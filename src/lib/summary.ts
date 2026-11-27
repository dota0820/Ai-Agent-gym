import type { Workout } from "./types";

/** Kilograms moved: weight × reps over every completed set. */
export function workoutVolume(w: Workout): number {
  let v = 0;
  for (const ex of w.exercises)
    for (const s of ex.sets ?? [])
      if (s.done && s.weight && s.reps) v += s.weight * s.reps;
  return v;
}

export const totalVolume = (ws: Workout[]) =>
  ws.reduce((n, w) => n + workoutVolume(w), 0);

/** Number of different calendar days with a workout. */
export function trainingDays(ws: Workout[]): number {
  return new Set(ws.map((w) => new Date(w.startedAt).toDateString())).size;
}

/** 36400 → "36.4k", 820 → "820". */
export function compactNum(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k`;
  return Math.round(n).toLocaleString();
}

/** Heaviest set ever per exercise, newest records first. */
export function personalBests(ws: Workout[], limit = 3) {
  const best = new Map<
    string,
    { name: string; weight: number; reps: number; at: string; prev: number }
  >();
  const sorted = [...ws].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  for (const w of sorted)
    for (const ex of w.exercises) {
      const top = Math.max(
        0,
        ...(ex.sets ?? [])
          .filter((s) => s.done && s.weight)
          .map((s) => s.weight!),
      );
      if (!top) continue;
      const key = ex.exerciseId || ex.name;
      const cur = best.get(key);
      const reps = Math.max(
        0,
        ...(ex.sets ?? [])
          .filter((s) => s.weight === top)
          .map((s) => s.reps ?? 0),
      );
      if (!cur)
        best.set(key, {
          name: ex.name,
          weight: top,
          reps,
          at: w.startedAt,
          prev: 0,
        });
      else if (top > cur.weight)
        best.set(key, {
          name: ex.name,
          weight: top,
          reps,
          at: w.startedAt,
          prev: cur.weight,
        });
    }
  return [...best.values()]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}

/** "今天" / "3天前" / "2周前". */
export function ago(iso: string, now = Date.now()): string {
  const d = Math.floor((now - new Date(iso).getTime()) / 864e5);
  if (d <= 0) return "今天";
  if (d < 7) return `${d}天前`;
  if (d < 60) return `${Math.floor(d / 7)}周前`;
  return `${Math.floor(d / 30)}个月前`;
}
