"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/thegridcn/button";
import { getTrackForPath } from "@/lib/audio";

const AUDIO_ENABLED_KEY = "reflexRoyaleAudioEnabled";

function readAudioEnabled() {
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(AUDIO_ENABLED_KEY);
  return stored === null ? true : stored === "true";
}

function writeAudioEnabled(enabled: boolean) {
  window.localStorage.setItem(AUDIO_ENABLED_KEY, String(enabled));
  document.cookie = `${AUDIO_ENABLED_KEY}=${enabled}; path=/; max-age=31536000; samesite=lax`;
}

export function AudioController() {
  const pathname = usePathname();
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const clickRef = useRef<HTMLAudioElement | null>(null);
  const pendingTrackRef = useRef<string | null>(null);
  const unlockedRef = useRef(false);
  const [audioEnabled, setAudioEnabled] = useState(true);

  useLayoutEffect(() => {
    setAudioEnabled(readAudioEnabled());
  }, []);

  useEffect(() => {
    const music = new Audio();
    music.loop = true;
    music.preload = "auto";
    music.volume = 0.28;
    musicRef.current = music;

    const click = new Audio("/audio/ui-click.mp3");
    click.preload = "auto";
    click.volume = 0.18;
    clickRef.current = click;

    const unlock = () => {
      unlockedRef.current = true;
      const track = pendingTrackRef.current;
      if (track && audioEnabled) {
        music.src = track;
        void music.play().catch(() => undefined);
      }
    };

    const playUiClick = () => {
      if (!audioEnabled || !clickRef.current) return;
      const sound = clickRef.current;
      sound.currentTime = 0;
      void sound.play().catch(() => undefined);
    };

    window.__reflexRoyalePlayUiClick = playUiClick;

    const onPointerDown = () => unlock();
    const onKeyDown = () => unlock();

    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.__reflexRoyalePlayUiClick = undefined;
      music.pause();
      musicRef.current = null;
      clickRef.current = null;
    };
  }, [audioEnabled]);

  useEffect(() => {
    const music = musicRef.current;
    if (!music) return;

    const track = getTrackForPath(pathname ?? "/");
    pendingTrackRef.current = track;

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

    if (unlockedRef.current) {
      void music.play().catch(() => undefined);
    }
  }, [audioEnabled, pathname]);

  useEffect(() => {
    writeAudioEnabled(audioEnabled);
    const music = musicRef.current;
    if (!music) return;
    if (!audioEnabled) {
      music.pause();
      return;
    }
    if (pendingTrackRef.current && unlockedRef.current) {
      music.src = pendingTrackRef.current;
      void music.play().catch(() => undefined);
    }
  }, [audioEnabled]);

  const toggle = () => setAudioEnabled((value) => !value);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[70]">
      <div className="pointer-events-auto">
        <Button type="button" variant="outline" size="icon" className="border-primary/35 bg-card/80 text-primary hover:bg-primary/10" onClick={toggle} aria-label={audioEnabled ? "Mute audio" : "Enable audio"}>
          {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
