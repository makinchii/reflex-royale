"use client"

import * as React from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useTheme } from "@/components/theme"
import * as THREE from "three"

// Convert hex to THREE.Color
function hexToThreeColor(hex: string): THREE.Color {
  return new THREE.Color(hex)
}

// Memoized shaders outside component to avoid recreation
const gridVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const gridFragmentShader = `
  uniform float uTime;
  uniform float uHorizonLinesOnly;
  uniform float uOpacity;
  uniform vec3 uColor;
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    // Create grid lines
    vec2 grid = abs(fract(vPosition.xz * 0.5 - 0.5) - 0.5) / fwidth(vPosition.xz * 0.5);
    float line = min(grid.x, grid.y);
    float gridLine = mix(1.0 - min(line, 1.0), 1.0 - min(grid.x, 1.0), uHorizonLinesOnly);

    // Distance fade
    float dist = length(vPosition.xz) / 180.0;
    float fade = 1.0 - smoothstep(0.0, 1.0, dist);

    // Pulse effect
    float pulse = sin(uTime * 2.0 - length(vPosition.xz) * 0.3) * 0.2 + 0.8;

    // Combine
    float alpha = gridLine * fade * pulse * uOpacity;

    gl_FragColor = vec4(uColor, alpha);
  }
`

// Grid floor component
function GridPlane({
  color,
  horizonLinesOnly = false,
  opacity = 0.6,
  position,
  rotation,
}: {
  color: string
  horizonLinesOnly?: boolean
  opacity?: number
  position: [number, number, number]
  rotation: [number, number, number]
}) {
  const meshRef = React.useRef<THREE.Mesh>(null)
  const materialRef = React.useRef<THREE.ShaderMaterial>(null)

  // Keep a ref to the latest color - updated synchronously during render
  const colorRef = React.useRef(color)
  colorRef.current = color

  // Create uniforms object once using useMemo
  const uniforms = React.useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: hexToThreeColor(color) },
      uHorizonLinesOnly: { value: horizonLinesOnly ? 1 : 0 },
      uOpacity: { value: opacity },
    }),
    [horizonLinesOnly, opacity]
  )

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
      materialRef.current.uniforms.uColor.value.set(colorRef.current)
      materialRef.current.uniforms.uHorizonLinesOnly.value = horizonLinesOnly ? 1 : 0
      materialRef.current.uniforms.uOpacity.value = opacity
    }
  })

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (meshRef.current) {
        meshRef.current.geometry?.dispose()
        if (meshRef.current.material) {
          const mat = meshRef.current.material as THREE.Material
          mat.dispose()
        }
      }
    }
  }, [])

  return (
    <mesh ref={meshRef} rotation={rotation} position={position}>
      {/* Reduced segments from 100x100 to 50x50 - grid shader doesn't need high tessellation */}
      <planeGeometry args={[420, 420, 112, 112]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={gridVertexShader}
        fragmentShader={gridFragmentShader}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

function GridFloor({ color }: { color: string }) {
  return <GridPlane color={color} position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]} />
}

function CeilingGrid({ color }: { color: string }) {
  return <GridPlane color={color} horizonLinesOnly opacity={0.32} position={[0, 38, -44]} rotation={[-Math.PI / 2, 0, 0]} />
}

