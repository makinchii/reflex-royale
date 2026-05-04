export type AudioSource = {
  src: string;
  type: string;
  sizeBytes?: number;
};

export type AudioCategory = "lobby" | "battle";
export type AudioMixMode = "default" | "custom" | "lobby" | "battle";

export type AudioTrack = {
  trackId: string;
  title: string;
  artist: string;
  album: string;
  durationSeconds: number;
  category: AudioCategory;
  coverImage?: string;
  thumbnailImage?: string;
  sourceUrl?: string;
  sourceTimestamp?: string;
  sources: AudioSource[];
};

function youtubeImages(videoId: string) {
  return {
    coverImage: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    thumbnailImage: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
  };
}

function requestedTrack(track: Omit<AudioTrack, "album" | "durationSeconds" | "sources"> & { videoId: string }): AudioTrack {
  return {
    trackId: track.trackId,
    title: track.title,
    artist: track.artist,
    album: "Reflex Royale Catalog",
    durationSeconds: 360,
    category: track.category,
    ...youtubeImages(track.videoId),
    sourceUrl: track.sourceUrl,
    sourceTimestamp: track.sourceTimestamp,
    sources: [],
  };
}

export const AUDIO_PLAYLIST: AudioTrack[] = [
  {
    trackId: "flower-fields",
    title: "Flower Fields",
    artist: "Athena IV",
    album: "Reaction Game Audio Console",
    durationSeconds: 360,
    category: "lobby",
    coverImage: "/images/audio/flower-fields-cover.webp",
    sourceUrl: "https://www.youtube.com/watch?v=J4njTYvvENQ&t=8137s",
    sourceTimestamp: "02:15:37",
    sources: [
      { src: "/audio/flower-fields.webm", type: "audio/webm" },
      { src: "/audio/flower-fields.mp3", type: "audio/mpeg" },
    ],
  },
  requestedTrack({
    trackId: "mirrors-edge",
    title: "Mirror's Edge",
    artist: "Solar Sands",
    category: "lobby",
    videoId: "qMPd8bv3W5w",
    sourceUrl: "https://www.youtube.com/watch?v=qMPd8bv3W5w&t=131s",
    sourceTimestamp: "00:02:11",
  }),
  requestedTrack({
    trackId: "future-self",
    title: "Future セルフ",
    artist: "Athena IV",
    category: "lobby",
    videoId: "SwUpMhp-DEc",
    sourceUrl: "https://www.youtube.com/watch?v=SwUpMhp-DEc&t=7122s",
    sourceTimestamp: "01:58:42",
  }),
  requestedTrack({
    trackId: "tears-in-rain",
    title: "Tears in Rain",
    artist: "Athena IV",
    category: "lobby",
    videoId: "XG-rJ8z3IO8",
    sourceUrl: "https://www.youtube.com/watch?v=XG-rJ8z3IO8&t=800s",
    sourceTimestamp: "00:13:20",
  }),
  requestedTrack({
    trackId: "emerald-archive",
    title: "Emerald Archive",
    artist: "Athena IV",
    category: "lobby",
    videoId: "IueYFej6JCw",
    sourceUrl: "https://www.youtube.com/watch?v=IueYFej6JCw&t=5077s",
    sourceTimestamp: "01:24:37",
  }),
  requestedTrack({
    trackId: "reflection",
    title: "Reflection",
    artist: "Athena IV",
    category: "lobby",
    videoId: "ndHbBhQkp5Q",
    sourceUrl: "https://www.youtube.com/watch?v=ndHbBhQkp5Q&t=237s",
    sourceTimestamp: "00:03:57",
  }),
  requestedTrack({
    trackId: "last-lightcycle",
    title: "Last Lightcycle",
    artist: "Athena IV",
    category: "lobby",
    videoId: "G-fy9e0sdS4",
    sourceUrl: "https://www.youtube.com/watch?v=G-fy9e0sdS4",
  }),
  requestedTrack({
    trackId: "deep-stone-crypt-lullaby",
    title: "Deep Stone Crypt Lullaby",
    artist: "Destiny 2",
    category: "lobby",
    videoId: "Uf57E9tmEnc",
    sourceUrl: "https://www.youtube.com/watch?v=Uf57E9tmEnc&t=368s",
    sourceTimestamp: "00:06:08",
  }),
  requestedTrack({
    trackId: "resurrections",
    title: "Resurrections",
    artist: "Celeste",
    category: "lobby",
    videoId: "1rwAvUvvQzQ",
    sourceUrl: "https://www.youtube.com/watch?v=1rwAvUvvQzQ",
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
    sources: [
      { src: "/audio/break-what-you-must.webm", type: "audio/webm" },
      { src: "/audio/break-what-you-must.mp3", type: "audio/mpeg" },
    ],
  },
  requestedTrack({
    trackId: "astra",
    title: "Astra",
    artist: "Altare ft. Devilish Trio",
    category: "battle",
    videoId: "xjTZ_GhhcKA",
    sourceUrl: "https://www.youtube.com/watch?v=xjTZ_GhhcKA&list=RD566i4nWbQkM&index=9",
  }),
  requestedTrack({
    trackId: "afterglow",
    title: "Afterglow",
    artist: "ROUDS",
    category: "battle",
    videoId: "L5S_BC9BrCE",
    sourceUrl: "https://www.youtube.com/watch?v=L5S_BC9BrCE&list=RD566i4nWbQkM&index=18",
  }),
  requestedTrack({
    trackId: "void-inside-the-machine",
    title: "Void Inside The Machine",
    artist: "FINALSORRY",
    category: "battle",
    videoId: "smwF1aQPUKg",
    sourceUrl: "https://www.youtube.com/watch?v=smwF1aQPUKg",
  }),
  requestedTrack({
    trackId: "peace-of-mind-before-death",
    title: "Peace of Mind Before Death",
    artist: "FINALSORRY",
    category: "battle",
    videoId: "oH_uGmLTzK0",
    sourceUrl: "https://www.youtube.com/watch?v=oH_uGmLTzK0",
  }),
];

export const AUDIO_PREFERENCES_CHANGED_EVENT = "reflexRoyaleAudioPreferencesChanged";
export const AUDIO_ENABLED_KEY = "reflexRoyaleAudioEnabled";
export const AUDIO_VOLUME_KEY = "reflexRoyaleAudioVolume";
export const AUDIO_MASTER_VOLUME_KEY = "reflexRoyaleAudioMasterVolume";
export const AUDIO_MUSIC_VOLUME_KEY = "reflexRoyaleAudioMusicVolume";
export const AUDIO_SFX_VOLUME_KEY = "reflexRoyaleAudioSfxVolume";
export const AUDIO_ROUND_ALERTS_KEY = "reflexRoyaleRoundAlertsEnabled";
export const AUDIO_VICTORY_PULSE_KEY = "reflexRoyaleVictoryPulseEnabled";
export const AUDIO_MIX_MODE_KEY = "reflexRoyaleAudioMixMode";
export const AUDIO_CUSTOM_TRACK_KEY = "reflexRoyaleAudioCustomTrack";
export const AUDIO_TRACK_LOOP_KEY = "reflexRoyaleAudioTrackLoop";
export const AUDIO_MATCH_STATE_EVENT = "reflexRoyaleMatchState";

export const UI_SFX_ASSETS = {
  click: { src: "/audio/ui-click.mp3", type: "audio/mpeg" },
  hover: { src: "/audio/ui-hover.mp3", type: "audio/mpeg" },
} as const;

export function clampAudioVolume(value: number, fallback: number) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

export function readAudioVolumePreference(key: string, fallback: number) {
  if (typeof window === "undefined") return fallback;
  return clampAudioVolume(Number(window.localStorage.getItem(key)), fallback);
}

export function readAudioTogglePreference(key: string, fallback = true) {
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(key);
  if (stored === null) return fallback;
  return stored === "true";
}

export function normalizeAudioMixMode(value: string | null): AudioMixMode {
  return value === "custom" || value === "lobby" || value === "battle" ? value : "default";
}

export function readAudioMixModePreference() {
  if (typeof window === "undefined") return "default";
  return normalizeAudioMixMode(window.localStorage.getItem(AUDIO_MIX_MODE_KEY));
}

export function readAudioCustomTrackPreference() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(AUDIO_CUSTOM_TRACK_KEY) || "";
}

