"use client";
import { sameExercise, setState } from "./store";
import type { Workout, WorkoutExercise } from "./types";

const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/** Change one saved workout in place. */
export function updateWorkout(id: string, fn: (w: Workout) => Workout) {
  setState((s) => ({ ...s, workouts: s.workouts.map((w) => (w.id === id ? fn(w) : w)) }));
}

/** Other records on the same calendar day (likely the same session saved twice). */
export function sameDayWorkouts(all: Workout[], w: Workout): Workout[] {
  const k = dayKey(w.startedAt);
  return all.filter((x) => x.id !== w.id && dayKey(x.startedAt) === k);
}

/**
 * Merges `dropId` into `keepId` and deletes it. The same exercise in both
 * records becomes one exercise with all its sets; everything else is appended.
 */
export function mergeWorkouts(keepId: string, dropId: string) {
  setState((s) => {
    const keep = s.workouts.find((w) => w.id === keepId);
    const drop = s.workouts.find((w) => w.id === dropId);
    if (!keep || !drop) return s;
    const exercises: WorkoutExercise[] = keep.exercises.map((e) => ({ ...e, sets: [...e.sets] }));
    for (const e of drop.exercises) {
      const hit = exercises.find((x) => sameExercise(x, e));
      if (hit) hit.sets.push(...e.sets);
      else exercises.push({ ...e, sets: [...e.sets] });
    }
    const starts = [keep.startedAt, drop.startedAt].sort();
    const ends = [keep.endedAt, drop.endedAt].filter(Boolean).sort() as string[];
    const watch = keep.watch ?? drop.watch;
    const notes = [keep.notes, drop.notes].filter(Boolean).join("\n");
    const merged: Workout = {
      ...keep,
      startedAt: starts[0],
      endedAt: ends.at(-1),
      exercises,
      watch,
      notes: notes || undefined,
      feeling: keep.feeling ?? drop.feeling,
    };
    return {
      ...s,
      workouts: s.workouts.filter((w) => w.id !== dropId).map((w) => (w.id === keepId ? merged : w)),
    };
  });
}
