"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveToLibrary, startFromPlan } from "@/lib/actions";
import { targetRirWords } from "@/lib/rir";
import { useApp } from "@/lib/store";
import { MUSCLE_LABEL, type Muscle, type Plan } from "@/lib/types";
import Icon from "./Icon";
import Guide, { guideFor } from "./Guide";
import { btnPrimary } from "./ui";

export default function PlanCard({
  plan,
  collapsible = false,
  defaultCollapsed = false,
  onDismiss,
}: {
  plan: Plan;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  onDismiss?: () => void;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState(collapsible && defaultCollapsed);
  const router = useRouter();
  const { active, customExercises } = useApp();

  if (collapsed) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-line bg-card px-3.5 py-2.5">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        >
          <span className="shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-deep">
            计划
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-bold">{plan.title}</span>
          <span className="shrink-0 text-xs text-sub">{plan.items.length} 动作</span>
        </button>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="min-h-8 shrink-0 rounded-full bg-bg px-2.5 text-xs font-semibold text-sub"
        >
          展开
        </button>
        {onDismiss && (
          <button
            type="button"
            aria-label="关闭计划"
            onClick={onDismiss}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sub active:bg-bg"
          >
            <Icon name="x" size={15} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-card">
      <div className="flex items-start justify-between gap-2 p-4 pb-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-deep">计划 · {plan.focus}</div>
          <div className="mt-0.5 text-lg font-bold">{plan.title}</div>
          {plan.note && <p className="mt-1 text-xs text-sub">{plan.note}</p>}
        </div>
        {(collapsible || onDismiss) && (
          <div className="flex shrink-0 items-center gap-1">
            {collapsible && (
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="min-h-8 rounded-full bg-bg px-2.5 text-xs font-semibold text-sub"
              >
                收起
              </button>
            )}
            {onDismiss && (
              <button
                type="button"
                aria-label="关闭计划"
                onClick={onDismiss}
                className="flex h-8 w-8 items-center justify-center rounded-full text-sub active:bg-bg"
              >
                <Icon name="x" size={15} />
              </button>
            )}
          </div>
        )}
      </div>
      <ul>
        {plan.items.map((it, i) => {
          const g = guideFor(it, customExercises);
          const target = ((g as { primary?: Muscle[] } | null)?.primary ?? [])
            .map((m) => MUSCLE_LABEL[m]?.split("(")[0])
            .filter(Boolean)
            .join("、");
          return (
            <li key={`${it.exerciseId ?? it.name}-${i}`} className="border-t border-line">
              <button
                type="button"
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
                    {it.sets}组×{it.reps}
                    {it.weight ? ` · ${it.weight}` : ""}
                    {it.targetRir != null ? ` · ${targetRirWords(it.targetRir)}` : ""}
                  </span>
                  {target && (
                    <span className="mt-0.5 block text-[11px] font-semibold text-deep">
                      {target}
                    </span>
                  )}
                </span>
                <span className="text-xs text-sub">{open === i ? "收起" : "动作"}</span>
              </button>
              {open === i && (
                <div className="px-4 pb-4">
                  {it.note && (
                    <p className="mb-3 rounded-xl bg-primary-soft px-3 py-2 text-xs text-deep">
                      {it.note}
                    </p>
                  )}
                  {!it.exerciseId && it.custom && (
                    <button
                      type="button"
                      onClick={() => saveToLibrary(it)}
                      className="mb-3 w-full rounded-xl border border-primary/40 bg-primary-soft px-3 py-2 text-xs font-semibold text-deep"
                    >
                      + 加入动作库
                    </button>
                  )}
                  {g ? (
                    <Guide guide={g} name={it.name} nameEn={it.nameEn} />
                  ) : (
                    <p className="text-xs text-sub">暂无内置教程，可在教练页询问。</p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="p-4 pt-2">
        <button
          type="button"
          className={`${btnPrimary} w-full`}
          onClick={() => {
            if (
              active &&
              !confirm("有一次训练还没结束，要放弃它并开始这个计划吗？")
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
