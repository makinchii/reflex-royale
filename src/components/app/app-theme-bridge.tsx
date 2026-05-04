"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { Theme } from "@/components/theme";

type Intensity = "none" | "light" | "medium" | "heavy";

const THEME_KEY = "ui-lab-theme";
const CUSTOM_THEME_COLOR_KEY = "reflexRoyaleCustomThemeColor";
const THEME_COMMAND_KEY = "reflexRoyaleThemeCommand";
const INTENSITY_KEY = "ui-lab-intensity";

function isTheme(value: string | null): value is Theme {
  return value === "tron" || value === "ares" || value === "clu" || value === "athena" || value === "aphrodite" || value === "poseidon" || value === "custom";
}

function isHexColor(value: string | null) {
  return Boolean(value && /^#[0-9a-fA-F]{6}$/.test(value));
}

function applyCustomThemeColor(color: string | null) {
  const roots = [document.documentElement, document.body];
  const validColor = isHexColor(color) ? color : "#00d4ff";

  roots.forEach((node) => {
    node.style.setProperty("--primary", validColor);
    node.style.setProperty("--accent", validColor);
    node.style.setProperty("--ring", validColor);
    node.style.setProperty("--border", `color-mix(in oklch, ${validColor} 42%, black)`);
    node.style.setProperty("--input", `color-mix(in oklch, ${validColor} 26%, black)`);
    node.style.setProperty("--glow", validColor);
    node.style.setProperty("--glow-muted", `color-mix(in oklch, ${validColor} 56%, black)`);
    node.style.setProperty("--sidebar-primary", validColor);
    node.style.setProperty("--sidebar-border", `color-mix(in oklch, ${validColor} 42%, black)`);
    node.style.setProperty("--sidebar-ring", validColor);
  });
}

function clearCustomThemeColor() {
  [document.documentElement, document.body].forEach((node) => {
    ["--primary", "--accent", "--ring", "--border", "--input", "--glow", "--glow-muted", "--sidebar-primary", "--sidebar-border", "--sidebar-ring"].forEach((property) => {
      node.style.removeProperty(property);
    });
  });
}

function forceTronTheme() {
  window.localStorage.setItem(THEME_KEY, "tron");
  window.localStorage.setItem(THEME_COMMAND_KEY, "tron");
  window.localStorage.removeItem(CUSTOM_THEME_COLOR_KEY);
  document.cookie = `${THEME_KEY}=tron; path=/; max-age=31536000; samesite=lax`;
  document.cookie = `${THEME_COMMAND_KEY}=tron; path=/; max-age=31536000; samesite=lax`;
  document.cookie = `${CUSTOM_THEME_COLOR_KEY}=; path=/; max-age=0; samesite=lax`;
  document.documentElement.dataset.theme = "tron";
  document.body.dataset.theme = "tron";
  clearCustomThemeColor();
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
    const storedCustomColor = window.localStorage.getItem(CUSTOM_THEME_COLOR_KEY) ?? getCookie(CUSTOM_THEME_COLOR_KEY);
    const storedIntensity = window.localStorage.getItem(INTENSITY_KEY) ?? getCookie(INTENSITY_KEY);
    const nextTheme = isTheme(storedTheme) ? storedTheme : theme;
    const nextIntensity = isIntensity(storedIntensity) ? storedIntensity : intensity;

    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.dataset.tronIntensity = nextIntensity;
    document.body.dataset.theme = nextTheme;
    document.body.dataset.tronIntensity = nextIntensity;

    if (nextTheme === "custom") applyCustomThemeColor(storedCustomColor);
    else clearCustomThemeColor();

    window.__reflexRoyaleSetFavicon?.();
  }, [theme, intensity, pathname]);

  useEffect(() => {
    let cancelled = false;

    async function syncGuestTheme() {
      try {
        const response = await fetch("/api/auth/session", { credentials: "same-origin" });
        const result = await response.json();
        if (!cancelled && result?.authenticated === false) {
          forceTronTheme();
          window.__reflexRoyaleSetFavicon?.();
        }
      } catch {
        // Keep the currently applied theme if session state cannot be checked.
      }
    }

    void syncGuestTheme();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
