"use client";
import { useEffect, useRef, useState } from "react";
import { isDark, themeColors, type Theme } from "@/lib/theme";
import type { Group as BodyGroup } from "@/lib/types";

export type BodyPart = Exclude<BodyGroup, "cardio">;

type V3 = [number, number, number];
/** One clickable muscle pad: which group it belongs to, where it sits, how big it is. */
interface Pad {
  part: BodyPart;
  pos: V3;
  scale: V3;
}

// Figure is ~1.75 units tall, feet at y=0, facing +z. Left/right pads are mirrored below.
const SIDE: Pad[] = [
  { part: "chest", pos: [0.078, 1.3, 0.1], scale: [0.095, 0.072, 0.045] },
  { part: "shoulders", pos: [0.222, 1.4, 0], scale: [0.072, 0.068, 0.075] },
  { part: "arms", pos: [0.245, 1.23, 0.028], scale: [0.042, 0.095, 0.04] }, // biceps
  { part: "arms", pos: [0.245, 1.23, -0.03], scale: [0.042, 0.1, 0.04] }, // triceps
  { part: "arms", pos: [0.27, 0.99, 0], scale: [0.038, 0.115, 0.038] }, // forearm
  { part: "core", pos: [0.128, 1.04, 0.05], scale: [0.04, 0.105, 0.06] }, // obliques
  { part: "back", pos: [0.09, 1.2, -0.095], scale: [0.088, 0.145, 0.045] }, // lats
  { part: "glutes", pos: [0.082, 0.87, -0.085], scale: [0.088, 0.085, 0.075] },
  { part: "legs", pos: [0.095, 0.62, 0.048], scale: [0.066, 0.175, 0.05] }, // quads
  { part: "legs", pos: [0.095, 0.62, -0.05], scale: [0.062, 0.165, 0.048] }, // hamstrings
  { part: "legs", pos: [0.095, 0.3, -0.03], scale: [0.048, 0.115, 0.045] }, // calves
];
const CENTER: Pad[] = [
  { part: "core", pos: [0, 1.05, 0.1], scale: [0.085, 0.135, 0.04] }, // abs
  { part: "back", pos: [0, 1.43, -0.065], scale: [0.13, 0.07, 0.045] }, // traps
  { part: "back", pos: [0, 1.0, -0.095], scale: [0.092, 0.075, 0.04] }, // lower back
];
const PADS: Pad[] = [
  ...CENTER,
  ...SIDE.flatMap((p) => [p, { ...p, pos: [-p.pos[0], p.pos[1], p.pos[2]] as V3 }]),
];

