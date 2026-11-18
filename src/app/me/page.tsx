"use client";
import Icon from "@/components/Icon";
import { useState } from "react";
import { setTheme, THEMES, useTheme } from "@/lib/theme";
import ProfileSheet from "@/components/ProfileSheet";
import { Card, H1, Row } from "@/components/ui";
import { getProfileGyms, parseEquipmentList } from "@/lib/equipment";
import { AI_MODELS } from "@/lib/models";
import { computeNutritionTargets } from "@/lib/nutrition";
import { useApp, useHydrated } from "@/lib/store";

export default function Me() {
  const { profile, aiModel } = useApp();
  const theme = useTheme();
  const ready = useHydrated();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!ready) return null;

  const { activeGym } = getProfileGyms(profile);
  const gymCount = parseEquipmentList(activeGym.equipment).length;
  const targets = computeNutritionTargets(profile);
  const modelLabel =
    AI_MODELS.find((m) => m.id === aiModel)?.label ?? (aiModel || "服务器默认");

  const meta = [
    profile.heightCm ? `${profile.heightCm}cm` : "",
    profile.weightKg ? `${profile.weightKg}kg` : "",
    profile.goal || "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-4">
      <H1>我的</H1>

      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-line bg-card p-4 text-left shadow-[0_1px_2px_rgba(42,39,51,0.04)] active:bg-bg"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-bg text-2xl">
          {profile.avatar || "🙂"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-bold">{profile.name || "默认人物"}</div>
          <div className="truncate text-xs text-sub">
            {meta || "点「身体与目标」填写身高、体重和目标"}
          </div>
        </div>
        <span className="shrink-0 text-xs font-semibold text-sub">切换 ▾</span>
      </button>

      <Card className="divide-y divide-line overflow-hidden p-0">
        <Row
          href="/me/profile"
          icon="user"
          title="身体与目标"
          value={`${targets.calories} kcal`}
        />
        <Row
          href="/me/gym"
          icon="dumbbell"
          title="我的健身房"
          value={`${activeGym.name} · ${gymCount}项`}
        />
        <Row
          href="/me/profile#memory"
          icon="brain"
          title="教练记住的事"
          value={`${profile.memory.length} 条`}
        />
      </Card>

      <Card className="divide-y divide-line overflow-hidden p-0">
        <Row href="/me/ai" icon="cpu" title="AI 模型" value={modelLabel} />
        <Row href="/me/data" icon="lock" title="口令与备份" />
      </Card>

      <Card>
        <div className="flex items-center gap-1.5 text-sm font-bold">
          <Icon name="palette" size={16} />
          外观（配色）
        </div>
        <p className="mt-0.5 text-xs text-sub">点一下马上换。开始训练后会自动变成同色系的深色模式。</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              aria-pressed={theme === t.id}
              onClick={() => setTheme(t.id)}
              className={`overflow-hidden rounded-2xl border-2 text-left ${
                theme === t.id ? "border-primary" : "border-line"
              }`}
            >
              <span className="block p-2" style={{ background: t.bg }}>
                <span
                  className="block rounded-lg p-1.5"
                  style={{ background: t.card, boxShadow: "0 1px 3px rgba(0,0,0,.12)" }}
                >
                  <span className="block h-1.5 w-8 rounded-full" style={{ background: t.ink }} />
                  <span
                    className="mt-1.5 block h-4 rounded-md"
                    style={{ background: t.primary }}
                  />
                </span>
              </span>
              <span className="block px-2 py-1.5 text-xs font-semibold">
                {theme === t.id && <Icon name="check" size={12} stroke={3} className="mr-1 inline" />}
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {sheetOpen && <ProfileSheet onClose={() => setSheetOpen(false)} />}
    </div>
  );
}
