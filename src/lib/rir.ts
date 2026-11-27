import type { AnyExercise } from "./exercise-lookup";
import type { SetLog, WorkoutExercise } from "./types";

/**
 * RIR (reps in reserve): after a set, how many more clean reps you could have done.
 * 0 = could not do another; 4 means "4 or more" (easy).
 */
export const RIR_OPTIONS = [0, 1, 2, 3, 4] as const;
export const RIR_MAX = 4;
/** Used when the coach did not set a target for an exercise. */
export const DEFAULT_TARGET_RIR = 2;

export const rirLabel = (r: number) => (r >= RIR_MAX ? "4+" : String(r));
/** Plain-language version for people new to RIR. */
export const rirWords = (r: number) =>
  r <= 0 ? "做不动了" : r >= RIR_MAX ? "还能 4 次以上" : `还能 ${r} 次`;
export const targetRirWords = (r: number) => (r <= 0 ? "做到力竭" : `留 ${r} 次力`);

/** "10-12" → [10, 12]; "12" → [12, 12]; anything else (e.g. "30秒") → undefined. */
export function parseRepRange(reps?: string): [number, number] | undefined {
  if (!reps || /秒|分钟|min|sec/i.test(reps)) return undefined;
  const nums = reps.match(/\d+/g)?.map(Number) ?? [];
  if (!nums.length) return undefined;
  return [Math.min(...nums), Math.max(...nums)];
}

/** Planks, cardio and other timed work don't get an RIR prompt. */
export function isTimedExercise(lib: AnyExercise | undefined, ex: WorkoutExercise): boolean {
  if (ex.target && /秒|分钟/.test(ex.target)) return true;
  if (!lib) return false;
  return lib.group === "cardio" || /秒|分钟/.test(lib.startWeight ?? "");
}

/** One weight step for this kind of exercise, in kg. */
export function weightStep(weight: number, lib: AnyExercise | undefined): number {
  const isDumbbell = /哑铃|壶铃/.test(lib?.equipment ?? "");
  if (isDumbbell) return weight < 10 ? 1 : 2;
  return weight < 60 ? 2.5 : 5;
}

const roundTo = (v: number, step: number) => Math.round(v / step) * step;

export type Verdict = "light" | "right" | "heavy";
export const VERDICT_TEXT: Record<Verdict, string> = {
  light: "偏轻",
  right: "刚好",
  heavy: "偏重",
};

/** How a finished set compares with the target. */
export function judgeSet(
  set: SetLog,
  targetRir: number,
  range?: [number, number],
): Verdict | undefined {
  if (set.rir == null) return undefined;
  if (set.rir >= targetRir + 2) return "light";
  if (set.rir === 0 && (set.reps ?? 0) < (range?.[0] ?? 0)) return "heavy";
  if (set.rir === 0 && targetRir >= 2) return "heavy";
  return "right";
}

export interface WeightAdvice {
  verdict: Verdict;
  /** Suggested weight in kg; undefined for bodyweight work. */
  weight?: number;
  /** Short explanation shown to the user. */
  text: string;
}

/**
 * Advice for the next set, from the set just finished. Only suggests a change;
 * the user decides whether to apply it.
 */
export function adviseNextSet(
  set: SetLog,
  targetRir: number,
  range: [number, number] | undefined,
  lib: AnyExercise | undefined,
): WeightAdvice | undefined {
  const verdict = judgeSet(set, targetRir, range);
  if (!verdict || verdict === "right") return verdict ? { verdict, text: "重量刚好,下一组保持" } : undefined;
  const w = set.weight;
  if (!w) {
    return {
      verdict,
      text: verdict === "light" ? "偏轻,下一组可以多做 2 次" : "偏重,下一组少做几次或休息久一点",
    };
  }
  const step = weightStep(w, lib);
  const next = Math.max(step, roundTo(verdict === "light" ? w + step : w - step, step / 2));
  return {
    verdict,
    weight: next,
    text: verdict === "light" ? `偏轻,下一组建议 ${next}kg` : `偏重,下一组建议 ${next}kg`,
  };
}

/**
 * Advice for today's starting weight, from the last set of the previous session.
 * Double progression: reach the top of the rep range with reps to spare → go up a step.
 */
