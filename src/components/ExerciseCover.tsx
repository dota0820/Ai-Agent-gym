"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { findExerciseById, isCustomExercise } from "@/lib/exercise-lookup";
import { safeHttpUrl, safeImageUrl, useApp } from "@/lib/store";
import ExerciseAnim from "./ExerciseAnim";

/**
 * Large demonstration visual for either a built-in exercise (looping start/end anim)
 * or a user-imported custom exercise (cover photo / video thumbnail).
 */
export default function ExerciseCover({
  exerciseId,
  name,
  compact = false,
}: {
  exerciseId?: string;
  name: string;
  compact?: boolean;
}) {
  const { customExercises } = useApp();
  const [failedId, setFailedId] = useState<string | null>(null);

  if (!exerciseId) return null;
  const ex = findExerciseById(exerciseId, customExercises);
  if (!ex) return null;

  if (!isCustomExercise(ex)) {
    return (
      <ExerciseAnim
        id={ex.id}
        name={ex.name}
        note={ex.imageNote}
        compact={compact}
      />
    );
  }

  const safeImg = safeImageUrl(ex.imageUrl);
  const safeSrc = safeHttpUrl(ex.sourceUrl);
  const like =
    !safeImg && ex.lookalikeId
      ? findExerciseById(ex.lookalikeId, [])
      : undefined;
  if (like) {
    // no photo of its own: show the closest built-in exercise as a reference
    return (
      <ExerciseAnim
        id={like.id}
        name={ex.name}
        note={`参考示范:${like.name}(姿势相近)`}
        compact={compact}
      />
    );
  }
  if (!safeImg && !safeSrc) return null;
  const imgFailed = failedId === exerciseId;

  return (
    <figure className="overflow-hidden rounded-2xl border border-line bg-bg">
      {safeImg && !imgFailed ? (
        <div className="relative aspect-[3/2] w-full">
          <img
            src={safeImg}
            alt={name}
            referrerPolicy="no-referrer"
            onError={() => setFailedId(exerciseId)}
            className="h-full w-full object-cover"
          />
          {ex.sourcePlatform && (
            <span className="absolute left-2 top-2 rounded-full bg-black/65 px-2.5 py-0.5 text-xs font-semibold text-white">
              {ex.sourcePlatform}
            </span>
          )}
          {safeSrc && (
            <a
              href={safeSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-2 right-2 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur"
            >
              ▶ 打开原视频
            </a>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between bg-primary-soft px-4 py-3 text-sm">
          <span className="font-semibold text-deep">
            {ex.sourcePlatform ? `${ex.sourcePlatform} 导入动作` : "自定义动作"}
          </span>
          {safeSrc && (
            <a
              href={safeSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white"
            >
              ▶ 打开原视频
            </a>
          )}
        </div>
      )}
    </figure>
  );
}