// Floating particles - optimized with less frequent position updates
function Particles({ color, count = 100, opacity = 0.72 }: { color: string; count?: number; opacity?: number }) {
  const pointsRef = React.useRef<THREE.Points>(null)
  const geometryRef = React.useRef<THREE.BufferGeometry>(null)
  const materialRef = React.useRef<THREE.PointsMaterial>(null)

  // Store initial Y positions for oscillation
  const initialYPositions = React.useRef<Float32Array | null>(null)

  const particlesPosition = React.useMemo(() => {
    const positions = new Float32Array(count * 3)
    const initialY = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 150
      positions[i * 3 + 1] = Math.random() * 20 - 1
      positions[i * 3 + 2] = Math.random() * -150 + 35
      initialY[i] = positions[i * 3 + 1]
    }
    initialYPositions.current = initialY
    return positions
  }, [count])

  React.useEffect(() => {
    if (geometryRef.current) {
      geometryRef.current.setAttribute(
        "position",
        new THREE.BufferAttribute(particlesPosition, 3)
      )
    }
  }, [particlesPosition])

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      geometryRef.current?.dispose()
      materialRef.current?.dispose()
    }
  }, [])

  useFrame((state) => {
    if (pointsRef.current && geometryRef.current && initialYPositions.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02

      // Only update positions every 2nd frame for performance
      if (Math.floor(state.clock.elapsedTime * 60) % 2 === 0) {
        const positionAttr = geometryRef.current.attributes.position
        if (positionAttr) {
          const positions = positionAttr.array as Float32Array
          const time = state.clock.elapsedTime
          for (let i = 0; i < count; i++) {
            // Use sin with initial position instead of cumulative addition
            positions[i * 3 + 1] = initialYPositions.current[i] + Math.sin(time + i * 0.1) * 0.5
          }
          positionAttr.needsUpdate = true
        }
      }
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry ref={geometryRef} />
      <pointsMaterial
        ref={materialRef}
        color={color}
        size={0.05}
        transparent
        opacity={opacity}
        sizeAttenuation
      />
    </points>
  )
}

// Light beams using InstancedMesh for better performance
const BEAM_POSITIONS: [number, number, number][] = [
  [-188, 28, -24],
  [-74, 28, -32],
  [52, 28, -42],
  [178, 28, -54],
  [-132, 28, -82],
  [12, 28, -76],
  [138, 28, -102],
  [-210, 28, -128],
  [-44, 28, -136],
  [88, 28, -154],
  [214, 28, -142],
  [-154, 28, -188],
  [0, 28, -206],
  [166, 28, -222],
  [-226, 28, -246],
  [-92, 28, -268],
  [64, 28, -252],
  [214, 28, -286],
  [-178, 28, -326],
  [-22, 28, -312],
  [126, 28, -344],
  [232, 28, -334],
]

const BEAM_HEIGHT = 280

function LightBeams({ color, opacity = 0.42, thickness = 0.045 }: { color: string; opacity?: number; thickness?: number }) {
  const meshRef = React.useRef<THREE.InstancedMesh>(null)
  const innerGlowRef = React.useRef<THREE.InstancedMesh>(null)
  const outerGlowRef = React.useRef<THREE.InstancedMesh>(null)
  const materialRef = React.useRef<THREE.MeshBasicMaterial>(null)
  const innerGlowMaterialRef = React.useRef<THREE.MeshBasicMaterial>(null)
  const outerGlowMaterialRef = React.useRef<THREE.MeshBasicMaterial>(null)

  // Setup instance matrices once
  React.useEffect(() => {
    if (meshRef.current) {
      const matrix = new THREE.Matrix4()
      BEAM_POSITIONS.forEach((pos, i) => {
        matrix.setPosition(pos[0], pos[1], pos[2])
        meshRef.current!.setMatrixAt(i, matrix)
        innerGlowRef.current?.setMatrixAt(i, matrix)
        outerGlowRef.current?.setMatrixAt(i, matrix)
      })
      meshRef.current.instanceMatrix.needsUpdate = true
      if (innerGlowRef.current) innerGlowRef.current.instanceMatrix.needsUpdate = true
      if (outerGlowRef.current) outerGlowRef.current.instanceMatrix.needsUpdate = true
    }
  }, [])

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (meshRef.current) {
        meshRef.current.geometry?.dispose()
        innerGlowRef.current?.geometry?.dispose()
        outerGlowRef.current?.geometry?.dispose()
        materialRef.current?.dispose()
        innerGlowMaterialRef.current?.dispose()
        outerGlowMaterialRef.current?.dispose()
      }
    }
  }, [])

  useFrame((state) => {
    const pulse = Math.sin(state.clock.elapsedTime * 1.4)
    if (materialRef.current) {
      // Animate opacity for all beams at once
      materialRef.current.opacity = opacity + pulse * 0.1
    }
    if (innerGlowMaterialRef.current) innerGlowMaterialRef.current.opacity = opacity * 0.26 + pulse * 0.04
    if (outerGlowMaterialRef.current) outerGlowMaterialRef.current.opacity = opacity * 0.13 + pulse * 0.025
  })

  return (
    <>
      <instancedMesh ref={outerGlowRef} args={[undefined, undefined, BEAM_POSITIONS.length]} renderOrder={1}>
        <cylinderGeometry args={[thickness * 7, thickness * 7, BEAM_HEIGHT, 14]} />
        <meshBasicMaterial
          ref={outerGlowMaterialRef}
          blending={THREE.AdditiveBlending}
          color={color}
          depthWrite={false}
          fog={false}
          opacity={opacity * 0.13}
          transparent
        />
      </instancedMesh>
      <instancedMesh ref={innerGlowRef} args={[undefined, undefined, BEAM_POSITIONS.length]} renderOrder={2}>
        <cylinderGeometry args={[thickness * 3.8, thickness * 3.8, BEAM_HEIGHT, 12]} />
        <meshBasicMaterial
          ref={innerGlowMaterialRef}
          blending={THREE.AdditiveBlending}
          color={color}
          depthWrite={false}
          fog={false}
          opacity={opacity * 0.26}
          transparent
        />
      </instancedMesh>
      <instancedMesh ref={meshRef} args={[undefined, undefined, BEAM_POSITIONS.length]} renderOrder={3}>
        <cylinderGeometry args={[thickness, thickness, BEAM_HEIGHT, 8]} />
        <meshBasicMaterial ref={materialRef} blending={THREE.AdditiveBlending} color={color} depthWrite={false} fog={false} transparent opacity={opacity} />
      </instancedMesh>
    </>
  )
}