export function adviseNextSession(
  lastSets: SetLog[],
  targetRir: number,
  range: [number, number] | undefined,
  lib: AnyExercise | undefined,
): WeightAdvice | undefined {
  const done = lastSets.filter((s) => s.done);
  const top = done.at(-1);
  if (!top || top.rir == null || !top.weight) return undefined;
  const step = weightStep(top.weight, lib);
  const hitTop = range ? (top.reps ?? 0) >= range[1] : true;
  if (top.rir >= targetRir && hitTop) {
    const w = roundTo(top.weight + step, step / 2);
    return { verdict: "light", weight: w, text: `上次最后一组还很有余力,今天可以试 ${w}kg` };
  }
  if (top.rir === 0 && range && (top.reps ?? 0) < range[0]) {
    const w = Math.max(step, roundTo(top.weight - step, step / 2));
    return { verdict: "heavy", weight: w, text: `上次最后一组做不够次数,今天先用 ${w}kg` };
  }
  return undefined;
}

export const DEFAULT_REP_RANGE: [number, number] = [8, 12];

export interface SessionPlan extends WeightAdvice {
  /** Weights to prefill, one per set (same length as last time's done sets). */
  weights?: (number | null)[];
  /** Reps to aim for this time. */
  goalReps?: number;
}

/**
 * How to beat last session (double progression). Works from weight and reps
 * alone; RIR, when logged, refines the call.
 * - every set reached the top of the rep range (and not at failure) → add one step
 * - the last set fell well short of the range at failure → drop one step
 * - otherwise keep the weight and aim for one more rep per set
 */
export function planNextSession(
  lastSets: SetLog[],
  targetRir: number,
  range: [number, number] | undefined,
  lib: AnyExercise | undefined,
): SessionPlan | undefined {
  const done = lastSets.filter((s) => s.done && (s.reps ?? 0) > 0);
  if (!done.length) return undefined;
  const [lo, hi] = range ?? DEFAULT_REP_RANGE;
  const reps = done.map((s) => s.reps ?? 0);
  const minReps = Math.min(...reps);
  const top = done.at(-1)!;
  const repsText = reps.join("/");

  if (!top.weight) {
    // bodyweight: progress by reps
    const goal = minReps >= hi ? Math.max(minReps, hi) + 2 : minReps + 1;
    return {
      verdict: minReps >= hi ? "light" : "right",
      goalReps: goal,
      text:
        minReps >= hi
          ? `上次每组都做满(${repsText}),今天每组做 ${goal} 次,或换难一点的版本`
          : `上次 ${repsText} 次,今天每组争取做到 ${goal} 次`,
    };
  }

  const step = weightStep(top.weight, lib);
  const allTop = minReps >= hi;
  const roomLeft = top.rir == null || top.rir >= Math.min(targetRir, 1);
  if (allTop && roomLeft) {
    const weights = done.map((s) => (s.weight ? roundTo(s.weight + weightStep(s.weight, lib), weightStep(s.weight, lib) / 2) : null));
    const w = weights.at(-1)!;
    return {
      verdict: "light",
      weight: w,
      weights,
      goalReps: lo,
      text: `上次每组都做满 ${hi} 次(${repsText}),今天加重到 ${w}kg,先做到 ${lo} 次以上`,
    };
  }
  if (allTop && !roomLeft) {
    return {
      verdict: "right",
      weight: top.weight,
      weights: done.map((s) => s.weight ?? null),
      goalReps: hi,
      text: `上次做满 ${hi} 次但最后一组已经力竭,今天同样 ${top.weight}kg,做满还留 1–2 次余力就加重`,
    };
  }
  const failedShort = (top.reps ?? 0) < lo - 1 && (top.rir == null ? (top.reps ?? 0) < lo - 2 : top.rir === 0);
  if (failedShort) {
    const w = Math.max(step, roundTo(top.weight - step, step / 2));
    return {
      verdict: "heavy",
      weight: w,
      weights: done.map((s) => (s.weight ? Math.max(step, roundTo(s.weight - step, step / 2)) : null)),
      goalReps: lo,
      text: `上次最后一组只做了 ${top.reps} 次,今天先降到 ${w}kg,把次数做够`,
    };
  }
  const goal = Math.min(hi, minReps + 1);
  return {
    verdict: "right",
    weight: top.weight,
    weights: done.map((s) => s.weight ?? null),
    goalReps: goal,
    text: `重量不变(${top.weight}kg),上次 ${repsText} 次,今天每组争取做到 ${goal} 次;都做满 ${hi} 次下次就加重`,
  };
}
