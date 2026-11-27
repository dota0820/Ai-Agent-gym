import { EX_BY_ID } from "./exercises";
import { uid } from "./store";
import {
  GROUPS,
  MUSCLE_LABEL,
  type CustomExercise,
  type Group,
  type Guide,
  type Muscle,
} from "./types";

const isGroup = (v: unknown): v is Group => GROUPS.some((g) => g.id === v);
const muscles = (v: unknown): Muscle[] =>
  Array.isArray(v)
    ? (v.filter((m) => typeof m === "string" && m in MUSCLE_LABEL) as Muscle[])
    : [];

/**
 * Turns an exercise the coach described (one that is not in the built-in library)
 * into a saved custom exercise, so it shows up in the library and can be reused.
 */
export function customExerciseFromGuide(
  name: string,
  nameEn: string | undefined,
  g: Guide,
  similarId?: string,
): CustomExercise {
  const like = similarId ? EX_BY_ID[similarId] : undefined;
  const primary = muscles(g.primary);
  return {
    id: `custom-${uid()}`,
    isCustom: true,
    name: name.trim(),
    nameEn: (nameEn ?? "").trim(),
    group: isGroup(g.group) ? g.group : (like?.group ?? "mobility"),
    sub: "",
    alsoIn: [],
    // fall back to the look-alike's muscles so the body map is never empty
    primary: primary.length ? primary : (like?.primary ?? []),
    secondary: primary.length ? muscles(g.secondary) : (like?.secondary ?? []),
    lookalikeId: like?.id,
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
/** Applies the coach's update_exercise_in_library patch to a saved exercise. */
export function patchCustomExercise(
  ex: CustomExercise,
  p: any,
): CustomExercise {
  const like =
    typeof p.similar_exercise_id === "string"
      ? EX_BY_ID[p.similar_exercise_id]
      : undefined;
  const prim =
    p.primary_muscles !== undefined ? muscles(p.primary_muscles) : ex.primary;
  return {
    ...ex,
    name: p.name?.trim() || ex.name,
    nameEn: p.name_en?.trim() ?? ex.nameEn,
    group: isGroup(p.group) ? p.group : ex.group,
    primary: prim.length ? prim : (like?.primary ?? ex.primary),
    secondary:
      p.secondary_muscles !== undefined
        ? muscles(p.secondary_muscles)
        : !ex.secondary.length && like
          ? like.secondary
          : ex.secondary,
    lookalikeId: like?.id ?? ex.lookalikeId,
    equipment: p.equipment?.trim() || ex.equipment,
    setup: p.setup ?? ex.setup,
    steps: Array.isArray(p.steps) ? p.steps : ex.steps,
    mistakes: Array.isArray(p.common_mistakes)
      ? p.common_mistakes
      : ex.mistakes,
    feel: p.feel ?? ex.feel,
    cues: Array.isArray(p.key_points) ? p.key_points.slice(0, 3) : ex.cues,
    startWeight: p.start_weight?.trim() || ex.startWeight,
  };
}

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