type BackgroundMoonConfig = {
  position: [number, number, number]
  scale: number
  spin: number
  opacity: number
  tilt: [number, number, number]
}

type BackgroundMoonCandidate = BackgroundMoonConfig & {
  spacing: number
}

const BACKGROUND_MOON_SEED = 73471

type BackgroundMoonLayer = {
  count: number
  attempts: number
  x: [number, number]
  y: [number, number]
  z: [number, number]
  scale: [number, number]
  opacity: [number, number]
  spacing: number
  spin: [number, number]
}

const BACKGROUND_MOON_LAYERS: BackgroundMoonLayer[] = [
  {
    count: 22,
    attempts: 560,
    x: [-175, 175],
    y: [-18, 72],
    z: [-48, -138],
    scale: [5.6, 10.2],
    opacity: [0.78, 0.94],
    spacing: 36,
    spin: [0.008, 0.016],
  },
  {
    count: 42,
    attempts: 1100,
    x: [-200, 200],
    y: [-28, 84],
    z: [-140, -245],
    scale: [3.6, 6.8],
    opacity: [0.43, 0.6],
    spacing: 22,
    spin: [0.005, 0.01],
  },
  {
    count: 66,
    attempts: 1800,
    x: [-220, 220],
    y: [-34, 92],
    z: [-248, -360],
    scale: [1.8, 4.2],
    opacity: [0.18, 0.34],
    spacing: 13,
    spin: [0.003, 0.006],
  },
]

function createSeededRandom(seed: number) {
  let value = seed
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296
    return value / 4294967296
  }
}

function isReservedMoonGridSpace(position: [number, number, number], scale: number) {
  const [x, y, z] = position
  const titleSafeZone = scale > 6.5 && x > -90 && x < 95 && y > 0 && y < 72 && z > -170 && z < -35
  const lowerCenterSafeZone = scale > 5 && x > -95 && x < 100 && y < 10 && z < -120

  return titleSafeZone || lowerCenterSafeZone
}

function getMoonGridDistance(a: BackgroundMoonCandidate, b: BackgroundMoonCandidate) {
  const dx = a.position[0] - b.position[0]
  const dy = (a.position[1] - b.position[1]) * 1.45
  const dz = (a.position[2] - b.position[2]) * 0.38
  return Math.hypot(dx, dy, dz)
}

function isMoonCandidateSpaced(candidate: BackgroundMoonCandidate, moons: BackgroundMoonCandidate[]) {
  return moons.every((moon) => {
    const scaleSpacing = (candidate.scale + moon.scale) * 1.15
    return getMoonGridDistance(candidate, moon) >= Math.max(candidate.spacing, moon.spacing) + scaleSpacing
  })
}

