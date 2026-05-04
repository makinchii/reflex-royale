const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const AudioTrack = require("../models/AudioTrack");
const { AUDIO_LIBRARY } = require("../lib/audioCatalog");

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const AUDIO_DIR = path.join(__dirname, "..", "public", "audio");
const ALLOW_MISSING_AUDIO = process.env.ALLOW_MISSING_AUDIO === "true";

function effectiveDuration(track) {
  return track.maxExtractSeconds || track.durationSeconds;
}

function variantInputsFor(track) {
  return [
    {
      format: "webm",
      mimeType: "audio/webm",
      bitrateKbps: 80,
      fileName: `${track.trackId}.webm`
    },
    {
      format: "mp3",
      mimeType: "audio/mpeg",
      bitrateKbps: 128,
      fileName: `${track.trackId}.mp3`
    }
  ];
}

function variantsFor(track) {
  const missingFiles = [];
  const variants = [];

  for (const variant of variantInputsFor(track)) {
    const filePath = path.join(AUDIO_DIR, variant.fileName);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(variant.fileName);
      continue;
    }

    const data = fs.readFileSync(filePath);
    variants.push({
      format: variant.format,
      mimeType: variant.mimeType,
      bitrateKbps: variant.bitrateKbps,
      sizeBytes: data.length,
      data
    });
  }

  if (missingFiles.length > 0 && !ALLOW_MISSING_AUDIO) {
    throw new Error(`Missing audio files for ${track.trackId}: ${missingFiles.join(", ")}. Provide assets or run with ALLOW_MISSING_AUDIO=true to seed metadata only.`);
  }

  if (missingFiles.length > 0) {
    console.warn(`Metadata-only seed for ${track.trackId}; missing ${missingFiles.join(", ")}.`);
  }

  return variants;
}

async function main() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is required to seed the audio library.");
  }

  await mongoose.connect(MONGODB_URI);

  let totalBytes = 0;
  for (const baseTrack of AUDIO_LIBRARY) {
    const variants = variantsFor(baseTrack);

    await AudioTrack.findOneAndUpdate(
      { trackId: baseTrack.trackId },
      {
        trackId: baseTrack.trackId,
        title: baseTrack.title,
        artist: baseTrack.artist,
        album: baseTrack.album,
        durationSeconds: effectiveDuration(baseTrack),
        category: baseTrack.category,
        coverImage: baseTrack.coverImage,
        thumbnailImage: baseTrack.thumbnailImage,
        sourceUrl: baseTrack.sourceUrl,
        sourceTimestamp: baseTrack.sourceTimestamp,
        variants
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    totalBytes += variants.reduce((sum, variant) => sum + variant.sizeBytes, 0);
    console.log(`Seeded ${baseTrack.trackId} with ${variants.length} variants.`);
  }
  await mongoose.disconnect();

  console.log(`Seeded ${AUDIO_LIBRARY.length} tracks (${Math.round(totalBytes / 1024)} KiB).`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
