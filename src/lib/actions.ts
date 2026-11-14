"use client";
import { useSyncExternalStore } from "react";
import { EX_BY_ID } from "./exercises";
import {
  getState,
  historyForCoach,
  lastPerformance,
  setState,
  uid,
} from "./store";
import type { ChatMsg, Guide, Plan, Workout, WorkoutExercise } from "./types";

// ───────── workouts ─────────

function firstNumber(s?: string): number | null {
  const m = s ? /(\d+(?:\.\d+)?)/.exec(s) : null;
  return m ? Number(m[1]) : null;
}

export function newExercise(
  base: {
    exerciseId?: string;
    name: string;
    nameEn?: string;
    custom?: Guide;
  },
  opts: { sets?: number; reps?: string; restSec?: number; weight?: string; note?: string } = {},
): WorkoutExercise {
  const last = lastPerformance(getState().workouts, base);
  const lastDone = last?.exercise.sets.filter((s) => s.done) ?? [];
  const n = opts.sets ?? (lastDone.length || 3);
  const planned = /kg|公斤/i.test(opts.weight ?? "") ? firstNumber(opts.weight) : null;
  return {
    ...base,
    target: opts.reps
      ? `${n} 组 × ${opts.reps}${opts.weight ? ` · ${opts.weight}` : ""}`
      : undefined,
    restSec: opts.restSec ?? 75,
    note: opts.note,
    sets: Array.from({ length: n }, (_, i) => ({
      weight: planned ?? lastDone[Math.min(i, lastDone.length - 1)]?.weight ?? null,
      reps: null,
      done: false,
    })),
  };
}

export function startFromPlan(plan: Plan) {
  const w: Workout = {
    id: uid(),
    title: plan.title,
    focus: plan.focus,
    startedAt: new Date().toISOString(),
    exercises: plan.items.map((it) =>
      newExercise(
        { exerciseId: it.exerciseId, name: it.name, nameEn: it.nameEn, custom: it.custom },
        { sets: it.sets, reps: it.reps, restSec: it.restSec, weight: it.weight, note: it.note },
      ),
    ),
  };
  setState((s) => ({ ...s, active: w }));
}

export function startFree() {
  setState((s) => ({
    ...s,
    active: {
      id: uid(),
      title: "自由训练",
      focus: "自由",
      startedAt: new Date().toISOString(),
      exercises: [],
    },
  }));
}

// ───────── coach chat ─────────

let busy = false;
const busyListeners = new Set<() => void>();
function setBusy(b: boolean) {
  busy = b;
  busyListeners.forEach((l) => l());
}
export function useCoachBusy() {
  return useSyncExternalStore(
    (l) => {
      busyListeners.add(l);
      return () => busyListeners.delete(l);
    },
    () => busy,
    () => false,
  );
}

function buildContext(): string {
  const s = getState();
  const p = s.profile;
  const now = new Date();
  const lines = [
    `今天是 ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")},星期${"日一二三四五六"[now.getDay()]}。`,
    "",
    "## 用户资料",
    `称呼: ${p.name || "(未填)"}`,
    `目标: ${p.goal || "(未填)"}`,
    `经验: ${p.level || "(未填)"}`,
    `每周计划去健身房: ${p.daysPerWeek || "?"} 次`,
    `身高/体重: ${p.heightCm || "?"} cm / ${p.weightKg || "?"} kg`,
    `健身房器械情况: ${p.equipment || "(未填,默认是器械齐全的商业健身房)"}`,
    `伤病/注意事项: ${p.injuries || "(无)"}`,
    "",
    "## 你之前记住的事",
    p.memory.length ? p.memory.map((m) => `- ${m}`).join("\n") : "(暂无)",
    "",
    "## App 里当前的计划",
    s.plan
      ? `${s.plan.title}(${s.plan.createdAt.slice(0, 10)} 制定): ${s.plan.items
          .map((i) => `${i.name} ${i.sets}×${i.reps}${i.weight ? ` ${i.weight}` : ""}`)
          .join(";")}`
      : "(暂无)",
    s.active ? `\n用户此刻正在进行一次训练: ${s.active.title}` : "",
    "",
    "## 最近的训练记录(新的在前)",
    historyForCoach(s.workouts),
  ];
  return lines.join("\n");
}