function generateBackgroundMoons() {
  const random = createSeededRandom(BACKGROUND_MOON_SEED)
  const moons: BackgroundMoonCandidate[] = []

  BACKGROUND_MOON_LAYERS.forEach((layer) => {
    let acceptedInLayer = 0

    for (let attempt = 0; attempt < layer.attempts && acceptedInLayer < layer.count; attempt += 1) {
      const position: [number, number, number] = [
        layer.x[0] + random() * (layer.x[1] - layer.x[0]),
        layer.y[0] + random() * (layer.y[1] - layer.y[0]),
        layer.z[0] + random() * (layer.z[1] - layer.z[0]),
      ]
      const scale = layer.scale[0] + random() * (layer.scale[1] - layer.scale[0])

      if (isReservedMoonGridSpace(position, scale)) continue

      const spinSpeed = layer.spin[0] + random() * (layer.spin[1] - layer.spin[0])
      const candidate: BackgroundMoonCandidate = {
        spacing: layer.spacing,
        position,
        scale,
        spin: (random() > 0.5 ? 1 : -1) * spinSpeed,
        opacity: layer.opacity[0] + random() * (layer.opacity[1] - layer.opacity[0]),
        tilt: [random() * 0.56 - 0.28, random() * 0.84 - 0.42, random() * 0.44 - 0.22],
      }

      if (isMoonCandidateSpaced(candidate, moons)) {
        moons.push(candidate)
        acceptedInLayer += 1
      }
    }
  })

  return moons.map((moon) => ({
    position: moon.position,
    scale: moon.scale,
    spin: moon.spin,
    opacity: moon.opacity,
    tilt: moon.tilt,
  }))
}

const moonGridLines = createMoonGridLines()

function createMoonGridLines() {
  const lines: THREE.Vector3[][] = []
  const segments = 72
  const latitudeAngles = [-60, -40, -20, 0, 20, 40, 60]
  const longitudeAngles = Array.from({ length: 12 }, (_, index) => index * 15)

  latitudeAngles.forEach((latitude) => {
    const latitudeRadians = THREE.MathUtils.degToRad(latitude)
    const y = Math.sin(latitudeRadians)
    const radius = Math.cos(latitudeRadians)
    const points: THREE.Vector3[] = []

    for (let index = 0; index <= segments; index += 1) {
      const theta = (index / segments) * Math.PI * 2
      points.push(new THREE.Vector3(Math.cos(theta) * radius, y, Math.sin(theta) * radius))
    }

    lines.push(points)
  })

  longitudeAngles.forEach((longitude) => {
    const longitudeRadians = THREE.MathUtils.degToRad(longitude)
    const points: THREE.Vector3[] = []

    for (let index = 0; index <= segments; index += 1) {
      const phi = -Math.PI / 2 + (index / segments) * Math.PI
      const radius = Math.cos(phi)
      points.push(new THREE.Vector3(Math.cos(longitudeRadians) * radius, Math.sin(phi), Math.sin(longitudeRadians) * radius))
    }

    lines.push(points)
  })

  return lines.map((points) => new THREE.BufferGeometry().setFromPoints(points))
}

function MoonLine({ color, geometry, opacity }: { color: string; geometry: THREE.BufferGeometry; opacity: number }) {
  const line = React.useMemo(() => {
    const material = new THREE.LineBasicMaterial({ color, depthWrite: false, fog: false, opacity, transparent: true })
    return new THREE.Line(geometry, material)
  }, [color, geometry, opacity])

  React.useEffect(() => {
    return () => {
      ;(line.material as THREE.Material).dispose()
    }
  }, [line])

  return <primitive object={line} />
}

function MoonBody({ color, visibility }: { color: string; visibility: number }) {
  const bodyColor = React.useMemo(() => new THREE.Color(color).multiplyScalar(0.035 + visibility * 0.085), [color, visibility])

  return (
    <mesh>
      <sphereGeometry args={[1, 48, 24]} />
      <meshStandardMaterial color={bodyColor} emissive={color} emissiveIntensity={0.06 + visibility * 0.16} fog={false} roughness={0.72} />
    </mesh>
  )
}

function MoonRimGlow({ color, visibility }: { color: string; visibility: number }) {
  return (
    <>
      <mesh>
        <sphereGeometry args={[1.018, 48, 16]} />
        <meshBasicMaterial color={color} depthWrite={false} fog={false} opacity={0.08 + visibility * 0.16} side={THREE.BackSide} transparent />
      </mesh>
      <mesh scale={1.055}>
        <sphereGeometry args={[1, 48, 16]} />
        <meshBasicMaterial color={color} depthWrite={false} fog={false} opacity={0.035 + visibility * 0.075} side={THREE.BackSide} transparent />
      </mesh>
    </>
  )
}

function MoonGridLines({ color, opacity }: { color: string; opacity: number }) {
  return (
    <>
      {moonGridLines.map((geometry, index) => (
        <MoonLine key={index} color={color} geometry={geometry} opacity={opacity} />
      ))}
    </>
  )
}

