"use client";
import { useState } from "react";
import GymWizardModal from "@/components/GymWizardModal";
import { btnSoft, Card, SubPage } from "@/components/ui";
import { getProfileGyms, parseEquipmentList } from "@/lib/equipment";
import { saveProfileGyms, switchProfileGym, uid, useApp, useHydrated } from "@/lib/store";
import type { GymEnvironment } from "@/lib/types";

export default function MeGymPage() {
  const { profile } = useApp();
  const ready = useHydrated();
  const [editing, setEditing] = useState<GymEnvironment | null>(null);

  if (!ready) return null;

  const { gyms, activeGym } = getProfileGyms(profile);

  function addGym() {
    const created: GymEnvironment = {
      id: `gym-${uid()}`,
      name: `Gym ${gyms.length + 1}`,
      scene: "",
      equipment: "",
      details: {},
    };
    saveProfileGyms([...gyms, created], created.id);
    setEditing(created);
  }

  function saveGym(updated: GymEnvironment) {
    const exists = gyms.some((g) => g.id === updated.id);
    const nextGyms = exists
      ? gyms.map((g) => (g.id === updated.id ? updated : g))
      : [...gyms, updated];
    saveProfileGyms(nextGyms, updated.id);
    setEditing(null);
  }

  function deleteGym(id: string) {
    if (gyms.length <= 1) return;
    const remaining = gyms.filter((g) => g.id !== id);
    saveProfileGyms(remaining, remaining[0].id);
    setEditing(null);
  }

  return (
    <SubPage title="我的健身房">
      <Card className="divide-y divide-line overflow-hidden p-0">
        {gyms.map((g) => {
          const isCurrent = g.id === activeGym.id;
          const count = parseEquipmentList(g.equipment).length;
          const dumbbell = g.details?.["哑铃"];
          return (
            <div key={g.id} className="flex items-center gap-3 px-4 py-3.5">
              <button
                type="button"
                onClick={() => switchProfileGym(g.id)}
                className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
              >
                <span className={`mt-0.5 text-sm ${isCurrent ? "text-primary" : "text-sub"}`}>
                  {isCurrent ? "●" : "○"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{g.name}</span>
                    {g.scene && <span className="truncate text-xs text-sub">{g.scene}</span>}
                    {isCurrent && (
                      <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        当前
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-sub">
                    {count > 0 ? `${count} 项` : "未配置器械"}
                    {dumbbell ? ` · 哑铃 ${dumbbell}` : ""}
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setEditing(g)}
                className="shrink-0 rounded-xl border border-line px-3 py-1.5 text-xs font-semibold text-ink active:bg-bg"
              >
                编辑
              </button>
            </div>
          );
        })}
      </Card>

      <button type="button" onClick={addGym} className={`${btnSoft} w-full`}>
        + 添加健身房
      </button>

      <p className="px-1 text-xs leading-relaxed text-sub">
        AI 教练会严格按你当前选中的场地器械和重量来安排计划，点击某行即可切换当前场地。
      </p>

      {editing && (
        <GymWizardModal
          initialGym={editing}
          canDelete={gyms.length > 1}
          onDelete={() => deleteGym(editing.id)}
          onClose={() => setEditing(null)}
          onSave={saveGym}
        />
      )}
    </SubPage>
  );
}
