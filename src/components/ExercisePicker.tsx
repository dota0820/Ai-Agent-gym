"use client";
/* eslint-disable @next/next/no-img-element */
import Icon from "./Icon";
import { useEffect, useMemo, useState } from "react";
import {
  allExercises,
  anySubLabel,
  exerciseThumbnail,
  isCustomExercise,
  listAllExercises,
  type ExtendedLibGroup,
} from "@/lib/exercise-lookup";
import { useApp } from "@/lib/store";
import { GROUPS } from "@/lib/types";
import ImportExerciseModal from "./ImportExerciseModal";
import { btnSoft, input } from "./ui";

export default function ExercisePicker({
  onPick,
  onClose,
}: {
  onPick: (e: { exerciseId?: string; name: string; nameEn?: string }) => void;
  onClose: () => void;
}) {
  const { customExercises } = useApp();
  const [g, setG] = useState<ExtendedLibGroup>(customExercises.length > 0 ? "custom" : "back");
  const [query, setQuery] = useState("");
  const [custom, setCustom] = useState("");
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !showImport) onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, showImport]);

  const tabs: { id: ExtendedLibGroup; label: string }[] = [
    ...(customExercises.length > 0 ? [{ id: "custom" as const, label: `我的(${customExercises.length})` }] : []),
    { id: "shape", label: "女生塑形" },
    ...GROUPS,
  ];

  const trimmedQuery = query.trim().toLowerCase();
  const list = useMemo(() => {
    if (trimmedQuery) {
      return allExercises(customExercises).filter(
        (e) =>
          e.name.toLowerCase().includes(trimmedQuery) ||
          e.nameEn.toLowerCase().includes(trimmedQuery) ||
          e.equipment.toLowerCase().includes(trimmedQuery),
      );
    }
    return listAllExercises(g, "", customExercises);
  }, [trimmedQuery, g, customExercises]);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end bg-black/45 backdrop-blur-[1px]" onClick={onClose}>
        <div
          className="safe-b rise-in mx-auto flex max-h-[86dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-bg"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="选择动作"
        >
          <div className="flex justify-center pt-2.5 pb-1">
            <span className="h-1 w-10 rounded-full bg-line" aria-hidden />
          </div>

          <div className="shrink-0 border-b border-line px-4 pt-1 pb-3">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold">添加动作</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="min-h-9 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-deep"
                  onClick={() => setShowImport(true)}
                >
                  从视频链接导入
                </button>
                <button
                  type="button"
                  aria-label="关闭"
                  className="flex h-10 w-10 items-center justify-center rounded-full text-sub active:bg-line/50"
                  onClick={onClose}
                >
                  <Icon name="x" size={18} />
                </button>
              </div>
            </div>

            <div className="relative mb-2.5">
              <input
                className={`${input} pr-9 py-2 text-sm`}
                placeholder="搜索动作名称、英文或器械…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  type="button"
                  aria-label="清除搜索"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-sub"
                >
                  <Icon name="x" size={14} />
                </button>
              )}
            </div>

            {!trimmedQuery && (
              <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
                {tabs.map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    onClick={() => setG(x.id)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${
                      g === x.id ? "bg-primary text-white" : "border border-line bg-card"
                    }`}
                  >
                    {x.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
            {list.length === 0 ? (
              <p className="py-8 text-center text-sm text-sub">
                没找到「{query.trim()}」，可以直接在下方输入动作名添加。
              </p>
            ) : (
              <ul className="space-y-2">
                {list.map((e) => {
                  const thumb = exerciseThumbnail(e);
                  const sub = anySubLabel(e, g);
                  return (
                    <li key={e.id}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 rounded-xl border border-line bg-card p-2 pr-3 text-left active:scale-[0.99]"
                        onClick={() => onPick({ exerciseId: e.id, name: e.name, nameEn: e.nameEn })}
                      >
                        {thumb ? (
                          <img
                            src={thumb}
                            alt=""
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="h-[68px] w-[102px] shrink-0 rounded-lg bg-bg object-cover"
                          />
                        ) : (
                          <div className="flex h-[68px] w-[102px] shrink-0 items-center justify-center rounded-lg bg-primary-soft text-deep">
                            <Icon name="video" size={22} />
                          </div>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-semibold">{e.name}</span>
                          <span className="block truncate text-xs text-sub">
                            {e.nameEn}
                            {sub ? `${e.nameEn ? " · " : ""}${sub}` : ""}
                          </span>
                          {isCustomExercise(e) && (
                            <span className="mt-1 inline-block rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-deep">
                              {e.sourcePlatform ? `来自 ${e.sourcePlatform}` : "自定义"}
                            </span>
                          )}
                        </span>
                        <Icon name="plus" size={18} className="shrink-0 text-deep" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="shrink-0 border-t border-line bg-card px-4 py-3">
            <div className="flex gap-2">
              <input
                className={input}
                placeholder="找不到？自己输入动作名"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
              />
              <button
                type="button"
                className={btnSoft}
                disabled={!custom.trim()}
                onClick={() => onPick({ name: custom.trim() })}
              >
                添加
              </button>
            </div>
          </div>
        </div>
      </div>

      {showImport && (
        <ImportExerciseModal
          onClose={() => setShowImport(false)}
          onSaved={(ex) => {
            setShowImport(false);
            onPick({ exerciseId: ex.id, name: ex.name, nameEn: ex.nameEn });
          }}
        />
      )}
    </>
  );
}
