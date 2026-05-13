export type AtmospherePreset = "calm" | "balanced" | "electric" | "custom";

export type AtmosphereState = {
  preset: AtmospherePreset;
  sway: number;
  swaySpeed: number;
  visibility: number;
  particleCount: number;
  particleOpacity: number;
  beamOpacity: number;
  beamThickness: number;
};

export const DEFAULT_ATMOSPHERE: AtmosphereState = {
  preset: "balanced",
  sway: 0.45,
  swaySpeed: 0.5,
  visibility: 1,
  particleCount: 220,
  particleOpacity: 0.72,
  beamOpacity: 0.42,
  beamThickness: 0.045,
};

export const ATMOSPHERE_PRESETS: Record<AtmospherePreset, AtmosphereState> = {
  calm: {
    preset: "calm",
    sway: 0.2,
    swaySpeed: 0.24,
    visibility: 0.9,
    particleCount: 120,
    particleOpacity: 0.42,
    beamOpacity: 0.24,
    beamThickness: 0.03,
  },
  balanced: DEFAULT_ATMOSPHERE,
  electric: {
    preset: "electric",
    sway: 0.7,
    swaySpeed: 0.72,
    visibility: 1.15,
    particleCount: 360,
    particleOpacity: 0.82,
    beamOpacity: 0.52,
    beamThickness: 0.058,
  },
  custom: {
    ...DEFAULT_ATMOSPHERE,
    preset: "custom",
  },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function applyAtmospherePreset(preset: AtmospherePreset): AtmosphereState {
  return { ...ATMOSPHERE_PRESETS[preset] };
}

export function normalizeAtmosphere(input?: Partial<AtmosphereState> | null): AtmosphereState {
  if (!input) return { ...DEFAULT_ATMOSPHERE };

  return {
    preset: input.preset === "calm" || input.preset === "electric" || input.preset === "custom" ? input.preset : "balanced",
    sway: clamp(Number.isFinite(input.sway) ? Number(input.sway) : DEFAULT_ATMOSPHERE.sway, 0, 1),
    swaySpeed: clamp(Number.isFinite(input.swaySpeed) ? Number(input.swaySpeed) : DEFAULT_ATMOSPHERE.swaySpeed, 0, 1),
    visibility: clamp(Number.isFinite(input.visibility) ? Number(input.visibility) : DEFAULT_ATMOSPHERE.visibility, 0.2, 1.5),
    particleCount: Math.round(clamp(Number.isFinite(input.particleCount) ? Number(input.particleCount) : DEFAULT_ATMOSPHERE.particleCount, 0, 500)),
    particleOpacity: clamp(Number.isFinite(input.particleOpacity) ? Number(input.particleOpacity) : DEFAULT_ATMOSPHERE.particleOpacity, 0, 1),
    beamOpacity: clamp(Number.isFinite(input.beamOpacity) ? Number(input.beamOpacity) : DEFAULT_ATMOSPHERE.beamOpacity, 0, 1),
    beamThickness: clamp(Number.isFinite(input.beamThickness) ? Number(input.beamThickness) : DEFAULT_ATMOSPHERE.beamThickness, 0.02, 0.08),
  };
}

export function serializeAtmosphere(state: AtmosphereState) {
  return JSON.stringify(state);
}

export function parseAtmosphere(raw: string | undefined | null) {
  if (!raw) return { ...DEFAULT_ATMOSPHERE };

  try {
    const parsed = JSON.parse(raw) as Partial<AtmosphereState>;
    return normalizeAtmosphere(parsed);
  } catch {
    return { ...DEFAULT_ATMOSPHERE };
  }
}
