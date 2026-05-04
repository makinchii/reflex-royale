"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Music2, Search, Volume1, Volume2, VolumeX } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/thegridcn/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/thegridcn/dialog";
import { Slider } from "@/components/thegridcn/slider";
import { CRTEffect } from "@/components/thegridcn/crt-effect";
import { VideoPlayer } from "@/components/thegridcn/video-player";
import { Waveform } from "@/components/thegridcn/waveform";
import {
  AUDIO_ENABLED_KEY,
  AUDIO_MASTER_VOLUME_KEY,
  AUDIO_MUSIC_VOLUME_KEY,
  AUDIO_MIX_MODE_KEY,
  AUDIO_PLAYLIST,
  AUDIO_PREFERENCES_CHANGED_EVENT,
  AUDIO_ROUND_ALERTS_KEY,
  AUDIO_SFX_VOLUME_KEY,
  AUDIO_VICTORY_PULSE_KEY,
  AUDIO_VOLUME_KEY,
  AUDIO_CUSTOM_TRACK_KEY,
  clampAudioVolume,
  fetchAudioPlaylist,
  getPlayableSource,
  readAudioCustomTrackPreference,
  readAudioMixModePreference,
  readAudioTogglePreference,
  readAudioVolumePreference,
  UI_SFX_ASSETS,
  writeAudioTogglePreference,
  writeAudioVolumePreference,
  type AudioCategory,
  type AudioMixMode,
} from "@/lib/audio";

const UI_INTERACTION_SELECTOR = "button, a, [role='button'], [data-hover-sound], [data-click-sound]";
type AudioCategoryFilter = AudioCategory | "all";

function writeAudioEnabled(enabled: boolean) {
  window.localStorage.setItem(AUDIO_ENABLED_KEY, String(enabled));
  document.cookie = `${AUDIO_ENABLED_KEY}=${enabled}; path=/; max-age=31536000; samesite=lax`;
}

function readInitialMasterVolume() {
  if (typeof window === "undefined") return 0.8;
  const stored = Number(window.localStorage.getItem(AUDIO_MASTER_VOLUME_KEY));
  if (Number.isFinite(stored)) return clampAudioVolume(stored, 0.8);
  return clampAudioVolume(Number(window.localStorage.getItem(AUDIO_VOLUME_KEY)), 0.8);
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const rounded = Math.floor(seconds);
  const minutes = Math.floor(rounded / 60);
  const remainingSeconds = rounded % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function ensureMusicSource(music: HTMLAudioElement, track: string) {
  const trackHref = new URL(track, window.location.origin).href;
  if (music.src !== trackHref) {
    music.src = track;
  }
}

function attemptMusicPlayback(music: HTMLAudioElement) {
  music.muted = false;
  void music.play().catch(() => {
    music.muted = true;
    void music.play().catch(() => undefined);
  });
}

function resolveMixCategory(mode: string, pathname: string): AudioCategory {
  if (mode === "lobby" || mode === "battle") return mode;
  return pathname.startsWith("/local") || pathname.startsWith("/online") ? "battle" : "lobby";
}

function getUiInteractionTarget(target: EventTarget | null) {
  return target instanceof Element ? target.closest(UI_INTERACTION_SELECTOR) : null;
}

function isDisabledUiInteraction(target: Element) {
  return (target instanceof HTMLButtonElement && target.disabled) || target.getAttribute("aria-disabled") === "true";
}

function pickRandomTrackIndex(playlist: Array<{ category: string }>, category: AudioCategory) {
  const indexes = playlist.map((track, index) => track.category === category ? index : -1).filter((index) => index >= 0);
  if (indexes.length === 0) return 0;
  return indexes[Math.floor(Math.random() * indexes.length)] ?? indexes[0];
}

function VolumeSlider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="audio-dialog__volume-row">
      <div className="audio-dialog__label-row">
        <span className="inline-flex items-center gap-2"><Volume1 className="h-3.5 w-3.5" /> {label}</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <Slider className="audio-dialog__hud-slider" value={[value * 100]} min={0} max={100} step={1} onValueChange={([nextValue]) => onChange((nextValue ?? 0) / 100)} aria-label={label} />
    </div>
  );
}

