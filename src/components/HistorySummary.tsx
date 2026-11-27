"use client";
import { useState } from "react";
import { computeStreakWeeks } from "@/lib/analytics";
import { partsOfWorkout } from "@/lib/recovery";
import { useApp } from "@/lib/store";
import { ago, compactNum, personalBests, workoutVolume } from "@/lib/summary";
import { GROUPS } from "@/lib/types";
import Icon from "./Icon";

const PERIODS = [
  { id: "week", label: "周", days: 7, buckets: 7, unit: "天", title: "本周" },
  { id: "month", label: "月", days: 28, buckets: 4, unit: "周", title: "本月" },
  {
    id: "year",
    label: "年",
    days: 364,
    buckets: 12,
    unit: "月",
    title: "今年",
  },
  { id: "all", label: "全部", days: 0, buckets: 6, unit: "", title: "全部" },
] as const;

const PART_COLORS = [
  "#163300",
  "#2f6c00",
  "#9fe870",
  "#c5eba3",
  "#6fae45",
  "#5c6457",
];

/** Training summary for the 记录 tab: trend, volume by body part and personal bests. */
export default function HistorySummary() {
  const { workouts, customExercises } = useApp();
  const [now] = useState(() => Date.now());
  const [pid, setPid] = useState<(typeof PERIODS)[number]["id"]>("month");
  const per = PERIODS.find((p) => p.id === pid)!;

  const first = workouts.length
    ? Math.min(...workouts.map((w) => new Date(w.startedAt).getTime()))
    : now;
  const span = per.days ? per.days * 864e5 : Math.max(now - first, 7 * 864e5);
  const start = now - span;
  const inRange = workouts.filter(
    (w) => new Date(w.startedAt).getTime() >= start,
  );
  const prevRange = per.days
    ? workouts.filter((w) => {
        const t = new Date(w.startedAt).getTime();
        return t >= start - span && t < start;
      })
    : [];

  // sessions per bucket, oldest first
  const counts = Array.from({ length: per.buckets }, () => 0);
  for (const w of inRange) {
    const i = Math.min(
      per.buckets - 1,
      Math.floor(
        ((new Date(w.startedAt).getTime() - start) / span) * per.buckets,
      ),
    );
    counts[Math.max(0, i)]++;
  }
  const max = Math.max(1, ...counts);
  const W = 300;
  const H = 70;
  const pts = counts.map((c, i) => [
    (i / (per.buckets - 1)) * W,
    H - 6 - (c / max) * (H - 16),
  ]);
  const line = pts
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

  const vol = inRange.reduce((n, w) => n + workoutVolume(w), 0);
  const prevVol = prevRange.reduce((n, w) => n + workoutVolume(w), 0);
  const change = prevVol ? Math.round(((vol - prevVol) / prevVol) * 100) : null;

  // volume split by body part (a workout's volume shared across the parts it hit)
  const byPart = new Map<string, number>();
  for (const w of inRange) {
    const parts = [...partsOfWorkout(w, customExercises)];
    const v = workoutVolume(w);
    if (!parts.length || !v) continue;
    for (const p of parts)
      byPart.set(p, (byPart.get(p) ?? 0) + v / parts.length);
  }
  const split = [...byPart.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([id, v], i) => ({
      label: GROUPS.find((g) => g.id === id)?.label ?? id,
      pct: vol ? Math.round((v / vol) * 100) : 0,
      color: PART_COLORS[i],
    }));

  const prs = personalBests(workouts, 3);
  const streak = computeStreakWeeks(workouts, now);

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="统计时间"
        className="lift grid grid-cols-4 gap-1 rounded-full bg-card p-1"
      >
        {PERIODS.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={pid === p.id}
            onClick={() => setPid(p.id)}
            className={`rounded-full py-2 text-[13px] font-bold ${pid === p.id ? "bg-primary text-forest" : "text-sub"}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-end justify-between gap-2 px-1">
        <div>
          <h1 className="text-[24px] font-bold">{per.title}训练总结</h1>
          <p className="mt-1 flex items-center gap-1 text-[12px] text-sub">
            <Icon name="checkCircle" size={15} className="text-deep" />
            连续打卡 {streak.currentWeeks} 周 · 本周练了 {streak.thisWeekDays}{" "}
            天
          </p>
        </div>
      </div>

      {/* trend */}
      <div className="relative overflow-hidden rounded-[28px] bg-forest p-5 text-white">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[13px] font-bold">
            <span className="h-2 w-2 rounded-full bg-primary" />
            训练频率走势
          </span>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-primary">
            {per.unit ? `按${per.unit}` : "全部"}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl bg-white/[0.07] p-3.5">
            <div className="text-[11px] text-white/60">训练次数</div>
            <div className="mt-1 flex items-baseline gap-1 text-primary">
              <span className="display-num text-[36px] leading-none">
                {inRange.length}
              </span>
              <span className="text-[12px]">次</span>
            </div>
            {per.days > 0 && (
              <div className="mt-1 text-[11px] text-white/60">
                上一段 {prevRange.length} 次
              </div>
            )}
          </div>
          <div className="rounded-2xl bg-white/[0.07] p-3.5">
            <div className="text-[11px] text-white/60">举起总重</div>
            <div className="mt-1 flex items-baseline gap-1 text-white">
              <span className="display-num text-[36px] leading-none">
                {compactNum(vol)}
              </span>
              <span className="text-[12px]">kg</span>
            </div>
            {change !== null && (
              <div
                className={`mt-1 text-[11px] ${change >= 0 ? "text-primary" : "text-white/60"}`}
              >
                {change >= 0 ? "↗" : "↘"} 比上一段 {change >= 0 ? "+" : ""}
                {change}%
              </div>
            )}
          </div>
        </div>
        <svg
          viewBox={`-6 0 ${W + 12} ${H}`}
          className="mt-4 h-[70px] w-full"
          aria-hidden
        >
          <path
            d={`${line} L${W},${H} L0,${H} Z`}
            fill="rgba(159,232,112,.12)"
          />
          <path
            d={line}
            fill="none"
            stroke="#9fe870"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {pts.map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={i === pts.length - 1 ? 5 : 3.5}
              fill={i === pts.length - 1 ? "#fff" : "#9fe870"}
            />
          ))}
        </svg>
        <div className="mt-1 flex justify-between text-[10px] text-white/50">
          <span>
            {per.days
              ? `${per.days >= 364 ? "一年" : per.days >= 28 ? "四周" : "七天"}前`
              : "开始"}
          </span>
          <span className="font-bold text-primary">现在</span>
        </div>
      </div>

      {/* volume split */}
      <div className="lift rounded-[28px] bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-forest">
              <Icon name="dumbbell" size={21} />
            </span>
            <h2 className="text-[17px] font-bold">力量训练总量</h2>
          </div>
          {change !== null && (
            <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold text-forest">
              {change >= 0 ? "+" : ""}
              {change}%
            </span>
          )}
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="display-num text-[34px] leading-none text-forest">
            {Math.round(vol).toLocaleString()}
          </span>
          <span className="text-[13px] text-sub">kg · {per.title}累计</span>
        </div>
        {split.length > 0 ? (
          <>
            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-bg">
              {split.map((p) => (
                <div
                  key={p.label}
                  style={{ width: `${p.pct}%`, background: p.color }}
                />
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {split.map((p) => (
                <div
                  key={p.label}
                  className="flex items-center justify-between rounded-xl bg-bg px-3 py-2 text-[12px]"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: p.color }}
                    />
                    {p.label}
                  </span>
                  <span className="font-bold text-forest">{p.pct}%</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-2 text-[12px] text-sub">
            记录时填上重量和次数，这里就会按部位算出来。
          </p>
        )}
      </div>

      {/* PRs */}
      {prs.length > 0 && (
        <div className="lift rounded-[28px] bg-card p-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-forest">
              <Icon name="star" size={21} />
            </span>
            <h2 className="text-[17px] font-bold">个人最佳</h2>
          </div>
          <div className="mt-3 space-y-2">
            {prs.map((p, i) => (
              <div
                key={p.name}
                className="flex items-center gap-3 rounded-2xl bg-bg px-3 py-3"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-forest">
                  <Icon
                    name={i === 0 ? "star" : "dumbbell"}
                    size={21}
                    fill={i === 0}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-bold">{p.name}</div>
                  <div className="text-[12px] text-sub">
                    {ago(p.at, now)} · {p.reps ? `${p.reps} 次` : "新纪录"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline justify-end gap-0.5 text-forest">
                    <span className="display-num text-[22px] leading-none">
                      {p.weight}
                    </span>
                    <span className="text-[11px]">kg</span>
                  </div>
                  {p.prev > 0 && (
                    <div className="mt-0.5 text-[11px] font-bold text-deep">
                      +{Math.round((p.weight - p.prev) * 10) / 10} kg 突破
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
