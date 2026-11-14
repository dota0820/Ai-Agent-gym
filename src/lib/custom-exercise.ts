import { uid } from "./store";
import { GROUPS, MUSCLE_LABEL, type CustomExercise, type Group, type Guide, type Muscle } from "./types";

const isGroup = (v: unknown): v is Group => GROUPS.some((g) => g.id === v);
const muscles = (v: unknown): Muscle[] =>
  Array.isArray(v) ? (v.filter((m) => typeof m === "string" && m in MUSCLE_LABEL) as Muscle[]) : [];

/**
 * Turns an exercise the coach described (one that is not in the built-in library)
 * into a saved custom exercise, so it shows up in the library and can be reused.
 */
export function customExerciseFromGuide(
  name: string,
  nameEn: string | undefined,
  g: Guide,
): CustomExercise {
  return {
    id: `custom-${uid()}`,
    isCustom: true,
    name: name.trim(),
    nameEn: (nameEn ?? "").trim(),
    group: isGroup(g.group) ? g.group : "mobility",
    sub: "",
    alsoIn: [],
    primary: muscles(g.primary),
    secondary: muscles(g.secondary),
    startWeight: g.startWeight?.trim() || "从轻重量开始",
    equipment: g.equipment?.trim() || "—",
    setup: g.setup ?? "",
    cues: (g.cues ?? []).filter(Boolean).slice(0, 3),
    steps: g.steps ?? [],
    mistakes: g.mistakes ?? [],
    feel: g.feel ?? "",
    sourcePlatform: "AI 教练",
    createdAt: new Date().toISOString(),
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Maps the coach's snake_case exercise description to a Guide. */
export function guideFromCoach(c: any): Guide {
  return {
    equipment: c.equipment ?? "",
    setup: c.setup ?? "",
    steps: c.steps ?? [],
    mistakes: c.common_mistakes ?? [],
    feel: c.feel ?? "",
    cues: c.key_points,
    group: c.group,
    primary: c.primary_muscles,
    secondary: c.secondary_muscles,
    startWeight: c.start_weight,
  };
}
