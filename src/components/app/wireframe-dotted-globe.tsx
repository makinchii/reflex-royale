"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type GlobeFeature = {
  type?: "Feature";
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
};

type DotData = {
  coordinates: [number, number];
  cosLat: number;
  cosLng: number;
  lng: number;
  lat: number;
  sinLat: number;
  sinLng: number;
};

type LandRing = DotData[];

type ProjectedPoint = [number, number];

type MoonCrater = {
  lng: number;
  lat: number;
  radius: number;
  depth: number;
};

type WireframeDottedGlobeProps = {
  animateOnHoverWithinSelector?: string;
  animated?: boolean;
  className?: string;
  height?: number;
  kind?: "earth" | "moon";
  maxFps?: number;
  surface?: "detailed" | "grid";
  width?: number;
};

const degreesToRadians = Math.PI / 180;
const VISUAL_ANIMATIONS_KEY = "reflexRoyaleVisualAnimationsEnabled";
const VISUAL_PREFERENCES_CHANGED_EVENT = "reflexRoyaleVisualPreferencesChanged";

function createDot(lng: number, lat: number): DotData {
  const lngRadians = lng * degreesToRadians;
  const latRadians = lat * degreesToRadians;
  return {
    coordinates: [lng, lat],
    cosLat: Math.cos(latRadians),
    cosLng: Math.cos(lngRadians),
    lng,
    lat,
    sinLat: Math.sin(latRadians),
    sinLng: Math.sin(lngRadians),
  };
}

function collectGraticuleRings(longitudeStep: number, latitudeStep: number): LandRing[] {
  const rings: LandRing[] = [];

  for (let lng = -180; lng < 180; lng += longitudeStep) {
    const ring: LandRing = [];
    for (let lat = -90; lat <= 90; lat += 2) ring.push(createDot(lng, lat));
    rings.push(ring);
  }

  for (let lat = -80; lat <= 80; lat += latitudeStep) {
    const ring: LandRing = [];
    for (let lng = -180; lng <= 180; lng += 2) ring.push(createDot(lng, lat));
    rings.push(ring);
  }

  return rings;
}

let cachedLandFeatures: { features: GlobeFeature[] } | null = null;
let cachedEarthDots: DotData[] | null = null;
let cachedLandRings: LandRing[] | null = null;
const globeFrameCallbacks = new Set<(timestamp: number) => void>();
let globeFrameId = 0;

function runGlobeFrame(timestamp: number) {
  globeFrameCallbacks.forEach((callback) => callback(timestamp));
  if (globeFrameCallbacks.size > 0) globeFrameId = requestAnimationFrame(runGlobeFrame);
}

function subscribeGlobeFrame(callback: (timestamp: number) => void) {
  globeFrameCallbacks.add(callback);
  if (globeFrameCallbacks.size === 1) globeFrameId = requestAnimationFrame(runGlobeFrame);

  return () => {
    globeFrameCallbacks.delete(callback);
    if (globeFrameCallbacks.size === 0) cancelAnimationFrame(globeFrameId);
  };
}

const moonCraters: MoonCrater[] = [
  { lng: -62, lat: 34, radius: 0.082, depth: 0.42 },
  { lng: -18, lat: 25, radius: 0.052, depth: 0.34 },
  { lng: -42, lat: -10, radius: 0.12, depth: 0.46 },
  { lng: 24, lat: -24, radius: 0.07, depth: 0.32 },
  { lng: -86, lat: -28, radius: 0.045, depth: 0.28 },
  { lng: -4, lat: -54, radius: 0.036, depth: 0.22 },
  { lng: 58, lat: 2, radius: 0.031, depth: 0.2 },
  { lng: 94, lat: 38, radius: 0.04, depth: 0.26 },
  { lng: 118, lat: -34, radius: 0.052, depth: 0.3 },
];

const moonDots: DotData[] = Array.from({ length: 240 }, (_, index) => {
  const phi = Math.acos(1 - 2 * ((index + 0.5) / 240));
  const theta = Math.PI * (1 + Math.sqrt(5)) * index;
  return createDot(((theta * 180) / Math.PI) % 360 - 180, 90 - (phi * 180) / Math.PI);
});

