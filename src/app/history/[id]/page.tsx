"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import ExercisePicker from "@/components/ExercisePicker";
import NumInput from "@/components/NumInput";
import WatchForm from "@/components/WatchForm";
import { btnGhost, btnPrimary, btnSoft, Card, input } from "@/components/ui";
import {
  mergeWorkouts,
  sameDayWorkouts,
  updateWorkout,
} from "@/lib/workout-edit";
import {
  durationMin,
  fmtDate,
  lastPerformance,
  setState,
  setsSummary,
  useApp,
  useHydrated,
  volume,
} from "@/lib/store";
import type { WatchData, WorkoutExercise } from "@/lib/types";

/** YYYY-MM-DD in the phone's own time zone (what a date input expects). */
function localDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const FEELINGS = ["😵", "😮‍💨", "🙂", "😄", "🔥"];

function best(e: WorkoutExercise) {
  const done = e.sets.filter((s) => s.done);
  const w = Math.max(0, ...done.map((s) => s.weight ?? 0));
  const reps = done.reduce((n, s) => n + (s.reps ?? 0), 0);
  return { w, reps };
}

function Delta({ cur, prev }: { cur: WorkoutExercise; prev: WorkoutExercise }) {
  const a = best(cur);
  const b = best(prev);
  let text = "和上次持平";
  let cls = "bg-bg text-sub";
  if (a.w > b.w) {
    text = `重量 +${+(a.w - b.w).toFixed(1)} kg ↑`;
    cls = "bg-mint-soft text-mint";
  } else if (a.w < b.w) {
    text = `重量 −${+(b.w - a.w).toFixed(1)} kg`;
  } else if (a.reps > b.reps) {
    text = `总次数 +${a.reps - b.reps} ↑`;
    cls = "bg-mint-soft text-mint";
  } else if (a.reps < b.reps) {
    text = `总次数 −${b.reps - a.reps}`;
  }
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}
    >
      {text}
    </span>
  );
}

