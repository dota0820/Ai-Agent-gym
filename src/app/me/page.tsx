"use client";
import { useState } from "react";
import { setTheme, useTheme } from "@/lib/theme";
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
          icon="👤"
          title="身体与目标"
          value={`${targets.calories} kcal`}
        />
        <Row
          href="/me/gym"
          icon="🏋️"
          title="我的健身房"
          value={`${activeGym.name} · ${gymCount}项`}
        />
        <Row
          href="/me/profile#memory"
          icon="🧠"
          title="教练记住的事"
          value={`${profile.memory.length} 条`}
        />
      </Card>

      <Card className="divide-y divide-line overflow-hidden p-0">
        <Row href="/me/ai" icon="🤖" title="AI 模型" value={modelLabel} />
        <Row href="/me/data" icon="🔐" title="口令与备份" />
      </Card>

      <Card>
        <div className="text-sm font-bold">🎨 外观</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(
            [
              { id: "tech", label: "科技感(深色)" },
              { id: "warm", label: "暖色(浅色)" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              aria-pressed={theme === t.id}
              onClick={() => setTheme(t.id)}
              className={`rounded-xl px-3 py-3 text-sm font-semibold ${
                theme === t.id ? "bg-primary text-white" : "border border-line bg-surface text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Card>

      {sheetOpen && <ProfileSheet onClose={() => setSheetOpen(false)} />}
    </div>
  );
}
