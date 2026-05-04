const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const AudioTrack = require("../models/AudioTrack");
const { AUDIO_LIBRARY } = require("../lib/audioCatalog");

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const AUDIO_DIR = path.join(__dirname, "..", "public", "audio");

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

async function main() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is required to seed the audio library.");
  }

  await mongoose.connect(MONGODB_URI);

  let totalBytes = 0;
  for (const baseTrack of AUDIO_LIBRARY) {
    const variants = variantInputsFor(baseTrack).map((variant) => {
      const filePath = path.join(AUDIO_DIR, variant.fileName);
      const data = fs.readFileSync(filePath);
      return {
        format: variant.format,
        mimeType: variant.mimeType,
        bitrateKbps: variant.bitrateKbps,
        sizeBytes: data.length,
        data
      };
    });

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
