import Link from "next/link";
import { RadioTower, Zap } from "lucide-react";
import { NavigateGridBackdrop } from "@/components/app/navigate-grid-backdrop";
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
      <WireframeDottedGlobe animateOnHoverWithinSelector=".navigate-route-row--local" maxFps={16} width={1380} height={1380} />
    </div>
  );
}

function MoonNode() {
  return (
    <div className="navigate-moon" aria-hidden="true">
      <Reticle size={850} variant="scanning" className="navigate-body-reticle navigate-body-reticle--moon" />
      <div className="navigate-moon__orbit" />
      <WireframeDottedGlobe animateOnHoverWithinSelector=".navigate-route-row--online" className="navigate-globe-canvas--moon" width={720} height={720} kind="moon" />
    </div>
  );
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
        <h1 className="fluorescent-title font-display text-[clamp(4.5rem,10vw,10.5rem)] font-black leading-none uppercase tracking-[0.12em] text-primary">Choose Vector</h1>
      </div>

      <div className="navigate-earth-viewport-layer" aria-hidden="true">
        <div className="navigate-earth-anchor">
          <EarthNode />
        </div>
      </div>

      <div className="navigate-orbit-stage">
        <NavigateGridBackdrop />

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
            <Link href={canPlayOnline ? "/dashboard" : "/"} className="navigate-tab navigate-tab--exit">
              <span>{canPlayOnline ? "Dashboard" : "Exit"}</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
