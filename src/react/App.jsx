import React from "react";
import { Badge, Button, Card, Dropdown, Input, Modal, Table, Toast, designSystemMeta } from "./design-system/components.jsx";

export function App() {
  const [session, setSession] = React.useState({ loading: true, authenticated: false, user: null });
  const [modalOpen, setModalOpen] = React.useState(false);
  const pathname = window.location.pathname;

  React.useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) {
          setSession({ loading: false, authenticated: data.authenticated, user: data.user });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSession({ loading: false, authenticated: false, user: null });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const sampleRows = [
    ["Phase 0", "Audit", <Badge key="phase0">Done</Badge>],
    ["Phase 1", "React foundation", <Badge key="phase1" tone="success">Done</Badge>],
    ["Phase 2", "Design system", <Badge key="phase2" tone="warning">In progress</Badge>]
  ];

  if (pathname === "/") {
    return (
      <main className="rr-app rr-home">
        <div className="rr-bg-grid" />
        <div className="rr-bg-glow rr-bg-glow-left" />
        <div className="rr-bg-glow rr-bg-glow-right" />

        <section className="rr-shell rr-hero rr-hero-home">
          <div className="rr-hero-copy">
            <div className="rr-kicker-row">
              <Badge tone="accent">Reflex Royale</Badge>
              <span className="rr-kicker">Same-origin · guest-friendly · server-authoritative</span>
            </div>

            <h1 className="rr-title">Quick matches, sharper reflexes.</h1>
            <p className="rr-subtitle">
              A cleaner entry point for guest play, signup, and login while the game backend
              keeps timing, rooms, and scoring on the server.
            </p>

            <div className="rr-cta-row">
              <Button asChild>
                <a href="/dashboard">Open dashboard</a>
              </Button>
              <Button asChild variant="secondary">
                <a href="/signup?next=/dashboard">Create account</a>
              </Button>
              <Button asChild variant="ghost">
                <a href="/login?next=/dashboard">Log in</a>
              </Button>
            </div>

            <div className="rr-chip-row">
              <Badge tone="success">Guest play works</Badge>
              <Badge tone="warning">No gameplay changes</Badge>
              <Badge tone="accent">Render-safe</Badge>
            </div>
          </div>

          <aside className="rr-hero-panel">
            <div className="rr-panel-topline">
              <span className="rr-panel-label">Launch path</span>
              <span className="rr-panel-value">Stable</span>
            </div>

            <div className="rr-launch-list">
              <Card eyebrow="Quick Play" title="Enter the game hub">
                <p>Go straight to dashboard, then choose local play or an online room.</p>
              </Card>
              <Card eyebrow="Sign Up" title="Create an account">
                <p>Use the existing signup flow to unlock account-backed play.</p>
              </Card>
              <Card eyebrow="Login" title="Return to play">
                <p>Sign back in and continue with your current session.</p>
              </Card>
            </div>
          </aside>
        </section>

        <section className="rr-shell rr-info-strip">
          <div className="rr-metric">
            <span className="rr-metric-label">Match model</span>
            <strong>Server-owned</strong>
          </div>
          <div className="rr-metric">
            <span className="rr-metric-label">Deployment</span>
            <strong>One origin</strong>
          </div>
          <div className="rr-metric">
            <span className="rr-metric-label">Guest flow</span>
            <strong>Enabled</strong>
          </div>
          <div className="rr-metric">
            <span className="rr-metric-label">Next step</span>
            <strong>Landing pilot</strong>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="rr-app">
      <section className="rr-shell rr-hero">
        <p className="rr-eyebrow">Phase 2 design system</p>
        <h1 className="rr-title">Reflex Royale Gridcn foundation</h1>
        <p className="rr-subtitle">A small reusable React kit for later page migrations, while the current HTML pages, sessions, and Socket.IO gameplay stay untouched.</p>

        <div className="rr-preview-bar">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost" onClick={() => setModalOpen(true)}>Open modal</Button>
          </div>
          <Badge tone={session.authenticated ? "success" : "accent"}>
            {session.loading ? "Loading session" : session.authenticated ? `Signed in as ${session.user.username}` : "Guest session"}
          </Badge>
        </div>

        <div className="rr-grid">
          <Card eyebrow="Session" title="Identity state">
            <p>{session.loading ? "Fetching current session from the same origin." : session.authenticated ? `Authenticated as ${session.user.username}.` : "Guest access remains enabled."}</p>
          </Card>
          <Card eyebrow="Architecture" title="Authority boundary">
            <p>React handles presentation only. Gameplay timing and room state still live on the server.</p>
          </Card>
          <Card eyebrow="Design tokens" title="Shared foundation">
            <p>Colors, radius, shadows, and spacing are centralized for future page migrations.</p>
          </Card>
        </div>

        <div className="rr-panel-grid">
          <Card eyebrow="Form controls" title="Inputs and actions">
            <div style={{ display: "grid", gap: 12 }}>
              <Input placeholder="Room code" />
              <Input placeholder="Display name" />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Button>Join room</Button>
                <Dropdown
                  label="More actions"
                  items={[
                    { label: "Copy link", onSelect: () => setModalOpen(true) },
                    { label: "Open preview", onSelect: () => setModalOpen(true) }
                  ]}
                />
              </div>
            </div>
          </Card>

          <Card eyebrow="Feedback" title="Toasts and tables">
            <div style={{ display: "grid", gap: 12 }}>
              <Toast tone="info" title="Info" message="This bundle is served from the same origin as the backend." />
              <Toast tone="success" title="Success" message="The current auth and socket flows still pass tests." />
              <Table columns={["Phase", "Focus", "Status"]} rows={sampleRows} />
            </div>
          </Card>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 4 }}>
          <a href="/" style={{ color: "#8ab4ff" }}>Home</a>
          <a href="/dashboard" style={{ color: "#8ab4ff" }}>Dashboard</a>
          <a href="/play" style={{ color: "#8ab4ff" }}>Local Play</a>
          <a href="/play/online" style={{ color: "#8ab4ff" }}>Online Play</a>
        </div>

        <Modal open={modalOpen} title="Preview modal" onClose={() => setModalOpen(false)}>
          <p>This is a reusable overlay primitive for later page migrations.</p>
          <p>It currently exists only in the React preview surface.</p>
        </Modal>
      </section>
    </main>
  );
}
