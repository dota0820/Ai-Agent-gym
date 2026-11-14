"use client";
import { useState } from "react";
import { getProfileGyms, parseEquipmentList } from "@/lib/equipment";
import { saveProfileGyms, switchProfileGym, uid, useApp } from "@/lib/store";
import type { GymEnvironment } from "@/lib/types";
import GymWizardModal from "./GymWizardModal";
import { btnPrimary, btnSoft } from "./ui";

export default function EquipmentSelector() {
  const { profile, profiles, activeProfileId } = useApp();
  const [wizardState, setWizardState] = useState<{ gym: GymEnvironment; step: number } | null>(
    null,
  );

  const { gyms, activeGym } = getProfileGyms(profile);
  const selected = parseEquipmentList(activeGym.equipment);
  const details = activeGym.details ?? {};

  const otherProfileGyms = profiles
    .filter((ws) => ws.profile.id !== activeProfileId)
    .flatMap((ws) =>
      getProfileGyms(ws.profile)
        .gyms.filter((g) => parseEquipmentList(g.equipment).length > 0 || g.notes?.trim())
        .map((g) => ({
          ownerName: ws.profile.name || "其他人物",
          gym: g,
        })),
    );

  function addNewGym() {
    const newGym: GymEnvironment = {
      id: `gym-${uid()}`,
      name: `Gym ${gyms.length + 1}`,
      scene: "",
      equipment: "",
      details: {},
    };
    const nextGyms = [...gyms, newGym];
    saveProfileGyms(nextGyms, newGym.id);
    setWizardState({ gym: newGym, step: 0 });
  }

  function deleteActiveGym() {
    if (gyms.length <= 1) return;
    if (!confirm(`确定删除「${activeGym.name}」吗？`)) return;
    const remaining = gyms.filter((g) => g.id !== activeGym.id);
    saveProfileGyms(remaining, remaining[0].id);
  }

  function saveEditedGym(updated: GymEnvironment) {
    const exists = gyms.some((g) => g.id === updated.id);
    const nextGyms = exists
      ? gyms.map((g) => (g.id === updated.id ? updated : g))
      : [...gyms, updated];
    saveProfileGyms(nextGyms, updated.id);
    setWizardState(null);
  }

  function copyOtherGym(source: GymEnvironment, ownerName: string) {
    const updated: GymEnvironment = {
      ...activeGym,
      scene: source.scene,
      equipment: source.equipment,
      details: source.details ? { ...source.details } : undefined,
      notes: source.notes,
    };
    const nextGyms = gyms.map((g) => (g.id === activeGym.id ? updated : g));
    saveProfileGyms(nextGyms, activeGym.id);
    alert(`已把「${ownerName} · ${source.name}」的器械配置复制到「${activeGym.name}」`);
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-bold">1. 让 AI 更清楚你的 Gym Environment</div>
        <p className="mt-0.5 text-xs text-sub">
          可为「{profile.name || "当前人物"}」添加 Gym 1、Gym 2 等不同场地；点击下方展开弹窗，像聊天一样一题一题帮你配好（含哑铃重量细节）。
        </p>
      </div>

      {/* Gym 1 / Gym 2 switcher & creator */}
      <div className="flex flex-wrap items-center gap-1.5">
        {gyms.map((g) => {
          const isCurrent = g.id === activeGym.id;
          const cnt = parseEquipmentList(g.equipment).length;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => switchProfileGym(g.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                isCurrent
                  ? "bg-primary text-white shadow-sm"
                  : "border border-line bg-white text-ink hover:bg-soft"
              }`}
            >
              📍 {g.name}
              {cnt > 0 ? ` (${cnt}项)` : ""}
            </button>
          );
        })}
        <button
          type="button"
          onClick={addNewGym}
          className="rounded-xl border border-dashed border-primary/50 bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary active:scale-95"
        >
          + 添加 Gym {gyms.length + 1}
        </button>
      </div>

      {/* Clean collapsed summary box for current active gym */}
      <div className="rounded-2xl border border-line bg-bg p-3.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-bold">{activeGym.name}</span>
            {activeGym.scene && (
              <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-sub border border-line">
                {activeGym.scene}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2 text-xs">
            {selected.length > 0 && (
              <button
                type="button"
                className="text-sub underline"
                onClick={() => {
                  if (confirm(`清空「${activeGym.name}」的已选器械吗？`)) {
                    saveEditedGym({ ...activeGym, equipment: "", details: {} });
                  }
                }}
              >
                清空
              </button>
            )}
            {gyms.length > 1 && (
              <button type="button" className="text-sub underline" onClick={deleteActiveGym}>
                删除场地
              </button>
            )}
          </div>
        </div>

        {selected.length === 0 && !activeGym.notes ? (
          <p className="text-xs leading-relaxed text-sub">
            还没填写这家场地的器械（AI 暂时只能按商业健身房猜）。点下面按钮展开问答向导，一个一个选或拍照即可。
          </p>
        ) : (
          <div className="space-y-1.5">
            <div className="text-xs leading-relaxed text-ink">
              <span className="font-semibold text-sub">已选 {selected.length} 项：</span>
              {selected
                .map((item) => (details[item] ? `${item}(${details[item]})` : item))
                .join("、")}
            </div>
            {activeGym.notes && (
              <div className="text-xs text-sub">📝 补充：{activeGym.notes}</div>
            )}
          </div>
        )}
      </div>

      {otherProfileGyms.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-sub">从其他人物复制器械：</span>
          {otherProfileGyms.map(({ ownerName, gym }) => (
            <button
              key={`${ownerName}-${gym.id}`}
              type="button"
              onClick={() => copyOtherGym(gym, ownerName)}
              className="rounded-lg border border-line bg-white px-2 py-1 text-[11px] font-semibold text-primary active:bg-soft"
            >
              复制「{ownerName} · {gym.name}」
            </button>
          ))}
        </div>
      )}

      {/* Wizard launch triggers */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          className={`${btnPrimary} col-span-2 text-xs`}
          onClick={() => setWizardState({ gym: activeGym, step: 0 })}
        >
          🧭 展开逐项问答配置 →
        </button>
        <button
          type="button"
          className={`${btnSoft} col-span-1 text-xs`}
          onClick={() => setWizardState({ gym: activeGym, step: 1 })}
        >
          📷 拍照/手填
        </button>
      </div>

      {wizardState && (
        <GymWizardModal
          initialGym={wizardState.gym}
          initialStep={wizardState.step}
          onClose={() => setWizardState(null)}
          onSave={saveEditedGym}
        />
      )}
    </div>
  );
}
