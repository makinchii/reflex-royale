const FLOWER_FIELDS_TRACK_ID = "flower-fields";

function youtubeImages(videoId) {
  return {
    coverImage: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    thumbnailImage: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
  };
}

function requestedTrack({ trackId, title, artist, category, videoId, sourceUrl, extractStartSeconds, sourceTimestamp }) {
  return {
    trackId,
    title,
    artist,
    album: "Reflex Royale Catalog",
    durationSeconds: 360,
    category,
    maxExtractSeconds: 360,
    ...(extractStartSeconds ? { extractStartSeconds } : {}),
    ...youtubeImages(videoId),
    sourceUrl,
    ...(sourceTimestamp ? { sourceTimestamp } : {})
  };
}

const AUDIO_LIBRARY = [
  {
    trackId: FLOWER_FIELDS_TRACK_ID,
    title: "Flower Fields",
    artist: "Athena IV",
    album: "Reaction Game Audio Console",
    durationSeconds: 360,
    category: "lobby",
    extractStartSeconds: 8137,
    maxExtractSeconds: 360,
    coverImage: "/images/audio/flower-fields-cover.webp",
    sourceUrl: "https://www.youtube.com/watch?v=J4njTYvvENQ&t=8137s",
    sourceTimestamp: "02:15:37",
    fallbackSources: [
      { src: "/audio/flower-fields.webm", type: "audio/webm" },
      { src: "/audio/flower-fields.mp3", type: "audio/mpeg" }
    ]
  },
  requestedTrack({
    trackId: "mirrors-edge",
    title: "Mirror's Edge",
    artist: "Solar Sands",
    category: "lobby",
    videoId: "qMPd8bv3W5w",
    sourceUrl: "https://www.youtube.com/watch?v=qMPd8bv3W5w&t=131s",
    extractStartSeconds: 131,
    sourceTimestamp: "00:02:11"
  }),
  requestedTrack({
    trackId: "future-self",
    title: "Future セルフ",
    artist: "Athena IV",
    category: "lobby",
    videoId: "SwUpMhp-DEc",
    sourceUrl: "https://www.youtube.com/watch?v=SwUpMhp-DEc&t=7122s",
    extractStartSeconds: 7122,
    sourceTimestamp: "01:58:42"
  }),
  requestedTrack({
    trackId: "tears-in-rain",
    title: "Tears in Rain",
    artist: "Athena IV",
    category: "lobby",
    videoId: "XG-rJ8z3IO8",
    sourceUrl: "https://www.youtube.com/watch?v=XG-rJ8z3IO8&t=800s",
    extractStartSeconds: 800,
    sourceTimestamp: "00:13:20"
  }),
  requestedTrack({
    trackId: "emerald-archive",
    title: "Emerald Archive",
    artist: "Athena IV",
    category: "lobby",
    videoId: "IueYFej6JCw",
    sourceUrl: "https://www.youtube.com/watch?v=IueYFej6JCw&t=5077s",
    extractStartSeconds: 5077,
    sourceTimestamp: "01:24:37"
  }),
  requestedTrack({
    trackId: "reflection",
    title: "Reflection",
    artist: "Athena IV",
    category: "lobby",
    videoId: "ndHbBhQkp5Q",
    sourceUrl: "https://www.youtube.com/watch?v=ndHbBhQkp5Q&t=237s",
    extractStartSeconds: 237,
    sourceTimestamp: "00:03:57"
  }),
  requestedTrack({
    trackId: "last-lightcycle",
    title: "Last Lightcycle",
    artist: "Athena IV",
    category: "lobby",
    videoId: "G-fy9e0sdS4",
    sourceUrl: "https://www.youtube.com/watch?v=G-fy9e0sdS4"
  }),
  requestedTrack({
    trackId: "deep-stone-crypt-lullaby",
    title: "Deep Stone Crypt Lullaby",
    artist: "Destiny 2",
    category: "lobby",
    videoId: "Uf57E9tmEnc",
    sourceUrl: "https://www.youtube.com/watch?v=Uf57E9tmEnc&t=368s",
    extractStartSeconds: 368,
    sourceTimestamp: "00:06:08"
  }),
  requestedTrack({
    trackId: "resurrections",
    title: "Resurrections",
    artist: "Celeste",
    category: "lobby",
    videoId: "1rwAvUvvQzQ",
    sourceUrl: "https://www.youtube.com/watch?v=1rwAvUvvQzQ"
  }),
  {
    trackId: "break-what-you-must",
    title: "Break What You Must",
    artist: "Destiny 2",
    album: "Music From the Grid",
    durationSeconds: 296,
    category: "battle",
    coverImage: "/images/audio/break-what-you-must-cover.webp",
    sourceUrl: "https://www.youtube.com/watch?v=44_aOyRnO9k&list=RD44_aOyRnO9k&start_radio=1",
    fallbackSources: [
      { src: "/audio/break-what-you-must.webm", type: "audio/webm" },
      { src: "/audio/break-what-you-must.mp3", type: "audio/mpeg" }
    ]
  },
  requestedTrack({
    trackId: "astra",
    title: "Astra",
    artist: "Altare ft. Devilish Trio",
    category: "battle",
    videoId: "xjTZ_GhhcKA",
    sourceUrl: "https://www.youtube.com/watch?v=xjTZ_GhhcKA&list=RD566i4nWbQkM&index=9"
  }),
  requestedTrack({
    trackId: "afterglow",
    title: "Afterglow",
    artist: "ROUDS",
    category: "battle",
    videoId: "L5S_BC9BrCE",
    sourceUrl: "https://www.youtube.com/watch?v=L5S_BC9BrCE&list=RD566i4nWbQkM&index=18"
  }),
  requestedTrack({
    trackId: "void-inside-the-machine",
    title: "Void Inside The Machine",
    artist: "FINALSORRY",
    category: "battle",
    videoId: "smwF1aQPUKg",
    sourceUrl: "https://www.youtube.com/watch?v=smwF1aQPUKg"
  }),
  requestedTrack({
    trackId: "peace-of-mind-before-death",
    title: "Peace of Mind Before Death",
    artist: "FINALSORRY",
    category: "battle",
    videoId: "oH_uGmLTzK0",
    sourceUrl: "https://www.youtube.com/watch?v=oH_uGmLTzK0"
  })
];

