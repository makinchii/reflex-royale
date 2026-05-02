import type { Theme } from "@/components/theme";

export type Intensity = "none" | "light" | "medium" | "heavy";

export function parseTheme(value: string | undefined): Theme {
  return value === "ares" || value === "clu" || value === "athena" || value === "aphrodite" || value === "poseidon" ? value : "tron";
}

export function parseIntensity(value: string | undefined): Intensity {
  return value === "none" || value === "medium" || value === "heavy" ? value : "light";
}

export function safeDecode(value: string | undefined) {
  if (!value) return value;

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
