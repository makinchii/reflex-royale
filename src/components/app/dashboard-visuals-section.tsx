import { Gauge, SlidersHorizontal } from "lucide-react";
import { SettingsRoundSlider } from "@/components/app/dashboard-controls";
import {
  INTENSITY_OPTIONS,
  percentToValue,
  valueToPercent,
  VISUAL_PRESETS,
  type VisualPresetId,
} from "@/components/app/dashboard-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/thegridcn/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/thegridcn/select";
import { applyAtmospherePreset, type AtmosphereState } from "@/lib/visual-atmosphere";
import type { Intensity } from "@/lib/ui-preferences";

export function DashboardVisualsSection({
  activeVisualPreset,
  changeVisualIntensity,
  chooseVisualPreset,
  setSectionRef,
  toggleVisualAnimations,
  updateVisualAtmosphere,
  visualAnimationsEnabled,
  visualAtmosphere,
  visualIntensity,
  visualIntensityLabel,
}: {
  activeVisualPreset: VisualPresetId | "custom";
  changeVisualIntensity: (intensity: Intensity) => void;
  chooseVisualPreset: (preset: VisualPresetId) => void;
  setSectionRef: (element: HTMLElement | null) => void;
  toggleVisualAnimations: () => void;
  updateVisualAtmosphere: (nextAtmosphere: Partial<AtmosphereState>) => void;
  visualAnimationsEnabled: boolean;
  visualAtmosphere: AtmosphereState;
  visualIntensity: Intensity;
  visualIntensityLabel: string;
}) {
  return (
    <section
      ref={setSectionRef}
      data-section-id="visuals"
      className="dashboard-settings-section scroll-mt-12 rounded border border-primary/20 bg-card/10 p-4"
    >
      <div className="mb-4 border-b border-primary/20 pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Visuals</div>
      <div className="dashboard-settings-grid grid gap-5">
        <div className="dashboard-visuals-grid">
          <Card className="dashboard-panel-card dashboard-visual-general-card border-primary/25 bg-card/15 backdrop-blur-xl">
            <CardHeader className="dashboard-panel-card-header">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="dashboard-card-glow-title uppercase tracking-[0.08em]">General Settings</CardTitle>
                  <CardDescription>Choose a fast visual profile for the whole command shell.</CardDescription>
                </div>
                <Gauge className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="dashboard-panel-card-content dashboard-visual-general-content">
              <div className="dashboard-visual-preset-card">
                <div className="dashboard-visual-card-heading">
                  <span>Visual Presets</span>
                  <strong>{activeVisualPreset === "custom" ? "Custom" : activeVisualPreset}</strong>
                </div>
                <div className="dashboard-visual-preset-grid" role="group" aria-label="Visual Presets">
                  {VISUAL_PRESETS.map((preset) => {
                    const presetAtmosphere = applyAtmospherePreset(preset.id);
                    return (
                      <button key={preset.id} type="button" className={visualAtmosphere.preset === preset.id ? "is-active" : undefined} onClick={() => chooseVisualPreset(preset.id)}>
                        <span>{preset.label}</span>
                        <small>{preset.description}</small>
                        <div className="dashboard-visual-preset-metrics" aria-hidden="true">
                          <em>{preset.intensity}</em>
                          <em>{presetAtmosphere.particleCount} particles</em>
                          <em>{Math.round(presetAtmosphere.beamOpacity * 100)}% beams</em>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="dashboard-visual-intensity-field">
                  <span className="dashboard-settings-label">Glow Intensity</span>
                  <Select value={visualIntensity} onValueChange={(value) => changeVisualIntensity(value as Intensity)}>
                    <SelectTrigger className="dashboard-settings-select" aria-label="Glow intensity">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INTENSITY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="dashboard-visual-summary-grid">
                  <div>
                    <span>Intensity</span>
                    <strong>{visualIntensityLabel}</strong>
                  </div>
                  <div>
                    <span>Particles</span>
                    <strong>{visualIntensity === "none" ? "Off" : visualAtmosphere.particleCount}</strong>
                  </div>
                </div>
                <button type="button" className={`dashboard-visual-animation-toggle ${!visualAnimationsEnabled ? "is-active" : ""}`} aria-pressed={!visualAnimationsEnabled} onClick={toggleVisualAnimations}>
                  <span>Disable Animations</span>
                  <strong>{visualAnimationsEnabled ? "Off" : "On"}</strong>
                </button>
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-panel-card dashboard-visual-advanced-card border-primary/25 bg-card/15 backdrop-blur-xl">
            <CardHeader className="dashboard-panel-card-header">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="dashboard-card-glow-title uppercase tracking-[0.08em]">Advanced Settings</CardTitle>
                  <CardDescription>Tweak the grid, motion, particles, and beam renderer.</CardDescription>
                </div>
                <SlidersHorizontal className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="dashboard-panel-card-content dashboard-settings-controls dashboard-visual-advanced-content">
              <div className="dashboard-settings-control-group dashboard-visual-advanced-group">
                <SettingsRoundSlider label="Grid Visibility" value={valueToPercent(visualAtmosphere.visibility, 0.2, 1.5)} onChange={(value) => updateVisualAtmosphere({ visibility: percentToValue(value, 0.2, 1.5) })} />
                <SettingsRoundSlider label="Scene Sway" value={valueToPercent(visualAtmosphere.sway, 0, 1)} onChange={(value) => updateVisualAtmosphere({ sway: value / 100 })} />
                <SettingsRoundSlider label="Drift Speed" value={valueToPercent(visualAtmosphere.swaySpeed, 0, 1)} onChange={(value) => updateVisualAtmosphere({ swaySpeed: value / 100 })} />
                <SettingsRoundSlider label="Particle Density" value={valueToPercent(visualAtmosphere.particleCount, 0, 500)} onChange={(value) => updateVisualAtmosphere({ particleCount: Math.round((value / 100) * 500) })} />
                <SettingsRoundSlider label="Particle Glow" value={valueToPercent(visualAtmosphere.particleOpacity, 0, 1)} onChange={(value) => updateVisualAtmosphere({ particleOpacity: value / 100 })} />
                <SettingsRoundSlider label="Beam Glow" value={valueToPercent(visualAtmosphere.beamOpacity, 0, 1)} onChange={(value) => updateVisualAtmosphere({ beamOpacity: value / 100 })} />
                <SettingsRoundSlider label="Beam Width" value={valueToPercent(visualAtmosphere.beamThickness, 0.02, 0.08)} onChange={(value) => updateVisualAtmosphere({ beamThickness: percentToValue(value, 0.02, 0.08) })} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
