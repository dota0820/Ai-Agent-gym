"use client";
import { useEffect, useRef, useState } from "react";
import { isDark, themeColors, type Theme } from "@/lib/theme";
import type { Group as BodyGroup } from "@/lib/types";

export type BodyPart = Exclude<BodyGroup, "cardio" | "mobility">;

type V3 = [number, number, number];
/** A muscle zone painted onto the figure: which group, where it sits, how far it reaches. */
interface Zone {
  part: BodyPart;
  pos: V3;
  r: V3;
}

// The figure is scaled to 1.75 units tall, feet at y=0, facing +z.
// Zones are in that space; side zones are mirrored for left/right below.
const SIDE: Zone[] = [
  { part: "chest", pos: [0.08, 1.34, 0.1], r: [0.11, 0.085, 0.1] },
  { part: "shoulders", pos: [0.18, 1.38, -0.01], r: [0.07, 0.07, 0.1] },
  { part: "arms", pos: [0.2, 1.22, -0.03], r: [0.09, 0.14, 0.11] }, // upper arm
  { part: "arms", pos: [0.225, 0.98, 0.02], r: [0.09, 0.15, 0.1] }, // forearm
  { part: "core", pos: [0.1, 1.17, 0.02], r: [0.05, 0.09, 0.08] }, // obliques
  { part: "back", pos: [0.09, 1.31, -0.08], r: [0.1, 0.1, 0.08] }, // lats
  { part: "glutes", pos: [0.08, 1.0, -0.1], r: [0.11, 0.11, 0.1] },
  { part: "legs", pos: [0.13, 0.75, -0.01], r: [0.14, 0.23, 0.15] }, // thigh
  { part: "legs", pos: [0.15, 0.3, -0.02], r: [0.11, 0.21, 0.12] }, // lower leg
];
const CENTER: Zone[] = [
  { part: "core", pos: [0, 1.19, 0.08], r: [0.1, 0.1, 0.09] }, // abs
  { part: "core", pos: [0, 1.03, 0.08], r: [0.1, 0.07, 0.07] }, // lower abs
  { part: "back", pos: [0, 1.43, -0.07], r: [0.12, 0.06, 0.07] }, // traps
  { part: "back", pos: [0, 1.17, -0.08], r: [0.1, 0.08, 0.07] }, // lower back
];
const ZONES: Zone[] = [
  ...CENTER,
  ...SIDE.flatMap((z) => [z, { ...z, pos: [-z.pos[0], z.pos[1], z.pos[2]] as V3 }]),
];
const N = ZONES.length;

/** Where to turn the figure and aim the camera when a part is chosen. */
const FOCUS: Record<BodyPart, { rot: number; y: number }> = {
  chest: { rot: 0.25, y: 1.34 },
  core: { rot: -0.25, y: 1.17 },
  shoulders: { rot: 0.7, y: 1.38 },
  arms: { rot: 0.75, y: 1.12 },
  back: { rot: Math.PI - 0.3, y: 1.3 },
  glutes: { rot: Math.PI + 0.35, y: 1.0 },
  legs: { rot: 0.45, y: 0.55 },
};

const VERT_DECL = /* glsl */ `
varying vec3 vFig;
uniform mat4 uInvFig;
`;
const VERT_BODY = /* glsl */ `
vFig = (uInvFig * modelMatrix * vec4(transformed, 1.0)).xyz;
`;
const FRAG_DECL = /* glsl */ `
varying vec3 vFig;
uniform vec3 uC[${N}];
uniform vec3 uR[${N}];
uniform vec2 uW[${N}];
uniform vec3 uGlow;
uniform vec3 uPick;
uniform vec3 uRim;
uniform float uRimK;
uniform float uEm;
uniform float uReveal;
`;
// Runs just before lighting: paints zones onto the surface, adds an edge glow,
// and "materialises" the figure from the feet up.
const FRAG_BODY = /* glsl */ `
if (vFig.y > uReveal) discard;
{
  float fres = pow(1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), 2.2);
  totalEmissiveRadiance += uRim * fres * uRimK;
  for (int i = 0; i < ${N}; i++) {
    float k = 1.0 - smoothstep(0.5, 1.0, length((vFig - uC[i]) / uR[i]));
    vec3 col = mix(uGlow, uPick, uW[i].y);
    float a = k * uW[i].x;
    diffuseColor.rgb = mix(diffuseColor.rgb, col, clamp(a, 0.0, 0.92));
    totalEmissiveRadiance += col * a * uEm;
  }
  float edge = smoothstep(uReveal - 0.06, uReveal, vFig.y);
  totalEmissiveRadiance += uRim * edge * 2.5;
}
`;

