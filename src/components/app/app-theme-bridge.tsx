"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { Theme } from "@/components/theme";

type Intensity = "none" | "light" | "medium" | "heavy";

const THEME_KEY = "ui-lab-theme";
const INTENSITY_KEY = "ui-lab-intensity";

function isTheme(value: string | null): value is Theme {
  return value === "tron" || value === "ares" || value === "clu" || value === "athena" || value === "aphrodite" || value === "poseidon";
}

function isIntensity(value: string | null): value is Intensity {
  return value === "none" || value === "light" || value === "medium" || value === "heavy";
}

function getCookie(name: string) {
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1) ?? null;
}

export function AppThemeBridge({ theme = "tron", intensity = "light" }: { theme?: Theme; intensity?: Intensity }) {
  const pathname = usePathname();

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_KEY) ?? getCookie(THEME_KEY);
    const storedIntensity = window.localStorage.getItem(INTENSITY_KEY) ?? getCookie(INTENSITY_KEY);
    const nextTheme = isTheme(storedTheme) ? storedTheme : theme;
    const nextIntensity = isIntensity(storedIntensity) ? storedIntensity : intensity;

    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.dataset.tronIntensity = nextIntensity;
    document.body.dataset.theme = nextTheme;
    document.body.dataset.tronIntensity = nextIntensity;

    window.__reflexRoyaleSetFavicon?.();
  }, [theme, intensity, pathname]);

  return null;
}
