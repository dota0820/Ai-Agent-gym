"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { startFree, startFromPlan } from "@/lib/actions";
import { computeStreakWeeks } from "@/lib/analytics";
import {
  computeNutritionTargets,
  localDateKey,
  mealsForDate,
  sumMealMacros,
} from "@/lib/nutrition";
import { planMinutes } from "@/lib/plan-time";
import { subsFor } from "@/lib/exercises";
import {
  hoursSinceTrained,
  RECOVERY_HOURS,
  todaySuggestion,
  weekDots,
} from "@/lib/recovery";
import { useApp } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { GROUPS } from "@/lib/types";
import Body3D, { type BodyPart } from "./Body3D";
import Icon, { type IconName } from "./Icon";
import ProfileSheet from "./ProfileSheet";

const TIMES = ["30 分钟", "45 分钟", "60 分钟"];
const ENERGY = [
  { label: "有点累", say: "今天有点累,想轻松一点" },
  { label: "正常", say: "状态正常" },
  { label: "状态很好", say: "状态很好,可以练得狠一点" },
];

/**
 * Home screen, laid out like a banking dashboard: a big weekly number, a row of
 * one-tap actions, one large card (3D body + body-part list) and a short to-do
 * list. Tapping a body part asks three quick questions and hands a complete
 * request to the coach.
 */
