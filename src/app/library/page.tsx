"use client";
import Link from "next/link";
import { useState } from "react";
import Guide from "@/components/Guide";
import { H1 } from "@/components/ui";
import { EXERCISES } from "@/lib/exercises";
import { GROUPS, type Group } from "@/lib/types";

export default function Library() {
  const [g, setG] = useState<Group>("back");
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div>
      <H1 sub="每个动作:器械怎么调、坐哪里、拉到哪里、哪里该酸">动作库</H1>
      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {GROUPS.map((x) => (
          <button
            key={x.id}
            onClick={() => {
              setG(x.id);
              setOpen(null);
            }}
            aria-pressed={g === x.id}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ${
              g === x.id ? "bg-primary text-white" : "border border-line bg-card"
            }`}
          >
            {x.emoji} {x.label}
          </button>
        ))}
      </div>
      <ul className="space-y-2">
        {EXERCISES.filter((e) => e.group === g).map((e) => (
          <li key={e.id} className="rounded-2xl border border-line bg-card">
            <button
              className="flex w-full items-center justify-between px-4 py-3 text-left"
              onClick={() => setOpen(open === e.id ? null : e.id)}
              aria-expanded={open === e.id}
            >
              <span>
                <span className="block font-bold">{e.name}</span>
                <span className="block text-xs text-sub">
                  {e.nameEn} · 新手起始 {e.startWeight}
                </span>
              </span>
              <span className="text-sub">{open === e.id ? "▴" : "▾"}</span>
            </button>
            {open === e.id && (
              <div className="border-t border-line p-4">
                <Guide guide={e} name={e.name} nameEn={e.nameEn} />
                <Link
                  href={`/coach?q=${encodeURIComponent(`${e.name}(${e.nameEn})我有点不确定动作对不对,能再仔细讲讲要点吗?`)}`}
                  className="mt-3 block text-sm font-semibold text-primary"
                >
                  💬 还是不懂?问教练
                </Link>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