export function WireframeDottedGlobe({ animateOnHoverWithinSelector, animated = true, className, height = 420, kind = "earth", maxFps = 30, surface = "detailed", width = 420 }: WireframeDottedGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);
  const [visualAnimationsEnabled, setVisualAnimationsEnabled] = useState(true);

  useEffect(() => {
    const syncAnimationPreference = () => {
      setVisualAnimationsEnabled(window.localStorage.getItem(VISUAL_ANIMATIONS_KEY) !== "false");
    };

    const syncFromStorage = (event: StorageEvent) => {
      if (event.key === VISUAL_ANIMATIONS_KEY) syncAnimationPreference();
    };

    syncAnimationPreference();
    window.addEventListener(VISUAL_PREFERENCES_CHANGED_EVENT, syncAnimationPreference);
    window.addEventListener("storage", syncFromStorage);

    return () => {
      window.removeEventListener(VISUAL_PREFERENCES_CHANGED_EVENT, syncAnimationPreference);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const ctx = context;

    let cancelled = false;
    let lastFrameAt = 0;
    let animationStarted = false;
    let unsubscribeFrame: (() => void) | null = null;
    const hoverAnimationTrigger = animateOnHoverWithinSelector ? document.querySelector<HTMLElement>(animateOnHoverWithinSelector) : null;
    const styles = getComputedStyle(document.documentElement);
    const primary = styles.getPropertyValue("--primary").trim() || "oklch(0.75 0.18 25)";
    const background = styles.getPropertyValue("--background").trim() || "#000";
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const minDimension = Math.min(width, height, 260);
    const targetWidth = surface === "grid" ? width : window.innerWidth * (kind === "earth" ? 0.64 : 0.3);
    const targetHeight = surface === "grid" ? height : window.innerHeight - 96;
    const containerWidth = Math.min(width, Math.max(minDimension, targetWidth));
    const containerHeight = Math.min(height, Math.max(minDimension, targetHeight));
    const globeSize = surface === "grid" ? null : Math.min(width, height, Math.max(minDimension, targetWidth, targetHeight));
    const renderWidth = globeSize ?? containerWidth;
    const renderHeight = globeSize ?? containerHeight;
    const radius = Math.min(renderWidth, renderHeight) / (kind === "earth" ? 2.18 : 2.32);
    let dots: DotData[] = cachedEarthDots ?? [];
    let landFeatures: { features: GlobeFeature[] } | null = null;
    let landRings: LandRing[] = cachedLandRings ?? [];
    let frame = 0;
    let frameCos = 1;
    let frameSin = 0;
    const fixedTiltRadians = (kind === "earth" ? -8 : -4) * degreesToRadians;
    const fixedTiltCos = Math.cos(fixedTiltRadians);
    const fixedTiltSin = Math.sin(fixedTiltRadians);
    const minFrameDuration = 1000 / Math.max(1, maxFps);

    const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    canvas.width = renderWidth * dpr;
    canvas.height = renderHeight * dpr;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const earthGraticuleRings = collectGraticuleRings(10, 10);
    const moonGraticuleRings = collectGraticuleRings(30, 20);

    function pointInPolygon(point: [number, number], polygon: number[][]) {
      const [x, y] = point;
      let inside = false;

      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }

      return inside;
    }

    function pointInFeature(point: [number, number], feature: GlobeFeature) {
      const { geometry } = feature;
      if (geometry.type === "Polygon") {
        const coordinates = geometry.coordinates as number[][][];
        if (!pointInPolygon(point, coordinates[0])) return false;
        return !coordinates.slice(1).some((ring) => pointInPolygon(point, ring));
      }

      const coordinates = geometry.coordinates as number[][][][];
      return coordinates.some((polygon) => pointInPolygon(point, polygon[0]) && !polygon.slice(1).some((ring) => pointInPolygon(point, ring)));
    }

    function generateDots(feature: GlobeFeature) {
      const bounds = getFeatureBounds(feature);
      const [[minLng, minLat], [maxLng, maxLat]] = bounds;
      const step = kind === "earth" ? 1.85 : 6;

      for (let lng = minLng; lng <= maxLng; lng += step) {
        for (let lat = minLat; lat <= maxLat; lat += step) {
          if (pointInFeature([lng, lat], feature)) dots.push(createDot(lng, lat));
        }
      }
    }

    function getFeatureBounds(feature: GlobeFeature): [[number, number], [number, number]] {
      let minLng = Infinity;
      let minLat = Infinity;
      let maxLng = -Infinity;
      let maxLat = -Infinity;

      function visitCoordinate([lng, lat]: number[]) {
        minLng = Math.min(minLng, lng);
        minLat = Math.min(minLat, lat);
        maxLng = Math.max(maxLng, lng);
        maxLat = Math.max(maxLat, lat);
      }

      if (feature.geometry.type === "Polygon") {
        const coordinates = feature.geometry.coordinates as number[][][];
        coordinates.forEach((ring) => ring.forEach(visitCoordinate));
      } else {
        const coordinates = feature.geometry.coordinates as number[][][][];
        coordinates.forEach((polygon) => polygon.forEach((ring) => ring.forEach(visitCoordinate)));
      }

      return [[minLng, minLat], [maxLng, maxLat]];
    }

    function collectLandRings(features: GlobeFeature[]) {
      const rings: LandRing[] = [];

      for (const feature of features) {
        const { geometry } = feature;
        if (geometry.type === "Polygon") {
          const coordinates = geometry.coordinates as number[][][];
          coordinates.forEach((ring) => rings.push(ring.map(([lng, lat]) => createDot(lng, lat))));
          continue;
        }

        const coordinates = geometry.coordinates as number[][][][];
        coordinates.forEach((polygon) => polygon.forEach((ring) => rings.push(ring.map(([lng, lat]) => createDot(lng, lat)))));
      }

      return rings;
    }

    function isDotVisible(dot: DotData) {
      const rotatedX = dot.cosLat * (dot.cosLng * frameCos - dot.sinLng * frameSin);
      return rotatedX * fixedTiltCos - dot.sinLat * fixedTiltSin > 0;
    }

    function isCoordinateVisible(lng: number, lat: number) {
      return isDotVisible(createDot(lng, lat));
    }

    function findLimbIntersection(visiblePoint: DotData, hiddenPoint: DotData) {
      let visibleLng = visiblePoint.lng;
      let visibleLat = visiblePoint.lat;
      let hiddenLng = hiddenPoint.lng;
      let hiddenLat = hiddenPoint.lat;

      for (let index = 0; index < 8; index += 1) {
        const midLng = (visibleLng + hiddenLng) / 2;
        const midLat = (visibleLat + hiddenLat) / 2;
        if (isCoordinateVisible(midLng, midLat)) {
          visibleLng = midLng;
          visibleLat = midLat;
        } else {
          hiddenLng = midLng;
          hiddenLat = midLat;
        }
      }

      return projectVisiblePoint(createDot(visibleLng, visibleLat));
    }

    function projectVisiblePoint(point: DotData): ProjectedPoint | null {
      const rotatedZ = point.cosLat * (point.cosLng * frameCos - point.sinLng * frameSin);
      const rotatedX = point.cosLat * (point.sinLng * frameCos + point.cosLng * frameSin);
      const tiltedY = point.sinLat * fixedTiltCos + rotatedZ * fixedTiltSin;
      const tiltedZ = rotatedZ * fixedTiltCos - point.sinLat * fixedTiltSin;
      if (tiltedZ <= 0) return null;
      return [renderWidth / 2 + radius * rotatedX, renderHeight / 2 - radius * tiltedY];
    }

    function drawVisibleRings(rings: LandRing[]) {
      ctx.beginPath();
      for (const ring of rings) {
        let drawing = false;
        let previousPoint: DotData | null = null;
        let previousVisible = false;

        for (const point of ring) {
          const visible = isDotVisible(point);

          if (!previousPoint) {
            if (visible) {
              const projected = projectVisiblePoint(point);
              if (projected) {
                ctx.moveTo(projected[0], projected[1]);
                drawing = true;
              }
            }
            previousPoint = point;
            previousVisible = visible;
            continue;
          }

          if (!visible) {
            if (drawing && previousVisible) {
              const projected = findLimbIntersection(previousPoint, point);
              if (projected) ctx.lineTo(projected[0], projected[1]);
            }
            drawing = false;
            previousPoint = point;
            previousVisible = false;
            continue;
          }

          const projected = projectVisiblePoint(point);
          if (!projected) {
            drawing = false;
            previousPoint = point;
            previousVisible = visible;
            continue;
          }

          if (drawing) {
            ctx.lineTo(projected[0], projected[1]);
          } else if (!previousVisible && previousPoint) {
            const intersection = findLimbIntersection(point, previousPoint);
            if (intersection) ctx.moveTo(intersection[0], intersection[1]);
            ctx.lineTo(projected[0], projected[1]);
            drawing = true;
          } else {
            ctx.moveTo(projected[0], projected[1]);
            drawing = true;
          }

          previousPoint = point;
          previousVisible = true;
        }
      }
    }

    function draw() {
      if (cancelled) return;
      ctx.clearRect(0, 0, renderWidth, renderHeight);

      ctx.save();
      ctx.shadowColor = primary;
      ctx.shadowBlur = kind === "earth" ? 26 : 18;
      ctx.beginPath();
      ctx.arc(renderWidth / 2, renderHeight / 2, radius, 0, Math.PI * 2);
      ctx.fillStyle = background;
      ctx.fill();
      ctx.strokeStyle = primary;
      ctx.lineWidth = kind === "earth" ? 1.25 : 1;
      ctx.stroke();
      ctx.restore();

      if (kind === "moon") {
        ctx.save();
        ctx.beginPath();
        ctx.arc(renderWidth / 2, renderHeight / 2, radius - 1, 0, Math.PI * 2);
        ctx.clip();

        ctx.strokeStyle = primary;
        ctx.globalAlpha = 0.32;
        ctx.lineWidth = 0.75;
        drawVisibleRings(moonGraticuleRings);
        ctx.stroke();

        if (surface === "detailed") {
          ctx.fillStyle = primary;
          ctx.globalAlpha = 0.34;
          ctx.beginPath();
          for (const dot of moonDots) {
            if (!isDotVisible(dot)) continue;
            const projected = projectVisiblePoint(dot);
            if (!projected) continue;
            ctx.moveTo(projected[0] + 0.9, projected[1]);
            ctx.arc(projected[0], projected[1], 0.9, 0, Math.PI * 2);
          }
          ctx.fill();

          for (const crater of moonCraters) {
            if (!isCoordinateVisible(crater.lng, crater.lat)) continue;
            const projected = projectVisiblePoint(createDot(crater.lng, crater.lat));
            if (!projected) continue;
            const [x, y] = projected;
            const craterRadius = radius * crater.radius;
            ctx.beginPath();
            ctx.arc(x, y, craterRadius, 0, Math.PI * 2);
            ctx.strokeStyle = primary;
            ctx.globalAlpha = 0.16 + crater.depth * 0.28;
            ctx.lineWidth = Math.max(0.8, radius * 0.004);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(x, y, craterRadius * 0.62, 0, Math.PI * 2);
            ctx.globalAlpha = 0.08 + crater.depth * 0.18;
            ctx.stroke();
          }
        }

        ctx.beginPath();
        ctx.arc(renderWidth / 2, renderHeight / 2, radius - 1, 0, Math.PI * 2);
        ctx.strokeStyle = primary;
        ctx.globalAlpha = 0.68;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.restore();
      }

      if (kind === "earth" && landFeatures) {
        ctx.strokeStyle = primary;
        ctx.globalAlpha = 0.22;
        ctx.lineWidth = 0.8;
        drawVisibleRings(earthGraticuleRings);
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.strokeStyle = primary;
        ctx.globalAlpha = 0.7;
        ctx.lineWidth = 0.8;
        drawVisibleRings(landRings);
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.fillStyle = primary;
        ctx.globalAlpha = 0.42;
        ctx.beginPath();
        for (const dot of dots) {
          if (!isDotVisible(dot)) continue;
          const projected = projectVisiblePoint(dot);
          if (!projected) continue;
          ctx.moveTo(projected[0] + 0.9, projected[1]);
          ctx.arc(projected[0], projected[1], 0.9, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    function animate(timestamp = 0) {
      if (cancelled || document.hidden) {
        animationStarted = false;
        return;
      }

      if (timestamp - lastFrameAt < minFrameDuration) {
        return;
      }

      lastFrameAt = timestamp;
      frame += kind === "earth" ? 0.18 : -0.18;
      const frameRadians = frame * degreesToRadians;
      frameCos = Math.cos(frameRadians);
      frameSin = Math.sin(frameRadians);
      draw();
    }

    function shouldAnimate() {
      if (prefersReducedMotion || !animated || !visualAnimationsEnabled) return false;
      return !hoverAnimationTrigger || hoverAnimationTrigger.matches(":hover") || hoverAnimationTrigger.matches(":focus-within");
    }

    function startRendering() {
      if (cancelled || document.hidden || animationStarted) return;
      if (!shouldAnimate()) {
        draw();
        return;
      }
      animationStarted = true;
      unsubscribeFrame = subscribeGlobeFrame(animate);
    }

    function stopRendering() {
      animationStarted = false;
      unsubscribeFrame?.();
      unsubscribeFrame = null;
    }

    function handleVisibilityChange() {
      if (document.hidden) stopRendering();
      else startRendering();
    }

    function handleHoverAnimationChange() {
      if (shouldAnimate()) startRendering();
      else stopRendering();
    }

    async function loadWorldData() {
      try {
        if (kind === "moon") {
          startRendering();
          return;
        }

        if (cachedLandFeatures) {
          landFeatures = cachedLandFeatures;
          if (!cachedLandRings) cachedLandRings = collectLandRings(landFeatures.features);
          landRings = cachedLandRings;
          if (!cachedEarthDots) {
            const generatedDots: DotData[] = [];
            dots = generatedDots;
            landFeatures.features.forEach(generateDots);
            cachedEarthDots = generatedDots;
          }
          dots = cachedEarthDots;
          startRendering();
          return;
        }

        const response = await fetch("https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/110m/physical/ne_110m_land.json");
        if (!response.ok) throw new Error("Failed to load land data");
        landFeatures = await response.json();
        cachedLandFeatures = landFeatures;
        cachedLandRings = landFeatures ? collectLandRings(landFeatures.features) : [];
        landRings = cachedLandRings;
        const generatedDots: DotData[] = [];
        dots = generatedDots;
        landFeatures?.features.forEach(generateDots);
        cachedEarthDots = generatedDots;
        if (!cancelled) {
          startRendering();
        }
      } catch {
        setError(true);
        draw();
      }
    }

    loadWorldData();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    hoverAnimationTrigger?.addEventListener("mouseenter", handleHoverAnimationChange);
    hoverAnimationTrigger?.addEventListener("mouseleave", handleHoverAnimationChange);
    hoverAnimationTrigger?.addEventListener("focusin", handleHoverAnimationChange);
    hoverAnimationTrigger?.addEventListener("focusout", handleHoverAnimationChange);

    return () => {
      cancelled = true;
      stopRendering();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      hoverAnimationTrigger?.removeEventListener("mouseenter", handleHoverAnimationChange);
      hoverAnimationTrigger?.removeEventListener("mouseleave", handleHoverAnimationChange);
      hoverAnimationTrigger?.removeEventListener("focusin", handleHoverAnimationChange);
      hoverAnimationTrigger?.removeEventListener("focusout", handleHoverAnimationChange);
    };
  }, [animateOnHoverWithinSelector, animated, className, height, kind, maxFps, surface, visualAnimationsEnabled, width]);

  return (
    <div className={cn("navigate-globe-canvas", className)}>
      <canvas ref={canvasRef} aria-hidden="true" />
      {error ? <div className="navigate-globe-canvas__fallback">Earth telemetry offline</div> : null}
    </div>
  );
}