/**
 * A stylised 3D figure you can spin with a finger and tap to choose a body part.
 * Calls onPick with the tapped part; `selected` keeps that part lit.
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
      const THREE = await import("three");
      if (disposed) return;
      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        onUnavailableRef.current?.();
        return;
      }
      const tc = themeColors();
      const glow = isDark(theme);
      const hex = (c: string) => new THREE.Color(c).getHex();
      const colors = {
        body: hex(tc.body),
        wire: hex(glow ? tc.muscle2 : tc.line),
        pad: hex(tc.muscle2),
        hot: hex(tc.muscle),
        pick: hex(glow ? tc.mint : tc.muscle),
        ring: hex(tc.primary),
      };
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
      camera.position.set(0, 0.98, 3.3);
      camera.lookAt(0, 0.88, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      el.appendChild(renderer.domElement);
      renderer.domElement.style.touchAction = "pan-y";
      renderer.domElement.style.display = "block";

      scene.add(new THREE.AmbientLight(0xffffff, glow ? 0.9 : 1.6));
      const key = new THREE.DirectionalLight(0xffffff, glow ? 1.4 : 1.2);
      key.position.set(1.5, 2.5, 3);
      scene.add(key);
      const rim = new THREE.DirectionalLight(glow ? 0x6f8cff : 0xffffff, 0.9);
      rim.position.set(-2, 1.5, -2.5);
      scene.add(rim);

      const figure = new THREE.Group();
      scene.add(figure);

      // ── base body: simple rounded shapes ──
      const bodyMat = new THREE.MeshStandardMaterial({
        color: colors.body,
        roughness: 0.75,
        metalness: glow ? 0.35 : 0,
        transparent: glow,
        opacity: glow ? 0.82 : 1,
      });
      const wireMat = new THREE.MeshBasicMaterial({
        color: colors.wire,
        wireframe: true,
        transparent: true,
        opacity: glow ? 0.22 : 0.12,
      });
      const sphere = new THREE.SphereGeometry(1, 20, 14);
      const addBlob = (pos: V3, scale: V3) => {
        for (const mat of [bodyMat, wireMat]) {
          const m = new THREE.Mesh(sphere, mat);
          m.position.set(...pos);
          m.scale.set(...scale);
          if (mat === wireMat) m.scale.multiplyScalar(1.01);
          figure.add(m);
        }
      };
      addBlob([0, 1.63, 0], [0.1, 0.125, 0.11]); // head
      addBlob([0, 1.49, 0], [0.05, 0.07, 0.05]); // neck
      addBlob([0, 1.27, 0], [0.19, 0.2, 0.11]); // ribcage
      addBlob([0, 1.03, 0], [0.15, 0.17, 0.095]); // waist
      addBlob([0, 0.88, 0], [0.17, 0.12, 0.105]); // hips
      for (const sx of [1, -1]) {
        addBlob([0.245 * sx, 1.24, 0], [0.05, 0.16, 0.05]); // upper arm
        addBlob([0.27 * sx, 0.99, 0], [0.04, 0.14, 0.04]); // forearm
        addBlob([0.28 * sx, 0.8, 0], [0.035, 0.06, 0.03]); // hand
        addBlob([0.095 * sx, 0.62, 0], [0.078, 0.22, 0.078]); // thigh
        addBlob([0.095 * sx, 0.27, 0], [0.052, 0.2, 0.055]); // shin
        addBlob([0.095 * sx, 0.04, 0.04], [0.05, 0.035, 0.1]); // foot
      }

      // ── clickable muscle pads ──
      const pads: import("three").Mesh[] = [];
      for (const p of PADS) {
        const mat = new THREE.MeshStandardMaterial({
          color: colors.pad,
          emissive: colors.pad,
          emissiveIntensity: glow ? 0.35 : 0,
          roughness: 0.5,
          transparent: true,
          opacity: glow ? 0.9 : 1,
        });
        const m = new THREE.Mesh(sphere, mat);
        m.position.set(...p.pos);
        m.scale.set(...p.scale);
        m.userData.part = p.part;
        figure.add(m);
        pads.push(m);
      }

      // ── floor ring + scanning ring ──
      const ringMat = new THREE.MeshBasicMaterial({
        color: colors.ring,
        transparent: true,
        opacity: glow ? 0.55 : 0.25,
        side: THREE.DoubleSide,
      });
      const floor = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.45, 64), ringMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = 0.005;
      scene.add(floor);
      const floor2 = new THREE.Mesh(
        new THREE.RingGeometry(0.56, 0.565, 64),
        new THREE.MeshBasicMaterial({ ...ringMat, opacity: 0.25 } as never),
      );
      floor2.rotation.x = -Math.PI / 2;
      scene.add(floor2);
      const scan = new THREE.Mesh(
        new THREE.TorusGeometry(0.36, 0.004, 8, 64),
        new THREE.MeshBasicMaterial({ color: colors.ring, transparent: true, opacity: 0.7 }),
      );
      scan.rotation.x = Math.PI / 2;
      scan.visible = glow;
      scene.add(scan);

      // ── sizing ──
      const resize = () => {
        const w = el.clientWidth;
        const h = el.clientHeight;
        renderer.setSize(w, h, false);
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(el);

      // ── interaction: drag to spin, tap to pick ──
      const ray = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      let hover: BodyPart | null = null;
      let dragging = false;
      let moved = 0;
      let lastX = 0;
      let velocity = 0;
      let touched = false;
      let rotY = -0.5;

      const partAt = (e: PointerEvent): BodyPart | null => {
        const r = renderer.domElement.getBoundingClientRect();
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObjects(pads, false)[0];
        return hit ? (hit.object.userData.part as BodyPart) : null;
      };
      const down = (e: PointerEvent) => {
        dragging = true;
        touched = true;
        moved = 0;
        lastX = e.clientX;
        velocity = 0;
      };
      const move = (e: PointerEvent) => {
        if (dragging) {
          const dx = e.clientX - lastX;
          lastX = e.clientX;
          moved += Math.abs(dx);
          velocity = dx * 0.011;
          rotY += velocity;
        } else if (e.pointerType === "mouse") {
          hover = partAt(e);
          renderer.domElement.style.cursor = hover ? "pointer" : "grab";
        }
      };
      const up = (e: PointerEvent) => {
        if (!dragging) return;
        dragging = false;
        if (moved < 8) {
          const p = partAt(e);
          if (p) onPickRef.current(p);
        }
      };
      const leave = () => {
        dragging = false;
        hover = null;
      };
      const c = renderer.domElement;
      c.addEventListener("pointerdown", down);
      c.addEventListener("pointermove", move);
      c.addEventListener("pointerup", up);
      c.addEventListener("pointerleave", leave);
      c.addEventListener("pointercancel", leave);

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const hot = new THREE.Color(colors.hot);
      const pick = new THREE.Color(colors.pick);
      const base = new THREE.Color(colors.pad);
      let raf = 0;
      const t0 = performance.now();
      const frame = (now: number) => {
        raf = requestAnimationFrame(frame);
        const t = (now - t0) / 1000;
        if (!dragging) {
          // glide after a flick; idle spin until the first touch
          rotY += velocity;
          velocity *= 0.93;
          if (!touched && !reduced) rotY += 0.006;
        }
        figure.rotation.y = rotY;
        const sel = selectedRef.current;
        for (const m of pads) {
          const mat = m.material as import("three").MeshStandardMaterial;
          const part = m.userData.part as BodyPart;
          const target = part === sel ? pick : part === hover ? hot : base;
          mat.color.lerp(target, 0.2);
          if (glow) {
            mat.emissive.lerp(target, 0.2);
            mat.emissiveIntensity =
              part === sel ? 0.9 + Math.sin(t * 4) * 0.25 : part === hover ? 0.8 : 0.35;
          }
        }
        scan.position.y = 0.9 + Math.sin(t * 0.9) * 0.8;
        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(frame);
      setLoading(false);

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        c.removeEventListener("pointerdown", down);
        c.removeEventListener("pointermove", move);
        c.removeEventListener("pointerup", up);
        c.removeEventListener("pointerleave", leave);
        c.removeEventListener("pointercancel", leave);
        scene.traverse((o) => {
          const mesh = o as import("three").Mesh;
          if (mesh.isMesh) {
            mesh.geometry.dispose();
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((m) => m.dispose());
          }
        });
        renderer.dispose();
        renderer.domElement.remove();
      };
      if (disposed) cleanup();
    })().catch(() => onUnavailableRef.current?.());

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
        <div className="absolute inset-0 flex items-center justify-center text-sm text-sub">
          正在加载 3D 模型…
        </div>
      )}
    </div>
  );
}
