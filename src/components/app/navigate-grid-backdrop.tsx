"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ThemeProvider, type Theme } from "@/components/theme";

const Grid3D = dynamic(() => import("@/components/grid").then((mod) => mod.Grid3D), { ssr: false });
const THEME_KEY = "ui-lab-theme";
const VISUAL_PREFERENCES_CHANGED_EVENT = "reflexRoyaleVisualPreferencesChanged";

function isTheme(value: string | null): value is Theme {
  return value === "tron" || value === "ares" || value === "clu" || value === "athena" || value === "aphrodite" || value === "poseidon" || value === "custom";
}

function getCookie(name: string) {
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1) ?? null;
}

function readActiveTheme(): Theme {
  const storedTheme = window.localStorage.getItem(THEME_KEY) ?? getCookie(THEME_KEY);
  return isTheme(storedTheme) ? storedTheme : "tron";
}

export function NavigateGridBackdrop() {
  const [theme, setTheme] = useState<Theme>("tron");

  useEffect(() => {
    const syncTheme = () => setTheme(readActiveTheme());
    const syncFromStorage = (event: StorageEvent) => {
      if (event.key === THEME_KEY || event.key === null) syncTheme();
    };

    syncTheme();
    window.addEventListener(VISUAL_PREFERENCES_CHANGED_EVENT, syncTheme);
    window.addEventListener("focus", syncTheme);
    window.addEventListener("storage", syncFromStorage);

    return () => {
      window.removeEventListener(VISUAL_PREFERENCES_CHANGED_EVENT, syncTheme);
      window.removeEventListener("focus", syncTheme);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <div className="navigate-grid-backdrop" data-grid-theme={theme} aria-hidden="true">
        <Grid3D
          animated
          backgroundMoons
          cameraAnimation={false}
          cameraFov={44}
          cameraPosition={[0, 12.5, 30]}
          cameraTarget={[0, 17, -120]}
          className="navigate-grid-backdrop__canvas"
          enableBeams={false}
          enableParticles={false}
          fogFar={170}
          fogNear={34}
          moonSpin
          sway={0.14}
          swaySpeed={0.16}
        />
      </div>
    </ThemeProvider>
  );
}
