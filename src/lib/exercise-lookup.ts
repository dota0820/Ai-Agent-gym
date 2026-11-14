import { exerciseImages, EXERCISES, EX_BY_ID, listExercises, subLabel } from "./exercises";
import type { CustomExercise, Exercise } from "./types";
import type { LibGroup } from "./exercises";

export type AnyExercise = Exercise | CustomExercise;
export type ExtendedLibGroup = LibGroup | "custom";

export function isCustomExercise(ex: AnyExercise): ex is CustomExercise {
  return "isCustom" in ex && ex.isCustom === true;
}

export function findExerciseById(
  id: string | undefined,
  customExercises: CustomExercise[],
): AnyExercise | undefined {
  if (!id) return undefined;
  return EX_BY_ID[id] ?? customExercises.find((c) => c.id === id);
}

export function listAllExercises(
  g: ExtendedLibGroup,
  sub = "",
  customExercises: CustomExercise[] = [],
): AnyExercise[] {
  if (g === "custom") {
    return [...customExercises].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const builtIn = listExercises(g, sub);
  if (g === "shape") return builtIn;
  const customMatches = customExercises
    .filter((e) => (sub ? e.group === g && e.sub === sub : e.group === g))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return [...customMatches, ...builtIn];
}

export function anySubLabel(e: AnyExercise, g: ExtendedLibGroup): string | undefined {
  if (g === "custom") return undefined;
  return subLabel(e, g);
}

export function exerciseThumbnail(e: AnyExercise): string | undefined {
  if (isCustomExercise(e)) return e.imageUrl;
  return exerciseImages(e.id)[1];
}

export function allExerciseNamesForPrompt(customExercises: CustomExercise[]): string {
  if (!customExercises.length) return "(暂无用户自定义动作)";
  return customExercises
    .map((e) => `- ${e.id}: ${e.name}${e.nameEn ? ` (${e.nameEn})` : ""} [${e.group}]`)
    .join("\n");
}

export { EXERCISES };
