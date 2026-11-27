import { localDateStr, sameExercise } from "./store";
import type { Workout, WorkoutExercise } from "./types";

function mondayKey(d: Date): string {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}-${String(m.getDate()).padStart(2, "0")}`;
}

function prevMonday(d: Date): Date {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - 7);
  return m;
}

/** Consecutive calendar weeks (Mon–Sun) with at least one workout, plus days trained this week. */
export function computeStreakWeeks(
  workouts: Workout[],
  now = Date.now(),
): { currentWeeks: number; thisWeekDays: number; totalWorkouts: number } {
  if (!workouts.length) return { currentWeeks: 0, thisWeekDays: 0, totalWorkouts: 0 };

  const weekSet = new Set<string>();
  const thisWeekDaySet = new Set<string>();
  const today = new Date(now);
  const thisMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  thisMonday.setDate(thisMonday.getDate() - ((thisMonday.getDay() + 6) % 7));
  const thisWeekKey = mondayKey(today);

  for (const w of workouts) {
    const d = new Date(w.startedAt);
    if (Number.isNaN(d.getTime())) continue;
    const wk = mondayKey(d);
    weekSet.add(wk);
    if (wk === thisWeekKey) {
      thisWeekDaySet.add(localDateStr(d));
    }
  }

  let cursor = thisMonday;
  if (!weekSet.has(mondayKey(cursor))) {
    cursor = prevMonday(cursor);
  }
  let streak = 0;
  while (weekSet.has(mondayKey(cursor))) {
    streak++;
    cursor = prevMonday(cursor);
  }

  return {
    currentWeeks: streak,
    thisWeekDays: thisWeekDaySet.size,
    totalWorkouts: workouts.length,
  };
}

export interface ProgressPoint {
  date: string;
  label: string;
  maxWeight: number;
  volume: number;
}

export interface ExerciseProgress {
  key: string;
  name: string;
  points: ProgressPoint[];
  latestWeight: number;
  deltaWeight: number;
  latestVolume: number;
  deltaVolume: number;
}

function exerciseStats(e: WorkoutExercise): { maxWeight: number; volume: number } {
  let maxWeight = 0;
  let volume = 0;
  for (const s of e.sets) {
    if (!s.done) continue;
    const w = s.weight ?? 0;
    const r = s.reps ?? 0;
    if (w > maxWeight) maxWeight = w;
    volume += w * r;
  }
  return { maxWeight, volume: Math.round(volume) };
}

/**
 * Top exercises with >= 2 weighted sessions in the last `days` (falls back to all-time if needed),
 * returning chronological points for sparkline/line chart visualization.
 */
export function topExerciseProgress(
  workouts: Workout[],
  days = 90,
  limit = 6,
): ExerciseProgress[] {
  const cutoff = Date.now() - days * 86400_000;
  const sorted = [...workouts]
    .filter((w) => !Number.isNaN(new Date(w.startedAt).getTime()))
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));

  const collect = (list: Workout[]) => {
    const map = new Map<string, { name: string; points: ProgressPoint[] }>();
    for (const w of list) {
      const date = localDateStr(w.startedAt);
      const label = date.slice(5).replace("-", "/");
      for (const e of w.exercises) {
        const stats = exerciseStats(e);
        if (stats.maxWeight <= 0 && stats.volume <= 0) continue;
        const key = e.exerciseId || e.name.trim().toLowerCase();
        const entry = map.get(key) ?? { name: e.name, points: [] };
        const existing = entry.points.find((p) => p.date === date);
        if (existing) {
          existing.maxWeight = Math.max(existing.maxWeight, stats.maxWeight);
          existing.volume += stats.volume;
        } else {
          entry.points.push({ date, label, maxWeight: stats.maxWeight, volume: stats.volume });
        }
        map.set(key, entry);
      }
    }
    return [...map.entries()]
      .filter(([, v]) => v.points.length >= 2)
      .sort((a, b) => b[1].points.length - a[1].points.length)
      .slice(0, limit)
      .map(([key, v]): ExerciseProgress => {
        const first = v.points[0];
        const last = v.points[v.points.length - 1];
        return {
          key,
          name: v.name,
          points: v.points,
          latestWeight: last.maxWeight,
          deltaWeight: Math.round((last.maxWeight - first.maxWeight) * 10) / 10,
          latestVolume: last.volume,
          deltaVolume: Math.round(last.volume - first.volume),
        };
      });
  };

  const recent = collect(sorted.filter((w) => new Date(w.startedAt).getTime() >= cutoff));
  if (recent.length > 0) return recent;
  return collect(sorted);
}

export interface WorkoutPR {
  exerciseName: string;
  kind: "weight" | "volume";
  value: number;
  prev: number;
}

/** Detect new personal records (max weight or session volume) achieved in `workout` compared to earlier workouts. */
export function detectWorkoutPRs(workout: Workout, allWorkouts: Workout[]): WorkoutPR[] {
  const earlier = allWorkouts.filter(
    (w) => w.id !== workout.id && w.startedAt < workout.startedAt,
  );
  if (!earlier.length) return [];

  const prs: WorkoutPR[] = [];
  for (const e of workout.exercises) {
    const cur = exerciseStats(e);
    if (cur.maxWeight <= 0 && cur.volume <= 0) continue;

    let prevMaxWeight = 0;
    let prevMaxVol = 0;
    let seenBefore = false;

    for (const prevW of earlier) {
      for (const prevE of prevW.exercises) {
        if (!sameExercise(prevE, e)) continue;
        const st = exerciseStats(prevE);
        if (st.maxWeight > 0 || st.volume > 0) {
          seenBefore = true;
          if (st.maxWeight > prevMaxWeight) prevMaxWeight = st.maxWeight;
          if (st.volume > prevMaxVol) prevMaxVol = st.volume;
        }
      }
    }

    if (!seenBefore) continue;
    if (cur.maxWeight > prevMaxWeight && prevMaxWeight > 0) {
      prs.push({
        exerciseName: e.name,
        kind: "weight",
        value: cur.maxWeight,
        prev: prevMaxWeight,
      });
    } else if (cur.volume > prevMaxVol && prevMaxVol > 0) {
      prs.push({
        exerciseName: e.name,
        kind: "volume",
        value: cur.volume,
        prev: prevMaxVol,
      });
    }
  }
  return prs;
}
