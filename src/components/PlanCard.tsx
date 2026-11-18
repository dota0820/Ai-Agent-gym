"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveToLibrary, startFromPlan } from "@/lib/actions";
import { targetRirWords } from "@/lib/rir";
import { useApp } from "@/lib/store";
import { MUSCLE_LABEL, type Muscle, type Plan } from "@/lib/types";
import Guide, { guideFor } from "./Guide";
import { btnPrimary } from "./ui";

export default function PlanCard({ plan }: { plan: Plan }) {
  const [open, setOpen] = useState<number | null>(null);
  const router = useRouter();
  const { active, customExercises } = useApp();
  return (
    <div className="rounded-2xl border border-line bg-card">
      <div className="p-4 pb-2">
        <div className="text-xs font-semibold text-deep">训练计划 · {plan.focus}</div>
        <div className="mt-0.5 text-lg font-bold">{plan.title}</div>
        {plan.note && <p className="mt-1 text-sm text-sub">{plan.note}</p>}
      </div>
      <ul>
        {plan.items.map((it, i) => {
          const g = guideFor(it, customExercises);
          const target = ((g as { primary?: Muscle[] } | null)?.primary ?? [])
            .map((m) => MUSCLE_LABEL[m]?.split("(")[0])
            .filter(Boolean)
            .join("、");
          return (
            <li key={i} className="border-t border-line">
              <button
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-deep">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{it.name}</span>
                  <span className="block text-xs text-sub">
                    {it.nameEn ? `${it.nameEn} · ` : ""}
                    {it.sets} 组 × {it.reps}
                    {it.weight ? ` · ${it.weight}` : ""}
                    {it.targetRir != null ? ` · ${targetRirWords(it.targetRir)}` : ""}
                  </span>
                  {target && (
                    <span className="mt-0.5 block text-xs font-semibold text-deep">
                      练到:{target}
                    </span>
                  )}
                </span>
                <span className="text-xs text-sub">{open === i ? "收起" : "怎么做"}</span>
              </button>
              {open === i && (
                <div className="px-4 pb-4">
                  {it.note && (
                    <p className="mb-3 rounded-xl bg-primary-soft px-3 py-2 text-sm text-deep">
                      教练提醒:{it.note}
                    </p>
                  )}
                  {!it.exerciseId && it.custom && (
                    <button
                      onClick={() => saveToLibrary(it)}
                      className="mb-3 w-full rounded-xl border border-primary/40 bg-primary-soft px-3 py-2.5 text-sm font-semibold text-deep"
                    >
                      ＋ 加入我的动作库(以后可以直接用)
                    </button>
                  )}
                  {g ? (
                    <Guide guide={g} name={it.name} nameEn={it.nameEn} />
                  ) : (
                    <p className="text-sm text-sub">
                      这个动作没有内置教程,可以去问教练“{it.name}怎么做”。
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="p-4 pt-2">
        <button
          className={`${btnPrimary} w-full`}
          onClick={() => {
            if (
              active &&
              !confirm("有一次训练还没结束,要放弃它并开始这个计划吗?")
            )
              return;
            startFromPlan(plan);
            router.push("/workout");
          }}
        >
          开始训练
        </button>
      </div>
    </div>
  );
}
