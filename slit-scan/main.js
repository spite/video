import { Gum } from "../modules/gum.js";

const gum = new Gum(
  document.querySelector("#device"),
  document.querySelector("#nextDeviceBtn")
);

const isVertical = true;
const size = 2;
const lagBuffer = [];
const canvas = document.getElementById("photo");
const context = canvas.getContext("2d");
let scanline = 0;
let lagFrames;

canvas.width = 0;
document.body.appendChild(canvas);

function gotStream() {
  const video = gum.video;

  console.log(video.videoWidth, video.videoHeight);
  lagFrames = (isVertical ? video.videoHeight : video.videoWidth) / size;
  for (let j = 0; j < lagFrames; j++) {
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    lagBuffer.push({ canvas: c, ctx: ctx });
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  for (let j = 0; j < lagBuffer.length; j++) {
    lagBuffer[j].canvas.width = video.videoWidth;
    lagBuffer[j].canvas.height = video.videoHeight;
  }
  scanline = 0;
  onResize();

  snapshotLagged();
}

function mod(a, n) {
  return ((a % n) + n) % n;
}

function snapshotLagged() {
  const video = gum.video;
  lagBuffer[scanline].ctx.drawImage(
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

  if (isVertical) {
    for (let y = 0; y < video.videoHeight / size; y++) {
      const p = mod(scanline - y, lagFrames);
      const i = lagBuffer[p].canvas;
      context.drawImage(
        i,
        0,
        y * size,
        video.videoWidth,
        size,
        0,
        y * size,
        canvas.width,
        size
      );
    }
  } else {
    for (let x = 0; x < video.videoWidth / size; x++) {
      const p = mod(scanline - x, lagFrames);
      const i = lagBuffer[p].canvas;
      context.drawImage(
        i,
        x * size,
        0,
        size,
        video.videoHeight,
        x * size,
        0,
        size,
        canvas.height
      );
    }
  }
  scanline = mod(scanline + 1, lagFrames);

  requestAnimationFrame(snapshotLagged);
}

async function init() {
  await gum.init();
  await gum.ready();
  gotStream();
}
init();

window.addEventListener("resize", onResize);

function onResize() {
  const video = gum.video;
  const ar = window.innerHeight / window.innerWidth;
  const cr = video.videoHeight / video.videoWidth;

  if (cr <= ar) {
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerWidth * cr + "px";
  } else {
    canvas.style.height = window.innerHeight + "px";
    canvas.style.width = window.innerHeight / cr + "px";
  }

  canvas.style.marginLeft = -0.5 * canvas.clientWidth + "px";
  canvas.style.marginTop = -0.5 * canvas.clientHeight + "px";
}
