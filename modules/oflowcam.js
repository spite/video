import { FlowCalculator } from "oflow";
import { Gum } from "./gum.js";

let flow;
let scale = 2;

const canvas = document.getElementById("photo");
const context = canvas.getContext("2d");
canvas.width = 0;

const oCanvas = document.createElement("canvas");
const oCtx = oCanvas.getContext("2d");
const tCanvas = document.createElement("canvas");
const tCtx = tCanvas.getContext("2d");

let startTime;

const gum = new Gum(
  document.querySelector("#device"),
  document.querySelector("#nextDeviceBtn")
);

let onSourceResize = () => {};

function extractDifferences() {
  const video = gum.video;
  if (
    canvas.width != video.videoWidth / scale ||
    canvas.height != video.videoHeight / scale
  ) {
    canvas.width = oCanvas.width = tCanvas.width = video.videoWidth / scale;
    canvas.height = oCanvas.height = tCanvas.height = video.videoHeight / scale;
    onSourceResize(canvas.width / scale, canvas.height / scale);
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
    return { d: null, f: null };
  }

  const buf8 = new Uint8ClampedArray(iData.data);
  const oBuf8 = new Uint8ClampedArray(oData.data);

  const d = flow.calculate(buf8, oBuf8, canvas.width, canvas.height);

  const currentTime = Date.now();
  const eTime = currentTime - startTime;
  startTime = currentTime;
  const f = eTime / 16;

  oCtx.drawImage(tCanvas, 0, 0);

  return { d, f };
}

async function init(s, onSourceResizeCb = onSourceResize) {
  scale = s;
  flow = new FlowCalculator(scale / 4);
  onSourceResize = onSourceResizeCb;
  await gum.init();
  await gum.ready();
  startTime = Date.now();
  return gum.video;
}

export { init, flow, extractDifferences, scale };
