"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { repeatWorkout, startFree } from "@/lib/actions";
import { getProfileGyms } from "@/lib/equipment";
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

  const parts = GROUPS.filter((g) => g.id !== "cardio" && g.id !== "mobility");
  const status = (id: string) => {
    const h = recovery[id as BodyPart];
    if (h === undefined) return { text: "没练过", ready: true };
    if (h < RECOVERY_HOURS) return { text: "恢复中", ready: false };
    return { text: `可以练 · ${Math.floor(h / 24)}天`, ready: true };
  };

  const goal = Math.max(1, parseInt(profile.daysPerWeek, 10) || 3);
  const left = goal - weekCount;
  const gymName = getProfileGyms(profile).activeGym.name;

  // the one dark card: what to do today
  const hero: {
    label: string;
    title: string;
    sub: string;
    meta: string;
    minutes?: number;
    cta: string;
    run: () => void;
  } = active
    ? {
        label: "训练进行中",
        title: active.title,
        sub: `已经记了 ${active.exercises.length} 个动作`,
        meta: "做完记得点结束",
        cta: "继续训练",
        run: () => router.push("/workout"),
      }
    : plan
      ? {
          label: "今天的专属计划",
          title: plan.title,
          sub: plan.focus,
          meta: `${plan.items.length} 个动作  ·  ${plan.items.reduce((n, it) => n + it.sets, 0)} 组`,
          minutes: planMinutes(plan),
          cta: "查看训练计划",
          run: () => router.push("/plan"),
        }
      : tip.part
        ? {
            label: "今天推荐",
            title: `练${GROUPS.find((g) => g.id === tip.part)?.label}`,
            sub: tip.text,
            meta: "回答三个小问题，教练帮你排好",
            cta: "安排今天的训练",
            run: () => pick(tip.part!),
          }
        : {
            label: "今天",
            title: "开始训练",
            sub: "边练边记，教练会帮你对比上次",
            meta: "新手友好",
            cta: "开始记录",
            run: () => {
              startFree();
              router.push("/workout");
            },
          };

  const quick: {
    label: string;
    sub: string;
    icon: IconName;
    run: () => void;
  }[] = [
    {
      label: "问问教练",
      sub: "不知道练什么?",
      icon: "chat",
      run: () => router.push("/coach"),
    },
    {
      label: "记一餐",
      sub: "吃好,也是训练",
      icon: "food",
      run: () => router.push("/food"),
    },
    ...(lastWorkout && !active && lastWorkout.exercises.length
      ? [
          {
            label: "再练上次",
            sub: lastWorkout.title,
            icon: "dumbbell" as IconName,
            run: () => {
              repeatWorkout(lastWorkout);
              router.push("/workout");
            },
          },
        ]
      : []),
    {
      label: "避坑指南",
      sub: "新手常见错误",
      icon: "bulb",
      run: () => router.push("/learn"),
    },
  ];

  return (
    <section className="space-y-7">
      {/* overview */}
      <div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[24px] font-bold">练练</span>
          <button
            onClick={() => setSheet(true)}
            aria-label="切换人物和健身房"
            className="flex h-[34px] max-w-[60%] items-center gap-2 rounded-full bg-card pl-3.5 pr-3 text-[12px] font-medium"
          >
            <span className="truncate">
              {name ? `${name} · ` : ""}
              {gymName}
            </span>
            <Icon name="chevronDown" size={14} />
          </button>
        </div>
        <h1 className="mt-4 text-[30px] font-bold leading-tight">
          每一次，都算进步。
        </h1>

        <p className="mt-5 text-[13px] font-medium text-sub">本周训练</p>
        <div className="flex items-end justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="display-num text-[76px] leading-none">
              {weekCount}
            </span>
            <span className="text-[21px] font-medium text-sub">
              / {goal} 次
            </span>
          </div>
          <span className="mb-3 shrink-0 rounded-full bg-primary px-4 py-2 text-[12px] font-medium">
            {left > 0 ? `离目标只差 ${left} 次` : "本周目标达成"}
          </span>
        </div>

        <ul
          className="mt-5 grid grid-cols-7 gap-[9px]"
          aria-label={`本周已经练了 ${weekCount} 天`}
        >
          {dots.map((d) => (
            <li key={d.label} className="flex flex-col items-center gap-3">
              <span className="text-[11px] text-sub">{d.label}</span>
              <span
                className={`flex aspect-square w-full max-w-[42px] items-center justify-center rounded-full text-[14px] tabular-nums ${
                  d.done
                    ? "bg-ink text-white"
                    : d.today
                      ? "bg-primary font-bold"
                      : "bg-card"
                }`}
                aria-label={`${d.label} ${d.done ? "练过" : ""}`}
              >
                {d.done ? <Icon name="check" size={20} /> : d.date}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* today */}
      <div className="rounded-3xl bg-ink p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-primary">{hero.label}</p>
            <h2 className="mt-2 text-[30px] font-bold leading-tight text-white">
              {hero.title}
            </h2>
            <p className="mt-2 text-[13px] leading-snug text-[#cedcc5]">
              {hero.sub}
            </p>
            <p className="mt-2 text-[12px] text-[#cedcc5]">{hero.meta}</p>
          </div>
          {hero.minutes != null && (
            <div className="flex h-[70px] w-[78px] shrink-0 flex-col items-center justify-center rounded-[18px] bg-[#294715] text-primary">
              <span className="display-num text-[30px] leading-none">
                {hero.minutes}
              </span>
              <span className="mt-1.5 text-[11px]">分钟</span>
            </div>
          )}
        </div>
        <button
          onClick={hero.run}
          className="mt-6 flex h-[47px] w-full items-center justify-between rounded-full bg-primary pl-6 pr-5 text-[14px] font-bold"
        >
          {hero.cta}
          <Icon name="arrowRight" size={22} />
        </button>
      </div>

      {/* quick actions */}
      <div>
        <h2 className="text-[16px] font-bold">你的健身搭子，随时在。</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {quick.map((a) => (
            <button
              key={a.label}
              onClick={a.run}
              className="flex min-h-[76px] items-start gap-3 rounded-[20px] bg-card px-3.5 py-3 text-left active:scale-[0.98]"
            >
              <span className="mt-1 shrink-0">
                <Icon name={a.icon} size={22} />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-bold">{a.label}</span>
                <span className="mt-1.5 block truncate text-[11px] text-sub">
                  {a.sub}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* body + parts */}
      <div className="overflow-hidden rounded-3xl bg-card">
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
