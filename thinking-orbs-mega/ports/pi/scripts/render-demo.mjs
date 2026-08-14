import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { once } from "node:events";
import { join } from "node:path";
import process from "node:process";
import { createCanvas } from "@napi-rs/canvas";
import { MODE_DRAWS, resolvePreset } from "thinking-orbs";

if (process.platform !== "darwin") {
  throw new Error("Gallery media generation requires macOS system fonts.");
}

const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 30;
const STATE_SECONDS = 3;
const PRESET_SIZE = 64;
const SOURCE_SIZE = 304;
const DISPLAY_SIZE = 304;
const RENDER_SCALE = SOURCE_SIZE / PRESET_SIZE;
const BACKGROUND = "#090a0b";
const PRIMARY = "#e8e8e3";
const MUTED = "#777b78";
const assetsDirectory = join(process.cwd(), "assets");
const videoPath = join(assetsDirectory, "demo.mp4");
const previewPath = join(assetsDirectory, "preview.png");

const states = [
  { name: "listening", description: "Input detected" },
  { name: "solving", description: "Reasoning begins" },
  { name: "searching", description: "Reading and discovery" },
  { name: "working", description: "Tools in motion" },
  { name: "shaping", description: "Editing the result" },
  { name: "composing", description: "Response taking shape" },
];

const canvas = createCanvas(WIDTH, HEIGHT);
const context = canvas.getContext("2d");
const orbCanvas = createCanvas(SOURCE_SIZE, SOURCE_SIZE);
const orbContext = orbCanvas.getContext("2d");

function drawText(text, x, y, font, color, align = "left") {
  context.font = font;
  context.fillStyle = color;
  context.textAlign = align;
  context.textBaseline = "alphabetic";
  context.fillText(text, x, y);
}

function drawOrb(state, timeSeconds) {
  orbContext.setTransform(1, 0, 0, 1, 0, 0);
  orbContext.clearRect(0, 0, SOURCE_SIZE, SOURCE_SIZE);
  orbContext.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0);
  const { mode, speed, opts } = resolvePreset(state, PRESET_SIZE);
  MODE_DRAWS[mode](orbContext, PRESET_SIZE, timeSeconds * speed, true, opts);
  orbContext.setTransform(1, 0, 0, 1, 0, 0);

  context.imageSmoothingEnabled = false;
  context.drawImage(
    orbCanvas,
    838 - DISPLAY_SIZE / 2,
    298 - DISPLAY_SIZE / 2,
    DISPLAY_SIZE,
    DISPLAY_SIZE,
  );
}

function drawFrame(frameIndex) {
  const stateIndex = Math.min(
    states.length - 1,
    Math.floor(frameIndex / (FPS * STATE_SECONDS)),
  );
  const state = states[stateIndex];
  const timeSeconds = frameIndex / FPS;

  context.fillStyle = BACKGROUND;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  drawText("PI EXTENSION", 88, 82, "600 16px Menlo, monospace", MUTED);
  drawText("Thinking", 84, 170, "600 58px Helvetica Neue, sans-serif", PRIMARY);
  drawText("Orbs", 84, 230, "600 58px Helvetica Neue, sans-serif", PRIMARY);
  drawText("Agent activity,", 88, 302, "400 23px Helvetica Neue, sans-serif", MUTED);
  drawText("made visible.", 88, 334, "400 23px Helvetica Neue, sans-serif", MUTED);

  context.fillStyle = "rgba(255, 255, 255, 0.08)";
  context.fillRect(504, 64, 1, 592);

  drawText("pi  ›  /orbs preview all", 88, 570, "400 16px Menlo, monospace", PRIMARY);
  drawText("30 FPS  ·  six states  ·  no telemetry", 88, 620, "400 14px Menlo, monospace", MUTED);

  drawText(
    `${String(stateIndex + 1).padStart(2, "0")} / ${String(states.length).padStart(2, "0")}`,
    1178,
    82,
    "400 14px Menlo, monospace",
    MUTED,
    "right",
  );

  drawOrb(state.name, timeSeconds);
  drawText(state.name, 838, 530, "600 30px Menlo, monospace", PRIMARY, "center");
  drawText(state.description, 838, 566, "400 17px Helvetica Neue, sans-serif", MUTED, "center");
}

async function writeRawFrame(stream) {
  const imageData = context.getImageData(0, 0, WIDTH, HEIGHT);
  const frame = Buffer.from(
    imageData.data.buffer,
    imageData.data.byteOffset,
    imageData.data.byteLength,
  );
  if (!stream.write(frame)) await once(stream, "drain");
}

await mkdir(assetsDirectory, { recursive: true });

const ffmpeg = spawn(
  "ffmpeg",
  [
    "-y",
    "-hide_banner",
    "-loglevel",
    "warning",
    "-f",
    "rawvideo",
    "-pixel_format",
    "rgba",
    "-video_size",
    `${WIDTH}x${HEIGHT}`,
    "-framerate",
    String(FPS),
    "-i",
    "pipe:0",
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    videoPath,
  ],
  { stdio: ["pipe", "inherit", "inherit"] },
);

const totalFrames = states.length * STATE_SECONDS * FPS;
for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += 1) {
  drawFrame(frameIndex);
  await writeRawFrame(ffmpeg.stdin);
}
ffmpeg.stdin.end();
const [exitCode] = await once(ffmpeg, "exit");
if (exitCode !== 0) throw new Error(`ffmpeg exited with code ${String(exitCode)}`);

const previewStateIndex = states.findIndex((state) => state.name === "composing");
const previewFrame = (previewStateIndex * STATE_SECONDS + 1.25) * FPS;
drawFrame(Math.round(previewFrame));
await writeFile(previewPath, canvas.toBuffer("image/png"));

console.log(`Wrote ${videoPath}`);
console.log(`Wrote ${previewPath}`);
