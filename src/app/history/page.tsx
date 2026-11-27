"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import RecordSwitch from "@/components/RecordSwitch";
import PlanCard from "@/components/PlanCard";
import ProgressChart from "@/components/ProgressChart";
import { btnPrimary, btnSoft, Card } from "@/components/ui";
import { startFree } from "@/lib/actions";
import { computeStreakWeeks, topExerciseProgress } from "@/lib/analytics";
import { sameDayWorkouts } from "@/lib/workout-edit";
import {
  computeNutritionTargets,
  fmtDateKey,
  localDateKey,
  sumMealMacros,
} from "@/lib/nutrition";
import {
  durationMin,
  fmtDate,
  removeMealLog,
  setState,
  useApp,
  useHydrated,
  volume,
} from "@/lib/store";
import { MEAL_TYPES, type MealLog } from "@/lib/types";

function HistoryContent() {
  const { workouts, active, meals, profile, plan } = useApp();
  const [now] = useState(() => Date.now());
  const router = useRouter();
  const searchParams = useSearchParams();
  const ready = useHydrated();

  if (!ready) return null;

  const tab = searchParams.get("tab") === "food" ? "food" : "workout";
  const setTab = (next: "workout" | "food") => {
    router.replace(next === "food" ? "/history?tab=food" : "/history", { scroll: false });
  };

  const sortedWorkouts = [...workouts].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const streak = computeStreakWeeks(workouts, now);
  const progressItems = topExerciseProgress(workouts, 90, 6);
  const targets = computeNutritionTargets(profile);

  // Group meals by local calendar day, newest day first, newest meal first within each day
  const mealsByDay = new Map<string, MealLog[]>();
  const sortedMeals = [...meals].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
  for (const m of sortedMeals) {
    const dk = localDateKey(m.loggedAt);
    const list = mealsByDay.get(dk);
    if (list) list.push(m);
    else mealsByDay.set(dk, [m]);
  }
  const dayEntries = [...mealsByDay.entries()].sort(([a], [b]) => b.localeCompare(a));

  return (
    <div className="space-y-3">
      <RecordSwitch on="log" />

      {/* Dual tab selector: Training vs Food */}
      <div
        role="tablist"
        aria-label="记录类型"
        className="grid grid-cols-2 gap-1.5 rounded-2xl border border-line bg-surface p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "workout"}
          onClick={() => setTab("workout")}
          className={`rounded-xl py-2.5 text-sm font-bold transition ${
            tab === "workout" ? "bg-primary-soft text-deep" : "text-sub"
          }`}
        >
          训练 ({workouts.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "food"}
          onClick={() => setTab("food")}
          className={`rounded-xl py-2.5 text-sm font-bold transition ${
            tab === "food" ? "bg-primary-soft text-deep" : "text-sub"
          }`}
        >
          饮食 ({meals.length})
        </button>
      </div>

      {tab === "workout" ? (
        <div className="space-y-3">
          {active && (
            <Card className="border-mint/40 bg-mint-soft">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-mint">训练中</div>
                  <div className="text-base font-bold">{active.title}</div>
                </div>
                <Link href="/workout" className={`${btnPrimary} py-2 text-sm`}>
                  继续
                </Link>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { l: "连续打卡", v: streak.currentWeeks, u: "周" },
              { l: "本周已练", v: streak.thisWeekDays, u: "天" },
              { l: "累计训练", v: workouts.length, u: "次" },
            ].map((x) => (
              <div key={x.l} className="rounded-2xl border border-line bg-card py-2.5">
                <div className="num text-2xl font-bold">
                  {x.v}
                  <span className="ml-0.5 text-xs font-semibold text-sub">{x.u}</span>
                </div>
                <div className="text-xs text-sub">{x.l}</div>
              </div>
            ))}
          </div>

          {progressItems.length > 0 && (
            <Card>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-sub">核心动作进步</span>
                <span className="text-xs text-sub">近 90 天</span>
              </div>
              <ProgressChart items={progressItems} />
            </Card>
          )}

          {plan && !active && (
            <PlanCard
              plan={plan}
              collapsible
              defaultCollapsed
              onDismiss={() => setState((s) => ({ ...s, plan: null }))}
            />
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={btnSoft}
              onClick={() => {
                if (active && !confirm("有一次训练还没结束，要放弃它重新开始记录吗？")) return;
                startFree();
                router.push("/workout");
              }}
            >
              手动记
            </button>
            <Link
              href={`/coach?q=${encodeURIComponent("我想补记一次训练,你来问我做了什么,帮我记录下来")}`}
              className={btnSoft}
            >
              AI 帮记
            </Link>
          </div>

          {sortedWorkouts.length === 0 ? (
            <Card>
              <p className="py-2 text-center text-sm text-sub">暂无训练记录</p>
            </Card>
          ) : (
            <ul className="space-y-2.5">
              {sortedWorkouts.map((w) => (
                <li key={w.id}>
                  <Link href={`/history/${w.id}`} className="block">
                    <Card>
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="font-bold">{w.title}</div>
                        <div className="shrink-0 text-xs text-sub">{fmtDate(w.startedAt)}</div>
                      </div>
                      <p className="mt-1 text-sm text-sub">
                        {w.exercises.map((e) => e.name).join(" · ") || "没有记录动作"}
                      </p>
                      {sameDayWorkouts(workouts, w).length > 0 && (
                        <p className="mt-1 text-xs font-semibold text-deep">
                          同一天有 {sameDayWorkouts(workouts, w).length + 1} 条记录,点开可以合并
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-sub">
                        {(durationMin(w) ?? 0) > 0 && <span>⏱ {durationMin(w)} 分钟</span>}
                        {volume(w) > 0 && <span>总重量 {volume(w)} kg</span>}
                        {(w.watch?.calories ?? 0) > 0 && <span>{w.watch!.calories} 千卡</span>}
                        {(w.watch?.avgHr ?? 0) > 0 && <span>心率 {w.watch!.avgHr} bpm</span>}
                      </div>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Link href="/food" className={btnSoft}>
              记一餐
            </Link>
            <Link
              href={`/coach?q=${encodeURIComponent("帮我看看最近的饮食和热量、蛋白质达标情况，给我下一餐建议")}`}
              className={btnSoft}
            >
              问教练
            </Link>
          </div>

          <Card className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-sub">每日目标</span>
              <Link href="/me/profile" className="font-semibold text-deep">
                修改 ›
              </Link>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold tabular-nums">
              <span className="text-deep">{targets.calories} kcal</span>
              <span>蛋白 {targets.protein}g</span>
              <span>碳水 {targets.carbs}g</span>
              <span>脂肪 {targets.fat}g</span>
            </div>
          </Card>

          {dayEntries.length === 0 ? (
            <Card>
              <p className="py-2 text-center text-sm text-sub">暂无饮食记录</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {dayEntries.map(([dateKey, dayMeals]) => {
                const dayTotals = sumMealMacros(dayMeals);
                const pct = Math.min(
                  100,
                  Math.round((dayTotals.calories / Math.max(1, targets.calories)) * 100),
                );
                const over = dayTotals.calories > targets.calories * 1.05;
                return (
                  <section key={dateKey} className="space-y-2">
                    <div className="rounded-2xl border border-line bg-surface px-3.5 py-2.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-bold">{fmtDateKey(dateKey)}</span>
                          <span className="text-xs text-sub tabular-nums">{dateKey}</span>
                        </div>
                        <Link
                          href={`/food?date=${dateKey}`}
                          className="text-xs font-semibold text-deep"
                        >
                          + 补记
                        </Link>
                      </div>
                      <div className="mt-1.5 flex items-baseline justify-between text-xs tabular-nums">
                        <span className="font-bold">
                          {dayTotals.calories} / {targets.calories} kcal
                        </span>
                        <span className="text-sub">
                          蛋 {dayTotals.protein}/{targets.protein}g · 碳 {dayTotals.carbs}/
                          {targets.carbs}g · 脂 {dayTotals.fat}/{targets.fat}g
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-bg">
                        <div
                          className={`h-full rounded-full ${over ? "bg-amber-500" : "bg-primary"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {dayMeals.map((m) => {
                      const mt = MEAL_TYPES.find((x) => x.id === m.mealType) ?? MEAL_TYPES[3];
                      const time = new Date(m.loggedAt).toTimeString().slice(0, 5);
                      return (
                        <Card key={m.id} className="space-y-2">
                          <div className="flex items-start gap-3">
                            {m.image && (
                              <img
                                src={m.image}
                                alt={m.summary}
                                className="h-14 w-14 shrink-0 rounded-xl object-cover"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-deep">
                                  {mt.emoji} {mt.label} · {time}
                                </span>
                                <button
                                  type="button"
                                  className="text-xs text-sub underline"
                                  onClick={() => {
                                    if (confirm(`删除「${m.summary}」这条饮食记录？`)) {
                                      removeMealLog(m.id);
                                    }
                                  }}
                                >
                                  删除
                                </button>
                              </div>
                              <div className="mt-1 font-bold">{m.summary}</div>
                              <div className="mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5 text-xs text-sub tabular-nums">
                                <span className="font-semibold text-ink">{m.calories} kcal</span>
                                <span>蛋白 {m.protein}g</span>
                                <span>碳水 {m.carbs}g</span>
                                <span>脂肪 {m.fat}g</span>
                              </div>
                            </div>
                          </div>

                          {m.advice && (
                            <p className="rounded-xl bg-mint-soft px-3 py-2 text-xs leading-relaxed text-mint">
                              {m.advice}
                            </p>
                          )}

                          {m.items.length > 1 && (
                            <details className="text-xs text-sub">
                              <summary className="cursor-pointer font-semibold">
                                查看单品明细 ({m.items.length})
                              </summary>
                              <ul className="mt-1.5 space-y-1 pl-2">
                                {m.items.map((it, idx) => (
                                  <li key={idx} className="flex justify-between gap-2">
                                    <span>
                                      • {it.name}
                                      {it.portion ? ` (${it.portion})` : ""}
                                    </span>
                                    <span className="shrink-0 tabular-nums">
                                      {it.calories} kcal · 蛋{it.protein} / 碳{it.carbs} / 脂
                                      {it.fat}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </details>
                          )}
                        </Card>
                      );
                    })}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function History() {
  return (
    <Suspense fallback={null}>
      <HistoryContent />
    </Suspense>
  );
}
