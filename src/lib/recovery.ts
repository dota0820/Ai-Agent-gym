import { findExerciseById } from "./exercise-lookup";
import { GROUPS, type CustomExercise, type Group, type Muscle, type Workout } from "./types";

/** The seven areas of the 3D body. */
export type BodyPart = Exclude<Group, "cardio" | "mobility">;
export const BODY_PARTS: BodyPart[] = ["back", "chest", "legs", "glutes", "shoulders", "arms", "core"];

/** How long a muscle group is shown as "recovering" after it was trained. */
export const RECOVERY_HOURS = 48;

const MUSCLE_PART: Record<Muscle, BodyPart> = {
  trapezius: "back",
  "upper-back": "back",
  "lower-back": "back",
  chest: "chest",
  biceps: "arms",
  triceps: "arms",
  forearm: "arms",
  "back-deltoids": "shoulders",
  "front-deltoids": "shoulders",
  abs: "core",
  obliques: "core",
  adductor: "legs",
  hamstring: "legs",
  quadriceps: "legs",
  calves: "legs",
  abductors: "glutes",
  gluteal: "glutes",
};

const partLabel = (p: BodyPart) => GROUPS.find((g) => g.id === p)!.label;

/** Body parts a workout actually trained (from the main muscles of its finished exercises). */
export function partsOfWorkout(w: Workout, custom: CustomExercise[]): Set<BodyPart> {
  const out = new Set<BodyPart>();
  for (const e of w.exercises) {
    if (!e.sets.some((s) => s.done)) continue;
    const lib = findExerciseById(e.exerciseId, custom);
    if (lib) {
      if (lib.primary.length) lib.primary.forEach((m) => { if (MUSCLE_PART[m]) out.add(MUSCLE_PART[m]); });
      else if ((BODY_PARTS as string[]).includes(lib.group)) out.add(lib.group as BodyPart);
      continue;
    }
    if (e.custom) {
      if (e.custom.primary?.length) {
        e.custom.primary.forEach((m) => {
          const part = MUSCLE_PART[m as Muscle];
          if (part) out.add(part);
        });
      } else if (e.custom.group && (BODY_PARTS as string[]).includes(e.custom.group)) {
        out.add(e.custom.group as BodyPart);
      }
    }
  }
  return out;
}

/** Hours since each part was last trained (undefined = never). */
export function hoursSinceTrained(
  workouts: Workout[],
  custom: CustomExercise[],
  now: number,
): Partial<Record<BodyPart, number>> {
  const out: Partial<Record<BodyPart, number>> = {};
  for (const w of workouts) {
    const ts = new Date(w.endedAt ?? w.startedAt).getTime();
    if (Number.isNaN(ts)) continue;
    const h = (now - ts) / 36e5;
    for (const p of partsOfWorkout(w, custom)) {
      if (out[p] === undefined || h < out[p]!) out[p] = Math.max(0, h);
    }
  }
  return out;
}

const ago = (h: number) => {
  const d = Math.floor(h / 24);
  return d >= 1 ? `${d} 天` : "不到一天";
};

/** One line of rule-based advice for the home screen, plus the part it points at. */
export function todaySuggestion(
  workouts: Workout[],
  custom: CustomExercise[],
  now: number,
): { text: string; part?: BodyPart } {
  if (!workouts.length)
    return { text: "还没有训练记录。点一下身体上想练的部位,开始第一次训练吧。" };
  const since = hoursSinceTrained(workouts, custom, now);
  const trained = BODY_PARTS.filter((p) => since[p] !== undefined);
  if (!trained.length)
    return { text: "点一下身体上想练的部位,教练会帮你排好今天的训练。" };

  const ready = trained.filter((p) => since[p]! >= RECOVERY_HOURS);
  const recovering = trained.filter((p) => since[p]! < RECOVERY_HOURS);
  const never = BODY_PARTS.filter((p) => since[p] === undefined);

  // longest-rested part that has been trained before wins; untrained parts come next
  if (ready.length) {
    const p = ready.sort((a, b) => since[b]! - since[a]!)[0];
    return { text: `距离上次练${partLabel(p)} ${ago(since[p]!)}了,今天适合练${partLabel(p)}。`, part: p };
  }
  if (never.length) {
    const p = never[0];
    const done = recovering.map(partLabel).join("、");
    return { text: `${done}还在恢复,今天可以试试还没练过的${partLabel(p)}。`, part: p };
  }
  return { text: "这两天全身都练到了,今天适合休息或做点拉伸放松。" };
}

/** Monday-to-Sunday of the current week: which days have a workout, and which is today. */
export function weekDots(workouts: Workout[], now: number) {
  const today = new Date(now);
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const trainedDays = new Set(workouts.map((w) => key(new Date(w.startedAt))));
  return "一二三四五六日".split("").map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { label, done: trainedDays.has(key(d)), today: key(d) === key(today), future: d > today };
  });
}
