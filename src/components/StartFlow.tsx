"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { repeatWorkout, startFree, startFromPlan } from "@/lib/actions";
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
  const { workouts, customExercises, active, plan, profile } = useApp();
  const [now] = useState(() => Date.now());
  const recovery = hoursSinceTrained(workouts, customExercises, now);
  const tip = todaySuggestion(workouts, customExercises, now);
  const dots = weekDots(workouts, now);
  const weekCount = dots.filter((d) => d.done).length;
  const lastWorkout = [...workouts].sort((a, b) =>
    b.startedAt.localeCompare(a.startedAt),
  )[0];
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
        ? {
            label: `练${GROUPS.find((g) => g.id === tip.part)?.label}`,
            icon: "play",
            run: () => pick(tip.part!),
          }
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

  const tasks: { icon: IconName; title: string; sub: string; href: string }[] =
    [
      ...(active
        ? [
            {
              icon: "play" as IconName,
              title: "训练进行中",
              sub: active.title,
              href: "/workout",
            },
          ]
        : []),
      ...(plan && !active
        ? [
            {
              icon: "clipboard" as IconName,
              title: "教练帮你排好了计划",
              sub: plan.title,
              href: "/history",
            },
          ]
        : []),
      ...(!profile.goal
        ? [
            {
              icon: "target" as IconName,
              title: "完善目标和器械",
              sub: "教练的安排会更适合你",
              href: "/me",
            },
          ]
        : []),
    ];
  const initial = name ? name.slice(0, 1) : "我";

  const today = dots.findIndex((d) => d.today);

  return (
    <section className="space-y-7">
      {/* top bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setSheet(true)}
          aria-label="切换人物和健身房"
          className="flex min-w-0 items-center gap-3 text-left"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-[17px] font-medium text-white">
            {initial}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[17px] font-semibold">
              您好{name ? `，${name}` : ""}
            </span>
            <span className="block text-[13px] text-sub">
              切换人物 / 健身房
            </span>
          </span>
        </button>
        <Link
          href="/history"
          aria-label="训练记录"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-card"
        >
          <Icon name="calendar" size={19} />
        </Link>
      </div>

      {/* one number */}
      <div>
        <p className="text-[15px] text-sub">本周训练</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="display-num text-[68px] leading-[0.9]">
            {weekCount}
          </span>
          <span className="text-[18px] text-sub">次</span>
        </div>
        <div
          className="mt-4 grid grid-cols-7 gap-1.5"
          role="img"
          aria-label={`本周已经练了 ${weekCount} 天`}
        >
          {dots.map((d, i) => (
            <div key={d.label} className="text-center">
              <div
                className={`h-1.5 rounded-full ${d.done ? "bg-primary" : i === today ? "bg-ink/25" : "bg-line"}`}
              />
              <div
                className={`mt-1.5 text-[13px] ${i === today ? "font-semibold text-ink" : "text-sub"}`}
              >
                {d.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* actions: one primary, the rest quiet */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <button
          onClick={main.run}
          className="flex h-12 shrink-0 items-center gap-2 rounded-full bg-primary px-5 text-[16px] font-semibold"
        >
          <Icon name={main.icon} size={15} />
          {main.label}
        </button>
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={a.run}
            className="flex h-12 shrink-0 items-center gap-2 rounded-full border border-line bg-card px-5 text-[16px] font-medium"
          >
            <Icon name={a.icon} size={17} />
            {a.label}
          </button>
        ))}
      </div>

      {/* today's suggestion */}
      {tip.part && (
        <button
          type="button"
          onClick={() => pick(tip.part!)}
          className="flex w-full items-center gap-4 rounded-3xl border border-line bg-card p-4 text-left"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-deep">
            <Icon name="target" size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-semibold">
              今天练{GROUPS.find((g) => g.id === tip.part)?.label}
            </span>
            <span className="mt-0.5 block text-[14px] leading-snug text-sub">
              {tip.text}
            </span>
          </span>
          <span className="shrink-0 text-sub">
            <Icon name="chevronRight" size={20} />
          </span>
        </button>
      )}

      {/* body + parts */}
      <div className="overflow-hidden rounded-3xl border border-line bg-card">
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div>
            <h2 className="text-[20px] font-semibold">选择部位</h2>
            <p className="mt-0.5 text-[14px] text-sub">
              点身体或下面的列表，可拖动旋转
            </p>
          </div>
          {hasRecovering && (
            <div className="shrink-0 space-y-1 pt-1 text-[13px] text-sub">
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
                className="flex w-full items-center gap-3 px-5 py-4 text-left active:bg-bg"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-medium">
                    {x.label}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-sub">
                    {x.st.text}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={`h-2 w-2 shrink-0 rounded-full ${x.st.ready ? "bg-primary" : "bg-[#c5c9c1]"}`}
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
            className="flex h-11 items-center gap-2 rounded-full border border-line px-4 text-[15px] font-medium"
          >
            <Icon name="sparkles" size={16} />
            让教练决定
          </button>
          <button
            onClick={() =>
              router.push(
                `/coach?q=${encodeURIComponent("今天想做拉伸和活动度放松，帮我安排一下")}`,
              )
            }
            className="flex h-11 items-center rounded-full border border-line px-4 text-[15px] font-medium"
          >
            拉伸放松
          </button>
        </div>
      </div>

      {tasks.length > 0 && (
        <div>
          <h2 className="mb-3 text-[20px] font-semibold">待办</h2>
          <ul className="overflow-hidden rounded-3xl border border-line bg-card">
            {tasks.map((t, i) => (
              <li key={t.title} className={i ? "border-t border-line" : ""}>
                <Link
                  href={t.href}
                  className="flex items-center gap-4 px-4 py-4 active:bg-bg"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-deep">
                    <Icon name={t.icon} size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] font-semibold leading-snug">
                      {t.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[14px] text-sub">
                      {t.sub}
                    </span>
                  </span>
                  <span className="shrink-0 text-sub">
                    <Icon name="chevronRight" size={20} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
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
