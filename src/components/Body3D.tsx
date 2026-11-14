"use client";
import { useEffect, useRef, useState } from "react";
import { isDark, themeColors, type Theme } from "@/lib/theme";
import type { Group as BodyGroup } from "@/lib/types";

export type BodyPart = Exclude<BodyGroup, "cardio" | "mobility">;

const PARTS: BodyPart[] = ["chest", "shoulders", "arms", "core", "back", "glutes", "legs"];

/** Where to turn the figure and aim the camera when a part is chosen (figure is 1.75 tall). */
const FOCUS: Record<BodyPart, { rot: number; y: number }> = {
  chest: { rot: 0.25, y: 1.32 },
  core: { rot: -0.25, y: 1.1 },
  shoulders: { rot: 0.7, y: 1.4 },
  arms: { rot: 0.75, y: 1.12 },
  back: { rot: Math.PI - 0.3, y: 1.3 },
  glutes: { rot: Math.PI + 0.35, y: 0.9 },
  legs: { rot: 0.45, y: 0.55 },
};

/**
 * An anatomical muscle figure you can spin with a finger and tap to choose a
 * body part. Each muscle group is its own mesh (see public/models/anatomy.glb,
 * built from BodyParts3D), so the tapped group lights up exactly. Choosing one
 * turns the figure and moves the camera in.
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
      const gltf = await new GLTFLoader().loadAsync("/models/anatomy.glb");
      if (disposed) {
        renderer.dispose();
        return;
      }

      const tc = themeColors();
      const dark = isDark(theme);
      const col = (c: string) => new THREE.Color(c);
      // anatomical muscle red, like a textbook plate; the chosen group takes the theme accent
      const MUSCLE = col(dark ? "#b8463c" : "#c24c40");
      const MUSCLE_DIM = col(dark ? "#5a2a2a" : "#dcb0a8");
      const HOVER = col("#f08a6e");
      const PICK = col(dark ? tc.mint : tc.muscle);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 30);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.localClippingEnabled = true;
      el.appendChild(renderer.domElement);
      const c = renderer.domElement;
      c.style.touchAction = "pan-y";
      c.style.display = "block";
      c.style.cursor = "grab";

      scene.add(new THREE.HemisphereLight(0xffffff, dark ? 0x202840 : 0xb9a79c, dark ? 1.3 : 1.45));
      const key = new THREE.DirectionalLight(0xffffff, 2.6);
      key.position.set(1.4, 2.6, 3);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xffffff, 0.9);
      fill.position.set(-2.2, 1.2, 1.5);
      scene.add(fill);
      const rim = new THREE.DirectionalLight(col(tc.primary), dark ? 2.4 : 0.9);
      rim.position.set(-1.5, 1.8, -3);
      scene.add(rim);

      // reveal: the figure "materialises" from the feet up
      const reveal = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);

      const figure = new THREE.Group();
      scene.add(figure);
      figure.add(gltf.scene);

      type PartMesh = import("three").Mesh<
        import("three").BufferGeometry,
        import("three").MeshStandardMaterial
      >;
      const partMeshes: PartMesh[] = [];
      gltf.scene.traverse((o) => {
        const m = o as PartMesh;
        if (!m.isMesh) return;
        const name = (m.name || m.parent?.name || "").toLowerCase();
        const part = PARTS.find((p) => name.startsWith(p));
        if (name.startsWith("skin")) {
          // a faint shell so head, hands and feet read as a whole body
          m.material = new THREE.MeshStandardMaterial({
            color: col(dark ? tc.muscle2 : tc.body),
            transparent: true,
            opacity: dark ? 0.16 : 0.15,
            roughness: 0.9,
            depthWrite: false,
            side: THREE.FrontSide,
            clippingPlanes: [reveal],
          }) as never;
          m.renderOrder = 2;
          return;
        }
        m.material = new THREE.MeshStandardMaterial({
          color: MUSCLE.clone(),
          roughness: 0.62,
          metalness: 0.05,
          emissive: new THREE.Color(0x000000),
          clippingPlanes: [reveal],
        });
        if (part) {
          m.userData.part = part;
          partMeshes.push(m);
        } else {
          m.userData.neutral = true;
        }
      });

      // ── stage: rings, floating particles, scan ring ──
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
          g.add(
            new THREE.Mesh(
              new THREE.RingGeometry(r0, r1, 24, 1, i * arc, arc * (1 - gap)),
              ringMat(opacity),
            ),
          );
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

      const scan = new THREE.Mesh(
        new THREE.TorusGeometry(0.4, 0.0035, 8, 72),
        ringMat(dark ? 0.8 : 0.45),
      );
      scan.rotation.x = Math.PI / 2;
      stage.add(scan);

      const P = 70;
      const pPos = new Float32Array(P * 3);
      const pSeed = new Float32Array(P);
      for (let i = 0; i < P; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 0.5 + Math.random() * 0.45;
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
      burst.renderOrder = 3;
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
      let hover: BodyPart | null = null;
      let dragging = false;
      let moved = 0;
      let lastX = 0;
      let velocity = 0;
      let touched = false;
      let rotY = -0.6;
      let lastHover = 0;
      let rotTarget: number | null = null;

      const hitAt = (e: PointerEvent) => {
        const r = c.getBoundingClientRect();
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObjects(partMeshes, false)[0];
        return hit ? { part: hit.object.userData.part as BodyPart, point: hit.point.clone() } : null;
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
        } else if (e.pointerType === "mouse" && performance.now() - lastHover > 60) {
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
          if (h) {
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
      let revealY = reduced ? 9 : 0;
      const cam = { y: 0.95, z: 4.3, lookY: 0.9 };
      const camGoal = { y: 0.98, z: 3.6, lookY: 0.88 };
      const black = new THREE.Color(0x000000);
      let raf = 0;

      const frame = () => {
        raf = requestAnimationFrame(frame);
        const nowT = performance.now();
        const dt = Math.min((nowT - lastT) / 1000, 0.05);
        lastT = nowT;
        if (!visible || document.hidden) return;
        t += dt;

        // selection changed: turn to show it and move the camera in
        const sel = selectedRef.current;
        if (sel !== lastSel) {
          lastSel = sel;
          if (sel) {
            const f = FOCUS[sel];
            const turns = Math.round((rotY - f.rot) / (Math.PI * 2));
            rotTarget = f.rot + turns * Math.PI * 2;
            // aim a little below the part so it sits in the upper half, above the question sheet
            Object.assign(camGoal, { y: f.y - 0.05, z: 2.4, lookY: f.y - 0.28 });
            velocity = 0;
            touched = true;
          } else {
            rotTarget = null;
            Object.assign(camGoal, { y: 0.98, z: 3.6, lookY: 0.88 });
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
        // a hint of breathing so the figure does not look frozen
        if (!reduced) figure.scale.set(1 + Math.sin(t * 1.4) * 0.004, 1, 1 + Math.sin(t * 1.4) * 0.008);

        const ease = Math.min(1, dt * 3.2);
        cam.y += (camGoal.y - cam.y) * ease;
        cam.z += (camGoal.z - cam.z) * ease;
        cam.lookY += (camGoal.lookY - cam.lookY) * ease;
        camera.position.set(0, cam.y, cam.z);
        camera.lookAt(0, cam.lookY, 0);

        revealY = Math.min(9, revealY + dt * (revealY < 1.9 ? 1.4 : 20));
        reveal.constant = revealY;

        const k = Math.min(1, dt * 9);
        for (const m of partMeshes) {
          const part = m.userData.part as BodyPart;
          const isSel = part === sel;
          const isHover = part === hover && !isSel;
          m.material.color.lerp(isSel ? PICK : isHover ? HOVER : sel ? MUSCLE_DIM : MUSCLE, k);
          m.material.emissive.lerp(isSel ? PICK : black, k);
          m.material.emissiveIntensity = isSel ? (dark ? 0.55 : 0.18) + Math.sin(t * 5) * 0.12 : 0;
        }

        ringA.rotation.z = t * 0.5;
        ringB.rotation.z = -t * 0.25;
        ringC.scale.setScalar(1 + 0.04 * Math.sin(t * 2));
        scan.position.y = revealY < 1.9 ? revealY : 0.92 + Math.sin(t * 0.9) * 0.86;
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
          const b = Math.min(1, burstT);
          burst.scale.setScalar(0.03 + b * 0.22);
          (burst.material as import("three").MeshBasicMaterial).opacity = (1 - b) * 0.9;
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
      aria-label="可以转动的 3D 肌肉人体模型,点一下肌肉来选择要练哪里"
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