function historyForApi(chat: ChatMsg[]) {
  const msgs = chat
    .slice(-24)
    .map((m) => {
      let text = m.text.trim();
      if (m.plan)
        text += `\n[已保存计划「${m.plan.title}」: ${m.plan.items
          .map((i) => `${i.name} ${i.sets}×${i.reps}`)
          .join(";")}]`;
      if (m.logged) text += `\n[已记录训练: ${m.logged}]`;
      return { role: m.role, text: text.trim() };
    })
    .filter((m) => m.text);
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  return msgs;
}

function patchMsg(id: string, fn: (m: ChatMsg) => ChatMsg) {
  setState((s) => ({ ...s, chat: s.chat.map((m) => (m.id === id ? fn(m) : m)) }));
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function toPlan(p: any): Plan {
  return {
    id: uid(),
    title: p.title,
    focus: p.focus,
    note: p.note,
    createdAt: new Date().toISOString(),
    items: (p.exercises ?? []).map((e: any) => {
      const lib = EX_BY_ID[e.exercise_id];
      const c = e.custom_instructions;
      return {
        exerciseId: lib ? lib.id : undefined,
        name: lib ? lib.name : e.name,
        nameEn: lib ? lib.nameEn : e.name_en,
        sets: e.sets,
        reps: e.reps,
        restSec: e.rest_seconds,
        weight: e.suggested_weight,
        note: e.coach_note,
        custom:
          !lib && c
            ? {
                equipment: c.equipment,
                setup: c.setup,
                steps: c.steps ?? [],
                mistakes: c.common_mistakes ?? [],
                feel: c.feel,
              }
            : undefined,
      };
    }),
  };
}

function toWorkout(w: any): Workout {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(w.date) ? new Date(`${w.date}T12:00:00`) : new Date();
  const iso = (isNaN(d.getTime()) ? new Date() : d).toISOString();
  return {
    id: uid(),
    title: w.title,
    focus: w.focus,
    startedAt: iso,
    endedAt: iso,
    notes: w.notes,
    exercises: (w.exercises ?? []).map((e: any) => {
      const lib = EX_BY_ID[e.exercise_id];
      return {
        exerciseId: lib?.id,
        name: lib ? lib.name : e.name,
        nameEn: lib?.nameEn,
        sets: (e.sets ?? []).map((s: any) => ({
          weight: s.weight_kg ?? null,
          reps: s.reps ?? null,
          done: true,
        })),
      };
    }),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function sendToCoach(text: string) {
  text = text.trim();
  if (!text || busy) return;
  setBusy(true);
  const ts = new Date().toISOString();
  const aid = uid();
  setState((s) => ({
    ...s,
    chat: [
      ...s.chat,
      { id: uid(), role: "user", text, ts },
      { id: aid, role: "assistant", text: "", ts },
    ],
  }));
  const fail = (msg: string) =>
    patchMsg(aid, (m) => ({ ...m, text: (m.text ? m.text + "\n\n" : "") + `⚠️ ${msg}` }));

  try {
    const s = getState();
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-app-passcode": s.profile.passcode,
      },
      body: JSON.stringify({
        messages: historyForApi(s.chat.filter((m) => m.id !== aid)),
        context: buildContext(),
      }),
    });
    if (!res.ok || !res.body) {
      const j = await res.json().catch(() => null);
      fail(j?.error ?? `请求失败(${res.status})`);
      return;
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    const handle = (line: string) => {
      if (!line.trim()) return;
      const ev = JSON.parse(line);
      if (ev.type === "text") {
        patchMsg(aid, (m) => ({ ...m, text: m.text + ev.text }));
      } else if (ev.type === "plan") {
        const plan = toPlan(ev.plan);
        setState((st) => ({ ...st, plan }));
        patchMsg(aid, (m) => ({ ...m, plan }));
      } else if (ev.type === "workout") {
        const w = toWorkout(ev.workout);
        setState((st) => ({ ...st, workouts: [...st.workouts, w] }));
        patchMsg(aid, (m) => ({ ...m, logged: w.title }));
      } else if (ev.type === "memory") {
        setState((st) => ({
          ...st,
          profile: { ...st.profile, memory: [...st.profile.memory, ev.note] },
        }));
      } else if (ev.type === "error") {
        fail(ev.error);
      }
    };
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        handle(buf.slice(0, i));
        buf = buf.slice(i + 1);
      }
    }
    handle(buf);
  } catch {
    fail("网络断了,请再发一次。");
  } finally {
    patchMsg(aid, (m) => ({
      ...m,
      text: m.text.trim() || (m.plan || m.logged ? "" : "⚠️ 教练没有回复,请再试一次。"),
    }));
    setBusy(false);
  }
}

export async function fileToJpegDataUrl(file: File, max = 1568): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}
