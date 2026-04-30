"use client";

import dynamic from "next/dynamic";
import * as React from "react";
import {
  Bell,
  CheckCircle2,
  Code2,
  Database,
  Layers3,
  MonitorSmartphone,
  Palette,
  Settings2,
  Sparkles,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/thegridcn/badge";
import { Button } from "@/components/thegridcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/thegridcn/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/thegridcn/dialog";
import { Dropdown } from "@/components/thegridcn/dropdown";
import { Input } from "@/components/thegridcn/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/thegridcn/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/thegridcn/table";
import { ToastProvider, useToast } from "@/components/thegridcn/toast";
import { ThemeProvider, type Theme } from "@/components/theme";
import {
  applyAtmospherePreset,
  normalizeAtmosphere,
  serializeAtmosphere,
  type AtmospherePreset,
  type AtmosphereState,
} from "./atmosphere";

const Grid3D = dynamic(() => import("@/components/grid").then((mod) => mod.Grid3D), { ssr: false });

type Intensity = "none" | "light" | "medium" | "heavy";

const THEME_COOKIE = "ui-lab-theme";
const INTENSITY_COOKIE = "ui-lab-intensity";
const ATMOSPHERE_COOKIE = "ui-lab-atmosphere";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const SOURCE_COMMAND = "npx shadcn@latest add @thegridcn/<component> -y";

const SECTION_LINKS = [
  { label: "Controls", href: "#controls" },
  { label: "Components", href: "#components" },
  { label: "Validation", href: "#validation" },
  { label: "Atmosphere", href: "#atmosphere" },
  { label: "Source", href: "#source" },
];

const INTENSITY_OPTIONS: Array<{ value: Intensity; label: string; description: string }> = [
  { value: "none", label: "None", description: "Minimal glow, quiet background" },
  { value: "light", label: "Light", description: "Default dashboard glow" },
  { value: "medium", label: "Medium", description: "Balanced HUD emphasis" },
  { value: "heavy", label: "Heavy", description: "Full neon inspection mode" },
];

const ATMOSPHERE_PRESET_OPTIONS: Array<{ value: AtmospherePreset; label: string; description: string }> = [
  { value: "calm", label: "Calm", description: "Soft sway and sparse effects" },
  { value: "balanced", label: "Balanced", description: "Default tuned view" },
  { value: "electric", label: "Electric", description: "Denser particles and brighter beams" },
  { value: "custom", label: "Custom", description: "Manual tuning mode" },
];

const SAMPLE_ROWS = [
  { node: "GRID-01", status: "Online", latency: "8ms" },
  { node: "GRID-02", status: "Online", latency: "11ms" },
  { node: "GRID-03", status: "Warning", latency: "43ms" },
];

function ComponentSpecimen({
  label,
  description,
  children,
  className,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`ui-lab-surface ui-lab-specimen ${className ?? ""}`.trim()}>
      <CardHeader className="ui-lab-specimen-header">
        <div>
          <p className="ui-lab-component-label">{label}</p>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="ui-lab-specimen-body">{children}</CardContent>
    </Card>
  );
}

function StatusTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="ui-lab-status-tile">
      <span className="ui-lab-status-icon">{icon}</span>
      <span className="ui-lab-status-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RangeField({
  label,
  description,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (next: number) => void;
}) {
  return (
    <label className="ui-lab-range-field">
      <div className="ui-lab-range-meta">
        <div>
          <p className="ui-lab-control-label">{label}</p>
          <p className="ui-lab-note">{description}</p>
        </div>
        <strong className="ui-lab-range-value">{Math.round(value)}{suffix}</strong>
      </div>
      <input
        className="ui-lab-range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
      />
    </label>
  );
}

