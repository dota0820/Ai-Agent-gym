"use client";
import { useState } from "react";
import { EXERCISES } from "@/lib/exercises";
import { GROUPS, type Group } from "@/lib/types";
import { btnSoft, input } from "./ui";

export default function ExercisePicker({
  onPick,
  onClose,
}: {
  onPick: (e: { exerciseId?: string; name: string; nameEn?: string }) => void;
  onClose: () => void;
}) {
  const [g, setG] = useState<Group>("back");
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
          {GROUPS.map((x) => (
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
          {EXERCISES.filter((e) => e.group === g).map((e) => (
            <li key={e.id}>
              <button
                className="w-full rounded-xl border border-line bg-card px-4 py-3 text-left"
                onClick={() => onPick({ exerciseId: e.id, name: e.name, nameEn: e.nameEn })}
              >
                <div className="font-semibold">{e.name}</div>
                <div className="text-xs text-sub">{e.nameEn}</div>
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
