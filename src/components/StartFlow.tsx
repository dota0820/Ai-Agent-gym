"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { subsFor } from "@/lib/exercises";
import { isDark, useTheme } from "@/lib/theme";
import { GROUPS } from "@/lib/types";
import Body3D, { type BodyPart } from "./Body3D";

const TIMES = ["30 分钟", "45 分钟", "60 分钟"];
const ENERGY = [
  { label: "有点累", say: "今天有点累,想轻松一点" },
  { label: "正常", say: "状态正常" },
  { label: "状态很好", say: "状态很好,可以练得狠一点" },
];
const SEEN_KEY = "gymcoach:greeted";

function useTyped(text: string, start: boolean, speed = 85) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!start || n >= text.length) return;
    const t = setTimeout(() => setN(n + 1), speed);
    return () => clearTimeout(t);
  }, [n, start, text, speed]);
  return { shown: text.slice(0, n), done: n >= text.length };
}

/**
 * Home-screen opener: animated greeting, then a 3D body to tap, then three
 * quick tap questions that hand a complete request to the coach.
 */
export default function StartFlow({ name }: { name: string }) {
  const theme = useTheme();
  const router = useRouter();
  // play the typing animation once per visit; afterwards show the text straight away
  const [animate] = useState(() => {
    try {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
      const seen = sessionStorage.getItem(SEEN_KEY);
      sessionStorage.setItem(SEEN_KEY, "1");
      return !seen;
    } catch {
      return false;
    }
  });
  const hello = `您好${name ? `,${name}` : ""}`;
  const line1 = useTyped(hello, animate);
  const [line2On, setLine2On] = useState(!animate);
  const [bodyOn, setBodyOn] = useState(!animate);
  useEffect(() => {
    if (!animate || !line1.done) return;
    const a = setTimeout(() => setLine2On(true), 250);
    const b = setTimeout(() => setBodyOn(true), 900);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [animate, line1.done]);

  const [no3d, setNo3d] = useState(false);
  const [part, setPart] = useState<BodyPart | null>(null);
  const [step, setStep] = useState(0);
  const [focus, setFocus] = useState("");
  const [time, setTime] = useState("");
  const [energy, setEnergy] = useState("");

  const group = GROUPS.find((g) => g.id === part);
  const subs = part ? subsFor(part) : [];
  // The tap that picks a body part is followed by a click at the same spot. The
  // sheet has just appeared under the finger, so that click must not dismiss it.
  const openedAt = useRef(0);
  const pick = (p: BodyPart) => {
    openedAt.current = performance.now();
    setPart(p);
    setFocus("");
    setTime("");
    setEnergy("");
    setStep(subsFor(p).length ? 0 : 1);
  };
  const close = () => setPart(null);
  const closeFromBackdrop = () => {
    if (performance.now() - openedAt.current > 450) close();
  };

  const go = (energySay: string) => {
    if (!group) return;
    const q = `今天想练${group.label}${focus ? `,重点练${focus}` : ""}。我有${time},${energySay}。请直接帮我安排好训练并保存成计划,不用再问我问题。`;
    router.push(`/coach?q=${encodeURIComponent(q)}`);
  };

  const questions = [
    {
      title: `${group?.label ?? ""}想重点练哪里?`,
      options: ["都练", ...subs.map((s) => s.label)],
      onPick: (v: string) => {
        setFocus(v === "都练" ? "" : v);
        setStep(1);
      },
    },
    {
      title: "今天有多少时间?",
      options: TIMES,
      onPick: (v: string) => {
        setTime(v);
        setStep(2);
      },
    },
    {
      title: "今天状态怎么样?",
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

  return (
    <section>
      <div className="min-h-[76px]">
        <h1
          className={`glow-text text-[30px] font-bold leading-tight tracking-tight ${
            animate && !line1.done ? "caret" : ""
          }`}
        >
          {animate ? line1.shown : hello}
        </h1>
        {line2On && (
          <p className={`mt-1 text-lg font-semibold text-primary ${animate ? "rise-in" : ""}`}>
            今天想做什么?
          </p>
        )}
      </div>

      {bodyOn && (
        <div
          className={`relative mt-2 overflow-hidden rounded-3xl border border-line bg-card ${
            animate ? "rise-in" : ""
          }`}
        >
          {isDark(theme) && (
            <div
              aria-hidden
              className="scan-sweep pointer-events-none absolute inset-x-0 top-0 h-full bg-gradient-to-b from-transparent via-primary/10 to-transparent"
            />
          )}
          <div className="flex items-center justify-between px-4 pt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-sub">
            <span>Body Scan</span>
            <span className="text-primary">{group ? `已选 · ${group.label}` : "转动 · 点选部位"}</span>
          </div>
          {!no3d && (
            <div className="h-[340px]">
              <Body3D
                selected={part}
                onPick={pick}
                theme={theme}
                onUnavailable={() => setNo3d(true)}
              />
            </div>
          )}
          {no3d && (
            <p className="px-4 py-6 text-center text-sm text-sub">
              这台手机显示不了 3D 模型,用下面的按钮选部位也一样。
            </p>
          )}
          <div className="flex gap-2 overflow-x-auto px-3 pb-3">
            {GROUPS.filter((g) => g.id !== "cardio" && g.id !== "mobility").map((g) => (
              <button
                key={g.id}
                onClick={() => pick(g.id as BodyPart)}
                aria-pressed={part === g.id}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${
                  part === g.id
                    ? "bg-primary text-white"
                    : "border border-line bg-surface text-ink"
                }`}
              >
                {g.label}
              </button>
            ))}
            {[
              { label: "有氧", q: "今天想做有氧,帮我安排一下" },
              { label: "拉伸放松", q: "今天想做拉伸和活动度放松,帮我安排一下" },
              { label: "帮我决定", q: "我不知道今天该练什么,你根据我的记录帮我决定吧" },
            ].map((x) => (
              <button
                key={x.label}
                onClick={() => router.push(`/coach?q=${encodeURIComponent(x.q)}`)}
                className="shrink-0 rounded-full border border-primary/40 bg-primary-soft px-3 py-1.5 text-sm font-semibold text-primary"
              >
                {x.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {part && group && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/50" onClick={closeFromBackdrop}>
          <div
            role="dialog"
            aria-label={`安排${group.label}的训练`}
            onClick={(e) => e.stopPropagation()}
            className="safe-b rise-in mx-auto max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t border-line bg-card p-5"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-sub">
              <span className="tracking-[0.18em]">
                {group.emoji} {group.label} · 第 {stepNo} / {total} 步
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
            <h2 className="mt-4 text-xl font-bold">{q.title}</h2>
            <div className="mt-3 space-y-2">
              {q.options.map((o) => (
                <button
                  key={o}
                  onClick={() => q.onPick(o)}
                  className="w-full rounded-2xl border border-primary/40 bg-primary-soft px-4 py-3.5 text-left text-[17px] font-semibold text-primary active:scale-[0.99]"
                >
                  {o}
                </button>
              ))}
            </div>
            {(focus || time || energy) && (
              <p className="mt-3 text-xs text-sub">
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
