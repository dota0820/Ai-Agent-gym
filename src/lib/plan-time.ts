import type { Plan } from "./types";

/** Rough session length: about 40 s of work per set plus the planned rest. */
export function planMinutes(plan: Plan): number {
  const sec = plan.items.reduce((n, it) => n + it.sets * (40 + (it.restSec || 60)), 0);
  return Math.max(5, Math.round(sec / 60 / 5) * 5);
}
