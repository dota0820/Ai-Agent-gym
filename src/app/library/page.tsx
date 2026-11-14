"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { H1 } from "@/components/ui";
import {
  exerciseImages,
  listExercises,
  subLabel,
  subsFor,
  type LibGroup,
} from "@/lib/exercises";
import { GROUPS, MUSCLE_LABEL } from "@/lib/types";

const TABS: { id: LibGroup; label: string; emoji: string }[] = [
  { id: "shape", label: "女生塑形", emoji: "✨" },
  ...GROUPS,
];

function Library() {
  const params = useSearchParams();
  const router = useRouter();
  const g: LibGroup = TABS.find((x) => x.id === params.get("g"))?.id ?? "back";
  const subs = subsFor(g);
  const sub = subs.find((x) => x.id === params.get("s"))?.id ?? "";
  const go = (ng: LibGroup, ns = "") =>
    router.replace(`/library?g=${ng}${ns ? `&s=${ns}` : ""}`, { scroll: false });
  const list = listExercises(g, sub);

  return (
    <div>
      <H1 sub="点开动作看动图示范、练到哪块肌肉、一步一步怎么做">动作库</H1>
      <div className="-mx-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-1">
        {TABS.map((x) => (
          <button
            key={x.id}
            onClick={() => go(x.id)}
            aria-pressed={g === x.id}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ${
              g === x.id ? "bg-primary text-white" : "border border-line bg-card"
            }`}
          >
            {x.emoji} {x.label}
          </button>
        ))}
      </div>
      {subs.length > 0 && (
        <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {[{ id: "", label: "全部" }, ...subs].map((x) => (
            <button
              key={x.id}
              onClick={() => go(g, x.id)}
              aria-pressed={sub === x.id}
              className={`shrink-0 rounded-full px-3 py-1 text-[13px] font-semibold ${
                sub === x.id ? "bg-ink text-white" : "bg-primary-soft text-primary"
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>
      )}
      {g === "shape" && (
        <p className="mb-3 rounded-2xl bg-card p-3 text-sm leading-relaxed text-sub">
          给想塑造身形的新手挑的入门动作:重点练臀腿、把背和肩练挺、收紧腰腹。重量从轻的开始,不会练成“大块头”。
        </p>
      )}
      <ul className="space-y-2">
        {list.map((e) => (
          <li key={e.id}>
            <Link
              href={`/library/${e.id}`}
              className="flex items-center gap-3 rounded-2xl border border-line bg-card p-2 pr-3 active:scale-[0.99]"
            >
              <img
                src={exerciseImages(e.id)[1]}
                alt=""
                loading="lazy"
                className="h-[68px] w-[102px] shrink-0 rounded-xl bg-[#141418] object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{e.name}</span>
                <span className="block truncate text-xs text-sub">{e.nameEn}</span>
                <span className="mt-1 flex flex-wrap gap-1">
                  {subLabel(e, g) && (
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
                      {subLabel(e, g)}
                    </span>
                  )}
                  <span className="rounded-full bg-bg px-2 py-0.5 text-[11px] text-sub">
                    {MUSCLE_LABEL[e.primary[0]].split("(")[0]}
                  </span>
                </span>
              </span>
              <span className="text-sub">›</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-center text-[11px] text-sub">
        示范照片来自公共领域的 free-exercise-db 开源动作库
      </p>
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense>
      <Library />
    </Suspense>
  );
}
