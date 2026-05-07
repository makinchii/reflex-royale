"use client";

import * as React from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useTheme } from "@/components/theme";
import * as THREE from "three";

const ringGeometry = new THREE.TorusGeometry(3, 0.02, 6, 32);
const speedLineGeometry = new THREE.BoxGeometry(0.02, 0.02, 1);

const themeColors: Record<string, string> = {
  ares: "#ff3333",
  vulcan: "#ff7a00",
  apollo: "#ffd400",
  gaia: "#24f07a",
  tron: "#00d4ff",
  bacchus: "#8a2bff",
  aphrodite: "#ff1493",
  olympus: "#ffffff",
  clu: "#ff6600",
  athena: "#ffd700",
  poseidon: "#0066ff",
};

export type LocalTransitionPlayer = {
  id: string;
  name: string;
  color: string;
  themeCommand?: string | null;
  themeLabel?: string;
  key?: string | null;
};

function useTunnelColor() {
  const { theme } = useTheme();
  const [cssPrimary, setCssPrimary] = React.useState("");

  React.useEffect(() => {
    setCssPrimary(getComputedStyle(document.documentElement).getPropertyValue("--primary").trim());
  }, []);

  return cssPrimary || themeColors[theme] || themeColors.tron;
}

function TunnelRings({ color, count = 15, durationMs = 3000 }: { color: string; count?: number; durationMs?: number }) {
  const meshRef = React.useRef<THREE.InstancedMesh>(null);
  const materialRef = React.useRef<THREE.MeshBasicMaterial>(null);
  const elapsedRef = React.useRef(0);

  const ringData = React.useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      z: -2 - i * 2,
      speed: 0.08 + Math.random() * 0.04,
      radius: 3 + Math.random() * 0.5,
      rotation: 0,
    }));
  }, [count]);

  React.useEffect(() => {
    if (!meshRef.current) return;

    const matrix = new THREE.Matrix4();
    const scale = new THREE.Vector3();

    ringData.forEach((ring, i) => {
      scale.set(ring.radius / 3, ring.radius / 3, 1);
      matrix.makeScale(scale.x, scale.y, scale.z);
      matrix.setPosition(0, 0, ring.z);
      meshRef.current?.setMatrixAt(i, matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [ringData]);

  React.useEffect(() => {
    return () => {
      materialRef.current?.dispose();
    };
  }, []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    elapsedRef.current += delta * 1000;
    const progress = THREE.MathUtils.clamp(elapsedRef.current / durationMs, 0, 1);
    const speedMultiplier = 1 + progress ** 3 * 5;
    const frameScale = delta * 60;

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    ringData.forEach((ring, i) => {
      ring.z += ring.speed * speedMultiplier * frameScale;
      if (ring.z > 5) ring.z = -30;
      ring.rotation += 0.001;

      position.set(0, 0, ring.z);
      quaternion.setFromEuler(new THREE.Euler(0, 0, ring.rotation));
      scale.set(ring.radius / 3, ring.radius / 3, 1);
      matrix.compose(position, quaternion, scale);
      meshRef.current?.setMatrixAt(i, matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;

    if (materialRef.current) {
      const avgDist = ringData.reduce((sum, ring) => sum + Math.abs(ring.z), 0) / count;
      materialRef.current.opacity = Math.min(0.85, Math.max(0.2, 0.6 - avgDist / 60) + progress * 0.22);
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[ringGeometry, undefined, count]}>
      <meshBasicMaterial ref={materialRef} color={color} transparent opacity={0.5} />
    </instancedMesh>
  );
}

function SpeedLines({ color, count = 50, durationMs = 3000 }: { color: string; count?: number; durationMs?: number }) {
  const meshRef = React.useRef<THREE.InstancedMesh>(null);
  const materialRef = React.useRef<THREE.MeshBasicMaterial>(null);
  const elapsedRef = React.useRef(0);

  const linesData = React.useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      angle: (i / count) * Math.PI * 2,
      radius: 2 + Math.random() * 2,
      z: Math.random() * -30,
      length: 0.5 + Math.random() * 1.5,
      speed: 0.1 + Math.random() * 0.2,
    }));
  }, [count]);

  React.useEffect(() => {
    if (!meshRef.current) return;

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();

    linesData.forEach((line, i) => {
      position.set(Math.cos(line.angle) * line.radius, Math.sin(line.angle) * line.radius, line.z);
      scale.set(1, 1, line.length);
      matrix.compose(position, quaternion, scale);
      meshRef.current?.setMatrixAt(i, matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [linesData]);

  React.useEffect(() => {
    return () => {
      materialRef.current?.dispose();
    };
  }, []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    elapsedRef.current += delta * 1000;
    const progress = THREE.MathUtils.clamp(elapsedRef.current / durationMs, 0, 1);
    const speedMultiplier = 1 + progress ** 3 * 6;
    const lengthMultiplier = 1 + progress ** 2 * 0.8;
    const frameScale = delta * 60;

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();

    linesData.forEach((line, i) => {
      line.z += line.speed * speedMultiplier * frameScale;
      if (line.z > 5) line.z = -30;

      position.set(Math.cos(line.angle) * line.radius, Math.sin(line.angle) * line.radius, line.z);
      scale.set(1, 1, line.length * lengthMultiplier);
      matrix.compose(position, quaternion, scale);
      meshRef.current?.setMatrixAt(i, matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;

    if (materialRef.current) {
      materialRef.current.opacity = 0.45 + progress ** 2 * 0.4;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[speedLineGeometry, undefined, count]}>
      <meshBasicMaterial ref={materialRef} color={color} transparent opacity={0.45} />
    </instancedMesh>
  );
}

export function LocalGameTransition({
  className,
  ringCount = 15,
  enableSpeedLines = true,
  durationMs = 3000,
}: {
  className?: string;
  ringCount?: number;
  enableSpeedLines?: boolean;
  durationMs?: number;
}) {
  const tunnelColor = useTunnelColor();
  const style = { "--local-transition-duration": `${durationMs}ms` } as React.CSSProperties;

  return (
    <div className={className} style={style} aria-hidden="true">
      <div className="local-game-transition-blackout" />
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        dpr={[1, 2]}
        style={{ background: "transparent", pointerEvents: "none" }}
      >
        <fog attach="fog" args={["#000", 5, 35]} />
        <TunnelRings color={tunnelColor} count={ringCount} durationMs={durationMs} />
        {enableSpeedLines ? <SpeedLines color={tunnelColor} count={50} durationMs={durationMs} /> : null}
        <ambientLight intensity={0.1} />
      </Canvas>
    </div>
  );
}

export function LocalPlayerSplash({
  className,
  players,
  durationMs = 2800,
}: {
  className?: string;
  players: LocalTransitionPlayer[];
  durationMs?: number;
}) {
  const style = {
    "--local-player-splash-duration": `${durationMs}ms`,
    "--local-player-count": players.length,
  } as React.CSSProperties;

  return (
    <div className={className} style={style} aria-hidden="true">
      <div className="local-player-splash__blackout" />
      <div className="local-player-splash__grid">
        {players.map((player, index) => {
          const sliceStyle = {
            "--player-color": player.color,
            "--slice-index": index,
          } as React.CSSProperties;

          return (
            <section className="local-player-splash__slice" style={sliceStyle} key={player.id || `${player.name}-${index}`}>
              <div className="local-player-splash__slice-glow" />
              <div className="local-player-splash__content">
                <span className="local-player-splash__number">P{index + 1}</span>
                <strong className="local-player-splash__name">{player.name}</strong>
                <span className="local-player-splash__theme">{player.themeLabel || player.themeCommand || "Custom"}</span>
                {player.key ? <kbd className="local-player-splash__key">{player.key.toUpperCase()}</kbd> : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
