"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ExerciseCover from "@/components/ExerciseCover";
import Icon from "@/components/Icon";
import ExercisePicker from "@/components/ExercisePicker";
import Guide, { guideFor } from "@/components/Guide";
import NumInput from "@/components/NumInput";
import {
  planNextSession,
  adviseNextSet,
  DEFAULT_TARGET_RIR,
  isTimedExercise,
  judgeSet,
  RIR_OPTIONS,
  rirLabel,
  rirWords,
  VERDICT_TEXT,
  type WeightAdvice,
} from "@/lib/rir";
import WatchForm from "@/components/WatchForm";
import { btnGhost, btnPrimary, btnSoft, Card, input } from "@/components/ui";
import { newExercise, saveToLibrary } from "@/lib/actions";
import { findExerciseById, isCustomExercise } from "@/lib/exercise-lookup";
import {
  fmtDate,
  lastPerformance,
  setState,
  setsSummary,
  useApp,
  useHydrated,
} from "@/lib/store";
import { setGymMode } from "@/lib/theme";
import type { WatchData, Workout, WorkoutExercise } from "@/lib/types";

function update(fn: (w: Workout) => Workout) {
  setState((s) => (s.active ? { ...s, active: fn(s.active) } : s));
}
function updateEx(i: number, fn: (e: WorkoutExercise) => WorkoutExercise) {
  update((w) => ({
    ...w,
    exercises: w.exercises.map((e, j) => (j === i ? fn(e) : e)),
  }));
}
/** Set the RIR of one set (tap the same value again to clear it). */
function setRir(i: number, k: number, rir: number | null) {
  updateEx(i, (e) => ({
    ...e,
    sets: e.sets.map((x, j) =>
      j === k ? { ...x, rir: x.rir === rir ? null : rir } : x,
    ),
  }));
}

/** Apply a suggested weight to every set of an exercise that isn't done yet, from set `from` on. */
function applyWeight(i: number, weight: number, from = 0) {
  updateEx(i, (e) => ({
    ...e,
    sets: e.sets.map((x, j) => (j >= from && !x.done ? { ...x, weight } : x)),
  }));
}

const VERDICT_STYLE = {
  light: "bg-primary-soft text-deep",
  right: "bg-mint-soft text-mint",
  heavy: "bg-red-50 text-red-600",
} as const;

