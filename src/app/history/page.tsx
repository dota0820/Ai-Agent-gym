"use client";
import Link from "next/link";
import { Card, H1 } from "@/components/ui";
import { durationMin, fmtDate, useApp, useHydrated, volume } from "@/lib/store";

export default function History() {
  const { workouts } = useApp();
  const ready = useHydrated();
  if (!ready) return null;
  const sorted = [...workouts].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return (
    <div>
      <H1 sub={`一共 ${workouts.length} 次训练`}>训练记录</H1>
      {sorted.length === 0 && (
        <Card>
          <p className="text-sm text-sub">
            还没有记录。去「今天」让教练安排第一次训练吧,练完这里就会出现记录,下次还能看到和上次的对比。
          </p>
        </Card>
      )}
      <ul className="space-y-3">
        {sorted.map((w) => (
          <li key={w.id}>
            <Link href={`/history/${w.id}`} className="block">
              <Card>
                <div className="flex items-baseline justify-between gap-2">
                  <div className="font-bold">{w.title}</div>
                  <div className="shrink-0 text-xs text-sub">{fmtDate(w.startedAt)}</div>
                </div>
                <p className="mt-1 text-sm text-sub">
                  {w.exercises.map((e) => e.name).join(" · ") || "没有记录动作"}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-sub">
                  {durationMin(w) && <span>⏱ {durationMin(w)} 分钟</span>}
                  {volume(w) > 0 && <span>🏋️ 总重量 {volume(w)} kg</span>}
                  {w.watch?.calories && <span>🔥 {w.watch.calories} 千卡</span>}
                  {w.watch?.avgHr && <span>❤️ {w.watch.avgHr} bpm</span>}
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