function audioSourceVersion(track, variant = null) {
  const updatedAt = track.updatedAt ? new Date(track.updatedAt).getTime() : 0;
  return String(updatedAt || variant?.sizeBytes || track.maxExtractSeconds || track.durationSeconds || 1);
}

function appendSourceVersion(source, version) {
  const separator = source.includes("?") ? "&" : "?";
  return `${source}${separator}v=${encodeURIComponent(version)}`;
}

function serializeTrack(track, req = null) {
  const catalogTrack = AUDIO_LIBRARY.find((item) => item.trackId === track.trackId);
  const streamPath = `/api/audio/tracks/${track.trackId}/stream`;
  const hasDbVariants = Array.isArray(track.variants) && track.variants.length > 0;
  const sources = hasDbVariants
    ? track.variants.map((variant) => ({
        src: `${streamPath}?format=${encodeURIComponent(variant.format)}&v=${encodeURIComponent(audioSourceVersion(track, variant))}`,
        type: variant.mimeType,
        sizeBytes: variant.sizeBytes
      }))
    : (track.fallbackSources || []).map((source) => ({ ...source, src: appendSourceVersion(source.src, audioSourceVersion(track)) }));

  return {
    trackId: track.trackId,
    title: track.title,
    artist: track.artist,
    album: track.album,
    durationSeconds: track.maxExtractSeconds || track.durationSeconds,
    category: track.category || catalogTrack?.category || "lobby",
    coverImage: track.coverImage,
    thumbnailImage: track.thumbnailImage || track.coverImage,
    sourceUrl: track.sourceUrl,
    sourceTimestamp: track.sourceTimestamp,
    sources: req ? sources.map((source) => ({ ...source, src: new URL(source.src, `${req.protocol}://${req.get("host")}`).pathname + new URL(source.src, `${req.protocol}://${req.get("host")}`).search })) : sources
  };
}

module.exports = {
  AUDIO_LIBRARY,
  FLOWER_FIELDS_TRACK_ID,
  serializeTrack
};
