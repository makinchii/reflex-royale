const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { AUDIO_LIBRARY } = require("../lib/audioCatalog");

const AUDIO_DIR = path.join(__dirname, "..", "public", "audio");
const WORK_DIR = path.join(__dirname, "..", ".audio-work");
const CONFIRM_AUDIO_RIGHTS = process.env.CONFIRM_AUDIO_RIGHTS === "true";
const FORCE = process.env.FORCE_AUDIO_EXTRACT === "true";
const TRACK_IDS = new Set((process.env.TRACK_IDS || "").split(",").map((id) => id.trim()).filter(Boolean));
const YT_DLP = process.env.YT_DLP_PATH || "yt-dlp";
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    ...options
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}`);
  }
}

function ensureCommand(command, versionArg) {
  const result = spawnSync(command, [versionArg], {
    stdio: "ignore",
    shell: false
  });

  if (result.error || result.status !== 0) {
    throw new Error(`${command} is required. Install it or set the matching *_PATH environment variable.`);
  }
}

function outputFiles(track) {
  return {
    mp3: path.join(AUDIO_DIR, `${track.trackId}.mp3`),
    webm: path.join(AUDIO_DIR, `${track.trackId}.webm`)
  };
}

function hasLocalVariants(track) {
  const files = outputFiles(track);
  return fs.existsSync(files.mp3) && fs.existsSync(files.webm);
}

function durationFor(track) {
  return track.maxExtractSeconds || track.durationSeconds || 360;
}

function sourcePathFor(track) {
  return path.join(WORK_DIR, `${track.trackId}.source.%(ext)s`);
}

function findDownloadedSource(track) {
  const prefix = `${track.trackId}.source.`;
  const match = fs.readdirSync(WORK_DIR).find((fileName) => fileName.startsWith(prefix));
  if (!match) {
    throw new Error(`yt-dlp did not create a source file for ${track.trackId}.`);
  }

  return path.join(WORK_DIR, match);
}

function extractTrack(track) {
  const files = outputFiles(track);
  if (!FORCE && hasLocalVariants(track)) {
    console.log(`Skipping ${track.trackId}; local variants already exist.`);
    return;
  }

  if (!track.sourceUrl) {
    console.log(`Skipping ${track.trackId}; no sourceUrl configured.`);
    return;
  }

  for (const fileName of fs.readdirSync(WORK_DIR)) {
    if (fileName.startsWith(`${track.trackId}.source.`)) {
      fs.rmSync(path.join(WORK_DIR, fileName), { force: true });
    }
  }

  const startSeconds = track.extractStartSeconds || 0;
  const durationSeconds = durationFor(track);
  const fadeOutStart = Math.max(0, durationSeconds - 0.25);
  console.log(`Extracting ${track.trackId} from ${startSeconds}s for ${durationSeconds}s.`);

  run(YT_DLP, [
    "--no-playlist",
    "-f",
    "bestaudio/best",
    "-o",
    sourcePathFor(track),
    track.sourceUrl
  ]);

  const sourcePath = findDownloadedSource(track);
  const commonArgs = [
    "-y",
    "-ss",
    String(startSeconds),
    "-i",
    sourcePath,
    "-t",
    String(durationSeconds),
    "-vn",
    "-af",
    `afade=t=in:st=0:d=0.04,afade=t=out:st=${fadeOutStart}:d=0.25`
  ];

  run(FFMPEG, [
    ...commonArgs,
    "-ar",
    "44100",
    "-ac",
    "2",
    "-b:a",
    "128k",
    files.mp3
  ]);

  run(FFMPEG, [
    ...commonArgs,
    "-ar",
    "48000",
    "-ac",
    "2",
    "-c:a",
    "libopus",
    "-b:a",
    "80k",
    files.webm
  ]);
}

function main() {
  if (!CONFIRM_AUDIO_RIGHTS) {
    throw new Error("Set CONFIRM_AUDIO_RIGHTS=true only after confirming you have rights/permission to download and use these audio sources.");
  }

  ensureCommand(YT_DLP, "--version");
  ensureCommand(FFMPEG, "-version");
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
  fs.mkdirSync(WORK_DIR, { recursive: true });

  const tracks = AUDIO_LIBRARY.filter((track) => TRACK_IDS.size === 0 || TRACK_IDS.has(track.trackId));
  for (const track of tracks) {
    extractTrack(track);
  }

  console.log(`Processed ${tracks.length} tracks.`);
}

main();
