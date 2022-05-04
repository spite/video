import {
  WebGLRenderer,
  Scene,
  OrthographicCamera,
  PlaneBufferGeometry,
  RawShaderMaterial,
  VideoTexture,
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

const scale = 2;

const container = document.getElementById("container");

const canvas = document.getElementById("photo");
const context = canvas.getContext("2d");
const oCanvas = document.createElement("canvas");
const oCtx = oCanvas.getContext("2d");
const tCanvas = document.createElement("canvas");
const tCtx = tCanvas.getContext("2d");

let offsets;
let momentum;
let offsetTexture;
let oW;
let oH;

const videoTexture = new VideoTexture(gum.video);
videoTexture.minFilter = NearestFilter;
videoTexture.magFilter = LinearFilter;

canvas.width = 0;
const flow = new FlowCalculator(scale / 4);
let startTime;

const renderer = new WebGLRenderer();
container.appendChild(renderer.domElement);

const scene = new Scene();

const camera = new OrthographicCamera(
  1 / -2,
  1 / 2,
  1 / 2,
  1 / -2,
  0.00001,
  1000
);

scene.add(camera);

const mesh = new Mesh(
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

function start() {
  startTime = Date.now();
  extractDifferences();
}

function update(d) {
  for (let j = 0; j < d.zones.length; j++) {
    const z = d.zones[j];
    const s = scale;
    const x = Math.round(z.x / s);
    const y = Math.round(z.y / s);
    const ptr = y * oW * 4 + x * 4;

    const m = 0.95;
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
    initOffsets(canvas.width / scale, canvas.height / scale);
    onResize();
  }

  let iData;
  let oData;

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
      tCtx.drawImage(canvas, 0, 0);
    }

    iData = context.getImageData(0, 0, canvas.width, canvas.height);
    oData = oCtx.getImageData(0, 0, oCanvas.width, oCanvas.height);
  } catch (e) {
    requestAnimationFrame(extractDifferences);
    return;
  }

  const buf8 = new Uint8ClampedArray(iData.data);
  const oBuf8 = new Uint8ClampedArray(oData.data);

  const d = flow.calculate(buf8, oBuf8, canvas.width, canvas.height);

  const currentTime = Date.now();
  const eTime = currentTime - startTime;
  startTime = currentTime;
  const f = eTime / 16;

  update(d, f);

  oCtx.drawImage(tCanvas, 0, 0);

  requestAnimationFrame(extractDifferences);
}

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

async function init() {
  await gum.init();
  await gum.ready();
  window.addEventListener("resize", onResize);
  onResize();
  start();
}

init();