function BackgroundMoon({ color, moon, spin }: { color: string; moon: BackgroundMoonConfig; spin: boolean }) {
  const groupRef = React.useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!spin || !groupRef.current) return
    const time = state.clock.elapsedTime * moon.spin
    groupRef.current.rotation.set(moon.tilt[0] + time * 0.35, moon.tilt[1] + time, moon.tilt[2] + time * 0.18)
  })

  return (
    <group ref={groupRef} position={moon.position} scale={moon.scale} rotation={moon.tilt}>
      <MoonBody color={color} visibility={moon.opacity} />
      <MoonRimGlow color={color} visibility={moon.opacity} />
      <group scale={1.04}>
        <MoonGridLines color={color} opacity={0.04 + moon.opacity * 0.2} />
      </group>
      <group scale={1.012}>
        <MoonGridLines color={color} opacity={0.08 + moon.opacity * 0.78} />
      </group>
    </group>
  )
}

function BackgroundMoons({ color, spin = true }: { color: string; spin?: boolean }) {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false)
  const moons = React.useMemo(() => generateBackgroundMoons(), [])

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches)
    updatePreference()
    mediaQuery.addEventListener("change", updatePreference)
    return () => mediaQuery.removeEventListener("change", updatePreference)
  }, [])

  return (
    <group>
      {moons.map((moon) => (
        <BackgroundMoon key={moon.position.join(",")} color={color} moon={moon} spin={spin && !prefersReducedMotion} />
      ))}
    </group>
  )
}

// Camera controller with cached far-horizon target
const HORIZON_TARGET = new THREE.Vector3(0, -1.4, -95)

function SceneSway({
  amplitude,
  speed,
  children,
}: {
  amplitude: number
  speed: number
  children: React.ReactNode
}) {
  const groupRef = React.useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!groupRef.current) return

    const time = state.clock.elapsedTime * speed
    const sway = amplitude * 0.55

    groupRef.current.position.x = Math.sin(time) * (1.5 + sway * 4)
    groupRef.current.position.z = Math.cos(time * 0.7) * (1 + sway * 2)
    groupRef.current.rotation.z = Math.sin(time * 0.8) * (0.01 + amplitude * 0.02)
    groupRef.current.rotation.y = Math.sin(time * 0.5) * (0.008 + amplitude * 0.015)
  })

  return <group ref={groupRef}>{children}</group>
}

function CameraController() {
  const { camera } = useThree()

  useFrame(() => {
    camera.position.set(0, 7.2, 28)
    camera.lookAt(HORIZON_TARGET)
  })

  return null
}

// Theme colors - hoisted outside component
const themeColors: Record<string, string> = {
  ares: "#ff3333",
  tron: "#00d4ff",
  clu: "#ff6600",
  athena: "#ffd700",
  aphrodite: "#ff1493",
  poseidon: "#0066ff",
}

// Main 3D scene component
interface Grid3DProps {
  className?: string
  enableParticles?: boolean
  enableBeams?: boolean
  cameraAnimation?: boolean
  sway?: number
  swaySpeed?: number
  particleCount?: number
  particleOpacity?: number
  beamOpacity?: number
  beamThickness?: number
  backgroundMoons?: boolean
  moonSpin?: boolean
}

export function Grid3D({
  className,
  enableParticles = true,
  enableBeams = true,
  cameraAnimation = true,
  sway = 0.45,
  swaySpeed = 0.5,
  particleCount = 180,
  particleOpacity = 0.72,
  beamOpacity = 0.42,
  beamThickness = 0.045,
  backgroundMoons = true,
  moonSpin = true,
}: Grid3DProps) {
  const { theme } = useTheme()
  const cssPrimary = typeof window !== "undefined" ? getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() : ""
  const color = themeColors[theme] || cssPrimary || themeColors.tron

  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 7.2, 28], fov: 48, far: 720 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        dpr={[1, 2]} // Limit DPR to max 2 for performance
        style={{ background: "transparent", pointerEvents: "none" }}
      >
        <fog attach="fog" args={["#000", 36, 260]} />

        {cameraAnimation && <CameraController />}

        <SceneSway amplitude={sway} speed={swaySpeed}>
          {backgroundMoons && <BackgroundMoons color={color} spin={moonSpin} />}

          <CeilingGrid color={color} />

          <GridFloor color={color} />

          {enableParticles && <Particles color={color} count={particleCount} opacity={particleOpacity} />}

          {enableBeams && <LightBeams color={color} opacity={beamOpacity} thickness={beamThickness} />}
        </SceneSway>

        <ambientLight intensity={0.1} />
        <pointLight position={[0, 10, 0]} color={color} intensity={1.6} />
      </Canvas>
    </div>
  )
}
