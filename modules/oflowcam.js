import { FlowCalculator } from "../third_party/oflow.js";
import { Gum } from "./gum.js";

let flow;
let scale = 2;

let width = 0;
let height = 0;

const newImage = document.createElement("canvas");
const newImageContext = newImage.getContext("2d");
const oldImage = document.createElement("canvas");
const oldImageContext = oldImage.getContext("2d");

document.body.append(newImage);
document.body.append(oldImage);

const gum = new Gum(
  document.querySelector("#device"),
  document.querySelector("#nextDeviceBtn")
);

let onSourceResize = () => {};

function extractDifferences() {
  const video = gum.video;
  const s = 2 * scale;
  const roundWidth = video.videoWidth; // Math.floor(video.videoWidth / s) * s;
  const roundHeight = video.videoHeight; //Math.floor(video.videoHeight / s) * s;
  if (width != roundWidth || height != roundHeight) {
    width = roundWidth;
    height = roundHeight;
    newImage.width = oldImage.width = width;
    newImage.height = oldImage.height = height;
    onSourceResize(width, height);
  }

  let oldImageData;
  let newImageData;

  try {
    newImageContext.drawImage(video, 0, 0);

    oldImageData = oldImageContext.getImageData(0, 0, width, height);
    newImageData = newImageContext.getImageData(0, 0, width, height);
  } catch (e) {
    return { d: null, f: null };
  }

  const d = flow.calculate(oldImageData.data, newImageData.data, width, height);

  oldImageContext.drawImage(newImage, 0, 0);

  return { d };
}

async function init(s, onSourceResizeCb = onSourceResize) {
  scale = s;
  flow = new FlowCalculator(scale);
  onSourceResize = onSourceResizeCb;
  await gum.init();
  await gum.ready();
  document.body.append(gum.video);
  gum.video.style.opacity = "0";
  gum.video.style.pointerEvents = "none";
  return { video: gum.video, canvas: newImage };
}

export { init, flow, extractDifferences, scale };
