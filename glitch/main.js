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
} from "three";
import { vertexShader, fragmentShader } from "./shaders.js";
import { init as initGum, extractDifferences, scale } from "./oflowcam.js";

let video;

const container = document.getElementById("container");

let offsets;
let momentum;
let oW;
let oH;

function initOffsets(w, h) {
  oW = w;
  oH = h;
  momentum = new Float32Array(w * h * 4);
  offsets = new Float32Array(w * h * 4);
  const offsetTexture = new DataTexture(offsets, w, h, RGBAFormat, FloatType);
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
  if (d) {
    update(d);
  }
  requestAnimationFrame(processFrame);
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
  video = await initGum(2, initOffsets);

  const videoTexture = new VideoTexture(video);
  mesh.material.uniforms.map.value = videoTexture;

  window.addEventListener("resize", onResize);
  onResize();
  start();
}

init();