function UiLabContent({
  initialTheme,
  initialIntensity,
  initialAtmosphere,
}: {
  initialTheme: Theme;
  initialIntensity: Intensity;
  initialAtmosphere: AtmosphereState;
}) {
  const { addToast } = useToast();
  const [roomName, setRoomName] = React.useState("Grid Room Alpha");
  const [theme, setTheme] = React.useState<Theme>(initialTheme);
  const [intensity, setIntensity] = React.useState<Intensity>(initialIntensity);
  const [atmosphere, setAtmosphere] = React.useState<AtmosphereState>(normalizeAtmosphere(initialAtmosphere));
  const isAres = theme === "ares";
  const isIntensityNone = intensity === "none";
  const intensityLabel = INTENSITY_OPTIONS.find((option) => option.value === intensity)?.label ?? "Light";

  React.useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.tronIntensity = intensity;
    document.body.dataset.theme = theme;
    document.body.dataset.tronIntensity = intensity;

    window.localStorage.setItem("ui-lab-theme", theme);
    window.localStorage.setItem("ui-lab-intensity", intensity);
    window.localStorage.setItem(ATMOSPHERE_COOKIE, serializeAtmosphere(atmosphere));
    document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
    document.cookie = `${INTENSITY_COOKIE}=${intensity}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
    document.cookie = `${ATMOSPHERE_COOKIE}=${encodeURIComponent(serializeAtmosphere(atmosphere))}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
  }, [theme, intensity, atmosphere]);

  const stageStyle = React.useMemo(
    () =>
      ({
        ["--ui-lab-grid-opacity-multiplier" as const]: String(atmosphere.visibility),
        ["--ui-lab-grid-sway-x" as const]: `${0.6 + atmosphere.sway * 3.4}px`,
        ["--ui-lab-grid-sway-y" as const]: `${0.3 + atmosphere.sway * 2.1}px`,
        ["--ui-lab-grid-sway-rotate" as const]: `${0.12 + atmosphere.sway * 0.22}deg`,
        ["--ui-lab-grid-sway-duration" as const]: `${26 - atmosphere.swaySpeed * 14}s`,
      }) as React.CSSProperties,
    [atmosphere]
  );

  const updateAtmosphere = (patch: Partial<AtmosphereState>) => {
    setAtmosphere((current) => ({ ...current, ...patch, preset: "custom" }));
  };

  return (
    <ThemeProvider theme={theme}>
      <main className="ui-lab ui-lab-dashboard" data-theme={theme} data-tron-intensity={intensity}>
        <div className="ui-lab-background" aria-hidden="true">
          <div className="ui-lab-grid-stage" style={stageStyle}>
            {/* Keep Grid3D as a fixed background viewport into the expanse, not a fly-through camera. */}
            <Grid3D
              className="ui-lab-grid-3d"
              enableParticles={!isIntensityNone}
              enableBeams={!isIntensityNone}
              cameraAnimation={!isIntensityNone}
              sway={atmosphere.sway}
              swaySpeed={atmosphere.swaySpeed}
              particleCount={atmosphere.particleCount}
              particleOpacity={atmosphere.particleOpacity}
              beamOpacity={atmosphere.beamOpacity}
              beamThickness={atmosphere.beamThickness}
            />
          </div>
          <div className="ui-lab-grid-fade" />
        </div>

        <div className="ui-lab-shell">
          <header className="ui-lab-dashboard-header">
            <div className="ui-lab-title-block">
              <Badge variant="secondary">UI Lab</Badge>
              <div>
                <p className="ui-lab-kicker">GridCN component cockpit</p>
                <h1 className="ui-lab-display">Component Dashboard</h1>
              </div>
              <p className="ui-lab-lede">
                Toggle route-scoped theme and glow settings, then inspect every direct GridCN primitive in labeled dashboard panels.
              </p>
            </div>

            <div className="ui-lab-header-aside">
              <div className="ui-lab-brand-row" aria-label="Current UI lab state">
                <span className="ui-css-sentinel">Theme: {isAres ? "Ares" : "Tron"}</span>
                <span className="ui-css-sentinel">Intensity: {intensity}</span>
                <span className="ui-css-sentinel">Scope: isolated</span>
              </div>
              <nav className="ui-lab-nav" aria-label="UI lab sections">
                {SECTION_LINKS.map((link) => (
                  <a key={link.href} href={link.href}>
                    {link.label}
                  </a>
                ))}
              </nav>
            </div>
          </header>

          <section id="controls" className="ui-lab-dashboard-grid" aria-label="UI lab controls and status">
            <Card className="ui-lab-surface ui-lab-control-panel">
              <CardHeader>
                <CardTitle>Control Panel</CardTitle>
                <CardDescription>Persistent route settings for theme, glow intensity, and background validation.</CardDescription>
              </CardHeader>
              <CardContent className="ui-lab-control-stack">
                <div className="ui-lab-control-row">
                  <div className="ui-lab-control-copy">
                    <span className="ui-lab-control-icon"><Palette className="h-4 w-4" /></span>
                    <div>
                      <p className="ui-lab-control-label">Theme</p>
                      <p className="ui-lab-note">Active theme: {isAres ? "Ares red" : "Tron cyan"}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    aria-pressed={isAres}
                    onClick={() => setTheme((current) => (current === "ares" ? "tron" : "ares"))}
                  >
                    Switch to {isAres ? "Tron" : "Ares"}
                  </Button>
                </div>

                <div className="ui-lab-control-row ui-lab-control-row--stacked">
                  <div className="ui-lab-control-copy">
                    <span className="ui-lab-control-icon"><Sparkles className="h-4 w-4" /></span>
                    <div>
                      <p className="ui-lab-control-label">Glow Intensity</p>
                      <p className="ui-lab-note">Active intensity: {intensityLabel}</p>
                    </div>
                  </div>
                  <Select value={intensity} onValueChange={(value) => setIntensity(value as Intensity)}>
                    <SelectTrigger className="ui-lab-select-trigger" aria-label="Glow intensity">
                      <SelectValue placeholder="Select intensity" />
                    </SelectTrigger>
                    <SelectContent className="ui-lab-select-content">
                      {INTENSITY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="ui-lab-select-item" description={option.description}>
                          <span className="ui-lab-select-item-label">{option.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="ui-lab-control-row">
                  <div className="ui-lab-control-copy">
                    <span className="ui-lab-control-icon"><Layers3 className="h-4 w-4" /></span>
                    <div>
                      <p className="ui-lab-control-label">3D Background</p>
                      <p className="ui-lab-note">Fixed horizon viewport with {isIntensityNone ? "ambient effects disabled" : "ambient effects enabled"}.</p>
                    </div>
                  </div>
                  <Badge variant={isIntensityNone ? "outline" : "secondary"}>{isIntensityNone ? "Quiet" : "Live"}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="ui-lab-surface ui-lab-status-panel">
              <CardHeader>
                <CardTitle>Lab State</CardTitle>
                <CardDescription>Fast checks for the settings that should change as you toggle the dashboard.</CardDescription>
              </CardHeader>
              <CardContent className="ui-lab-status-grid">
                <StatusTile icon={<Code2 className="h-4 w-4" />} label="Registry" value="@thegridcn" />
                <StatusTile icon={<Palette className="h-4 w-4" />} label="Theme" value={isAres ? "Ares" : "Tron"} />
                <StatusTile icon={<Sparkles className="h-4 w-4" />} label="Intensity" value={intensityLabel} />
                <StatusTile icon={<Database className="h-4 w-4" />} label="Persistence" value="Cookie + localStorage" />
              </CardContent>
            </Card>

            <Card id="source" className="ui-lab-surface ui-lab-source-panel">
              <CardHeader>
                <CardTitle>Registry Source</CardTitle>
                <CardDescription>Use direct GridCN registry output. No local UI wrappers.</CardDescription>
              </CardHeader>
              <CardContent className="ui-lab-stack">
                <div className="ui-lab-command">{SOURCE_COMMAND}</div>
                <div className="ui-lab-inline">
                  <Badge>@thegridcn/button</Badge>
                  <Badge>@thegridcn/card</Badge>
                  <Badge>@thegridcn/select</Badge>
                  <Badge>@thegridcn/grid</Badge>
                </div>
              </CardContent>
            </Card>
          </section>

          <section id="atmosphere" className="ui-lab-section">
            <Card className="ui-lab-surface ui-lab-atmosphere-panel">
              <CardHeader>
                <CardTitle>Atmosphere Tuning</CardTitle>
                <CardDescription>Adjust sway, visibility, particles, and beams live. Presets give you a fast starting point.</CardDescription>
              </CardHeader>
              <CardContent className="ui-lab-atmosphere-grid">
                <div className="ui-lab-atmosphere-preset-row">
                  <div>
                    <p className="ui-lab-control-label">Preset</p>
                    <p className="ui-lab-note">Quick modes for calmer or denser visual feedback.</p>
                  </div>
                  <Select
                    value={atmosphere.preset}
                    onValueChange={(value) => setAtmosphere(applyAtmospherePreset(value as AtmospherePreset))}
                  >
                    <SelectTrigger className="ui-lab-select-trigger" aria-label="Atmosphere preset">
                      <SelectValue placeholder="Choose preset" />
                    </SelectTrigger>
                    <SelectContent className="ui-lab-select-content">
                      {ATMOSPHERE_PRESET_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="ui-lab-select-item" description={option.description}>
                          <span className="ui-lab-select-item-label">{option.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="ui-lab-atmosphere-controls">
                  <RangeField
                    label="Grid Sway"
                    description="Side-to-side sway applied to the full background stage."
                    value={Math.round(atmosphere.sway * 100)}
                    min={0}
                    max={100}
                    step={1}
                    suffix="%"
                    onChange={(next) => updateAtmosphere({ sway: next / 100 })}
                  />
                  <RangeField
                    label="Drift Speed"
                    description="How quickly the subtle sway loops."
                    value={Math.round(atmosphere.swaySpeed * 100)}
                    min={0}
                    max={100}
                    step={1}
                    suffix="%"
                    onChange={(next) => updateAtmosphere({ swaySpeed: next / 100 })}
                  />
                  <RangeField
                    label="Background Visibility"
                    description="How strongly the grid sits behind the panels."
                    value={Math.round(atmosphere.visibility * 100)}
                    min={60}
                    max={150}
                    step={1}
                    suffix="%"
                    onChange={(next) => updateAtmosphere({ visibility: next / 100 })}
                  />
                  <RangeField
                    label="Particle Density"
                    description="More points means a busier, deeper horizon."
                    value={atmosphere.particleCount}
                    min={0}
                    max={500}
                    step={1}
                    suffix=""
                    onChange={(next) => updateAtmosphere({
                      particleCount: Math.round(next),
                      particleOpacity: Math.max(0.25, Math.min(0.9, 0.3 + next / 900)),
                    })}
                  />
                  <RangeField
                    label="Beam Strength"
                    description="Controls both the brightness and presence of the vertical lines."
                    value={Math.round(atmosphere.beamOpacity * 100)}
                    min={0}
                    max={100}
                    step={1}
                    suffix="%"
                    onChange={(next) => {
                      const normalized = next / 100;
                      updateAtmosphere({
                        beamOpacity: Math.max(0.12, normalized * 0.7),
                        beamThickness: 0.03 + normalized * 0.03,
                      });
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </section>

          <section id="components" className="ui-lab-section">
            <div className="ui-lab-section-heading">
              <p className="ui-lab-eyebrow">Component Gallery</p>
              <h2 className="ui-lab-section-title">Labeled GridCN primitives</h2>
              <p className="ui-lab-section-subtitle">Every specimen is labeled by the primitive it is meant to validate.</p>
            </div>

            <div className="ui-lab-component-grid">
              <ComponentSpecimen label="Component: Button" description="Primary actions and variants with stable hover/focus states.">
                <div className="ui-lab-row">
                  <Button>Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                </div>
              </ComponentSpecimen>

              <ComponentSpecimen label="Component: Badge" description="Compact status labels used throughout the dashboard.">
                <div className="ui-lab-row">
                  <Badge>Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="outline">Outline</Badge>
                </div>
              </ComponentSpecimen>

              <ComponentSpecimen label="Component: Input" description="Form fields with the current route-scoped glow intensity.">
                <div className="ui-lab-grid">
                  <Input aria-label="Room code" placeholder="Room code" />
                  <Input aria-label="Player name" placeholder="Player name" />
                </div>
              </ComponentSpecimen>

              <ComponentSpecimen label="Component: Select" description="The live intensity selector is the select smoke test.">
                <Select value={intensity} onValueChange={(value) => setIntensity(value as Intensity)}>
                  <SelectTrigger className="ui-lab-select-trigger" aria-label="Component select sample">
                    <SelectValue placeholder="Select intensity" />
                  </SelectTrigger>
                  <SelectContent className="ui-lab-select-content">
                    {INTENSITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="ui-lab-select-item" description={option.description}>
                        <span className="ui-lab-select-item-label">{option.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ComponentSpecimen>

              <ComponentSpecimen label="Component: Dropdown" description="Menu primitive with command and route-safety actions.">
                <Dropdown
                  align="left"
                  items={[
                    {
                      label: "Copy source command",
                      shortcut: "CMD+C",
                      onSelect: () => addToast({ title: "Copied", description: SOURCE_COMMAND, variant: "success" }),
                    },
                    {
                      label: "Open registry flow",
                      onSelect: () => addToast({ title: "Registry", description: "Use @thegridcn registry items", variant: "info" }),
                    },
                    { separator: true, label: "separator" },
                    {
                      label: "Keep lab isolated",
                      variant: "danger",
                      onSelect: () => addToast({ title: "Constraint", description: "No gameplay route changes", variant: "warning" }),
                    },
                  ]}
                >
                  <Button variant="outline">Open Menu</Button>
                </Dropdown>
              </ComponentSpecimen>

              <ComponentSpecimen label="Component: Dialog" description="Modal primitive with an editable field and save action.">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="secondary">Open Dialog</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Room settings</DialogTitle>
                      <DialogDescription>Adjust a sample room name to validate modal behavior inside the lab.</DialogDescription>
                    </DialogHeader>
                    <Input aria-label="Room name" value={roomName} onChange={(event) => setRoomName(event.target.value)} />
                    <DialogFooter>
                      <Button onClick={() => addToast({ title: "Saved", description: `Room name set to ${roomName}`, variant: "success" })}>
                        Save
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </ComponentSpecimen>

              <ComponentSpecimen label="Component: Toast" description="Notification variants for status, warning, and error states.">
                <div className="ui-lab-row">
                  <Button onClick={() => addToast({ title: "Connected", description: "Live room sync active", variant: "success" })}>
                    Success Toast
                  </Button>
                  <Button variant="outline" onClick={() => addToast({ title: "Heads up", description: "A player reconnected", variant: "warning" })}>
                    Warning Toast
                  </Button>
                  <Button variant="ghost" onClick={() => addToast({ title: "Error", description: "Socket timeout", variant: "error" })}>
                    Error Toast
                  </Button>
                </div>
              </ComponentSpecimen>

              <ComponentSpecimen label="Component: Card" description="The specimen panel itself validates card styling, blur, and glow." className="ui-lab-card-specimen">
                <div className="ui-lab-card-preview">
                  <Settings2 className="h-5 w-5" />
                  <div>
                    <strong>Panel shell</strong>
                    <p className="ui-lab-note">Card surfaces stay readable over the grid background.</p>
                  </div>
                </div>
              </ComponentSpecimen>

              <ComponentSpecimen label="Component: Table" description="Telemetry table with caption, header, body, and row states." className="ui-lab-table-specimen">
                <Table>
                  <TableCaption>Sample telemetry table for direct GridCN primitive validation.</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Node</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Latency</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {SAMPLE_ROWS.map((row) => (
                      <TableRow key={row.node}>
                        <TableCell>{row.node}</TableCell>
                        <TableCell>{row.status}</TableCell>
                        <TableCell>{row.latency}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ComponentSpecimen>
            </div>
          </section>

          <section id="validation" className="ui-lab-section ui-lab-validation-grid">
            <Card className="ui-lab-surface">
              <CardHeader>
                <CardTitle>Validation Notes</CardTitle>
                <CardDescription>Smoke checks that keep the dashboard aligned with the migration constraints.</CardDescription>
              </CardHeader>
              <CardContent className="ui-lab-note-list">
                <div className="ui-lab-note"><CheckCircle2 className="h-4 w-4" /><span>Direct imports remain locked to `@/components/thegridcn/*`.</span></div>
                <div className="ui-lab-note"><MonitorSmartphone className="h-4 w-4" /><span>The layout is dashboard-first and stacks cleanly on mobile.</span></div>
                <div className="ui-lab-note"><Zap className="h-4 w-4" /><span>Theme and intensity persist through cookie and localStorage state.</span></div>
              </CardContent>
            </Card>

            <Card className="ui-lab-surface">
              <CardHeader>
                <CardTitle>Background Readout</CardTitle>
                <CardDescription>The 3D layer is decorative, fixed, and non-interactive.</CardDescription>
              </CardHeader>
              <CardContent className="ui-lab-note-list">
                <div className="ui-lab-note"><Layers3 className="h-4 w-4" /><span>Camera is aimed toward a far horizon, not orbiting the viewer.</span></div>
                <div className="ui-lab-note"><Bell className="h-4 w-4" /><span>Ambient particles and beams are disabled when intensity is `none`.</span></div>
                <div className="ui-lab-note"><Code2 className="h-4 w-4" /><span>The GridCN source remains route-scoped to `/ui-lab`.</span></div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </ThemeProvider>
  );
}

export default function UiLabClient({
  initialTheme,
  initialIntensity,
  initialAtmosphere,
}: {
  initialTheme: Theme;
  initialIntensity: Intensity;
  initialAtmosphere: AtmosphereState;
}) {
  return (
    <ToastProvider>
      <UiLabContent initialTheme={initialTheme} initialIntensity={initialIntensity} initialAtmosphere={initialAtmosphere} />
    </ToastProvider>
  );
}