export function writeAudioVolumePreference(key: string, volume: number) {
  if (typeof window === "undefined") return;
  const nextVolume = clampAudioVolume(volume, 0);
  window.localStorage.setItem(key, String(nextVolume));
  document.cookie = `${key}=${nextVolume}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(new CustomEvent(AUDIO_PREFERENCES_CHANGED_EVENT));
}

export function writeAudioTogglePreference(key: string, enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, String(enabled));
  document.cookie = `${key}=${enabled}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(new CustomEvent(AUDIO_PREFERENCES_CHANGED_EVENT));
}

export function writeAudioMixModePreference(mode: AudioMixMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUDIO_MIX_MODE_KEY, mode);
  document.cookie = `${AUDIO_MIX_MODE_KEY}=${mode}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(new CustomEvent(AUDIO_PREFERENCES_CHANGED_EVENT));
}

export function writeAudioCustomTrackPreference(trackId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUDIO_CUSTOM_TRACK_KEY, trackId);
  document.cookie = `${AUDIO_CUSTOM_TRACK_KEY}=${trackId}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(new CustomEvent(AUDIO_PREFERENCES_CHANGED_EVENT));
}

export async function fetchAudioPlaylist(): Promise<AudioTrack[]> {
  const response = await fetch("/api/audio/tracks", { headers: { Accept: "application/json" } });
  if (!response.ok) return AUDIO_PLAYLIST;
  const payload = await response.json() as { tracks?: AudioTrack[] };
  return Array.isArray(payload.tracks) && payload.tracks.length > 0
    ? payload.tracks.map((track) => ({ ...track, category: track.category === "battle" ? "battle" : "lobby" }))
    : AUDIO_PLAYLIST;
}

export function getTrackIdForPath(_pathname: string): string {
  return AUDIO_PLAYLIST[0].trackId;
}

export function getPlayableSource(track: AudioTrack | undefined, audioElement: HTMLAudioElement | null): AudioSource | null {
  if (!track) return null;
  if (!audioElement) return track.sources[0] ?? null;
  return track.sources.find((source) => audioElement.canPlayType(source.type) !== "") ?? track.sources[0] ?? null;
}

export function playUiClick() {
  if (typeof window === "undefined") return;
  window.__reflexRoyalePlayUiClick?.();
}

declare global {
  interface Window {
    __reflexRoyalePlayUiClick?: () => void;
    __reflexRoyaleSetFavicon?: () => void;
  }
}
