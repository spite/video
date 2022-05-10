import { OrthographicCamera, Scene, WebGLRenderer, Mesh } from "three";
import {
  init as initGum,
  extractDifferences,
  scale,
} from "../modules/oflowcam.js";

let video;

var mode = 1;

var fStep = scale;
var wStep = fStep * fStep + 1;

var camera,
  renderer,
  container = document.getElementById("container");

var scene, geometry, material, particles;
var scene2, geometry2, material2, particles2;
var balls = [],
  balls2 = [];

var message = document.getElementById("message");
var instructions = document.getElementById("instructions");
instructions.style.display = "none";

var size = 2,
  canvas = document.getElementById("photo"),
  context = canvas.getContext("2d"),
  oCanvas = document.createElement("canvas"),
  oCtx = oCanvas.getContext("2d"),
  fCanvas = document.getElementById("fcanvas"),
  fCtx = fCanvas.getContext("2d"),
  tCanvas = document.createElement("canvas"),
  tCtx = tCanvas.getContext("2d");

canvas.width = 0;
canvas.style.display = "none";
var startTime;

function start() {
  oCanvas.style.display = "block";
  startTime = Date.now();
  processFrame();
}
function processFrame() {
  const { d, f } = extractDifferences();
  if (d && d.u !== 0 && d.v !== 0) {
    updateCanvas(d, f);
  }
  requestAnimationFrame(processFrame);
}

function updateCanvas(d, f) {
  var min = 2;
  var maxLife = 100;
  for (const zone of d.zones) {
    if (Math.abs(zone.u) > min || Math.abs(zone.v) > min) {
      balls.push({
        x: zone.x,
        y: zone.y,
        u: zone.u,
        v: zone.v,
        ox: zone.x,
        oy: zone.y,
        life: maxLife,
      });
    }
  }

  fCtx.drawImage(video, 0, 0);
  fCtx.fillStyle = "#FFD285";
  fCtx.strokeStyle = "#FFD285";
  fCtx.save();
  fCtx.globalCompositeOperation = "lighter";

  const s = scale;
  for (const zone of d.zones) {
    fCtx.beginPath();
    const x = zone.x;
    const y = zone.y;
    fCtx.moveTo(x, y);
    fCtx.lineTo(x + zone.u, y + zone.v);
    fCtx.stroke();
    fCtx.beginPath();
    fCtx.arc(x, y, scale, 0, 2 * Math.PI);
    fCtx.stroke();
  }

  for (var j = 0; j < balls.length; j++) {
    var b = balls[j];
    var ox = b.x;
    var oy = b.y;
    b.x -= f * 0.5 * b.u * scale;
    b.y -= f * 0.5 * b.v * scale;
    b.v -= f * 0.098 * scale;
    b.life -= f;
    if (b.life < 0) {
      balls.splice(j, 1);
    }
    var a = 0.5 * Math.max(0, b.life / maxLife);

    fCtx.globalAlpha = a;
    fCtx.beginPath();
    fCtx.arc(
      b.x * scale,
      b.y * scale,
      0.05 * (maxLife - b.life) * scale,
      0,
      2 * Math.PI
    );
    fCtx.fill();

    b.ox = ox;
    b.oy = oy;
  }
  fCtx.restore();
}

