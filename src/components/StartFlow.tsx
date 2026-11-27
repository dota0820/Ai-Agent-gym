"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { repeatWorkout, startFree, startFromPlan } from "@/lib/actions";
import { subsFor } from "@/lib/exercises";
import { hoursSinceTrained, RECOVERY_HOURS, todaySuggestion, weekDots } from "@/lib/recovery";
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
  const { workouts, customExercises, active, plan, profile } = useApp();
  const [now] = useState(() => Date.now());
  const recovery = hoursSinceTrained(workouts, customExercises, now);
  const tip = todaySuggestion(workouts, customExercises, now);
  const dots = weekDots(workouts, now);
  const weekCount = dots.filter((d) => d.done).length;
  const lastWorkout = [...workouts].sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  const hasRecovering = Object.values(recovery).some((h) => h !== undefined && h < RECOVERY_HOURS);

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

  // the one main action, like "Scan" in a banking app
  const main: { label: string; icon: IconName; run: () => void } = active
    ? { label: "继续训练", icon: "play", run: () => router.push("/workout") }
    : plan
      ? {
          label: "开始计划",
          icon: "play",
          run: () => {
            startFromPlan(plan);
            router.push("/workout");
          },
        }
      : tip.part
        ? { label: `练${GROUPS.find((g) => g.id === tip.part)?.label}`, icon: "play", run: () => pick(tip.part!) }
        : {
            label: "开始训练",
            icon: "play",
            run: () => {
              startFree();
              router.push("/workout");
            },
          };
  const actions: { label: string; icon: IconName; run: () => void }[] = [
    { label: "问教练", icon: "chat", run: () => router.push("/coach") },
    { label: "记一餐", icon: "food", run: () => router.push("/food") },
    ...(lastWorkout && !active && lastWorkout.exercises.length
      ? [
          {
            label: "再练上次",
            icon: "dumbbell" as IconName,
            run: () => {
              repeatWorkout(lastWorkout);
              router.push("/workout");
            },
          },
        ]
      : []),
    { label: "避坑指南", icon: "bulb", run: () => router.push("/learn") },
  ];

  const parts = GROUPS.filter((g) => g.id !== "cardio" && g.id !== "mobility");
  const status = (id: string) => {
    const h = recovery[id as BodyPart];
    if (h === undefined) return { text: "没练过", ready: true };
    if (h < RECOVERY_HOURS) return { text: "恢复中", ready: false };
    return { text: `可以练 · ${Math.floor(h / 24)}天`, ready: true };
  };

  const tasks: { icon: IconName; title: string; sub: string; href: string }[] = [
    ...(active ? [{ icon: "play" as IconName, title: "训练进行中", sub: active.title, href: "/workout" }] : []),
    ...(plan && !active
      ? [{ icon: "clipboard" as IconName, title: "教练帮你排好了计划", sub: plan.title, href: "/history" }]
      : []),
    ...(!profile.goal
      ? [{ icon: "target" as IconName, title: "完善目标和器械", sub: "教练的安排会更适合你", href: "/me" }]
      : []),
  ];
  const initial = profile.avatar || (name ? name.slice(0, 1) : "🙂");

  return (
    <section className="space-y-6">
      {/* top bar: avatar + two pills */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setSheet(true)}
          aria-label="切换人物和健身房"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line bg-card text-lg font-bold"
        >
          {initial}
        </button>
        <div className="flex gap-2">
          <Link
            href="/history"
            className="flex h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-[15px] font-bold"
          >
            <Icon name="flame" size={17} />
            本周 {weekCount} 天
          </Link>
          <Link
            href="/history"
            className="flex h-11 items-center gap-1 rounded-full bg-primary-soft px-4 text-[15px] font-bold text-deep"
          >
            记录
            <Icon name="plus" size={17} />
          </Link>
        </div>
      </div>

      {/* dashboard: one big number */}
      <div>
        <p className="text-[16px] text-sub">{`您好${name ? `,${name}` : ""} · 本周训练`}</p>
        <div className="mt-1 flex items-center gap-3">
          <span className="text-[44px] font-extrabold leading-none tracking-tight">
            {weekCount}
            <span className="ml-1.5 text-[24px] font-bold">次</span>
          </span>
          <Link
            href="/history"
            aria-label="查看训练记录"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-deep"
          >
            <Icon name="calendar" size={19} />
          </Link>
          <Link
            href="/coach"
            aria-label="问教练"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-deep"
          >
            <Icon name="chat" size={19} />
          </Link>
        </div>
        <div className="mt-3 flex items-center gap-1.5" role="img" aria-label={`本周已经练了 ${weekCount} 天`}>
          {dots.map((d) => (
            <span
              key={d.label}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-[14px] font-semibold ${
                d.done
                  ? "bg-primary"
                  : d.today
                    ? "border-2 border-deep text-deep"
                    : "bg-card text-sub"
              } ${d.future ? "opacity-50" : ""}`}
            >
              {d.done ? <Icon name="check" size={16} stroke={3} /> : d.label}
            </span>
          ))}
        </div>
      </div>

      {/* action pills */}
      <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4">
        <button
          onClick={main.run}
          className="flex h-12 shrink-0 items-center gap-2 rounded-full bg-primary px-5 text-[16px] font-bold"
        >
          <Icon name={main.icon} size={16} />
          {main.label}
        </button>
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={a.run}
            className="flex h-12 shrink-0 items-center gap-2 rounded-full bg-primary-soft px-5 text-[16px] font-bold text-deep"
          >
            <Icon name={a.icon} size={17} />
            {a.label}
          </button>
        ))}
      </div>

      {/* the big card */}
      <div className="overflow-hidden rounded-[28px] border border-line bg-surface shadow-[0_6px_24px_rgba(14,15,12,0.06)]">
        <button
          type="button"
          onClick={() => tip.part && pick(tip.part)}
          disabled={!tip.part}
          className="flex w-full items-center justify-between gap-2 bg-primary px-5 py-4 text-left"
        >
          <span className="text-[16px] font-bold leading-snug">{tip.text}</span>
          {tip.part && <Icon name="chevronRight" size={20} />}
        </button>
        <div className="px-5 pt-4">
          <h2 className="text-[26px] font-extrabold leading-tight">今天练哪里</h2>
          <p className="mt-1 text-[16px] text-sub">点身体或下面的部位 · 可以拖动旋转</p>
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
        {!no3d && hasRecovering && (
          <div className="flex items-center justify-center gap-5 pb-2 text-[14px] text-sub">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#aab0bd]" />
              恢复中
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#c24c40]" />
              可以练
            </span>
          </div>
        )}
        <ul className="grid grid-cols-2 gap-x-3 px-3 pt-1 pb-2">
          {parts.map((g) => {
            const st = status(g.id);
            return (
              <li key={g.id}>
                <button
                  onClick={() => pick(g.id as BodyPart)}
                  aria-pressed={part === g.id}
                  className="flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left active:bg-card"
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[20px] ${
                      st.ready ? "bg-primary-soft" : "bg-card grayscale"
                    }`}
                  >
                    {g.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] font-bold">{g.label}</span>
                    <span className="block truncate text-[13px] text-sub">{st.text}</span>
                  </span>
                  <span className="shrink-0 text-sub">
                    <Icon name="chevronRight" size={18} />
                  </span>
                </button>
              </li>
            );
          })}
          <li>
            <button
              onClick={() => router.push(`/coach?q=${encodeURIComponent("今天想做有氧,帮我安排一下")}`)}
              className="flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left active:bg-card"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[20px]">
                🏃
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-bold">有氧</span>
                <span className="block truncate text-[13px] text-sub">跑步机等</span>
              </span>
              <span className="shrink-0 text-sub">
                <Icon name="chevronRight" size={18} />
              </span>
            </button>
          </li>
        </ul>
        <div className="flex flex-wrap gap-2 px-5 pb-5">
          <button
            onClick={() =>
              router.push(`/coach?q=${encodeURIComponent("我不知道今天该练什么,你根据我的记录帮我决定吧")}`)
            }
            className="flex h-11 items-center gap-2 rounded-full bg-card px-4 text-[15px] font-bold"
          >
            <Icon name="sparkles" size={17} />
            AI 帮我决定
          </button>
          <button
            onClick={() =>
              router.push(`/coach?q=${encodeURIComponent("今天想做拉伸和活动度放松,帮我安排一下")}`)
            }
            className="flex h-11 items-center gap-2 rounded-full bg-card px-4 text-[15px] font-bold"
          >
            🧘 拉伸放松
          </button>
        </div>
      </div>

      {tasks.length > 0 && (
        <div>
          <h2 className="mb-3 text-[20px] font-bold">待办</h2>
          <ul className="space-y-2.5">
            {tasks.map((t) => (
              <li key={t.title}>
                <Link
                  href={t.href}
                  className="flex items-center gap-4 rounded-3xl border border-line bg-surface p-4 shadow-[0_4px_16px_rgba(14,15,12,0.04)]"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-deep">
                    <Icon name={t.icon} size={22} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] font-bold leading-snug">{t.title}</span>
                    <span className="block truncate text-[15px] text-sub">{t.sub}</span>
                  </span>
                  <Icon name="chevronRight" size={20} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sheet && <ProfileSheet onClose={() => setSheet(false)} />}

      {part && group && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/50" onClick={closeFromBackdrop}>
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
              <button className="mt-2 text-sm text-sub underline" onClick={() => setStep(step - 1)}>
                ← 上一步
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
