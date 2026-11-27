"use client";
import { articlesForExercise } from "@/lib/knowledge";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import ExerciseCover from "@/components/ExerciseCover";
import Guide from "@/components/Guide";
import Icon from "@/components/Icon";
import MuscleMap from "@/components/MuscleMap";
import { btnGhost, btnPrimary, btnSoft, Card, input } from "@/components/ui";
import { findExerciseById, isCustomExercise } from "@/lib/exercise-lookup";
import {
  fmtDate,
  lastPerformance,
  removeCustomExercise,
  setsSummary,
  updateCustomExercise,
  useApp,
} from "@/lib/store";
import { GROUPS, SUBS, type CustomExercise } from "@/lib/types";

function Detail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { workouts, customExercises } = useApp();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CustomExercise | null>(null);

  const e = findExerciseById(id, customExercises);
  if (!e)
    return (
      <div className="pt-20 text-center">
        <p className="text-sub">找不到这个动作。</p>
        <Link href="/library" className={`${btnPrimary} mt-4`}>
          返回动作库
        </Link>
      </div>
    );
  const group = GROUPS.find((x) => x.id === e.group);
  const subList = SUBS[e.group] ?? [];
  const sub = subList.find((x) => x.id === e.sub);
  const last = lastPerformance(workouts, { exerciseId: e.id, name: e.name });
  const custom = isCustomExercise(e);

  function startEdit() {
    if (!custom) return;
    setDraft({ ...e });
    setEditing(true);
  }

  function saveEdit() {
    if (!draft || !draft.name.trim()) return;
    updateCustomExercise({
      ...draft,
      name: draft.name.trim(),
      nameEn: draft.nameEn.trim(),
      equipment: draft.equipment.trim() || "请参考原视频",
      startWeight: draft.startWeight.trim() || "从轻重量开始",
      setup: draft.setup.trim(),
      feel: draft.feel.trim(),
    });
    setEditing(false);
    setDraft(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Link
          href={custom ? "/library?g=custom" : `/library?g=${e.group}`}
          className="-ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-sub"
        >
          <Icon name="chevronLeft" size={20} />
          返回动作库
        </Link>
        {custom && !editing && (
          <button
            type="button"
            onClick={startEdit}
            className="min-h-10 rounded-full bg-primary-soft px-3.5 text-xs font-semibold text-deep"
          >
            编辑动作
          </button>
        )}
      </div>

      {editing && draft ? (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">编辑自定义动作</h2>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="min-h-9 px-2 text-xs text-sub"
            >
              取消
            </button>
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-sub">动作名称</span>
            <input
              className={`${input} mt-1`}
              value={draft.name}
              onChange={(ev) => setDraft({ ...draft, name: ev.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-sub">英文名（可选）</span>
            <input
              className={`${input} mt-1`}
              value={draft.nameEn}
              onChange={(ev) => setDraft({ ...draft, nameEn: ev.target.value })}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-xs font-semibold text-sub">器械</span>
              <input
                className={`${input} mt-1`}
                value={draft.equipment}
                onChange={(ev) => setDraft({ ...draft, equipment: ev.target.value })}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-sub">新手起始重量</span>
              <input
                className={`${input} mt-1`}
                value={draft.startWeight}
                onChange={(ev) => setDraft({ ...draft, startWeight: ev.target.value })}
              />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-sub">准备姿势</span>
            <textarea
              className={`${input} mt-1`}
              rows={2}
              value={draft.setup}
              onChange={(ev) => setDraft({ ...draft, setup: ev.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-sub">哪里该有感觉</span>
            <input
              className={`${input} mt-1`}
              value={draft.feel}
              onChange={(ev) => setDraft({ ...draft, feel: ev.target.value })}
            />
          </label>
          <button type="button" onClick={saveEdit} className={`${btnPrimary} w-full`}>
            保存修改
          </button>
        </Card>
      ) : (
        <>
          <header>
            <div className="flex items-center gap-2 text-xs font-semibold text-deep">
              <span>
                {group?.label ?? "动作"}
                {sub ? ` › ${sub.label}` : ""}
              </span>
              {custom && (
                <span className="rounded-full bg-mint-soft px-2 py-0.5 text-[11px] text-mint">
                  {e.sourcePlatform ? `${e.sourcePlatform}` : "自定义动作"}
                </span>
              )}
            </div>
            <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">{e.name}</h1>
            <p className="text-sm text-sub">
              {e.nameEn ? `${e.nameEn} · ` : ""}新手起始 {e.startWeight}
            </p>
          </header>

          <ExerciseCover exerciseId={e.id} name={e.name} />

          <Card>
            <Guide
              guide={e}
              name={e.name}
              nameEn={e.nameEn}
              showAnim={false}
              showMuscles={false}
            />
          </Card>

          <Card>
            <h2 className="mb-3 text-base font-bold">练到哪里</h2>
            <MuscleMap primary={e.primary} secondary={e.secondary} />
          </Card>

          {last && (
            <Card>
              <div className="text-xs font-semibold text-sub">
                你上次做这个动作({fmtDate(last.workout.startedAt)})
              </div>
              <div className="mt-1 font-semibold">{setsSummary(last.exercise)}</div>
            </Card>
          )}

          {articlesForExercise(e.id).length > 0 && (
            <Card>
              <h2 className="mb-2 text-base font-bold">新手常见问题</h2>
              <ul className="space-y-2">
                {articlesForExercise(e.id).map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/learn?k=${a.id}`}
                      className="flex items-start gap-2 rounded-xl bg-primary-soft px-3 py-2.5 text-sm"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{a.title}</span>
                        <span className="mt-0.5 block text-[13px] leading-relaxed text-sub">
                          💡 {a.truth}
                        </span>
                      </span>
                      <Icon name="chevronRight" size={16} className="mt-0.5 shrink-0 text-deep" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Link
            href={`/coach?q=${encodeURIComponent(`${e.name}${e.nameEn ? `(${e.nameEn})` : ""}我有点不确定动作对不对，能再仔细讲讲要点吗？`)}`}
            className={`${btnSoft} w-full`}
          >
            还是不懂？问教练
          </Link>

          {custom && (
            <button
              type="button"
              className={`${btnGhost} w-full text-sub`}
              onClick={() => {
                if (confirm(`确定从我的动作库删除「${e.name}」吗？`)) {
                  removeCustomExercise(e.id);
                  router.replace("/library?g=custom");
                }
              }}
            >
              删除这个自定义动作
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function ExerciseDetail() {
  return (
    <Suspense>
      <Detail />
    </Suspense>
  );
}