/**
 * An animated 3D figure you can spin with a finger and tap to choose a body part.
 * Muscle zones glow on the surface; choosing one turns the figure and moves the
 * camera in. Calls onPick with the tapped part; `selected` keeps that part lit.
 */
export default function Body3D({
  selected,
  onPick,
  theme,
  onUnavailable,
}: {
  selected: BodyPart | null;
  onPick: (p: BodyPart) => void;
  theme: Theme;
  onUnavailable?: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const selectedRef = useRef(selected);
  const onPickRef = useRef(onPick);
  const onUnavailableRef = useRef(onUnavailable);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    selectedRef.current = selected;
    onPickRef.current = onPick;
    onUnavailableRef.current = onUnavailable;
  });

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const [THREE, { GLTFLoader }] = await Promise.all([
        import("three"),
        import("three/examples/jsm/loaders/GLTFLoader.js"),
      ]);
      if (disposed) return;
      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        onUnavailableRef.current?.();
        return;
      }
      const gltf = await new GLTFLoader().loadAsync("/models/xbot.glb");
      if (disposed) {
        renderer.dispose();
        return;
      }

      const tc = themeColors();
      const dark = isDark(theme);
      const col = (c: string) => new THREE.Color(c);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 30);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      el.appendChild(renderer.domElement);
      const c = renderer.domElement;
      c.style.touchAction = "pan-y";
      c.style.display = "block";
      c.style.cursor = "grab";

      scene.add(new THREE.AmbientLight(0xffffff, dark ? 0.7 : 1.5));
      const key = new THREE.DirectionalLight(0xffffff, dark ? 1.6 : 1.5);
      key.position.set(1.5, 2.6, 3);
      scene.add(key);
      const rim = new THREE.DirectionalLight(col(tc.primary), dark ? 2.2 : 0.8);
      rim.position.set(-2, 1.6, -2.5);
      scene.add(rim);

      // ── the figure ──
      const figure = new THREE.Group();
      scene.add(figure);
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const scale = 1.75 / (box.max.y - box.min.y);
      model.scale.setScalar(scale);
      model.position.set(
        -((box.min.x + box.max.x) / 2) * scale,
        -box.min.y * scale,
        -((box.min.z + box.max.z) / 2) * scale,
      );
      figure.add(model);

      const uniforms = {
        uInvFig: { value: new THREE.Matrix4() },
        uC: { value: ZONES.map((z) => new THREE.Vector3(...z.pos)) },
        uR: { value: ZONES.map((z) => new THREE.Vector3(...z.r)) },
        uW: { value: ZONES.map(() => new THREE.Vector2(0, 0)) },
        uGlow: { value: col(dark ? tc.muscle : tc.muscle2) },
        uPick: { value: col(dark ? tc.mint : tc.muscle) },
        uRim: { value: col(tc.primary) },
        uRimK: { value: dark ? 1.1 : 0.25 },
        uEm: { value: dark ? 0.9 : 0.12 },
        uReveal: { value: 0 },
      };
      const skinned: import("three").SkinnedMesh[] = [];
      model.traverse((o) => {
        const m = o as import("three").SkinnedMesh;
        if (!m.isMesh) return;
        const isJoint = /joint/i.test(m.name) || /joint/i.test((m.material as { name?: string }).name ?? "");
        const mat = new THREE.MeshStandardMaterial({
          color: isJoint ? col(dark ? tc.muscle2 : tc.muscle2) : col(tc.body),
          roughness: isJoint ? 0.35 : 0.55,
          metalness: dark ? 0.55 : 0.1,
        });
        mat.onBeforeCompile = (shader) => {
          Object.assign(shader.uniforms, uniforms);
          shader.vertexShader = shader.vertexShader
            .replace("#include <common>", `#include <common>\n${VERT_DECL}`)
            .replace("#include <project_vertex>", `#include <project_vertex>\n${VERT_BODY}`);
          shader.fragmentShader = shader.fragmentShader
            .replace("#include <common>", `#include <common>\n${FRAG_DECL}`)
            .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\n${FRAG_BODY}`);
        };
        m.material = mat;
        m.frustumCulled = false;
        if (m.isSkinnedMesh) skinned.push(m);
      });

      const mixer = new THREE.AnimationMixer(model);
      const idle = gltf.animations.find((a) => a.name === "idle") ?? gltf.animations[0];
      if (idle) mixer.clipAction(idle).play();
      mixer.update(0);

      // ── stage: rings, grid, floating particles, scan ring ──
      const stage = new THREE.Group();
      scene.add(stage);
      const lineColor = col(tc.primary);
      const ringMat = (opacity: number) =>
        new THREE.MeshBasicMaterial({
          color: lineColor,
          transparent: true,
          opacity,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
      const dashRing = (r0: number, r1: number, parts: number, gap: number, opacity: number) => {
        const g = new THREE.Group();
        const arc = (Math.PI * 2) / parts;
        for (let i = 0; i < parts; i++) {
          const seg = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 24, 1, i * arc, arc * (1 - gap)), ringMat(opacity));
          g.add(seg);
        }
        g.rotation.x = -Math.PI / 2;
        g.position.y = 0.004;
        stage.add(g);
        return g;
      };
      const ringA = dashRing(0.46, 0.485, 3, 0.18, dark ? 0.8 : 0.5);
      const ringB = dashRing(0.6, 0.607, 24, 0.5, dark ? 0.55 : 0.3);
      const ringC = dashRing(0.72, 0.724, 1, 0, dark ? 0.25 : 0.15);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.46, 48), ringMat(dark ? 0.09 : 0.06));
      disc.rotation.x = -Math.PI / 2;
      stage.add(disc);

      const scan = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.0035, 8, 72), ringMat(dark ? 0.8 : 0.45));
      scan.rotation.x = Math.PI / 2;
      stage.add(scan);

      const P = 70;
      const pPos = new Float32Array(P * 3);
      const pSeed = new Float32Array(P);
      for (let i = 0; i < P; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 0.45 + Math.random() * 0.45;
        pPos.set([Math.cos(a) * r, Math.random() * 1.9, Math.sin(a) * r], i * 3);
        pSeed[i] = 0.06 + Math.random() * 0.12;
      }
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
      const particles = new THREE.Points(
        pGeo,
        new THREE.PointsMaterial({
          color: lineColor,
          size: 0.018,
          transparent: true,
          opacity: dark ? 0.75 : 0.4,
          depthWrite: false,
          blending: dark ? THREE.AdditiveBlending : THREE.NormalBlending,
        }),
      );
      stage.add(particles);

      // burst ring shown where a part is picked
      const burst = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), ringMat(0));
      scene.add(burst);
      let burstT = 1;

      // ── sizing ──
      const resize = () => {
        const w = el.clientWidth;
        const h = el.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        c.style.width = "100%";
        c.style.height = "100%";
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(el);

      // ── interaction: drag to spin, tap to pick ──
      const ray = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      const inv = new THREE.Matrix4();
      const local = new THREE.Vector3();
      let hover: BodyPart | null = null;
      let dragging = false;
      let moved = 0;
      let lastX = 0;
      let velocity = 0;
      let touched = false;
      let rotY = -0.6;
      let lastHover = 0;

      /** Which zone a figure-space point belongs to (nearest zone it falls inside). */
      const zoneAt = (p: import("three").Vector3): BodyPart | null => {
        let best: BodyPart | null = null;
        let bestD = 1.15;
        for (const z of ZONES) {
          const d = Math.hypot((p.x - z.pos[0]) / z.r[0], (p.y - z.pos[1]) / z.r[1], (p.z - z.pos[2]) / z.r[2]);
          if (d < bestD) {
            bestD = d;
            best = z.part;
          }
        }
        return best;
      };
      const hitAt = (e: PointerEvent) => {
        const r = c.getBoundingClientRect();
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        for (const m of skinned) {
          m.computeBoundingSphere();
          m.computeBoundingBox();
        }
        const hit = ray.intersectObjects(skinned, false)[0];
        if (!hit) return null;
        figure.updateMatrixWorld();
        local.copy(hit.point).applyMatrix4(inv.copy(figure.matrixWorld).invert());
        return { part: zoneAt(local), point: hit.point.clone() };
      };
      const down = (e: PointerEvent) => {
        dragging = true;
        touched = true;
        moved = 0;
        lastX = e.clientX;
        velocity = 0;
        c.style.cursor = "grabbing";
      };
      const move = (e: PointerEvent) => {
        if (dragging) {
          const dx = e.clientX - lastX;
          lastX = e.clientX;
          moved += Math.abs(dx);
          velocity = dx * 0.011;
          rotY += velocity;
          rotTarget = null;
        } else if (e.pointerType === "mouse" && performance.now() - lastHover > 90) {
          lastHover = performance.now();
          hover = hitAt(e)?.part ?? null;
          c.style.cursor = hover ? "pointer" : "grab";
        }
      };
      const up = (e: PointerEvent) => {
        if (!dragging) return;
        dragging = false;
        c.style.cursor = "grab";
        if (moved < 8) {
          const h = hitAt(e);
          if (h?.part) {
            burst.position.copy(h.point);
            burstT = 0;
            onPickRef.current(h.part);
          }
        }
      };
      const leave = () => {
        dragging = false;
        hover = null;
      };
      c.addEventListener("pointerdown", down);
      c.addEventListener("pointermove", move);
      c.addEventListener("pointerup", up);
      c.addEventListener("pointerleave", leave);
      c.addEventListener("pointercancel", leave);

      // ── render loop (paused while off-screen) ──
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let visible = true;
      const io = new IntersectionObserver(([en]) => (visible = en.isIntersecting));
      io.observe(el);
      let lastT = performance.now();
      let t = 0;
      let lastSel: BodyPart | null = null;
      let rotTarget: number | null = null;
      const cam = { y: 0.95, z: 4.1, lookY: 0.9 };
      const camGoal = { y: 0.98, z: 3.5, lookY: 0.88 };
      const weights = uniforms.uW.value;
      let raf = 0;

      const frame = () => {
        raf = requestAnimationFrame(frame);
        const nowT = performance.now();
        const dt = Math.min((nowT - lastT) / 1000, 0.05);
        lastT = nowT;
        if (!visible || document.hidden) return;
        t += dt;
        if (!reduced) mixer.update(dt);

        // selection changed: turn to show it and move the camera in
        const sel = selectedRef.current;
        if (sel !== lastSel) {
          lastSel = sel;
          if (sel) {
            const f = FOCUS[sel];
            // shortest way round to the target angle
            const turns = Math.round((rotY - f.rot) / (Math.PI * 2));
            rotTarget = f.rot + turns * Math.PI * 2;
            // aim a little below the part so it sits in the upper half, above the question sheet
            Object.assign(camGoal, { y: f.y - 0.05, z: 2.35, lookY: f.y - 0.28 });
            velocity = 0;
            touched = true;
          } else {
            rotTarget = null;
            Object.assign(camGoal, { y: 0.98, z: 3.5, lookY: 0.88 });
          }
        }
        if (!dragging) {
          if (rotTarget !== null) rotY += (rotTarget - rotY) * Math.min(1, dt * 4);
          else {
            rotY += velocity;
            velocity *= 0.93;
            if (!touched && !reduced) rotY += dt * 0.35;
          }
        }
        figure.rotation.y = rotY;
        figure.updateMatrixWorld();
        uniforms.uInvFig.value.copy(figure.matrixWorld).invert();

        const ease = Math.min(1, dt * 3.2);
        cam.y += (camGoal.y - cam.y) * ease;
        cam.z += (camGoal.z - cam.z) * ease;
        cam.lookY += (camGoal.lookY - cam.lookY) * ease;
        camera.position.set(0, cam.y, cam.z);
        camera.lookAt(0, cam.lookY, 0);

        // materialise from the feet up, then keep everything visible
        uniforms.uReveal.value = reduced ? 9 : Math.min(9, uniforms.uReveal.value + dt * (uniforms.uReveal.value < 1.9 ? 1.5 : 20));

        for (let i = 0; i < N; i++) {
          const z = ZONES[i];
          const isSel = z.part === sel;
          const isHover = z.part === hover;
          // idle: a soft wave travelling up the body hints that zones are tappable
          const wave = 0.16 + 0.12 * Math.max(0, Math.sin(t * 1.6 - z.pos[1] * 4));
          const goalW = isSel ? 0.85 + 0.12 * Math.sin(t * 5) : isHover ? 0.6 : sel ? 0.06 : wave;
          weights[i].x += (goalW - weights[i].x) * Math.min(1, dt * 8);
          weights[i].y += ((isSel ? 1 : 0) - weights[i].y) * Math.min(1, dt * 8);
        }

        ringA.rotation.z = t * 0.5;
        ringB.rotation.z = -t * 0.25;
        ringC.scale.setScalar(1 + 0.04 * Math.sin(t * 2));
        scan.position.y = 0.92 + Math.sin(t * 0.9) * 0.86;
        const pa = pGeo.attributes.position as import("three").BufferAttribute;
        for (let i = 0; i < P; i++) {
          let y = pa.getY(i) + pSeed[i] * dt;
          if (y > 1.95) y = 0;
          pa.setY(i, y);
        }
        pa.needsUpdate = true;
        particles.rotation.y = t * 0.06;

        if (burstT < 1) {
          burstT += dt * 2.2;
          const k = Math.min(1, burstT);
          burst.scale.setScalar(0.03 + k * 0.22);
          (burst.material as import("three").MeshBasicMaterial).opacity = (1 - k) * 0.9;
          burst.lookAt(camera.position);
        }
        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(frame);
      setLoading(false);

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        c.removeEventListener("pointerdown", down);
        c.removeEventListener("pointermove", move);
        c.removeEventListener("pointerup", up);
        c.removeEventListener("pointerleave", leave);
        c.removeEventListener("pointercancel", leave);
        mixer.stopAllAction();
        scene.traverse((o) => {
          const mesh = o as import("three").Mesh;
          if (mesh.isMesh || (o as import("three").Points).isPoints) {
            mesh.geometry.dispose();
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((m) => m.dispose());
          }
        });
        renderer.dispose();
        c.remove();
      };
      if (disposed) cleanup();
    })().catch((err) => {
      console.error("3D body failed", err);
      onUnavailableRef.current?.();
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [theme]);

  return (
    <div
      ref={host}
      className="relative h-full w-full"
      role="img"
      aria-label="可以转动的 3D 人体模型,点一下身体部位来选择要练哪里"
    >
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-sub">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-primary" />
          正在加载 3D 模型…
        </div>
      )}
    </div>
  );
}