function updateParticles(d, f, data) {
  var min = 1;
  for (var j = 0; j < d.zones.length; j++) {
    if (Math.abs(d.zones[j].u) > min || Math.abs(d.zones[j].v) > min) {
      var b = balls2[j];
      if (b.life <= 0) {
        b.x = d.zones[j].x;
        b.y = d.zones[j].y;
        b.ox = d.zones[j].x;
        b.oy = d.zones[j].y;
        var su = d.zones[j].u;
        if (su > 0) su -= min;
        else if (su < 0) su += min;
        var sv = d.zones[j].v;
        if (sv > 0) sv -= min;
        else if (sv < 0) sv += min;
        b.u = -su;
        b.v = -sv;
        b.life = 100;
      }
    }
  }

  fCtx.globalCompositeOperation = "source-over";
  fCtx.drawImage(video, 0, 0);

  for (var j = 0; j < geometry.vertices.length; j++) {
    if (j < balls2.length && balls2[j].life > 0) {
      var b = balls2[j];
      b.x += f * b.u;
      b.y += f * b.v;
      b.v += f * 0.098;
      b.life -= f;
      geometry.vertices[j].x = scale * b.x - 320;
      geometry.vertices[j].y = scale * b.y - 240;
      geometry.vertices[j].z = 0;
      b.ox = b.x;
      b.oy = b.y;
    } else {
      geometry.vertices[j].x = -5000;
      geometry.vertices[j].y = -5000;
      geometry.vertices[j].z = 0;
    }
  }

  geometry.verticesNeedUpdate = true;
  renderer.render(scene, camera);
}

function updateParticlesII(d, f, data) {
  var min = 1;
  var w = (640 / scale - (2 * fStep + 1)) / wStep;
  for (var j = 0; j < d.zones.length; j++) {
    if (Math.abs(d.zones[j].u) > min || Math.abs(d.zones[j].v) > min) {
      var x = (d.zones[j].x - fStep - 1) / wStep;
      var y = (d.zones[j].y - fStep - 1) / wStep;
      var ptr = y * w + x;
      geometry2.speeds[ptr].x -= f * 10 * d.zones[j].u;
      geometry2.speeds[ptr].y -= f * 10 * d.zones[j].v;
    }
  }

  var ptr = 0,
    pptr = 0;
  var k = 0.1;

  for (y = fStep + 1; y < 480 / scale - fStep - 1; y += wStep) {
    for (var x = fStep + 1; x < 640 / scale - fStep - 1; x += wStep) {
      ptr = ((y * 640) / scale) * 4 + x * 4;
      var r = data[ptr] / 255,
        g = data[ptr + 1] / 255,
        b = data[ptr + 2] / 255;
      geometry2.colors[pptr].setRGB(r, g, b);

      geometry2.targetVertices[pptr].x =
        geometry2.originalVertices[pptr].x + f * geometry2.speeds[pptr].x;
      geometry2.targetVertices[pptr].y =
        geometry2.originalVertices[pptr].y + f * geometry2.speeds[pptr].y;

      geometry2.vertices[pptr].x +=
        (geometry2.targetVertices[pptr].x - geometry2.vertices[pptr].x) * 0.9;
      geometry2.vertices[pptr].y +=
        (geometry2.targetVertices[pptr].y - geometry2.vertices[pptr].y) * 0.9;

      geometry2.speeds[pptr].x -= f * k * geometry2.speeds[pptr].x;
      geometry2.speeds[pptr].y -= f * k * geometry2.speeds[pptr].y;

      pptr++;
    }
  }

  geometry2.verticesNeedUpdate = true;
  geometry2.colorsNeedUpdate = true;
  renderer.render(scene2, camera);
}

function initWebGL() {
  camera = new OrthographicCamera(-320, 320, -240, 240, 0, 500);
  camera.position.x = 0;
  camera.position.y = 0;
  camera.position.z = 0;

  renderer = new WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);
}

function initCanvas() {}

function initParticles() {
  scene = new Scene();

  geometry = new Geometry();
  geometry.dynamic = true;

  sprite = ImageUtils.loadTexture("disc.png");

  for (i = 0; i < 30000; i++) {
    var vertex = new Vector3();
    vertex.x = 2000 * Math.random() - 1000;
    vertex.y = 2000 * Math.random() - 1000;
    vertex.z = 0; // 2000 * Math.random() - 1000;

    geometry.vertices.push(vertex);
    balls2.push({
      x: 0,
      y: 0,
      ox: 0,
      oy: 0,
      u: 0,
      v: 0,
      life: 0,
    });
  }

  material = new ParticleBasicMaterial({
    size: 10,
    opacity: 0.5,
    sizeAttenuation: false,
    map: sprite,
    vertexColors: false,
    transparent: true,
  });
  material.color.setHSL(1.0, 0.2, 0.7);

  particles = new ParticleSystem(geometry, material);

  scene.add(particles);
}

