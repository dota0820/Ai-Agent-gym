"use client";
import Link from "next/link";
import { useState } from "react";
import Icon, { type IconName } from "@/components/Icon";
import { avatarLetter } from "@/components/Avatar";
import ProfileSheet from "@/components/ProfileSheet";
import { computeStreakWeeks } from "@/lib/analytics";
import { getProfileGyms, parseEquipmentList } from "@/lib/equipment";
import { AI_MODELS } from "@/lib/models";
import { computeNutritionTargets } from "@/lib/nutrition";
import { useApp, useHydrated } from "@/lib/store";
import { compactNum, totalVolume, trainingDays } from "@/lib/summary";

function SectionHead({
  icon,
  title,
  sub,
  right,
}: {
  icon: IconName;
  title: string;
  sub: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-forest">
          <Icon name={icon} size={21} />
        </span>
        <div>
          <h2 className="text-[17px] font-bold leading-tight">{title}</h2>
          <p className="mt-0.5 text-[12px] text-sub">{sub}</p>
        </div>
      </div>
      {right}
    </div>
  );
}

function LinkRow({
  href,
  icon,
  title,
  sub,
  value,
}: {
  href: string;
  icon: IconName;
  title: string;
  sub?: string;
  value?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 py-3.5 active:opacity-70"
    >
      <Icon name={icon} size={22} className="text-forest" />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold">{title}</span>
        {sub && (
          <span className="mt-0.5 block truncate text-[12px] text-sub">
            {sub}
          </span>
        )}
      </span>
      {value && (
        <span className="max-w-[40%] truncate text-[12px] font-bold text-deep">
          {value}
        </span>
      )}
      <Icon name="chevronRight" size={20} className="text-sub" />
    </Link>
  );
}

export default function Me() {
  const { profile, aiModel, workouts } = useApp();
  const ready = useHydrated();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [now] = useState(() => Date.now());
  if (!ready) return null;

  const { activeGym } = getProfileGyms(profile);
  const gymCount = parseEquipmentList(activeGym.equipment).length;
  const targets = computeNutritionTargets(profile);
  const modelLabel =
    AI_MODELS.find((m) => m.id === aiModel)?.label ?? (aiModel || "服务器默认");
  const streak = computeStreakWeeks(workouts, now);

  return (
    <div className="space-y-4">
      <h1 className="text-[26px] font-bold">我的</h1>

      {/* profile hero */}
      <div className="relative overflow-hidden rounded-[28px] bg-forest p-5 text-white">
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <span className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-white/10 text-[26px] font-bold text-white">
            {avatarLetter(profile.name)}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-forest bg-primary text-forest">
              <Icon name="check" size={14} stroke={3} />
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-['Space_Grotesk'] text-[22px] font-bold">
              {profile.name || "默认人物"}
            </div>
            <div className="mt-0.5 truncate text-[12px] text-white/65">
              {[activeGym.name, profile.goal].filter(Boolean).join(" · ") ||
                "完善身体资料"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-3.5 py-2 text-[12px] font-bold"
          >
            <Icon name="swap" size={16} />
            切换
          </button>
        </div>
        <div className="relative mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-primary">
          <Icon name="flame" size={16} fill className="text-primary" />
          {streak.currentWeeks
            ? `已连续打卡 ${streak.currentWeeks} 周`
            : "这周开始打卡吧"}
        </div>
        <div className="relative mt-4 grid grid-cols-3 rounded-2xl bg-white/[0.07] px-4 py-3">
          {[
            { l: "坚持天数", v: trainingDays(workouts), u: "天" },
            { l: "累计举起", v: compactNum(totalVolume(workouts)), u: "kg" },
            { l: "累计训练", v: workouts.length, u: "次" },
          ].map((x) => (
            <div key={x.l}>
              <div className="text-[11px] text-white/60">{x.l}</div>
              <div className="mt-1 flex items-baseline gap-0.5 text-primary">
                <span className="display-num text-[22px] leading-none">
                  {x.v}
                </span>
                <span className="text-[11px] font-semibold">{x.u}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* body */}
      <div className="lift rounded-[28px] bg-card p-4">
        <SectionHead
          icon="scale"
          title="身体基础与训练目标"
          sub={
            profile.goal
              ? `当前目标：${profile.goal}`
              : "填好资料，教练安排更准"
          }
        />
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {[
            { l: "身高", v: profile.heightCm || "—", u: "cm" },
            { l: "体重", v: profile.weightKg || "—", u: "kg" },
            { l: "每周训练", v: profile.daysPerWeek || "—", u: "次" },
            { l: "每日热量", v: targets.calories.toLocaleString(), u: "kcal" },
          ].map((x) => (
            <div key={x.l} className="rounded-2xl bg-bg px-4 py-3">
              <div className="text-[11px] font-semibold text-sub">{x.l}</div>
              <div className="mt-1 flex items-baseline gap-1 text-forest">
                <span className="display-num text-[24px] leading-none">
                  {x.v}
                </span>
                <span className="text-[12px] font-semibold text-sub">
                  {x.u}
                </span>
              </div>
            </div>
          ))}
        </div>
        <Link
          href="/me/profile"
          className="mt-3 flex items-center justify-between rounded-2xl bg-bg px-4 py-3 text-[13px] font-bold text-forest"
        >
          <span className="flex items-center gap-2">
            <Icon name="settings" size={18} />
            调整身体资料与营养目标
          </span>
          <Icon name="chevronRight" size={18} />
        </Link>
      </div>

      {/* settings */}
      <div className="lift rounded-[28px] bg-card px-4 pt-4 pb-1">
        <SectionHead
          icon="settings"
          title="偏好与设置"
          sub="健身房、教练和数据"
        />
        <div className="mt-2 divide-y divide-line">
          <LinkRow
            href="/me/gym"
            icon="dumbbell"
            title="我的健身房"
            sub="教练只安排你有的器械"
            value={`${activeGym.name} · ${gymCount}项`}
          />
          <LinkRow
            href="/me/profile#memory"
            icon="brain"
            title="教练记忆"
            sub="教练记住的你的习惯和伤病"
            value={`${profile.memory.length} 条`}
          />
          <LinkRow
            href="/me/ai"
            icon="robot"
            title="AI 模型"
            sub="教练用哪个大脑"
            value={modelLabel}
          />
          <LinkRow
            href="/me/data"
            icon="lock"
            title="口令与备份"
            sub="换手机前记得备份"
          />
        </div>
      </div>

      {sheetOpen && <ProfileSheet onClose={() => setSheetOpen(false)} />}
    </div>
  );
}