function Detail() {
  const { id } = useParams<{ id: string }>();
  const { workouts } = useApp();
  const ready = useHydrated();
  const router = useRouter();
  const [editWatch, setEditWatch] = useState(false);
  const [editing, setEditing] = useState(false);
  const [picker, setPicker] = useState<{ swap?: number } | null>(null);
  if (!ready) return null;
  const w = workouts.find((x) => x.id === id);
  if (!w)
    return (
      <div className="pt-20 text-center">
        <p className="text-sub">找不到这条记录。</p>
        <Link href="/history" className={`${btnPrimary} mt-4`}>
          返回记录
        </Link>
      </div>
    );

  // Move the session to another day, keeping its time of day and duration.
  const moveToDate = (ymd: string) => {
    const [y, mo, d] = ymd.split("-").map(Number);
    const start = new Date(w.startedAt);
    const shifted = new Date(start);
    shifted.setFullYear(y, mo - 1, d);
    const delta = shifted.getTime() - start.getTime();
    if (!delta || isNaN(delta)) return;
    setState((s) => ({
      ...s,
      workouts: s.workouts.map((x) =>
        x.id === w.id
          ? {
              ...x,
              startedAt: shifted.toISOString(),
              endedAt: x.endedAt
                ? new Date(new Date(x.endedAt).getTime() + delta).toISOString()
                : x.endedAt,
            }
          : x,
      ),
    }));
  };
  const setWatch = (watch: WatchData) =>
    setState((s) => ({
      ...s,
      workouts: s.workouts.map((x) => (x.id === w.id ? { ...x, watch } : x)),
    }));
  const twins = sameDayWorkouts(workouts, w);
  const editEx = (i: number, fn: (e: WorkoutExercise) => WorkoutExercise) =>
    updateWorkout(w.id, (x) => ({
      ...x,
      exercises: x.exercises.map((e, j) => (j === i ? fn(e) : e)),
    }));
  const editSet = (
    i: number,
    k: number,
    patch: Partial<WorkoutExercise["sets"][number]>,
  ) =>
    editEx(i, (e) => ({
      ...e,
      sets: e.sets.map((st, j) => (j === k ? { ...st, ...patch } : st)),
    }));
  const reviewQ = `我完成了 ${localDate(w.startedAt)} 的「${w.title}」，请点评这次训练，和上一次比怎么样，并告诉我下次的目标。`;

  return (
    <div className="space-y-3">
      <Link
        href="/history"
        className="-ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-sub"
      >
        ‹ 训练记录
      </Link>
      <header>
        <div className="flex items-start justify-between gap-2">
          {editing ? (
            <input
              aria-label="训练名称"
              className={`${input} text-xl font-bold`}
              value={w.title}
              onChange={(e) =>
                updateWorkout(w.id, (x) => ({ ...x, title: e.target.value }))
              }
              onBlur={() =>
                !w.title.trim() &&
                updateWorkout(w.id, (x) => ({ ...x, title: "自由训练" }))
              }
            />
          ) : (
            <h1 className="text-2xl font-bold tracking-tight">{w.title}</h1>
          )}
          <button
            onClick={() => setEditing(!editing)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold ${
              editing
                ? "bg-primary text-white"
                : "border border-line bg-card text-ink"
            }`}
          >
            {editing ? "完成" : "编辑"}
          </button>
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-sub">
          <span>
            {fmtDate(w.startedAt)}
            {w.feeling ? ` · 感受 ${FEELINGS[w.feeling - 1]}` : ""}
          </span>
          <label className="relative cursor-pointer font-semibold text-deep underline underline-offset-2">
            改日期
            <input
              type="date"
              aria-label="修改这次训练的日期"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              value={localDate(w.startedAt)}
              max={localDate(new Date().toISOString())}
              onChange={(e) => e.target.value && moveToDate(e.target.value)}
            />
          </label>
        </p>
      </header>

      {twins.map((t) => (
        <div
          key={t.id}
          className="rounded-2xl border border-primary/40 bg-primary-soft p-3 text-sm"
        >
          <div className="font-semibold text-deep">
            同一天还有一条记录「{t.title}」
          </div>
          <p className="mt-0.5 text-xs text-sub">
            {t.exercises.map((e) => e.name).join(" · ") || "没有动作"}
          </p>
          <p className="mt-1 text-xs text-sub">
            如果是同一次训练,可以合并成一条:动作和组数都会保留,相同的动作会合在一起。
          </p>
          <button
            className={`${btnPrimary} mt-2 w-full py-2.5`}
            onClick={() => {
              if (
                confirm(`把「${t.title}」合并到这条记录里?合并后那条会被删除。`)
              )
                mergeWorkouts(w.id, t.id);
            }}
          >
            合并成一条记录
          </button>
        </div>
      ))}

      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { l: "时长", v: durationMin(w), u: "分钟" },
          { l: "总重量", v: volume(w) || null, u: "kg" },
          { l: "消耗", v: w.watch?.calories, u: "千卡" },
          { l: "平均心率", v: w.watch?.avgHr, u: "bpm" },
        ].map((x) => (
          <div
            key={x.l}
            className="rounded-2xl border border-line bg-card py-2"
          >
            <div className="text-lg font-bold tabular-nums">{x.v ?? "—"}</div>
            <div className="text-[11px] text-sub">
              {x.l}
              {x.v ? ` ${x.u}` : ""}
            </div>
          </div>
        ))}
      </div>

      <Link
        href={`/coach?q=${encodeURIComponent(reviewQ)}`}
        className={`${btnPrimary} w-full`}
      >
        让教练点评这次训练
      </Link>

      {w.exercises.map((e, i) => {
        const prev = lastPerformance(workouts, e, w.startedAt);
        return (
          <Card key={i}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-bold">{e.name}</div>
                {e.nameEn && <div className="text-xs text-sub">{e.nameEn}</div>}
              </div>
              {prev && <Delta cur={e} prev={prev.exercise} />}
            </div>
            {editing ? (
              <div className="mt-3 space-y-2">
                <div className="flex gap-2">
                  <button
                    className={`${btnSoft} flex-1 py-2 text-sm`}
                    onClick={() => setPicker({ swap: i })}
                  >
                    ⇄ 换成动作库里的动作
                  </button>
                  <button
                    className={`${btnGhost} px-3 py-2 text-sm text-sub`}
                    onClick={() => {
                      if (confirm(`从这条记录里删除「${e.name}」?`))
                        updateWorkout(w.id, (x) => ({
                          ...x,
                          exercises: x.exercises.filter((_, j) => j !== i),
                        }));
                    }}
                  >
                    删除
                  </button>
                </div>
                <div className="grid grid-cols-[28px_1fr_1fr_36px] items-center gap-2 text-center text-[11px] text-sub">
                  <span>组</span>
                  <span>重量 kg</span>
                  <span>次数</span>
                  <span />
                </div>
                {e.sets.map((st, k) => (
                  <div
                    key={k}
                    className="grid grid-cols-[28px_1fr_1fr_36px] items-center gap-2"
                  >
                    <span className="text-center text-sm font-semibold text-sub">
                      {k + 1}
                    </span>
                    <NumInput
                      decimal
                      className={`${input} text-center`}
                      placeholder="自重"
                      aria-label={`${e.name} 第 ${k + 1} 组重量`}
                      value={st.weight}
                      onChange={(v) => editSet(i, k, { weight: v, done: true })}
                    />
                    <NumInput
                      className={`${input} text-center`}
                      placeholder="—"
                      aria-label={`${e.name} 第 ${k + 1} 组次数`}
                      value={st.reps}
                      onChange={(v) => editSet(i, k, { reps: v, done: true })}
                    />
                    <button
                      aria-label={`删除第 ${k + 1} 组`}
                      className="h-9 rounded-lg text-sub active:bg-bg"
                      onClick={() =>
                        editEx(i, (x) => ({
                          ...x,
                          sets: x.sets.filter((_, j) => j !== k),
                        }))
                      }
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  className="text-sm font-semibold text-deep"
                  onClick={() =>
                    editEx(i, (x) => ({
                      ...x,
                      sets: [
                        ...x.sets,
                        {
                          weight: x.sets.at(-1)?.weight ?? null,
                          reps: null,
                          done: true,
                        },
                      ],
                    }))
                  }
                >
                  + 加一组
                </button>
              </div>
            ) : (
              <div className="mt-2 text-sm">
                <span className="text-sub">这次:</span>
                <span className="font-semibold">{setsSummary(e)}</span>
              </div>
            )}
            <div className="mt-1 text-sm text-sub">
              {prev
                ? `上次(${fmtDate(prev.workout.startedAt)}):${setsSummary(prev.exercise)}`
                : "上次:第一次做这个动作"}
            </div>
          </Card>
        );
      })}

      {editing && (
        <button className={`${btnGhost} w-full`} onClick={() => setPicker({})}>
          + 添加动作
        </button>
      )}

      {picker && (
        <ExercisePicker
          onClose={() => setPicker(null)}
          onPick={(ex) => {
            const i = picker.swap;
            if (i !== undefined)
              editEx(i, (e) => ({
                ...e,
                exerciseId: ex.exerciseId,
                name: ex.name,
                nameEn: ex.nameEn,
                custom: undefined,
              }));
            else
              updateWorkout(w.id, (x) => ({
                ...x,
                exercises: [
                  ...x.exercises,
                  { ...ex, sets: [{ weight: null, reps: null, done: true }] },
                ],
              }));
            setPicker(null);
          }}
        />
      )}

      {w.notes && (
        <Card>
          <div className="text-xs font-semibold text-sub">备注</div>
          <p className="mt-1 whitespace-pre-wrap text-sm">{w.notes}</p>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">
            ⌚ 手表数据
            {w.watch?.maxHr ? (
              <span className="ml-2 font-normal text-sub">
                最高心率 {w.watch.maxHr} bpm
              </span>
            ) : null}
          </div>
          <button
            className="text-sm text-deep"
            onClick={() => setEditWatch(!editWatch)}
          >
            {editWatch ? "完成" : w.watch ? "修改" : "补充"}
          </button>
        </div>
        {editWatch && (
          <div className="mt-3">
            <WatchForm
              value={w.watch ?? { source: "manual" }}
              onChange={setWatch}
            />
          </div>
        )}
      </Card>

      <div className="flex gap-2">
        <Link href="/" className={`${btnSoft} flex-1`}>
          回到首页
        </Link>
        <button
          className={`${btnGhost} flex-1 text-sub`}
          onClick={() => {
            if (confirm("删除这条训练记录?删除后不能恢复。")) {
              setState((s) => ({
                ...s,
                workouts: s.workouts.filter((x) => x.id !== w.id),
              }));
              router.replace("/history");
            }
          }}
        >
          删除记录
        </button>
      </div>
    </div>
  );
}

export default function WorkoutDetail() {
  return (
    <Suspense>
      <Detail />
    </Suspense>
  );
}
