import {
  WebGLRenderer,
  Scene,
  OrthographicCamera,
  PlaneBufferGeometry,
  RawShaderMaterial,
  VideoTexture,
  RGBAFormat,
  FloatType,
  Mesh,
  DataTexture,
  GLSL3,
} from "../modules/three.js";
import { vertexShader, fragmentShader } from "./shaders.js";
import {
  init as initGum,
  extractDifferences,
  scale,
} from "../modules/oflowcam.js";

let video;

const container = document.getElementById("container");

let offsets;
let momentum;
let oW;
let oH;

function initOffsets(w, h) {
  oW = Math.floor(w / scale);
  oH = Math.floor(h / scale);
  momentum = new Float32Array(oW * oH * 4);
  offsets = new Float32Array(oW * oH * 4);
  const offsetTexture = new DataTexture(offsets, oW, oH, RGBAFormat, FloatType);
  offsetTexture.flipY = true;
  mesh.material.uniforms.offsetMap.value = offsetTexture;
}

const renderer = new WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);
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
      map: { value: null },
      offsetMap: { value: null },
    },
    vertexShader,
    fragmentShader,
    glslVersion: GLSL3,
  })
);

scene.add(mesh);

function start() {
  processFrame();
}

function processFrame() {
  const { d, f } = extractDifferences();
  if (d && d.u !== 0 && d.v !== 0) {
    update(d);
  }
  requestAnimationFrame(processFrame);
}

function update(d) {
  const s = scale;
  const m = 0.5;
  for (const z of d.zones) {
    const x = Math.round(z.x / s);
    const y = Math.round(z.y / s);
    const ptr = y * oW * 4 + x * 4;

    momentum[ptr] += z.u / scale;
    momentum[ptr] *= m;
    momentum[ptr + 1] += z.v / scale;
    momentum[ptr + 1] *= m;

    offsets[ptr] += momentum[ptr];
    offsets[ptr] *= 0.5;
    offsets[ptr + 1] += momentum[ptr + 1];
    offsets[ptr + 1] *= 0.5;

    // offsets[ptr] += z.u;
    // offsets[ptr] *= 0.9;
    // offsets[ptr + 1] += z.v;
    // offsets[ptr + 1] *= 0.9;
  }

  mesh.material.uniforms.offsetMap.value.needsUpdate = true;
  mesh.material.uniforms.map.value.needsUpdate = true;
  renderer.render(scene, camera);
}

function onResize() {
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
  const res = await initGum(2, initOffsets);
  video = res.video;

  const videoTexture = new VideoTexture(video);
  mesh.material.uniforms.map.value = videoTexture;

  window.addEventListener("resize", onResize);
  onResize();
  start();
}

init();