export function AudioController() {
  const pathname = usePathname();
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const clickRef = useRef<HTMLAudioElement | null>(null);
  const hoverRef = useRef<HTMLAudioElement | null>(null);
  const pendingTrackRef = useRef<string | null>(null);
  const audioEnabledRef = useRef(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const waveformRafRef = useRef<number | null>(null);
  const currentMixCategoryRef = useRef<AudioCategory | null>(null);
  const appliedCustomTrackIdRef = useRef("");
  const unlockedRef = useRef(false);
  const lastHoverAtRef = useRef(0);
  const lastClickAtRef = useRef(0);
  const lastHoverElementRef = useRef<Element | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [musicVolume, setMusicVolume] = useState(0.35);
  const [sfxVolume, setSfxVolume] = useState(0.55);
  const [roundAlertsEnabled, setRoundAlertsEnabled] = useState(true);
  const [victoryPulseEnabled, setVictoryPulseEnabled] = useState(true);
  const [mixMode, setMixMode] = useState("default");
  const [customTrackId, setCustomTrackId] = useState("");
  const [audioSearch, setAudioSearch] = useState("");
  const [audioCategoryFilter, setAudioCategoryFilter] = useState<AudioCategoryFilter>("all");
  const [audioPanelOpen, setAudioPanelOpen] = useState(false);
  const [gameHeaderSlot, setGameHeaderSlot] = useState<HTMLElement | null>(null);
  const [dashboardAudioSlot, setDashboardAudioSlot] = useState<HTMLElement | null>(null);
  const [playlist, setPlaylist] = useState(AUDIO_PLAYLIST);
  const [trackIndex, setTrackIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(AUDIO_PLAYLIST[0]?.durationSeconds ?? 0);
  const [waveformLevels, setWaveformLevels] = useState<number[]>([]);
  const activeTrack = playlist[trackIndex] ?? playlist[0];
  const filteredPlaylist = playlist.filter((track) => {
    const query = audioSearch.trim().toLowerCase();
    const matchesSearch = !query || track.title.toLowerCase().includes(query) || track.artist.toLowerCase().includes(query);
    const matchesCategory = audioCategoryFilter === "all" || track.category === audioCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  useLayoutEffect(() => {
    setAudioEnabled(true);
    setMasterVolume(readInitialMasterVolume());
    setMusicVolume(readAudioVolumePreference(AUDIO_MUSIC_VOLUME_KEY, 0.35));
    setSfxVolume(readAudioVolumePreference(AUDIO_SFX_VOLUME_KEY, 0.55));
    setRoundAlertsEnabled(readAudioTogglePreference(AUDIO_ROUND_ALERTS_KEY, true));
    setVictoryPulseEnabled(readAudioTogglePreference(AUDIO_VICTORY_PULSE_KEY, true));
    setMixMode(readAudioMixModePreference());
    setCustomTrackId(readAudioCustomTrackPreference());
  }, []);

  useEffect(() => {
    const music = new Audio();
    music.loop = true;
    music.preload = "auto";
    music.volume = readInitialMasterVolume() * readAudioVolumePreference(AUDIO_MUSIC_VOLUME_KEY, 0.35);
    musicRef.current = music;

    const click = new Audio(UI_SFX_ASSETS.click.src);
    click.preload = "auto";
    click.volume = readInitialMasterVolume() * readAudioVolumePreference(AUDIO_SFX_VOLUME_KEY, 0.55);
    clickRef.current = click;

    const hover = new Audio(UI_SFX_ASSETS.hover.src);
    hover.preload = "auto";
    hover.volume = readInitialMasterVolume() * readAudioVolumePreference(AUDIO_SFX_VOLUME_KEY, 0.55);
    hoverRef.current = hover;

    const unlock = () => {
      unlockedRef.current = true;
      const track = pendingTrackRef.current;
      if (track && audioEnabledRef.current) {
        ensureMusicSource(music, track);
        attemptMusicPlayback(music);
      }
    };

    const playUiClick = () => {
      if (!audioEnabledRef.current || !clickRef.current) return;
      const now = window.performance.now();
      if (now - lastClickAtRef.current < 48) return;
      lastClickAtRef.current = now;
      const sound = clickRef.current;
      sound.currentTime = 0;
      void sound.play().catch(() => undefined);
    };

    const playUiHover = () => {
      if (!audioEnabledRef.current || !hoverRef.current) return;
      const now = window.performance.now();
      if (now - lastHoverAtRef.current < 42) return;
      lastHoverAtRef.current = now;
      const sound = hoverRef.current;
      sound.currentTime = 0;
      void sound.play().catch(() => undefined);
    };

    const onPointerOver = (event: PointerEvent) => {
      const hoverTarget = getUiInteractionTarget(event.target);
      if (!hoverTarget || hoverTarget === lastHoverElementRef.current) return;
      if (isDisabledUiInteraction(hoverTarget)) return;
      lastHoverElementRef.current = hoverTarget;
      playUiHover();
    };

    const onPointerOut = (event: PointerEvent) => {
      const hoverTarget = getUiInteractionTarget(event.target);
      if (!hoverTarget || hoverTarget !== lastHoverElementRef.current) return;
      if (event.relatedTarget instanceof Node && hoverTarget.contains(event.relatedTarget)) return;
      lastHoverElementRef.current = null;
    };

    const onClick = (event: MouseEvent) => {
      const clickTarget = getUiInteractionTarget(event.target);
      if (!clickTarget || isDisabledUiInteraction(clickTarget)) return;
      playUiClick();
    };

    window.__reflexRoyalePlayUiClick = playUiClick;

    const onPointerDown = () => unlock();
    const onKeyDown = () => unlock();

    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerover", onPointerOver, { passive: true });
    document.addEventListener("pointerout", onPointerOut, { passive: true });
    document.addEventListener("click", onClick);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerout", onPointerOut);
      document.removeEventListener("click", onClick);
      window.__reflexRoyalePlayUiClick = undefined;
      if (waveformRafRef.current !== null) cancelAnimationFrame(waveformRafRef.current);
      void audioContextRef.current?.close().catch(() => undefined);
      music.pause();
      musicRef.current = null;
      clickRef.current = null;
      hoverRef.current = null;
    };
  }, []);

  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
  }, [audioEnabled]);

  useEffect(() => {
    const syncAudioPreferences = () => {
      setMasterVolume(readInitialMasterVolume());
      setMusicVolume(readAudioVolumePreference(AUDIO_MUSIC_VOLUME_KEY, 0.35));
      setSfxVolume(readAudioVolumePreference(AUDIO_SFX_VOLUME_KEY, 0.55));
      setRoundAlertsEnabled(readAudioTogglePreference(AUDIO_ROUND_ALERTS_KEY, true));
      setVictoryPulseEnabled(readAudioTogglePreference(AUDIO_VICTORY_PULSE_KEY, true));
      setMixMode(readAudioMixModePreference());
      setCustomTrackId(readAudioCustomTrackPreference());
    };

    const syncFromStorage = (event: StorageEvent) => {
      if (
        event.key === AUDIO_MASTER_VOLUME_KEY ||
        event.key === AUDIO_VOLUME_KEY ||
        event.key === AUDIO_MUSIC_VOLUME_KEY ||
        event.key === AUDIO_SFX_VOLUME_KEY ||
        event.key === AUDIO_ROUND_ALERTS_KEY ||
        event.key === AUDIO_VICTORY_PULSE_KEY ||
        event.key === AUDIO_MIX_MODE_KEY ||
        event.key === AUDIO_CUSTOM_TRACK_KEY
      ) {
        syncAudioPreferences();
      }
    };

    window.addEventListener(AUDIO_PREFERENCES_CHANGED_EVENT, syncAudioPreferences);
    window.addEventListener("storage", syncFromStorage);

    return () => {
      window.removeEventListener(AUDIO_PREFERENCES_CHANGED_EVENT, syncAudioPreferences);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchAudioPlaylist()
      .then((tracks) => {
        if (cancelled) return;
        setPlaylist(tracks);
        setTrackIndex((index) => Math.min(index, tracks.length - 1));
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (playlist.length === 0) return;

    if (mixMode === "custom" && customTrackId) {
      const customIndex = playlist.findIndex((track) => track.trackId === customTrackId);
      if (customIndex >= 0) {
        currentMixCategoryRef.current = null;
        if (appliedCustomTrackIdRef.current !== customTrackId) {
          appliedCustomTrackIdRef.current = customTrackId;
          setTrackIndex((currentIndex) => playlist[currentIndex]?.trackId === customTrackId ? currentIndex : customIndex);
        }
        return;
      }
    }

    appliedCustomTrackIdRef.current = "";
    const nextCategory = resolveMixCategory(mixMode, pathname ?? "/");
    setTrackIndex((currentIndex) => {
      const boundedIndex = Math.min(currentIndex, playlist.length - 1);
      const currentTrack = playlist[boundedIndex];

      if (currentMixCategoryRef.current === nextCategory && currentTrack) {
        return boundedIndex;
      }

      currentMixCategoryRef.current = nextCategory;
      return currentTrack?.category === nextCategory ? boundedIndex : pickRandomTrackIndex(playlist, nextCategory);
    });
  }, [customTrackId, mixMode, pathname, playlist]);

  useEffect(() => {
    const music = musicRef.current;
    if (!music) return;

    const syncTime = () => setCurrentTime(music.currentTime || 0);
    const syncDuration = () => {
      const fallbackDuration = playlist[trackIndex]?.durationSeconds ?? 0;
      setDurationSeconds(Number.isFinite(music.duration) && music.duration > 0 ? music.duration : fallbackDuration);
    };

    music.addEventListener("timeupdate", syncTime);
    music.addEventListener("loadedmetadata", syncDuration);
    music.addEventListener("durationchange", syncDuration);

    syncTime();
    syncDuration();

    return () => {
      music.removeEventListener("timeupdate", syncTime);
      music.removeEventListener("loadedmetadata", syncDuration);
      music.removeEventListener("durationchange", syncDuration);
    };
  }, [playlist, trackIndex]);

  useEffect(() => {
    if (!audioEnabled || !musicRef.current || !activeTrack?.sources.length) {
      if (waveformRafRef.current !== null) cancelAnimationFrame(waveformRafRef.current);
      waveformRafRef.current = null;
      setWaveformLevels([]);
      return;
    }

    const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;

    const context = audioContextRef.current ?? new AudioContextConstructor();
    audioContextRef.current = context;

    if (!mediaSourceRef.current) {
      mediaSourceRef.current = context.createMediaElementSource(musicRef.current);
      analyserRef.current = context.createAnalyser();
      analyserRef.current.fftSize = 128;
      mediaSourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(context.destination);
    }

    void context.resume().catch(() => undefined);

    const analyser = analyserRef.current;
    if (!analyser) return;

    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    const renderWaveform = () => {
      analyser.getByteFrequencyData(frequencyData);
      const bars = 48;
      const binCount = frequencyData.length;
      setWaveformLevels(Array.from({ length: bars }, (_, index) => {
        const start = Math.floor((index / bars) * binCount);
        const end = Math.max(start + 1, Math.floor(((index + 1) / bars) * binCount));
        const slice = frequencyData.slice(start, end);
        const average = slice.reduce((total, value) => total + value, 0) / Math.max(1, slice.length);
        const previous = frequencyData[Math.max(0, start - 1)] ?? average;
        const next = frequencyData[Math.min(binCount - 1, end)] ?? average;
        const normalized = (average * 0.62 + previous * 0.19 + next * 0.19) / 255;
        const highFrequencyLift = 0.58 + (index / Math.max(1, bars - 1)) * 2.45;
        return Math.min(1, Math.pow(normalized * highFrequencyLift, 0.78));
      }));
      waveformRafRef.current = requestAnimationFrame(renderWaveform);
    };

    renderWaveform();

    return () => {
      if (waveformRafRef.current !== null) cancelAnimationFrame(waveformRafRef.current);
      waveformRafRef.current = null;
    };
  }, [audioEnabled, activeTrack?.sources.length]);

  useEffect(() => {
    const music = musicRef.current;
    if (!music) return;

    const source = getPlayableSource(playlist[trackIndex], music);
    const track = source?.src ?? null;
    pendingTrackRef.current = track;
    setDurationSeconds(playlist[trackIndex]?.durationSeconds ?? 0);

    if (!audioEnabled || !track) {
      music.pause();
      music.removeAttribute("src");
      music.load();
      return;
    }

    if (music.src !== new URL(track, window.location.origin).href) {
      music.src = track;
      music.currentTime = 0;
    }

    attemptMusicPlayback(music);
  }, [audioEnabled, playlist, trackIndex]);

  useEffect(() => {
    writeAudioEnabled(audioEnabled);
    const music = musicRef.current;
    if (!music) return;
    if (!audioEnabled) {
      music.pause();
      return;
    }
    if (pendingTrackRef.current && unlockedRef.current) {
      ensureMusicSource(music, pendingTrackRef.current);
      attemptMusicPlayback(music);
    }
  }, [audioEnabled]);

  useEffect(() => {
    writeAudioVolumePreference(AUDIO_MASTER_VOLUME_KEY, masterVolume);
    writeAudioVolumePreference(AUDIO_MUSIC_VOLUME_KEY, musicVolume);
    writeAudioVolumePreference(AUDIO_SFX_VOLUME_KEY, sfxVolume);
    if (musicRef.current) musicRef.current.volume = masterVolume * musicVolume;
    if (clickRef.current) clickRef.current.volume = masterVolume * sfxVolume;
    if (hoverRef.current) hoverRef.current.volume = masterVolume * sfxVolume;
  }, [masterVolume, musicVolume, sfxVolume]);

  useEffect(() => {
    writeAudioTogglePreference(AUDIO_ROUND_ALERTS_KEY, roundAlertsEnabled);
    writeAudioTogglePreference(AUDIO_VICTORY_PULSE_KEY, victoryPulseEnabled);
  }, [roundAlertsEnabled, victoryPulseEnabled]);

  useEffect(() => {
    if (pathname?.startsWith("/dashboard")) {
      setDashboardAudioSlot(document.querySelector<HTMLElement>(".dashboard-sound-player-slot"));
      return;
    }

    setDashboardAudioSlot(null);
  }, [pathname]);

  useEffect(() => {
    if (!pathname?.startsWith("/local") && !pathname?.startsWith("/online") && !pathname?.startsWith("/play")) {
      setGameHeaderSlot(null);
      return;
    }

    setGameHeaderSlot(document.querySelector<HTMLElement>(".play-command-banner__audio-slot"));
  }, [pathname]);

  const safeDuration = durationSeconds || activeTrack?.durationSeconds || 0;
  const playerStatus = audioEnabled ? "playing" : "paused";

  const openAudioPanel = () => setAudioPanelOpen(true);
  const play = () => {
    unlockedRef.current = true;
    setAudioEnabled(true);
    if (musicRef.current && pendingTrackRef.current) attemptMusicPlayback(musicRef.current);
  };
  const pause = () => setAudioEnabled(false);
  const seekTo = (seconds: number) => {
    const music = musicRef.current;
    const nextTime = Math.min(Math.max(seconds, 0), safeDuration || seconds);
    if (music && Number.isFinite(music.duration)) music.currentTime = nextTime;
    setCurrentTime(nextTime);
  };
  const shiftTrack = (offset: number) => {
    if (playlist.length === 0) return;
    setTrackIndex((value) => (value + offset + playlist.length) % playlist.length);
    setCurrentTime(0);
  };
  const selectTrackById = (trackId: string) => {
    const index = playlist.findIndex((track) => track.trackId === trackId);
    if (index < 0) return;
    setTrackIndex(index);
    setCustomTrackId(trackId);
    setMixMode("custom");
    window.localStorage.setItem(AUDIO_CUSTOM_TRACK_KEY, trackId);
    window.localStorage.setItem(AUDIO_MIX_MODE_KEY, "custom");
    window.dispatchEvent(new CustomEvent(AUDIO_PREFERENCES_CHANGED_EVENT));
    setCurrentTime(0);
  };

  const audioConsoleBody = (
    <>
      <div className="audio-dialog__track-meta">
        <span>{activeTrack.title}</span>
        <span>{activeTrack.artist}</span>
      </div>

      <VideoPlayer
        status={playerStatus}
        currentTime={formatTime(currentTime)}
        onPlay={play}
        onPause={pause}
        onRewind={() => seekTo(currentTime - 10)}
        onFastForward={() => seekTo(currentTime + 10)}
        onPrevious={() => shiftTrack(-1)}
        onNext={() => shiftTrack(1)}
        progressSlot={(
          <div className="audio-dialog__inline-progress">
            <Slider className="audio-dialog__hud-slider" value={[Math.min(currentTime, safeDuration)]} min={0} max={Math.max(1, safeDuration)} step={1} onValueChange={([value]) => seekTo(value ?? 0)} aria-label="Track progress" />
            <div className="audio-dialog__time-row">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(safeDuration)}</span>
            </div>
          </div>
        )}
      >
        <div className="audio-dialog__album-art" aria-label={`${activeTrack.title} album art`}>
          {activeTrack.coverImage ? (
            <CRTEffect intensity="light" spacing={4} colored={false} animated={false} className="audio-dialog__cover-crt">
              <img src={activeTrack.coverImage} alt={`${activeTrack.title} cover frame`} className="audio-dialog__cover-image" />
            </CRTEffect>
          ) : null}
          {audioEnabled && activeTrack.sources.length > 0 ? <Waveform bars={48} playing={audioEnabled} levels={waveformLevels} intensity="high" fill className="audio-dialog__waveform" aria-hidden="true" /> : null}
        </div>
      </VideoPlayer>

      <div className="audio-dialog__controls">
        <div className="audio-dialog__control-group">
          <VolumeSlider label="Master Volume" value={masterVolume} onChange={setMasterVolume} />
          <VolumeSlider label="SFX Volume" value={sfxVolume} onChange={setSfxVolume} />
          <VolumeSlider label="Music Volume" value={musicVolume} onChange={setMusicVolume} />
          <div className="audio-dialog__toggle-list">
            <button type="button" className={roundAlertsEnabled ? "is-active" : undefined} aria-pressed={roundAlertsEnabled} onClick={() => setRoundAlertsEnabled((enabled) => !enabled)}>
              <span>Round Alerts</span>
              <strong>{roundAlertsEnabled ? "Enabled" : "Muted"}</strong>
            </button>
            <button type="button" className={victoryPulseEnabled ? "is-active" : undefined} aria-pressed={victoryPulseEnabled} onClick={() => setVictoryPulseEnabled((enabled) => !enabled)}>
              <span>Victory Pulse</span>
              <strong>{victoryPulseEnabled ? "Enabled" : "Muted"}</strong>
            </button>
          </div>
          <div className="audio-dialog__mix-field" aria-label="Music mix mode">
            <span>Mix</span>
            <div className="audio-dialog__mix-options">
              {(["default", "custom", "lobby", "battle"] as AudioMixMode[]).map((mode) => (
                <button key={mode} type="button" className={mixMode === mode ? "is-active" : undefined} onClick={() => {
                  setMixMode(mode);
                  window.localStorage.setItem(AUDIO_MIX_MODE_KEY, mode);
                  window.dispatchEvent(new CustomEvent(AUDIO_PREFERENCES_CHANGED_EVENT));
                }}>
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="audio-dialog__track-list">
          <div className="audio-dialog__track-list-header">
            <span>Library</span>
            <strong>{filteredPlaylist.length} tracks</strong>
          </div>
          <label className="audio-dialog__track-search">
            <Search className="h-4 w-4" aria-hidden="true" />
            <input value={audioSearch} onChange={(event) => setAudioSearch(event.currentTarget.value)} placeholder="Search songs or artists" aria-label="Search audio library" />
          </label>
          <div className="audio-dialog__track-filters" role="group" aria-label="Filter music category">
            {(["all", "lobby", "battle"] as AudioCategoryFilter[]).map((category) => (
              <button key={category} type="button" className={audioCategoryFilter === category ? "is-active" : undefined} onClick={() => setAudioCategoryFilter(category)}>
                {category === "all" ? "All" : category}
              </button>
            ))}
          </div>
          <div className="audio-dialog__track-scroller" role="list">
            {filteredPlaylist.map((track) => {
              const selected = track.trackId === activeTrack.trackId;
              return (
                <button key={track.trackId} type="button" className={selected ? "is-active" : undefined} onClick={() => selectTrackById(track.trackId)} role="listitem">
                  <span className="audio-dialog__track-thumb">{track.thumbnailImage || track.coverImage ? <img src={track.thumbnailImage || track.coverImage} alt="" /> : <Music2 className="h-4 w-4" />}</span>
                  <span className="audio-dialog__track-row-meta">
                    <strong>{track.title}</strong>
                    <small>{track.artist}</small>
                  </span>
                  <em>{track.category}</em>
                </button>
              );
            })}
          </div>
        </div>
      </div>

    </>
  );

  const audioConsoleShell = (
      <div className="audio-dialog__shell">
        <DialogHeader className="audio-dialog__header">
          <DialogTitle className="audio-dialog__title"><Music2 className="h-5 w-5" /> Audio Console</DialogTitle>
          <DialogDescription className="audio-dialog__subtitle">Music From the Grid</DialogDescription>
        </DialogHeader>
        {audioConsoleBody}
      </div>
  );

  const dashboardAudioConsoleShell = <div className="audio-dialog__shell">{audioConsoleBody}</div>;

  const audioPanelContent = (
    <DialogContent className="audio-dialog border-primary/35 bg-background/95 p-0 shadow-[0_0_48px_color-mix(in_oklch,var(--primary)_18%,transparent)] sm:max-w-3xl" showCloseButton>
      {audioConsoleShell}
    </DialogContent>
  );

  if (pathname?.startsWith("/dashboard")) return dashboardAudioSlot ? createPortal(<div className="dashboard-audio-player audio-dialog">{dashboardAudioConsoleShell}</div>, dashboardAudioSlot) : null;

  const isGameRoute = pathname?.startsWith("/local") || pathname?.startsWith("/online") || pathname?.startsWith("/play");
  const gameHeaderControl = (
    <Dialog open={audioPanelOpen} onOpenChange={setAudioPanelOpen}>
      <Button type="button" variant="outline" className="play-command-button play-command-button--audio" onClick={openAudioPanel} aria-label="Open audio console">
        {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        <span>Audio</span>
      </Button>
      {audioPanelContent}
    </Dialog>
  );

  if (isGameRoute) return gameHeaderSlot ? createPortal(gameHeaderControl, gameHeaderSlot) : null;

  return (
    <div className="audio-controller audio-controller--framed pointer-events-none fixed z-[70]">
      <div className="audio-controller__slot pointer-events-auto">
        <Dialog open={audioPanelOpen} onOpenChange={setAudioPanelOpen}>
          <Button type="button" variant="outline" size="icon" className="audio-controller__button" onClick={openAudioPanel} aria-label="Open audio console">
            {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          {audioPanelContent}
        </Dialog>
      </div>
    </div>
  );
}
