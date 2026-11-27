"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Guide, { guideFor } from "@/components/Guide";
import Icon from "@/components/Icon";
import { saveToLibrary, startFromPlan } from "@/lib/actions";
import { planMinutes } from "@/lib/plan-time";
import { targetRirWords } from "@/lib/rir";
import { useApp, useHydrated } from "@/lib/store";
import { MUSCLE_LABEL, type Muscle } from "@/lib/types";

/** Today's plan, full screen: summary, the exercises in order, one start button. */
export default function PlanPage() {
  const router = useRouter();
  const ready = useHydrated();
  const { plan, active, customExercises } = useApp();
  const [open, setOpen] = useState<number | null>(null);
  if (!ready) return null;

  const header = (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="返回"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-card"
      >
        <Icon name="chevronLeft" size={22} />
      </button>
      <span className="text-[14px] font-medium">今日计划</span>
      <span className="flex h-[30px] items-center rounded-full bg-primary px-3 text-[11px] font-bold">
        AI 定制
      </span>
    </div>
  );

  if (!plan) {
    return (
      <div className="space-y-8">
        {header}
        <div>
          <h1 className="text-[34px] font-bold leading-tight">还没有计划</h1>
          <p className="mt-2 text-[13px] text-sub">
            告诉教练你有多少时间、想练哪里，它会帮你排好。
          </p>
        </div>
        <Link
          href="/coach"
          className="flex h-[54px] items-center justify-center rounded-full bg-primary text-[16px] font-bold"
        >
          问问教练
        </Link>
      </div>
    );
  }

  const sets = plan.items.reduce((n, it) => n + it.sets, 0);
  const start = () => {
    if (active && !confirm("有一次训练还没结束，要放弃它并开始这个计划吗？"))
      return;
    startFromPlan(plan);
    router.push("/workout");
  };

  return (
    <div className="pb-24">
      {header}
      <h1 className="mt-6 text-[34px] font-bold leading-tight">{plan.title}</h1>
      <p className="mt-2 text-[13px] text-sub">
        {plan.note || plan.focus || "从轻重量开始，找到自己的节奏。"}
      </p>

      <div className="mt-6 grid grid-cols-3 rounded-[20px] bg-card px-4 py-4">
        {[
          { n: planMinutes(plan), u: "分钟" },
          { n: plan.items.length, u: "个动作" },
          { n: sets, u: "组训练" },
        ].map((x) => (
          <div key={x.u} className="flex items-baseline gap-2">
            <span className="display-num text-[25px] leading-none">{x.n}</span>
            <span className="text-[11px] text-sub">{x.u}</span>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-baseline justify-between">
        <h2 className="text-[17px] font-bold">动作安排</h2>
        <span className="text-[11px] text-sub">按顺序完成</span>
      </div>

      <ul className="mt-2">
        {plan.items.map((it, i) => {
          const g = guideFor(it, customExercises);
          const target = ((g as { primary?: Muscle[] } | null)?.primary ?? [])
            .map((m) => MUSCLE_LABEL[m]?.split("(")[0])
            .filter(Boolean)
            .slice(0, 2)
            .join("、");
          const last = i === plan.items.length - 1;
          return (
            <li key={`${it.exerciseId ?? it.name}-${i}`}>
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
                className="flex w-full items-center gap-3.5 py-2.5 text-left"
              >
                <span
                  className={`display-num flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] text-[15px] ${
                    i === 0 ? "bg-primary" : "bg-card"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={`min-w-0 flex-1 py-1.5 ${last && open !== i ? "" : "border-b border-line"}`}
                >
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-bold">
                        {it.name}
                      </span>
                      <span className="mt-1.5 block truncate text-[11px] text-sub">
                        {it.sets} 组 × {it.reps} 次
                        {target ? `  ·  ${target}` : ""}
                        {it.weight ? `  ·  ${it.weight}` : ""}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 transition-transform ${open === i ? "rotate-90" : ""}`}
                    >
                      <Icon name="chevronRight" size={19} />
                    </span>
                  </span>
                </span>
              </button>
              {open === i && (
                <div className="mb-3 ml-[56px] space-y-3 border-b border-line pb-4">
                  {it.targetRir != null && (
                    <p className="text-[12px] text-sub">
                      每组 {targetRirWords(it.targetRir)}
                    </p>
                  )}
                  {it.note && (
                    <p className="rounded-xl bg-card px-3 py-2 text-[12px]">
                      {it.note}
                    </p>
                  )}
                  {!it.exerciseId && it.custom && (
                    <button
                      type="button"
                      onClick={() => saveToLibrary(it)}
                      className="w-full rounded-xl bg-card px-3 py-2 text-[12px] font-bold"
                    >
                      + 加入动作库
                    </button>
                  )}
                  {g ? (
                    <Guide guide={g} name={it.name} nameEn={it.nameEn} />
                  ) : (
                    <p className="text-[12px] text-sub">
                      暂无内置教程，可在教练页询问。
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-10 px-6 pb-3">
        <button
          type="button"
          onClick={start}
          className="relative mx-auto flex h-[54px] w-full max-w-md items-center justify-center rounded-full bg-primary text-[16px] font-bold"
        >
          开始训练
          <span className="absolute right-6">
            <Icon name="arrowRight" size={22} />
          </span>
        </button>
      </div>
    </div>
  );
}
