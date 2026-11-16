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
  return weight < 20 ? 2.5 : 5;
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
