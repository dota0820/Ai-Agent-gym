"use client";
import { useSyncExternalStore } from "react";
import type { AppState, Workout, WorkoutExercise } from "./types";

const KEY = "gymcoach:v1";

export const EMPTY: AppState = {
  profile: {
    name: "",
    goal: "",
    level: "新手(刚开始健身)",
    daysPerWeek: "3",
    equipment: "",
    injuries: "",
    heightCm: "",
    weightKg: "",
    memory: [],
    passcode: "",
  },
  plan: null,
  active: null,
  workouts: [],
  chat: [],
};

let state: AppState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      state = { ...EMPTY, ...p, profile: { ...EMPTY.profile, ...p.profile } };
    }
  } catch {
    // corrupted or unavailable storage: start fresh
  }
}

export function getState(): AppState {
  load();
  return state;
}

export function setState(fn: (s: AppState) => AppState) {
  load();
  state = fn(state);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage full / unavailable — keep in memory
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useApp(): AppState {
  return useSyncExternalStore(subscribe, getState, () => EMPTY);
}

/** false during SSR/hydration, true once localStorage data is readable */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function sameExercise(
  a: { exerciseId?: string; name: string },
  b: { exerciseId?: string; name: string },
) {
  if (a.exerciseId && b.exerciseId) return a.exerciseId === b.exerciseId;
  return a.name.trim().toLowerCase() === b.name.trim().toLowerCase();
}

/** Most recent logged performance of an exercise (optionally before a date). */
export function lastPerformance(
  workouts: Workout[],
  ex: { exerciseId?: string; name: string },
  beforeIso?: string,
): { workout: Workout; exercise: WorkoutExercise } | null {
  const sorted = [...workouts].sort((a, b) =>
    b.startedAt.localeCompare(a.startedAt),
  );
  for (const w of sorted) {
    if (beforeIso && w.startedAt >= beforeIso) continue;
    const hit = w.exercises.find(
      (e) => sameExercise(e, ex) && e.sets.some((s) => s.done),
    );
    if (hit) return { workout: w, exercise: hit };
  }
  return null;
}

export function setsSummary(e: WorkoutExercise): string {
  const done = e.sets.filter((s) => s.done);
  if (!done.length) return "未完成";
  return done
    .map((s) => `${s.weight ? `${s.weight}kg` : "自重"}×${s.reps ?? "?"}`)
    .join("  ");
}

export function volume(w: Workout): number {
  let v = 0;
  for (const e of w.exercises)
    for (const s of e.sets) if (s.done) v += (s.weight ?? 0) * (s.reps ?? 0);
  return Math.round(v);
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  const wk = "日一二三四五六"[d.getDay()];
  return `${d.getMonth() + 1}月${d.getDate()}日 周${wk}`;
}

export function durationMin(w: Workout): number | null {
  if (w.watch?.durationMin) return w.watch.durationMin;
  if (!w.endedAt) return null;
  return Math.max(
    1,
    Math.round(
      (new Date(w.endedAt).getTime() - new Date(w.startedAt).getTime()) / 60000,
    ),
  );
}

/** Compact text summary of history for the AI coach. */
export function historyForCoach(workouts: Workout[], n = 8): string {
  const sorted = [...workouts]
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, n);
  if (!sorted.length) return "(还没有任何训练记录)";
  return sorted
    .map((w) => {
      const head = `【${w.startedAt.slice(0, 10)} ${w.title}】${
        durationMin(w) ? ` ${durationMin(w)}分钟` : ""
      }${w.watch?.calories ? ` ${w.watch.calories}千卡` : ""}${
        w.watch?.avgHr ? ` 平均心率${w.watch.avgHr}` : ""
      }${w.watch?.maxHr ? ` 最高心率${w.watch.maxHr}` : ""}${
        w.feeling ? ` 感受${w.feeling}/5` : ""
      }`;
      const body = w.exercises
        .map(
          (e) =>
            `- ${e.name}${e.exerciseId ? ` [${e.exerciseId}]` : ""}: ${setsSummary(e)}`,
        )
        .join("\n");
      return `${head}\n${body}${w.notes ? `\n备注: ${w.notes}` : ""}`;
    })
    .join("\n\n");
}
