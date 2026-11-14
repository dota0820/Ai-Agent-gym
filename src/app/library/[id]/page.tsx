"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import ExerciseAnim from "@/components/ExerciseAnim";
import Guide from "@/components/Guide";
import MuscleMap from "@/components/MuscleMap";
import { btnPrimary, btnSoft, Card } from "@/components/ui";
import { EX_BY_ID } from "@/lib/exercises";
import { fmtDate, lastPerformance, setsSummary, useApp } from "@/lib/store";
import { GROUPS, SUBS } from "@/lib/types";

function Detail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { workouts } = useApp();
  const e = EX_BY_ID[id];
  if (!e)
    return (
      <div className="pt-20 text-center">
        <p className="text-sub">找不到这个动作。</p>
        <Link href="/library" className={`${btnPrimary} mt-4`}>
          返回动作库
        </Link>
      </div>
    );
  const group = GROUPS.find((x) => x.id === e.group)!;
  const sub = SUBS[e.group].find((x) => x.id === e.sub);
  const last = lastPerformance(workouts, { exerciseId: e.id, name: e.name });

  return (
    <div className="space-y-3">
      <button className="text-sm text-sub" onClick={() => router.back()}>
        ‹ 返回
      </button>
      <header>
        <div className="text-xs font-semibold text-primary">
          {group.label}
          {sub ? ` › ${sub.label}` : ""}
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{e.name}</h1>
        <p className="text-sm text-sub">
          {e.nameEn} · 新手起始 {e.startWeight}
        </p>
      </header>

      <ExerciseAnim id={e.id} name={e.name} note={e.imageNote} />

      <Card>
        <h2 className="mb-3 text-sm font-bold">练到哪里</h2>
        <MuscleMap primary={e.primary} secondary={e.secondary} />
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-bold">标准动作</h2>
        <Guide guide={e} name={e.name} nameEn={e.nameEn} showAnim={false} />
      </Card>

      {last && (
        <Card>
          <div className="text-xs font-semibold text-sub">
            你上次做这个动作({fmtDate(last.workout.startedAt)})
          </div>
          <div className="mt-1 font-semibold">{setsSummary(last.exercise)}</div>
        </Card>
      )}

      <Link
        href={`/coach?q=${encodeURIComponent(`${e.name}(${e.nameEn})我有点不确定动作对不对,能再仔细讲讲要点吗?`)}`}
        className={`${btnSoft} w-full`}
      >
        💬 还是不懂?问教练
      </Link>
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
