"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PlanCard from "@/components/PlanCard";
import ProfileChip from "@/components/ProfileChip";
import StartFlow from "@/components/StartFlow";
import { btnGhost, btnPrimary, Card } from "@/components/ui";
import { startFree } from "@/lib/actions";
import { computeNutritionTargets, localDateKey, mealsForDate, sumMealMacros } from "@/lib/nutrition";
import { durationMin, fmtDate, useApp, useHydrated } from "@/lib/store";
import { GROUPS } from "@/lib/types";

export default function Home() {
  const { profile, plan, active, workouts, meals } = useApp();
  const ready = useHydrated();
  const router = useRouter();
  const sorted = [...workouts].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const last = sorted[0];
  const [now] = useState(() => new Date());
  const weekAgo = new Date(now.getTime() - 7 * 864e5).toISOString();
  const thisWeek = workouts.filter((w) => w.startedAt >= weekAgo).length;

  const todayMeals = mealsForDate(meals, localDateKey(now));
  const todayMacros = sumMealMacros(todayMeals);
  const targets = computeNutritionTargets(profile);

  if (!ready) return null;

  return (
    <div className="space-y-4">
      <ProfileChip />
      <StartFlow name={profile.name} />
      <p className="text-sm text-sub">
        最近 7 天练了 {thisWeek} 次 · 一共 {workouts.length} 次
      </p>

      {!profile.goal && (
        <Link href="/me" className="block">
          <Card className="border-primary/30 bg-primary-soft">
            <div className="font-semibold text-primary">先让教练认识你 →</div>
            <p className="mt-1 text-sm text-ink/70">
              花 1 分钟填一下目标和健身房器械,教练的安排会更适合你。
            </p>
          </Card>
        </Link>
      )}

      {active && (
        <Card className="border-mint/40 bg-mint-soft">
          <div className="text-sm font-semibold text-mint">训练进行中</div>
          <div className="mt-0.5 text-lg font-bold">{active.title}</div>
          <Link href="/workout" className={`${btnPrimary} mt-3 w-full`}>
            继续训练
          </Link>
        </Card>
      )}

      <section>
        <div className="grid grid-cols-2 gap-2">
          {GROUPS.filter((g) => g.id === "cardio").map((g) => (
            <Link
              key={g.id}
              href={`/coach?q=${encodeURIComponent(`今天想做${g.label},帮我安排一下`)}`}
              className={btnGhost}
            >
              {g.emoji} 今天做{g.label}
            </Link>
          ))}
          <Link
            href={`/coach?q=${encodeURIComponent("今天想做拉伸和活动度放松,帮我安排一下")}`}
            className={btnGhost}
          >
            🧘 拉伸放松
          </Link>
        </div>
        <Link
          href={`/coach?q=${encodeURIComponent("我不知道今天该练什么,你根据我的记录帮我决定吧")}`}
          className={`${btnGhost} mt-2 w-full`}
        >
          🤔 不知道练什么,教练帮我决定
        </Link>
      </section>

      {plan && !active && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-sub">
            教练安排的计划 · {fmtDate(plan.createdAt)}
          </h2>
          <PlanCard plan={plan} />
        </section>
      )}

      {!active && (
        <button
          className={`${btnGhost} w-full`}
          onClick={() => {
            startFree();
            router.push("/workout");
          }}
        >
          ✍️ 不用计划,自己记录一次训练
        </button>
      )}

      <Link href="/food" className="block">
        <Card className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-mint">🥗 今日饮食营养</div>
            <div className="mt-0.5 text-sm font-bold tabular-nums">
              {todayMacros.calories} / {targets.calories} kcal · 蛋白 {Math.round(todayMacros.protein)}/{targets.protein}g
            </div>
            <div className="text-xs text-sub">
              {todayMeals.length > 0
                ? `已记 ${todayMeals.length} 餐 · 碳水 ${Math.round(todayMacros.carbs)}g`
                : "拍食物照片，AI 帮你算蛋白质、碳水和热量"}
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-mint-soft px-3 py-1.5 text-xs font-semibold text-mint">
            记一餐 ›
          </span>
        </Card>
      </Link>

      {last && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-sub">上一次训练</h2>
          <Link href={`/history/${last.id}`} className="block">
            <Card>
              <div className="flex items-baseline justify-between">
                <div className="font-bold">{last.title}</div>
                <div className="text-xs text-sub">{fmtDate(last.startedAt)}</div>
              </div>
              <p className="mt-1 text-sm text-sub">
                {last.exercises.map((e) => e.name).join(" · ") || "没有记录动作"}
              </p>
              <p className="mt-1 text-xs text-sub">
                {durationMin(last) ? `${durationMin(last)} 分钟` : ""}
                {last.watch?.calories ? ` · ${last.watch.calories} 千卡` : ""}
                {last.watch?.avgHr ? ` · 平均心率 ${last.watch.avgHr}` : ""}
              </p>
            </Card>
          </Link>
        </section>
      )}
    </div>
  );
}