function switchMode(m) {
  fCanvas.style.display = "none";
  container.style.display = "none";

  var a = document.querySelectorAll(".modeSwitch");
  for (var j = 0; j < a.length; j++) {
    a[j].classList.remove("selected");
    if (parseInt(a[j].getAttribute("data-mode"), 10) == m)
      a[j].classList.add("selected");
  }

  mode = m;

  switch (mode) {
    case 1:
      fCanvas.style.display = "block";
      break;
    case 2:
      fCanvas.style.display = "block";
      container.style.display = "block";
      break;
    case 3:
      container.style.display = "block";
      break;
  }

  onResize();
}

function initParticlesII() {
  scene2 = new Scene();

  geometry2 = new Geometry();
  geometry2.dynamic = true;
  geometry2.originalVertices = [];
  geometry2.speeds = [];
  geometry2.targetVertices = [];

  var colors = [];
  sprite = ImageUtils.loadTexture("disc.png");
  var ptr = 0;

  for (y = fStep + 1; y < 480 / scale - fStep - 1; y += wStep) {
    for (var x = fStep + 1; x < 640 / scale - fStep - 1; x += wStep) {
      var vertex = new Vector3();
      vertex.x = scale * (x - 0.5 * 320);
      vertex.y = scale * (y - 0.5 * 240);
      vertex.z = 0;

      geometry2.vertices.push(vertex);
      geometry2.originalVertices.push(vertex.clone());
      geometry2.targetVertices.push(vertex.clone());
      geometry2.speeds.push({ x: 10, y: 0 });

      colors[ptr] = new Color(0xffffff);
      colors[ptr].setHSL((vertex.x + 1000) / 2000, 1, 0.5);

      ptr++;
    }
  }

  geometry2.colors = colors;

  material2 = new ParticleBasicMaterial({
    size: 30,
    opacity: 1,
    sizeAttenuation: false,
    map: sprite,
    vertexColors: true,
    transparent: true,
  });
  material2.color.setHSL(1.0, 0.2, 0.7);

  particles2 = new ParticleSystem(geometry2, material2);

  scene2.add(particles2);
}

initWebGL();
initCanvas();
// initParticles();
// initParticlesII();

var a = document.querySelectorAll(".modeSwitch");
for (var j = 0; j < a.length; j++) {
  a[j].addEventListener("click", function (e) {
    var id = parseInt(this.getAttribute("data-mode"), 10);
    switchMode(id);
    e.preventDefault();
  });
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

  container.style.position = "absolute";
  container.style.left = "50%";
  container.style.top = "50%";
  container.style.marginLeft = -(0.5 * w) + "px";
  container.style.marginTop = -(0.5 * h) + "px";
  container.style.width = w + "px";
  container.style.height = h + "px";

  fCanvas.style.position = container.style.position;
  fCanvas.style.width = container.style.width;
  fCanvas.style.height = container.style.height;
  fCanvas.style.left = container.style.left;
  fCanvas.style.top = container.style.top;
  fCanvas.style.marginLeft = container.style.marginLeft;
  fCanvas.style.marginTop = container.style.marginTop;

  renderer.setSize(container.clientWidth, container.clientHeight);

  camera.updateProjectionMatrix();
}

async function init() {
  const res = await initGum(16);
  video = res.video;
  window.addEventListener("resize", onResize);

  fCanvas.width = video.videoWidth;
  fCanvas.height = video.videoHeight;

  onResize();
  switchMode(1);
  start();
}

init();
