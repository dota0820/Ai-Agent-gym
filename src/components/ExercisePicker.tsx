"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { exerciseImages, listExercises, subLabel, type LibGroup } from "@/lib/exercises";
import { GROUPS } from "@/lib/types";

const TABS: { id: LibGroup; label: string }[] = [{ id: "shape", label: "✨ 女生塑形" }, ...GROUPS];
import { btnSoft, input } from "./ui";

export default function ExercisePicker({
  onPick,
  onClose,
}: {
  onPick: (e: { exerciseId?: string; name: string; nameEn?: string }) => void;
  onClose: () => void;
}) {
  const [g, setG] = useState<LibGroup>("back");
  const [custom, setCustom] = useState("");
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="safe-b mx-auto max-h-[80dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-bg p-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="选择动作"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">添加动作</h2>
          <button className="text-sub" onClick={onClose}>
            关闭
          </button>
        </div>
        <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
          {TABS.map((x) => (
            <button
              key={x.id}
              onClick={() => setG(x.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${
                g === x.id ? "bg-primary text-white" : "border border-line bg-card"
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>
        <ul className="space-y-2">
          {listExercises(g).map((e) => (
            <li key={e.id}>
              <button
                className="flex w-full items-center gap-3 rounded-xl border border-line bg-card p-2 pr-3 text-left active:scale-[0.99]"
                onClick={() => onPick({ exerciseId: e.id, name: e.name, nameEn: e.nameEn })}
              >
                <img
                  src={exerciseImages(e.id)[1]}
                  alt=""
                  loading="lazy"
                  className="h-[60px] w-[90px] shrink-0 rounded-lg bg-[#141418] object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold">{e.name}</span>
                  <span className="block truncate text-xs text-sub">
                    {e.nameEn}
                    {subLabel(e, g) ? ` · ${subLabel(e, g)}` : ""}
                  </span>
                </span>
                <span className="text-lg font-bold text-primary">+</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex gap-2">
          <input
            className={input}
            placeholder="找不到?自己输入动作名"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
          <button
            className={btnSoft}
            disabled={!custom.trim()}
            onClick={() => onPick({ name: custom.trim() })}
          >
            添加
          </button>
        </div>
      </div>
    </div>
  );
}