export default function StartFlow({ name }: { name: string }) {
  const theme = useTheme();
  const router = useRouter();
  const [sheet, setSheet] = useState(false);
  const { workouts, customExercises, active, plan, profile, meals } = useApp();
  const [now] = useState(() => Date.now());
  const recovery = hoursSinceTrained(workouts, customExercises, now);
  const tip = todaySuggestion(workouts, customExercises, now);
  const dots = weekDots(workouts, now);
  const weekCount = dots.filter((d) => d.done).length;
  const hasRecovering = Object.values(recovery).some(
    (h) => h !== undefined && h < RECOVERY_HOURS,
  );

  const [no3d, setNo3d] = useState(false);
  const [part, setPart] = useState<BodyPart | null>(null);
  const [step, setStep] = useState(0);
  const [focus, setFocus] = useState("");
  const [time, setTime] = useState("");
  const [energy, setEnergy] = useState("");

  const group = GROUPS.find((g) => g.id === part);
  const subs = part ? subsFor(part) : [];
  // The tap that picks a body part is followed by a click at the same spot. The
  // sheet has just appeared under the finger, so ignore backdrop taps briefly.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!part) return;
    const t = setTimeout(() => setArmed(true), 450);
    return () => clearTimeout(t);
  }, [part]);
  const pick = (p: BodyPart) => {
    setArmed(false);
    setPart(p);
    setFocus("");
    setTime("");
    setEnergy("");
    setStep(subsFor(p).length ? 0 : 1);
  };
  const close = () => setPart(null);
  const closeFromBackdrop = () => {
    if (armed) close();
  };

  const go = (energySay: string) => {
    if (!group) return;
    const q = `今天想练${group.label}${focus ? `,重点练${focus}` : ""}。我有${time},${energySay}。请直接帮我安排好训练并保存成计划,不用再问我问题。`;
    router.push(`/coach?q=${encodeURIComponent(q)}`);
  };

  const questions = [
    {
      title: "重点部位",
      options: ["都练", ...subs.map((s) => s.label)],
      onPick: (v: string) => {
        setFocus(v === "都练" ? "" : v);
        setStep(1);
      },
    },
    {
      title: "训练时长",
      options: TIMES,
      onPick: (v: string) => {
        setTime(v);
        setStep(2);
      },
    },
    {
      title: "今日状态",
      options: ENERGY.map((e) => e.label),
      onPick: (v: string) => {
        setEnergy(v);
        go(ENERGY.find((e) => e.label === v)!.say);
      },
    },
  ];
  const total = subs.length ? 3 : 2;
  const stepNo = subs.length ? step + 1 : step;
  const q = questions[step];

  const parts = GROUPS.filter((g) => g.id !== "cardio" && g.id !== "mobility");
  const status = (id: string) => {
    const h = recovery[id as BodyPart];
    if (h === undefined) return { text: "没练过", ready: true };
    if (h < RECOVERY_HOURS) return { text: "恢复中", ready: false };
    return { text: `可以练 · ${Math.floor(h / 24)}天`, ready: true };
  };

  const goal = Math.max(1, parseInt(profile.daysPerWeek, 10) || 3);
  const pct = Math.min(100, Math.round((weekCount / goal) * 100));
  const streak = computeStreakWeeks(workouts, now);
  const today = new Date(now);
  const dateLabel = `周${"日一二三四五六"[today.getDay()]} · ${today.getMonth() + 1}月${today.getDate()}日`;
  const tipLabel = GROUPS.find((g) => g.id === tip.part)?.label;

  const cta: { label: string; run: () => void } = active
    ? { label: "继续训练", run: () => router.push("/workout") }
    : plan
      ? {
          label: "开始今日训练",
          run: () => {
            startFromPlan(plan);
            router.push("/workout");
          },
        }
      : tip.part
        ? { label: `安排今天练${tipLabel}`, run: () => pick(tip.part!) }
        : {
            label: "开始训练",
            run: () => {
              startFree();
              router.push("/workout");
            },
          };

  const food = computeNutritionTargets(profile);
  const eaten = sumMealMacros(mealsForDate(meals, localDateKey(today)));
  const macroRows = [
    { label: "蛋白质", v: eaten.protein, t: food.protein, color: "#2f6c00" },
    { label: "碳水化合物", v: eaten.carbs, t: food.carbs, color: "#fbbf24" },
    { label: "脂肪", v: eaten.fat, t: food.fat, color: "#ff5a36" },
  ];

  const quick: {
    label: string;
    icon: IconName;
    chip: string;
    run: () => void;
  }[] = [
    {
      label: "记饮食",
      icon: "addPhoto",
      chip: "bg-[#fff4d6] text-[#c98a00]",
      run: () => router.push("/food"),
    },
    {
      label: "录训练",
      icon: "dumbbell",
      chip: "bg-primary text-forest",
      run: () => {
        if (active) return router.push("/workout");
        startFree();
        router.push("/workout");
      },
    },
    {
      label: "避坑指南",
      icon: "bulb",
      chip: "bg-[#ffe6df] text-[#e0482a]",
      run: () => router.push("/learn"),
    },
    {
      label: "问教练",
      icon: "forum",
      chip: "bg-forest text-primary",
      run: () => router.push("/coach"),
    },
  ];

  return (
    <section className="space-y-4">
      {/* app bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-['Space_Grotesk'] text-[22px] font-bold tracking-tight text-forest">
            练练
          </span>
          {streak.currentWeeks > 0 && (
            <span className="lift flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-[12px] font-bold text-forest">
              <Icon name="flame" size={16} fill className="text-[#fbbf24]" />
              {streak.currentWeeks}周
            </span>
          )}
        </div>
        <button
          onClick={() => setSheet(true)}
          aria-label="切换人物和健身房"
          className="flex h-9 items-center gap-2 rounded-full pl-3 text-[12px] font-semibold text-sub"
        >
          <span className="max-w-[9rem] truncate">{name || "我"}</span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-deep text-white">
            <Icon name="user" size={19} />
          </span>
        </button>
      </div>

      {/* greeting */}
      <div className="flex items-end justify-between gap-3 pt-1">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold tracking-wider text-sub">
            {dateLabel}
          </p>
          <h1 className="mt-1 text-[26px] font-bold leading-tight">
            今天也要全力以赴
          </h1>
        </div>
        <span className="mb-1 flex shrink-0 items-center gap-1 rounded-full bg-primary-soft px-3 py-1.5 text-[11px] font-bold text-forest">
          <Icon name="bolt" size={16} fill className="text-deep" />
          {weekCount >= goal ? "本周已达标" : `本周还差 ${goal - weekCount} 次`}
        </span>
      </div>

      {/* hero */}
      <div className="relative overflow-hidden rounded-[28px] bg-forest p-5 text-white shadow-md">
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative flex items-start justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold tracking-wide text-primary">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              {active ? "训练进行中" : "本周训练进度"}
            </span>
            <p className="mt-2 text-[13px] text-white/70">本周目标达成度</p>
          </div>
          <div className="relative flex h-14 w-14 items-center justify-center">
            <svg
              viewBox="0 0 36 36"
              className="h-full w-full -rotate-90"
              aria-hidden
            >
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke="rgba(255,255,255,.1)"
                strokeWidth="3.5"
              />
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke="#9fe870"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray={`${pct} 100`}
                pathLength={100}
              />
            </svg>
            <span className="absolute text-[12px] font-bold text-primary">
              {pct}%
            </span>
          </div>
        </div>
        <div className="relative my-4">
          <div className="flex items-baseline gap-1.5">
            <span className="display-num text-[44px] leading-none text-primary">
              {weekCount}
            </span>
            <span className="font-['Space_Grotesk'] text-[22px] font-semibold text-primary/80">
              / {goal} 次
            </span>
          </div>
          <p className="mt-2 text-[13px] text-white/70">
            {active
              ? `${active.title} · 已记 ${active.exercises.length} 个动作`
              : tip.text}
          </p>
        </div>
        <button
          onClick={cta.run}
          className="relative flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-[16px] font-bold text-forest shadow-[0_8px_24px_rgba(159,232,112,0.25)] active:scale-[0.98]"
        >
          {cta.label}
          <Icon name="arrowRight" size={20} />
        </button>
      </div>

      {/* AI plan */}
      <div className="lift rounded-[28px] bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-forest">
              <Icon name="robot" size={20} />
            </span>
            <h2 className="text-[16px] font-bold">AI 私教个性化方案</h2>
          </div>
          <span className="rounded-full bg-bg px-2.5 py-1 text-[11px] font-semibold text-sub">
            {plan ? "已排好" : "按恢复推荐"}
          </span>
        </div>
        <div className="mt-3 rounded-[20px] bg-bg p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-[19px] font-bold text-forest">
                {plan
                  ? plan.title
                  : tipLabel
                    ? `今天推荐练${tipLabel}`
                    : "让教练帮你排今天"}
              </div>
              <p className="mt-1 text-[13px] leading-snug text-sub">
                {plan
                  ? plan.note || plan.focus
                  : tip.text || "告诉教练时间和状态,马上排好"}
              </p>
            </div>
            <Icon name="dumbbell" size={24} className="text-deep" />
          </div>
          {plan && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                {
                  l: "动作组合",
                  v: plan.items.length,
                  u: "个",
                  c: "text-forest",
                },
                {
                  l: "预估时长",
                  v: planMinutes(plan),
                  u: "分钟",
                  c: "text-[#ff5a36]",
                },
                {
                  l: "训练总量",
                  v: plan.items.reduce((n, it) => n + it.sets, 0),
                  u: "组",
                  c: "text-deep",
                },
              ].map((x) => (
                <div key={x.l} className="lift rounded-2xl bg-card px-3 py-2.5">
                  <div className="text-[11px] font-semibold text-sub">
                    {x.l}
                  </div>
                  <div className={`mt-1 flex items-baseline gap-0.5 ${x.c}`}>
                    <span className="display-num text-[22px] leading-none">
                      {x.v}
                    </span>
                    <span className="text-[12px] font-bold">{x.u}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between px-1 text-[12px] font-semibold">
          <span className="flex items-center gap-1.5 text-sub">
            <Icon name="checkCircle" size={17} className="text-deep" />
            按你的恢复情况安排
          </span>
          {plan ? (
            <Link href="/plan" className="flex items-center text-deep">
              查看动作详情
              <Icon name="chevronRight" size={18} />
            </Link>
          ) : (
            <button
              onClick={() =>
                tip.part ? pick(tip.part) : router.push("/coach")
              }
              className="flex items-center text-deep"
            >
              让教练排计划
              <Icon name="chevronRight" size={18} />
            </button>
          )}
        </div>
      </div>

      {/* food */}
      <Link href="/food" className="lift block rounded-[28px] bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="food" size={22} className="text-[#fbbf24]" />
            <h2 className="text-[16px] font-bold">饮食能量监控</h2>
          </div>
          <span className="text-[12px] font-bold text-forest">
            {eaten.calories
              ? `剩余 ${Math.max(0, food.calories - eaten.calories)} kcal`
              : "今天还没记录"}
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="display-num text-[30px] leading-none text-forest">
            {eaten.calories.toLocaleString()}
          </span>
          <span className="text-[14px] text-sub">
            / {food.calories.toLocaleString()} kcal
          </span>
        </div>
        <div className="mt-3 space-y-2.5">
          {macroRows.map((m) => {
            const p = m.t ? Math.min(100, Math.round((m.v / m.t) * 100)) : 0;
            return (
              <div key={m.label}>
                <div className="flex justify-between text-[12px]">
                  <span className="text-sub">
                    {m.label} {Math.round(m.v)}g / {m.t}g
                  </span>
                  <span className="font-bold text-forest">{p}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-bg">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${p}%`, background: m.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Link>

      {/* week rhythm */}
      <div className="lift rounded-[28px] bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-bold">本周训练节律</h2>
          <span className="text-[12px] font-semibold text-sub">
            目标 {goal} 次 / 已完成 {weekCount} 次
          </span>
        </div>
        <ul className="mt-3 grid grid-cols-7 gap-1.5">
          {dots.map((d) => (
            <li
              key={d.label}
              className={`flex flex-col items-center gap-2 rounded-2xl py-2.5 ${d.today ? "bg-primary-soft" : "bg-bg"}`}
            >
              <span
                className={`text-[11px] ${d.today ? "font-bold text-forest" : "text-sub"}`}
              >
                周{d.label}
              </span>
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold ${
                  d.done
                    ? "bg-forest text-white"
                    : d.today
                      ? "bg-primary text-forest"
                      : "text-[#b5bcb0]"
                }`}
              >
                {d.done ? (
                  <Icon name="check" size={18} stroke={2.5} />
                ) : d.today ? (
                  "今"
                ) : d.future ? (
                  <Icon name="dumbbell" size={17} />
                ) : (
                  <Icon name="bed" size={17} />
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* quick */}
      <div className="pt-1">
        <h2 className="mb-2.5 px-1 text-[15px] font-bold">常用快捷记录</h2>
        <div className="grid grid-cols-4 gap-2.5">
          {quick.map((q) => (
            <button
              key={q.label}
              onClick={q.run}
              className="lift flex flex-col items-center gap-2 rounded-[22px] bg-card py-3.5 active:scale-[0.97]"
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-full ${q.chip}`}
              >
                <Icon name={q.icon} size={24} />
              </span>
              <span className="text-[12px] font-semibold">{q.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* body + parts */}
      <div className="lift overflow-hidden rounded-[28px] bg-card">
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div>
            <h2 className="text-[17px] font-bold">想练哪里?</h2>
            <p className="mt-1 text-[12px] text-sub">
              点身体或下面的列表，可拖动旋转
            </p>
          </div>
          {hasRecovering && (
            <div className="shrink-0 space-y-1 pt-1 text-[11px] text-sub">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#c24c40]" />
                可以练
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#aab0bd]" />
                恢复中
              </span>
            </div>
          )}
        </div>
        {!no3d && (
          <div className="h-[300px]">
            <Body3D
              selected={part}
              onPick={pick}
              theme={theme}
              onUnavailable={() => setNo3d(true)}
              recovery={recovery}
              recoveryHours={RECOVERY_HOURS}
            />
          </div>
        )}
        <ul className="grid grid-cols-2 border-t border-line">
          {[
            ...parts.map((g) => ({
              id: g.id,
              label: g.label,
              st: status(g.id),
              run: () => pick(g.id as BodyPart),
            })),
            {
              id: "cardio",
              label: "有氧",
              st: { text: "跑步机等", ready: true },
              run: () =>
                router.push(
                  `/coach?q=${encodeURIComponent("今天想做有氧，帮我安排一下")}`,
                ),
            },
          ].map((x, i) => (
            <li
              key={x.id}
              className={`border-line ${i % 2 === 0 ? "border-r" : ""} ${i >= 2 ? "border-t" : ""}`}
            >
              <button
                onClick={x.run}
                aria-pressed={part === x.id}
                className="flex w-full items-center gap-3 px-5 py-3.5 text-left active:bg-bg"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-bold">{x.label}</span>
                  <span className="mt-0.5 block text-[11px] text-sub">
                    {x.st.text}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={`h-2 w-2 shrink-0 rounded-full ${x.st.ready ? "bg-primary" : "bg-[#b9c2b0]"}`}
                />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2 border-t border-line px-5 py-4">
          <button
            onClick={() =>
              router.push(
                `/coach?q=${encodeURIComponent("我不知道今天该练什么，你根据我的记录帮我决定吧")}`,
              )
            }
            className="flex h-10 items-center gap-2 rounded-full bg-bg px-4 text-[13px] font-bold"
          >
            <Icon name="sparkles" size={15} />
            让教练决定
          </button>
          <button
            onClick={() =>
              router.push(
                `/coach?q=${encodeURIComponent("今天想做拉伸和活动度放松，帮我安排一下")}`,
              )
            }
            className="flex h-10 items-center rounded-full bg-bg px-4 text-[13px] font-bold"
          >
            拉伸放松
          </button>
        </div>
      </div>

      {!profile.goal && (
        <Link
          href="/me"
          className="flex items-center gap-3 rounded-[20px] bg-card px-4 py-3.5"
        >
          <Icon name="target" size={22} />
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-bold">完善目标和器械</span>
            <span className="mt-1 block text-[11px] text-sub">
              教练的安排会更适合你
            </span>
          </span>
          <Icon name="chevronRight" size={19} />
        </Link>
      )}

      {sheet && <ProfileSheet onClose={() => setSheet(false)} />}

      {part && group && (
        <div
          className="fixed inset-0 z-40 flex items-end bg-black/50"
          onClick={closeFromBackdrop}
        >
          <div
            role="dialog"
            aria-label={`安排${group.label}的训练`}
            onClick={(e) => e.stopPropagation()}
            className="safe-b rise-in mx-auto max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t border-line bg-card p-5"
          >
            <div className="flex items-center justify-between text-[14px] font-semibold text-sub">
              <span>
                {group.label} · 第 {stepNo} / {total} 步
              </span>
              <button onClick={close} className="px-2 py-1">
                取消
              </button>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(stepNo / total) * 100}%` }}
              />
            </div>
            <h2 className="mt-4 text-[24px] font-extrabold">{q.title}</h2>
            <div className="mt-3 space-y-2">
              {q.options.map((o) => (
                <button
                  key={o}
                  onClick={() => q.onPick(o)}
                  className="w-full rounded-2xl border border-primary/40 bg-primary-soft px-4 py-3.5 text-left text-[17px] font-semibold text-deep active:scale-[0.99]"
                >
                  {o}
                </button>
              ))}
            </div>
            {(focus || time || energy) && (
              <p className="mt-3 text-[14px] text-sub">
                已选:{[focus, time, energy].filter(Boolean).join(" · ")}
              </p>
            )}
            {step > (subs.length ? 0 : 1) && (
              <button
                className="mt-2 text-sm text-sub underline"
                onClick={() => setStep(step - 1)}
              >
                ← 上一步
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
