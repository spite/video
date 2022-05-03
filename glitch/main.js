import {
  WebGLRenderer,
  Scene,
  OrthographicCamera,
  PlaneBufferGeometry,
  RawShaderMaterial,
  CanvasTexture,
  LinearFilter,
  NearestFilter,
  RGBAFormat,
  FloatType,
  Mesh,
  DataTexture,
  GLSL3,
} from "three";
import { FlowCalculator } from "oflow";
import { vertexShader, fragmentShader } from "./shaders.js";
import { Gum } from "../modules/gum.js";

const gum = new Gum(
  document.querySelector("#device"),
  document.querySelector("#nextDeviceBtn")
);

Number.prototype.sign = function () {
  if (this < 0) {
    return -1;
  }
  if (this > 0) {
    return 1;
  }
  return 0;
};

var scale = 2;
var fStep = scale;
var wStep = fStep * fStep + 1;

var camera,
  renderer,
  container = document.getElementById("container");

var scene, mesh;

const canvas = document.getElementById("photo");
const context = canvas.getContext("2d");
const oCanvas = document.createElement("canvas");
const oCtx = oCanvas.getContext("2d");
const tCanvas = document.createElement("canvas");
const tCtx = tCanvas.getContext("2d");

var offsets, momentum, offsetTexture;
var oW, oH;

var videoTexture = new CanvasTexture(oCanvas);
videoTexture.minFilter = NearestFilter;
videoTexture.magFilter = LinearFilter;

canvas.width = 0;
var flow = new FlowCalculator(fStep);
var startTime;

function start() {
  oCanvas.style.display = "block";
  startTime = Date.now();
  extractDifferences();
}

function update(d, f, data) {
  for (var j = 0; j < d.zones.length; j++) {
    var ptr = d.zones[j].y / fStep;
    var z = d.zones[j];
    var s = wStep;
    var x = Math.floor(z.x / s);
    var y = Math.floor(z.y / s);
    var ptr = y * oW * 4 + x * 4;

    var m = 0.95;
    momentum[ptr] += z.u;
    momentum[ptr] *= m;
    momentum[ptr + 1] += z.v;
    momentum[ptr + 1] *= m;

    offsets[ptr] += momentum[ptr];
    offsets[ptr] *= 0.5;
    offsets[ptr + 1] += momentum[ptr + 1];
    offsets[ptr + 1] *= 0.5;
  }

  offsetTexture.needsUpdate = true;
  videoTexture.needsUpdate = true;
  renderer.render(scene, camera);
}

function initOffsets(w, h) {
  oW = w;
  oH = h;
  momentum = new Float32Array(w * h * 4);
  offsets = new Float32Array(w * h * 4);
  offsetTexture = new DataTexture(offsets, w, h, RGBAFormat, FloatType);
  offsetTexture.flipY = true;
  mesh.material.uniforms.offsetMap.value = offsetTexture;
}

function extractDifferences() {
  const video = gum.video;
  if (
    canvas.width != video.videoWidth / scale ||
    canvas.height != video.videoHeight / scale
  ) {
    canvas.width = oCanvas.width = tCanvas.width = video.videoWidth / scale;
    canvas.height = oCanvas.height = tCanvas.height = video.videoHeight / scale;
    initOffsets(canvas.width / wStep, canvas.height / wStep);
    onResize();
  }

  try {
    context.drawImage(
      video,
      0,
      0,
      video.videoWidth,
      video.videoHeight,
      0,
      0,
      canvas.width,
      canvas.height
    );
    if (canvas.width > 0 && canvas.height > 0) {
      //stackBlurCanvasRGB( canvas, 0, 0, canvas.width, canvas.height, 10 );
      tCtx.drawImage(canvas, 0, 0);
    }

    var iData = context.getImageData(0, 0, canvas.width, canvas.height);
    var oData = oCtx.getImageData(0, 0, oCanvas.width, oCanvas.height);
  } catch (e) {
    requestAnimationFrame(extractDifferences);
    return;
  }

  var p = iData.data.length / 4;
  var buf = new ArrayBuffer(iData.data.length);
  var oBuf = new ArrayBuffer(oData.data.length);
  var buf8 = new Uint8ClampedArray(iData.data);
  var oBuf8 = new Uint8ClampedArray(oData.data);

  var d = flow.calculate(buf8, oBuf8, canvas.width, canvas.height);

  var currentTime = Date.now();
  var eTime = currentTime - startTime;
  startTime = currentTime;
  var f = eTime / 16;

  update(d, f);

  oCtx.drawImage(tCanvas, 0, 0);

  requestAnimationFrame(extractDifferences);
}

function initWebGL() {
  renderer = new WebGLRenderer();
  container.appendChild(renderer.domElement);

  scene = new Scene();

  camera = new OrthographicCamera(1 / -2, 1 / 2, 1 / 2, 1 / -2, 0.00001, 1000);

  scene.add(camera);

  mesh = new Mesh(
    new PlaneBufferGeometry(1, 1),
    new RawShaderMaterial({
      uniforms: {
        map: { value: videoTexture },
        offsetMap: { value: offsetTexture },
      },
      vertexShader,
      fragmentShader,
      glslVersion: GLSL3,
    })
  );

  scene.add(mesh);

  onResize();
}

async function init() {
  await gum.init();
  await gum.ready();

  initWebGL();
  start();
}
init();

window.addEventListener("resize", onResize);

function onResize() {
  const video = gum.video;
  var ar = window.innerHeight / window.innerWidth;
  var cr = video.videoHeight / video.videoWidth;
  var w, h;
  if (cr <= ar) {
    w = window.innerWidth;
    h = window.innerWidth * cr;
  } else {
    h = window.innerHeight;
    w = window.innerHeight / cr;
  }

  renderer.setSize(container.clientWidth, container.clientHeight);

  mesh.scale.set(w, h, 1);

  camera.left = -container.clientWidth / 2;
  camera.right = container.clientWidth / 2;
  camera.top = container.clientHeight / 2;
  camera.bottom = -container.clientHeight / 2;

  camera.updateProjectionMatrix();
}
