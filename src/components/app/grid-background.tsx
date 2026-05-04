"use client";

import dynamic from "next/dynamic";
import type React from "react";
import { useEffect, useState } from "react";
import { ThemeProvider, type Theme } from "@/components/theme";
import { normalizeAtmosphere, type AtmosphereState } from "@/app/ui-lab/atmosphere";

const Grid3D = dynamic(() => import("@/components/grid").then((mod) => mod.Grid3D), { ssr: false });
const THEME_KEY = "ui-lab-theme";
const INTENSITY_KEY = "ui-lab-intensity";
const ATMOSPHERE_KEY = "ui-lab-atmosphere";
const VISUAL_PREFERENCES_CHANGED_EVENT = "reflexRoyaleVisualPreferencesChanged";

function isTheme(value: string | null): value is Theme {
  return value === "tron" || value === "ares" || value === "clu" || value === "athena" || value === "aphrodite" || value === "poseidon" || value === "custom";
}

function isIntensity(value: string | null): value is "none" | "light" | "medium" | "heavy" {
  return value === "none" || value === "light" || value === "medium" || value === "heavy";
}

function getCookie(name: string) {
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1) ?? null;
}

export function GridBackground({
  theme,
  intensity,
  atmosphere,
  className,
  useStoredTheme = true,
}: {
  theme: Theme;
  intensity: "none" | "light" | "medium" | "heavy";
  atmosphere: AtmosphereState;
  className?: string;
  useStoredTheme?: boolean;
}) {
  const [currentTheme, setCurrentTheme] = useState(theme);
  const [currentIntensity, setCurrentIntensity] = useState(intensity);
  const [currentAtmosphere, setCurrentAtmosphere] = useState(atmosphere);
  const normalized = normalizeAtmosphere(currentAtmosphere);
  const effectsEnabled = currentIntensity !== "none";

  useEffect(() => {
    const syncStoredPreferences = () => {
      const storedTheme = window.localStorage.getItem(THEME_KEY) ?? getCookie(THEME_KEY);
      const storedIntensity = window.localStorage.getItem(INTENSITY_KEY) ?? getCookie(INTENSITY_KEY);
      const storedAtmosphere = window.localStorage.getItem(ATMOSPHERE_KEY) ?? getCookie(ATMOSPHERE_KEY);

      if (useStoredTheme && isTheme(storedTheme)) setCurrentTheme(storedTheme);
      if (isIntensity(storedIntensity)) setCurrentIntensity(storedIntensity);
      if (storedAtmosphere) {
        try {
          setCurrentAtmosphere(normalizeAtmosphere(JSON.parse(decodeURIComponent(storedAtmosphere))));
        } catch {
          setCurrentAtmosphere(atmosphere);
        }
      }
    };

    const syncFromStorage = (event: StorageEvent) => {
      if (event.key === INTENSITY_KEY || event.key === ATMOSPHERE_KEY || event.key === THEME_KEY) syncStoredPreferences();
    };

    syncStoredPreferences();
    window.addEventListener(VISUAL_PREFERENCES_CHANGED_EVENT, syncStoredPreferences);
    window.addEventListener("storage", syncFromStorage);

    return () => {
      window.removeEventListener(VISUAL_PREFERENCES_CHANGED_EVENT, syncStoredPreferences);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, [atmosphere, useStoredTheme]);
  const stageStyle = {
    ["--ui-lab-grid-opacity-multiplier" as const]: String(normalized.visibility),
    ["--ui-lab-grid-sway-x" as const]: `${0.6 + normalized.sway * 3.4}px`,
    ["--ui-lab-grid-sway-y" as const]: `${0.3 + normalized.sway * 2.1}px`,
    ["--ui-lab-grid-sway-rotate" as const]: `${0.12 + normalized.sway * 0.22}deg`,
    ["--ui-lab-grid-sway-duration" as const]: `${26 - normalized.swaySpeed * 14}s`,
  } as React.CSSProperties;

  return (
    <ThemeProvider theme={currentTheme}>
      <div className={className ?? "app-grid-background"} aria-hidden="true">
        <div className="ui-lab-grid-stage" style={stageStyle}>
          <Grid3D
            className="app-grid-3d"
            enableParticles={effectsEnabled}
            enableBeams={effectsEnabled}
            cameraAnimation={effectsEnabled}
            sway={normalized.sway}
            swaySpeed={normalized.swaySpeed}
            particleCount={normalized.particleCount}
            particleOpacity={normalized.particleOpacity}
            beamOpacity={normalized.beamOpacity}
            beamThickness={normalized.beamThickness}
          />
        </div>
        <div className="ui-lab-grid-fade" />
      </div>
    </ThemeProvider>
  );
}
