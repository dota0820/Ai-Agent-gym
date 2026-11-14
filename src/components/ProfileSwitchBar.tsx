"use client";
import Link from "next/link";
import { useState } from "react";
import { getProfileGyms, parseEquipmentList } from "@/lib/equipment";
import { switchProfile, switchProfileGym, useApp, useHydrated } from "@/lib/store";

const GOALS_MAX_LEN = 16;

export default function ProfileSwitchBar({ compact = false }: { compact?: boolean }) {
  const { profile, profiles, activeProfileId } = useApp();
  const ready = useHydrated();
  const [open, setOpen] = useState(false);

  if (!ready) return null;

  const { gyms, activeGym } = getProfileGyms(profile);
  const gymEquipCount = parseEquipmentList(activeGym.equipment).length;

  const statsText = [
    `📍${activeGym.name}${gymEquipCount ? `(${gymEquipCount}项)` : ""}`,
    profile.heightCm ? `${profile.heightCm}cm` : "",
    profile.weightKg ? `${profile.weightKg}kg` : "",
    profile.goal
      ? profile.goal.length > GOALS_MAX_LEN
        ? `${profile.goal.slice(0, GOALS_MAX_LEN)}…`
        : profile.goal
      : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="relative">
      <div
        className={`flex items-center justify-between gap-2 rounded-2xl border border-line bg-white ${
          compact ? "px-3 py-2" : "px-3.5 py-2.5"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-soft text-base">
            {profile.avatar || "🧑"}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-bold">{profile.name || "默认人物"}</span>
              <span className="rounded-full bg-soft px-1.5 py-0.5 text-[10px] font-semibold text-sub">
                {profiles.length > 1 ? `${profiles.length} 档案` : "切人物/场地"} ▾
              </span>
            </div>
            <div className="truncate text-[11px] text-sub">
              {statsText || "点右上「管理档案」完善场地与身体数据"}
            </div>
          </div>
        </button>

        <Link
          href="/me"
          className="shrink-0 rounded-xl border border-line px-2.5 py-1.5 text-xs font-semibold text-sub active:bg-soft"
        >
          管理档案
        </Link>
      </div>

      {open && (
        <div className="mt-1.5 rounded-2xl border border-line bg-white p-2.5 shadow-sm space-y-2.5">
          <div>
            <div className="mb-1 flex items-center justify-between px-1">
              <span className="text-[11px] font-semibold text-sub">
                选择人物档案 (计划/记录/AI 教练独立隔离)
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs font-semibold text-sub"
              >
                收起
              </button>
            </div>
            <div className="space-y-1">
              {profiles.map((ws) => {
                const p = ws.profile;
                const isCurrent = p.id === activeProfileId;
                const meta = [
                  p.gender === "male" ? "男" : p.gender === "female" ? "女" : "",
                  p.age ? `${p.age}岁` : "",
                  p.heightCm ? `${p.heightCm}cm` : "",
                  p.weightKg ? `${p.weightKg}kg` : "",
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      switchProfile(p.id);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left transition ${
                      isCurrent
                        ? "bg-primary/10 ring-1 ring-primary"
                        : "hover:bg-soft active:bg-soft"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="text-lg">{p.avatar || "🧑"}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-sm font-bold">
                          <span className="truncate">{p.name || "未命名人物"}</span>
                          {isCurrent && (
                            <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-white">
                              当前
                            </span>
                          )}
                        </div>
                        <div className="truncate text-[11px] text-sub">
                          {meta || "未填身高体重"} · {ws.workouts.length}练 · {ws.meals.length}餐
                        </div>
                      </div>
                    </div>
                    {p.goal && (
                      <span className="max-w-[90px] truncate rounded-full bg-soft px-2 py-0.5 text-[10px] font-semibold text-sub">
                        {p.goal}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {gyms.length > 1 && (
            <div className="border-t border-line pt-2">
              <div className="mb-1.5 px-1 text-[11px] font-semibold text-sub">
                📍 当前所在场地（AI 按该场地器械排计划）：
              </div>
              <div className="flex flex-wrap gap-1.5">
                {gyms.map((g) => {
                  const isActive = g.id === activeGym.id;
                  const cnt = parseEquipmentList(g.equipment).length;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        switchProfileGym(g.id);
                        setOpen(false);
                      }}
                      className={`rounded-xl px-2.5 py-1.5 text-xs font-bold ${
                        isActive
                          ? "bg-primary text-white"
                          : "border border-line bg-bg text-ink"
                      }`}
                    >
                      {g.name}
                      {cnt > 0 ? ` (${cnt}项)` : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Link
            href="/me"
            onClick={() => setOpen(false)}
            className="block rounded-xl border border-dashed border-line py-2 text-center text-xs font-semibold text-primary active:bg-soft"
          >
            ➕ 去「我的」添加人物或配置 Gym 1 / Gym 2
          </Link>
        </div>
      )}
    </div>
  );
}
