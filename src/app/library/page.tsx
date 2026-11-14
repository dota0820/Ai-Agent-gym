"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { H1 } from "@/components/ui";
import { EXERCISES, exerciseImages } from "@/lib/exercises";
import { GROUPS, MUSCLE_LABEL, SUBS, type Group } from "@/lib/types";

function Library() {
  const params = useSearchParams();
  const router = useRouter();
  const g = (GROUPS.find((x) => x.id === params.get("g"))?.id ?? "back") as Group;
  const subs = SUBS[g];
  const sub = subs.find((x) => x.id === params.get("s"))?.id ?? "";
  const go = (ng: Group, ns = "") =>
    router.replace(`/library?g=${ng}${ns ? `&s=${ns}` : ""}`, { scroll: false });

  const inGroup = EXERCISES.filter(
    (e) => e.group === g || e.alsoIn.some((t) => t.startsWith(`${g}/`)),
  );
  const list = sub
    ? inGroup.filter(
        (e) => (e.group === g && e.sub === sub) || e.alsoIn.includes(`${g}/${sub}`),
      )
    : inGroup;
  const subLabel = (e: (typeof EXERCISES)[number]) => {
    const id = e.group === g ? e.sub : e.alsoIn.find((t) => t.startsWith(`${g}/`))?.split("/")[1];
    return subs.find((x) => x.id === id)?.label;
  };

  return (
    <div>
      <H1 sub="点开动作看动图示范、练到哪块肌肉、一步一步怎么做">动作库</H1>
      <div className="-mx-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-1">
        {GROUPS.map((x) => (
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
                  {subLabel(e) && (
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
                      {subLabel(e)}
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