function AdviceLine({
  advice,
  onApply,
}: {
  advice: WeightAdvice;
  onApply?: () => void;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold ${
        VERDICT_STYLE[advice.verdict]
      }`}
    >
      <span className="flex items-center gap-1.5">
        <Icon name="bulb" size={14} />
        {advice.text}
      </span>
      {onApply && (
        <button
          onClick={onApply}
          className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-xs font-bold shadow-sm"
        >
          改成 {advice.weight}kg
        </button>
      )}
    </div>
  );
}

const mmss = (sec: number) =>
  `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

const FEELINGS = ["😵", "😮‍💨", "🙂", "😄", "🔥"];

export default function WorkoutPage() {
  const { active, workouts, customExercises } = useApp();
  const ready = useHydrated();
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [openGuide, setOpenGuide] = useState<string | null>(null);
  const [hiddenImgs, setHiddenImgs] = useState<Record<string, boolean>>({});
  const [picker, setPicker] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [hint, setHint] = useState("");
  const [feeling, setFeeling] = useState(3);
  const [notes, setNotes] = useState("");
  const [watch, setWatch] = useState<WatchData>({ source: "manual" });

  const restEnd = active?.restEnd ?? null;
  const setRestEnd = (next: number | null) => {
    update((w) => ({ ...w, restEnd: next }));
  };

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);

  // Gym mode: dark and high-contrast only while a workout is actually active.
  useEffect(() => {
    if (!active) {
      setGymMode(false);
      return;
    }
    setGymMode(true);
    return () => setGymMode(false);
  }, [active]);

  const restLeft = restEnd ? Math.ceil((restEnd - now) / 1000) : 0;
  useEffect(() => {
    if (!restEnd) return;
    const delay = Math.max(0, restEnd - Date.now());
    const t = setTimeout(() => {
      update((w) => ({ ...w, restEnd: null }));
      navigator.vibrate?.([200, 100, 200]);
    }, delay);
    return () => clearTimeout(t);
  }, [restEnd]);

  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(""), 2600);
    return () => clearTimeout(t);
  }, [hint]);

  if (!ready) return null;
  if (!active)
    return (
      <div className="pt-20 text-center">
        <p className="text-sub">现在没有进行中的训练。</p>
        <Link href="/" className={`${btnPrimary} mt-4`}>
          回到首页
        </Link>
      </div>
    );

  const elapsed = Math.max(
    0,
    (now - new Date(active.startedAt).getTime()) / 1000,
  );
  // A session dated on an earlier day is a back-filled record: no live timer.
  const dayOf = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const sessionDay = dayOf(new Date(active.startedAt));
  const today = dayOf(new Date(now));
  const backfill = sessionDay !== today;
  const setDay = (ymd: string) => {
    if (!ymd) return;
    const [y, mo, d] = ymd.split("-").map(Number);
    // keep "now" as the start time when switching back to today, noon for other days
    const next = ymd === today ? new Date() : new Date(y, mo - 1, d, 12, 0, 0);
    update((w) => ({ ...w, startedAt: next.toISOString() }));
  };
  const doneSets = active.exercises.reduce(
    (n, e) => n + e.sets.filter((s) => s.done).length,
    0,
  );
  const totalSets = active.exercises.reduce((n, e) => n + e.sets.length, 0);

  function toggleSet(i: number, k: number) {
    const ex = active!.exercises[i];
    const s = ex.sets[k];
    if (s.done) {
      updateEx(i, (e) => ({
        ...e,
        sets: e.sets.map((x, j) => (j === k ? { ...x, done: false } : x)),
      }));
      return;
    }
    if (s.reps == null) {
      setHint(`请先填「${ex.name}」第 ${k + 1} 组的次数（或秒数）再打勾`);
      return;
    }
    setHint("");
    updateEx(i, (e) => ({
      ...e,
      sets: e.sets.map((x, j) =>
        j === k
          ? { ...x, done: true }
          : // carry both weight and reps forward to later unfinished sets
            j > k && !x.done
            ? {
                ...x,
                weight: x.weight == null ? s.weight : x.weight,
                reps: x.reps == null ? s.reps : x.reps,
              }
            : x,
      ),
    }));
    if (ex.restSec) setRestEnd(Date.now() + ex.restSec * 1000);
  }

  function finish() {
    const finishedExercises = active!.exercises
      .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) }))
      .filter((e) => e.sets.length);
    if (finishedExercises.length === 0) {
      setHint("还没有打勾任何完成的组。如果想放弃这次训练，请点「放弃」。");
      return;
    }
    const w: Workout = {
      ...active!,
      restEnd: undefined,
      // a back-filled record has no real end time; its length comes from the watch field if given
      endedAt: backfill ? undefined : new Date().toISOString(),
      title: active!.title.trim() || "自由训练",
      feeling,
      notes: notes.trim() || undefined,
      watch:
        watch.durationMin || watch.calories || watch.avgHr || watch.maxHr
          ? watch
          : undefined,
      exercises: finishedExercises,
    };
    setState((s) => ({ ...s, active: null, workouts: [...s.workouts, w] }));
    router.replace(`/history/${w.id}`);
  }

  return (
    <div className="space-y-3 pb-28">
      <header className="sticky top-0 z-10 -mx-4 flex items-center justify-between bg-bg/95 px-4 py-2 backdrop-blur">
        <div className="min-w-0 flex-1 pr-2">
          <input
            aria-label="训练名称"
            value={active.title}
            placeholder="给这次训练起个名字"
            onChange={(e) => update((w) => ({ ...w, title: e.target.value }))}
            className="w-full truncate rounded-lg border border-transparent bg-transparent text-lg font-bold leading-tight outline-none focus:border-primary focus:bg-surface focus:px-2"
          />
          <div className="flex flex-wrap items-center gap-x-2 text-xs text-sub">
            <span className="flex items-center gap-1">
              {backfill ? (
                "补记"
              ) : (
                <>
                  <Icon name="timer" size={13} />
                  <span className="num text-[15px] font-bold text-ink">{mmss(elapsed)}</span>
                </>
              )}
              <span>
                · <span className="num text-[15px] font-bold text-ink">{doneSets}/{totalSets}</span> 组
              </span>
            </span>
            <label className="relative flex cursor-pointer items-center gap-1 font-semibold text-deep underline underline-offset-2">
              <Icon name="calendar" size={13} />
              {backfill
                ? sessionDay.slice(5).replace("-", "月") + "日"
                : "今天"}
              <input
                type="date"
                aria-label="训练日期"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                value={sessionDay}
                max={today}
                onChange={(e) => setDay(e.target.value)}
              />
            </label>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/coach"
            className="flex h-11 items-center rounded-full border border-line bg-card px-4 text-sm"
          >
            问教练
          </Link>
          <button
            className="h-11 rounded-full bg-primary px-4 text-sm font-bold text-white"
            onClick={() => setFinishing(true)}
          >
            结束
          </button>
        </div>
      </header>

      {active.exercises.length === 0 && (
        <p className="py-6 text-center text-sm text-sub">
          还没有动作,点下面的按钮添加第一个动作。
        </p>
      )}

      {active.exercises.map((ex, i) => {
        const guide = guideFor(ex, customExercises);
        const last = lastPerformance(workouts, ex);
        const libEx = findExerciseById(ex.exerciseId, customExercises);
        const targetRir = ex.targetRir ?? DEFAULT_TARGET_RIR;
        const timed = isTimedExercise(libEx, ex);
        const sessionAdvice =
          !timed && last && !ex.sets.some((x) => x.done)
            ? planNextSession(
                last.exercise.sets,
                targetRir,
                ex.repRange,
                libEx,
              )
            : undefined;
        const showSessionAdvice = !!sessionAdvice;
        const canApply =
          sessionAdvice?.weight != null &&
          ex.sets.some((x) => !x.done && x.weight !== sessionAdvice.weight);
        const hasBigVisual =
          !!libEx &&
          (!isCustomExercise(libEx) || !!libEx.imageUrl || !!libEx.sourceUrl);
        const exKey = `${ex.exerciseId ?? ex.name}-${i}`;
        const stateKey = ex.exerciseId ?? ex.name;
        const imgShown = hasBigVisual && !hiddenImgs[stateKey];
        return (
          <Card key={exKey} className="p-0">
            <div className="p-4 pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xl font-bold">{ex.name}</div>
                  <div className="text-xs text-sub">
                    {ex.nameEn}
                    {ex.target
                      ? `${ex.nameEn ? " · " : ""}目标 ${ex.target}`
                      : ""}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {hasBigVisual && (
                    <button
                      type="button"
                      className="min-h-8 rounded-full border border-line bg-bg px-2.5 py-1 text-xs font-semibold text-sub"
                      onClick={() =>
                        setHiddenImgs((m) => ({ ...m, [stateKey]: !m[stateKey] }))
                      }
                    >
                      {imgShown ? "隐图" : "图示"}
                    </button>
                  )}
                  <button
                    type="button"
                    className={`min-h-8 shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                      openGuide === stateKey
                        ? "bg-primary text-white"
                        : "bg-primary-soft text-deep"
                    }`}
                    onClick={() => setOpenGuide(openGuide === stateKey ? null : stateKey)}
                    aria-expanded={openGuide === stateKey}
                  >
                    {openGuide === stateKey ? "收起" : "教程"}
                  </button>
                </div>
              </div>
              {imgShown && (
                <div className="mt-3">
                  <ExerciseCover
                    exerciseId={ex.exerciseId}
                    name={ex.name}
                    compact
                  />
                </div>
              )}
              <div className="mt-2 rounded-lg bg-bg px-3 py-1.5 text-xs text-sub">
                {last ? (
                  <>
                    上次({fmtDate(last.workout.startedAt)}):
                    <span className="font-semibold text-ink">
                      {setsSummary(last.exercise)}
                    </span>
                  </>
                ) : (
                  "首次练习 · 轻重量起手"
                )}
              </div>
              {sessionAdvice && showSessionAdvice && (
                <div className="mt-1.5">
                  <AdviceLine
                    advice={sessionAdvice}
                    onApply={canApply ? () => applyWeight(i, sessionAdvice.weight!) : undefined}
                  />
                </div>
              )}
              {ex.note && (
                <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-primary-soft px-3 py-1.5 text-xs text-deep">
                  <Icon name="bulb" size={14} className="mt-px" />
                  {ex.note}
                </p>
              )}
              {openGuide === stateKey && (
                <div className="mt-3 border-t border-line pt-3">
                  {!ex.exerciseId && ex.custom && (
                    <button
                      onClick={() => saveToLibrary(ex)}
                      className="mb-3 w-full rounded-xl border border-primary/40 bg-primary-soft px-3 py-2.5 text-sm font-semibold text-deep"
                    >
                      + 存到动作库
                    </button>
                  )}
                  {guide ? (
                    <Guide
                      guide={guide}
                      name={ex.name}
                      nameEn={ex.nameEn}
                      showAnim={!imgShown}
                    />
                  ) : (
                    <p className="text-sm text-sub">
                      这个动作没有内置教程,点右上角“问教练”问问看。
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="px-4">
              <div className="grid grid-cols-[28px_1fr_1fr_52px] items-center gap-2 py-1 text-center text-xs text-sub">
                <span>组</span>
                <span>重量 kg</span>
                <span>{timed ? "时长(秒)" : "次数"}</span>
                <span>完成</span>
              </div>
              {ex.sets.map((s, k) => {
                const nextOpen = ex.sets.findIndex((x, j) => j > k && !x.done);
                // advice only for the most recently finished set, so older sets stay quiet
                const isLatestDone =
                  s.done && !ex.sets.some((x, j) => j > k && x.done);
                const advice =
                  isLatestDone && !timed && s.rir != null && nextOpen > -1
                    ? adviseNextSet(s, targetRir, ex.repRange, libEx)
                    : undefined;
                const verdict = s.done
                  ? judgeSet(s, targetRir, ex.repRange)
                  : undefined;
                return (
                  <div key={k}>
                    <div className="grid grid-cols-[28px_1fr_1fr_52px] items-center gap-2 py-1">
                      <span className="num text-center text-lg font-bold text-sub">
                        {k + 1}
                      </span>
                      <NumInput
                        decimal
                        className={`${input} num h-12 text-center !text-2xl font-bold placeholder:!text-base placeholder:font-normal ${s.done ? "bg-mint-soft" : ""}`}
                        placeholder="自重"
                        aria-label={`${ex.name} 第 ${k + 1} 组重量`}
                        value={s.weight}
                        onChange={(v) =>
                          updateEx(i, (x) => ({
                            ...x,
                            sets: x.sets.map((y, j) =>
                              j === k ? { ...y, weight: v } : y,
                            ),
                          }))
                        }
                      />
                      <NumInput
                        className={`${input} num h-12 text-center !text-2xl font-bold placeholder:!text-base placeholder:font-normal ${s.done ? "bg-mint-soft" : ""}`}
                        placeholder="—"
                        aria-label={`${ex.name} 第 ${k + 1} 组${timed ? "时长" : "次数"}`}
                        value={s.reps}
                        onChange={(v) =>
                          updateEx(i, (x) => ({
                            ...x,
                            sets: x.sets.map((y, j) =>
                              j === k ? { ...y, reps: v } : y,
                            ),
                          }))
                        }
                      />
                      <button
                        type="button"
                        aria-label={`${ex.name} 第 ${k + 1} 组${s.done ? "取消完成" : "完成"}`}
                        aria-pressed={s.done}
                        onClick={() => toggleSet(i, k)}
                        className={`flex h-12 items-center justify-center rounded-xl ${
                          s.done
                            ? "bg-primary text-white"
                            : "border-2 border-line bg-surface text-sub"
                        }`}
                      >
                        <Icon name="check" size={22} stroke={3} />
                      </button>
                    </div>
                    {s.done && !timed && (
                      <div className="mb-1.5 ml-[36px] space-y-1.5">
                        {s.rir == null ? (
                          <div className="flex items-center gap-1.5">
                            <span className="shrink-0 text-xs text-sub">
                              余力
                            </span>
                            {RIR_OPTIONS.map((r) => (
                              <button
                                key={r}
                                type="button"
                                aria-label={`${ex.name} 第 ${k + 1} 组 ${rirWords(r)}`}
                                onClick={() => setRir(i, k, r)}
                                className="h-8 min-w-8 flex-1 rounded-lg border border-line bg-surface px-1 text-xs font-semibold active:bg-primary-soft"
                              >
                                {r === 0 ? "0" : rirLabel(r)}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setRir(i, k, s.rir!)}
                            aria-label={`修改第 ${k + 1} 组的剩余次数`}
                            className="flex items-center gap-2 text-xs"
                          >
                            <span className="font-semibold">
                              RIR {rirLabel(s.rir)}
                            </span>
                            <span className="text-sub">{rirWords(s.rir)}</span>
                            {verdict && (
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${VERDICT_STYLE[verdict]}`}
                              >
                                {VERDICT_TEXT[verdict]}
                              </span>
                            )}
                            <span className="text-sub underline">改</span>
                          </button>
                        )}
                        {advice &&
                          (advice.verdict !== "right" ||
                            nextOpen === k + 1) && (
                            <AdviceLine
                              advice={advice}
                              onApply={
                                advice.weight != null &&
                                ex.sets[nextOpen]?.weight !== advice.weight
                                  ? () =>
                                      applyWeight(i, advice.weight!, nextOpen)
                                  : undefined
                              }
                            />
                          )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between px-4 py-3 text-sm">
              <div className="flex gap-4">
                <button
                  type="button"
                  className="min-h-9 font-semibold text-deep"
                  onClick={() =>
                    updateEx(i, (x) => ({
                      ...x,
                      sets: [
                        ...x.sets,
                        {
                          weight: x.sets.at(-1)?.weight ?? null,
                          reps: x.sets.at(-1)?.reps ?? null,
                          done: false,
                        },
                      ],
                    }))
                  }
                >
                  + 加一组
                </button>
                {ex.sets.length > 1 && (
                  <button
                    type="button"
                    className="min-h-9 text-sub"
                    onClick={() => {
                      const lastSet = ex.sets.at(-1);
                      if (lastSet?.done && !confirm("最后一组已经完成了，确定删除吗？")) return;
                      updateEx(i, (x) => ({ ...x, sets: x.sets.slice(0, -1) }));
                    }}
                  >
                    − 减一组
                  </button>
                )}
              </div>
              <button
                type="button"
                className="min-h-9 text-sub"
                onClick={() => {
                  if (confirm(`从这次训练中移除「${ex.name}」？`)) {
                    setOpenGuide(null);
                    update((w) => ({
                      ...w,
                      exercises: w.exercises.filter((_, j) => j !== i),
                    }));
                  }
                }}
              >
                移除
              </button>
            </div>
          </Card>
        );
      })}

      <button type="button" className={`${btnGhost} w-full`} onClick={() => setPicker(true)}>
        + 添加动作
      </button>

      {hint && (
        <div
          role="status"
          className="fixed inset-x-0 top-16 z-40 mx-auto max-w-md px-4"
        >
          <div className="rounded-2xl border border-primary/40 bg-card px-4 py-2.5 text-center text-sm font-semibold text-deep shadow-lg">
            {hint}
          </div>
        </div>
      )}

      {restEnd && restLeft > 0 && (
        <div className="safe-b-4 fixed inset-x-0 bottom-0 z-30 px-4">
          <div className="mx-auto flex max-w-md items-center justify-between rounded-3xl bg-primary px-5 py-3 text-[var(--c-on-accent)] shadow-lg">
            <div>
              <div className="text-xs font-semibold opacity-80">组间休息</div>
              <div className="num text-5xl font-bold leading-none">
                {mmss(restLeft)}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="h-12 rounded-2xl bg-black/15 px-3 text-sm font-semibold"
                onClick={() => setRestEnd(restEnd + 30000)}
              >
                +30 秒
              </button>
              <button
                type="button"
                className="h-12 rounded-2xl bg-surface px-4 text-sm font-bold text-ink"
                onClick={() => setRestEnd(null)}
              >
                跳过
              </button>
            </div>
          </div>
        </div>
      )}

      {picker && (
        <ExercisePicker
          onClose={() => setPicker(false)}
          onPick={(e) => {
            update((w) => ({
              ...w,
              exercises: [...w.exercises, newExercise(e)],
            }));
            setPicker(false);
          }}
        />
      )}

      {finishing && (
        <div
          className="fixed inset-0 z-40 flex items-end bg-black/40"
          onClick={() => setFinishing(false)}
        >
          <div
            className="safe-b mx-auto max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-bg p-5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="结束训练"
          >
            <h2 className="text-xl font-bold">完成训练</h2>
            <p className="mt-1 text-sm text-sub">
              完成 {doneSets} 组 ·{" "}
              {backfill
                ? `补记到 ${sessionDay}(训练时长可以填在下面“时长”里)`
                : `用时 ${Math.max(1, Math.round(elapsed / 60))} 分钟`}
              。没打勾的组不会被记录。
            </p>

            <div className="mt-4 text-sm font-semibold">训练感受</div>
            <div className="mt-2 flex justify-between">
              {FEELINGS.map((f, i) => (
                <button
                  key={i}
                  aria-label={`感受 ${i + 1} 分`}
                  aria-pressed={feeling === i + 1}
                  onClick={() => setFeeling(i + 1)}
                  className={`h-12 w-12 rounded-2xl text-2xl ${
                    feeling === i + 1
                      ? "bg-primary-soft ring-2 ring-primary"
                      : "bg-card"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="mt-4 text-sm font-semibold">手表数据</div>
            <div className="mt-2">
              <WatchForm value={watch} onChange={setWatch} />
            </div>

            <div className="mt-4 text-sm font-semibold">备注</div>
            <textarea
              className={`${input} mt-2`}
              rows={2}
              placeholder="例如:腿举最后一组膝盖有点不舒服"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <button className={`${btnPrimary} mt-4 w-full`} onClick={finish}>
              保存训练
            </button>
            <div className="mt-2 flex gap-2">
              <button
                className={`${btnSoft} flex-1`}
                onClick={() => setFinishing(false)}
              >
                继续练
              </button>
              <button
                className={`${btnGhost} flex-1 text-sub`}
                onClick={() => {
                  if (confirm("放弃这次训练?已填的内容不会保存。")) {
                    setState((s) => ({ ...s, active: null }));
                    router.replace("/");
                  }
                }}
              >
                放弃
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
