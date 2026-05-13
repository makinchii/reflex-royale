import type { ReactNode } from "react";

export function SidebarButton({ active, collapsed, icon, label, onClick }: { active: boolean; collapsed: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-selected={active}
      title={label}
      className={`group relative grid h-10 w-full grid-cols-[5rem_minmax(0,1fr)] items-center overflow-hidden text-left transition-[background-color,color,border-color,transform,box-shadow] duration-500 active:translate-y-px focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
        active
          ? "bg-primary/10 text-primary shadow-[inset_4px_0_0_var(--primary),0_0_26px_color-mix(in_oklch,var(--primary)_22%,transparent)]"
          : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
      }`}
    >
      <span className={`flex h-full w-20 items-center justify-center ${active ? "text-primary drop-shadow-[0_0_10px_var(--primary)]" : "text-muted-foreground group-hover:text-primary"}`}>{icon}</span>
      <span className={`truncate text-left font-mono text-sm font-semibold tracking-[0.04em] transition-all duration-300 ${collapsed ? "translate-x-2 opacity-0" : "translate-x-0 opacity-100"}`}>{label}</span>
    </button>
  );
}

export function SettingsRoundSlider({ label, value, onChange }: { label: string; value: number; onChange?: (value: number) => void }) {
  return (
    <div data-slot="tron-slider" className="round-slider dashboard-round-slider" aria-label={`${label} slider`}>
      <div className="round-slider__header">
        <span className="dashboard-settings-label">{label}</span>
        <span className="round-slider__value">{value}%</span>
      </div>
      <div className="round-slider__track-wrap">
        <div data-slot="slider-track" className="round-slider__track" />
        <div data-slot="slider-range" className="round-slider__range" style={{ width: `${value}%` }} />
        <div data-slot="slider-thumb" className="round-slider__thumb" style={{ left: `${value}%` }} />
        <input
          className="round-slider__input"
          type="range"
          min="0"
          max="100"
          step="1"
          value={value}
          onChange={(event) => onChange?.(Number(event.currentTarget.value))}
          aria-label={label}
        />
      </div>
    </div>
  );
}

export function AudioSettingsToggle({ label, enabled, onToggle }: { label: string; enabled: boolean; onToggle: () => void }) {
  return (
    <button type="button" className={`dashboard-settings-toggle ${enabled ? "dashboard-settings-toggle--active" : ""}`} aria-pressed={enabled} onClick={onToggle}>
      <span>{label}</span>
      <strong>{enabled ? "Enabled" : "Muted"}</strong>
    </button>
  );
}
