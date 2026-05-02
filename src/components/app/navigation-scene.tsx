import Link from "next/link";
import { RadioTower, Zap } from "lucide-react";
import { WireframeDottedGlobe } from "@/components/app/wireframe-dotted-globe";
import { LocationDisplay } from "@/components/thegridcn/location-display";
import { Reticle } from "@/components/thegridcn/reticle";

function CircuitBackground() {
  return (
    <div className="navigate-circuit-bg" aria-hidden="true">
      <div className="navigate-circuit-bg__grid" />
      <div className="navigate-circuit-bg__nodes" />
    </div>
  );
}

function EarthNode() {
  return (
    <div className="navigate-earth" aria-hidden="true">
      <Reticle size={1800} variant="scanning" className="navigate-body-reticle navigate-body-reticle--earth" />
      <div className="navigate-earth__orbit" />
      <div className="navigate-earth__glow" />
      <WireframeDottedGlobe width={1380} height={1380} />
    </div>
  );
}

function MoonNode() {
  return (
    <div className="navigate-moon" aria-hidden="true">
      <Reticle size={850} variant="scanning" className="navigate-body-reticle navigate-body-reticle--moon" />
      <div className="navigate-moon__orbit" />
      <WireframeDottedGlobe className="navigate-globe-canvas--moon" width={540} height={540} kind="moon" />
    </div>
  );
}

function SimplePlanet({ className, size = 140 }: { className: string; size?: number }) {
  return <WireframeDottedGlobe animated={false} className={`navigate-simple-planet ${className}`} width={size} height={size} kind="moon" surface="grid" />;
}

export function NavigationScene({ canPlayOnline }: { canPlayOnline: boolean }) {
  return (
    <section className="navigate-scene" aria-label="Choose play mode">
      <CircuitBackground />
      <div className="navigate-border-hud">
        <LocationDisplay sector="ORBITAL SECTOR" grid="RX-160 / VECTOR 03" coordinates="E: -34.91 M: +18.42" status="ROUTE STABLE" className="navigate-location-display" />
      </div>

      <div className="navigate-scene__header">
        <p className="font-mono text-[10px] uppercase tracking-[0.36em] text-primary/75">Orbital route select</p>
        <h1 className="font-display text-[clamp(4.5rem,10vw,10.5rem)] font-black leading-none uppercase tracking-[0.12em] text-primary [text-shadow:0_0_90px_oklch(from_var(--primary)_l_c_h/0.5)]">Choose Vector</h1>
      </div>

      <div className="navigate-orbit-stage">
        <SimplePlanet className="navigate-simple-planet--upper-left" />
        <SimplePlanet className="navigate-simple-planet--lower-right" size={650} />

        <div className="navigate-link-field navigate-link-field--local">
          <EarthNode />
        </div>

        <div className="navigate-link-field navigate-link-field--online">
          <MoonNode />
        </div>

        <div className="navigate-route-stack">
          <div className="navigate-route-row navigate-route-row--local">
            <span className="navigate-route-line navigate-route-line--local" aria-hidden="true" />
            <Link href="/local" className="navigate-tab navigate-tab--local">
              <Zap className="h-4 w-4" />
              <span>Local Play</span>
            </Link>
          </div>
          <div className="navigate-route-row navigate-route-row--online">
            <span className="navigate-route-line navigate-route-line--online" aria-hidden="true" />
            {canPlayOnline ? (
              <Link href="/online" className="navigate-tab navigate-tab--online">
                <RadioTower className="h-4 w-4" />
                <span>Online Play</span>
              </Link>
            ) : (
              <span className="navigate-tooltip-wrap">
                <button type="button" className="navigate-tab navigate-tab--online navigate-tab--disabled" aria-describedby="navigate-online-tooltip" aria-disabled="true">
                  <RadioTower className="h-4 w-4" />
                  <span>Online Play</span>
                </button>
                <span id="navigate-online-tooltip" role="tooltip" className="navigate-tooltip">
                  Create an account to unlock online play.
                </span>
              </span>
            )}
          </div>
          <div className="navigate-route-row navigate-route-row--exit">
            <Link href="/" className="navigate-tab navigate-tab--exit">
              <span>Exit</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
