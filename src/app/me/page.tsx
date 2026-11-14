"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import EquipmentSelector from "@/components/EquipmentSelector";
import { btnGhost, btnPrimary, btnSoft, Card, H1, input } from "@/components/ui";
import { computeNutritionTargets } from "@/lib/nutrition";
import {
  createProfile,
  deleteProfile,
  exportRootBackup,
  importRootBackup,
  setState,
  switchProfile,
  useApp,
  useHydrated,
} from "@/lib/store";
import type { Gender, Profile } from "@/lib/types";

const GOALS = ["减脂", "增肌塑形", "练翘臀", "改善体态", "保持健康"];
const AVATARS = ["🧑", "👩", "👨", "💪", "🏃‍♀️", "🏋️"];
const GENDERS: { id: Gender; label: string }[] = [
  { id: "female", label: "女" },
  { id: "male", label: "男" },
  { id: "", label: "暂不填" },
];

interface NewProfileDraft {
  name: string;
  avatar: string;
  gender: Gender;
  age: string;
  heightCm: string;
  weightKg: string;
  daysPerWeek: string;
  goal: string;
  level: string;
  copyEquipment: boolean;
}

const EMPTY_DRAFT: NewProfileDraft = {
  name: "",
  avatar: "🧑",
  gender: "",
  age: "",
  heightCm: "",
  weightKg: "",
  daysPerWeek: "3",
  goal: "减脂",
  level: "新手(刚开始健身)",
  copyEquipment: true,
};

export default function Me() {
  const { profile, profiles, activeProfileId, workouts, customExercises, meals } = useApp();
  const ready = useHydrated();
  const fileRef = useRef<HTMLInputElement>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<NewProfileDraft>(EMPTY_DRAFT);

  if (!ready) return null;

  const set = (patch: Partial<Profile>) =>
    setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));

  const target = computeNutritionTargets(profile);
  const otherProfilesWithEquipment = profiles.filter(
    (ws) => ws.profile.id !== activeProfileId && ws.profile.equipment.trim().length > 0,
  );

  const field = (key: keyof Profile, label: string, placeholder = "", mode?: "numeric") => (
    <label className="block">
      <span className="text-xs font-semibold text-sub">{label}</span>
      <input
        className={`${input} mt-1`}
        placeholder={placeholder}
        inputMode={mode}
        value={(profile[key] as string) ?? ""}
        onChange={(e) => set({ [key]: e.target.value })}
      />
    </label>
  );

  function handleCreateProfile(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = draft.name.trim() || `人物 ${profiles.length + 1}`;
    createProfile(
      {
        name: cleanName,
        avatar: draft.avatar,
        gender: draft.gender,
        age: draft.age.trim(),
        heightCm: draft.heightCm.trim(),
        weightKg: draft.weightKg.trim(),
        daysPerWeek: draft.daysPerWeek.trim() || "3",
        goal: draft.goal,
        level: draft.level,
      },
      draft.copyEquipment,
    );
    setDraft(EMPTY_DRAFT);
    setCreating(false);
  }

  function handleDeleteCurrent() {
    if (profiles.length <= 1) return;
    const label = profile.name || "当前人物";
    if (
      !confirm(
        `确定要删除「${label}」档案吗？该人物下的 ${workouts.length} 次训练、${meals.length} 条饮食、计划和 AI 教练记录都会一起删除（不影响其他人物）。`,
      )
    ) {
      return;
    }
    deleteProfile(activeProfileId);
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(exportRootBackup(), null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `健身记录-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importData(file: File) {
    try {
      const data = JSON.parse(await file.text());
      const previewProfiles = Array.isArray(data?.profiles)
        ? data.profiles.length
        : data?.profile
          ? 1
          : 0;
      const previewWorkouts = Array.isArray(data?.profiles)
        ? data.profiles.reduce(
            (n: number, ws: { workouts?: unknown[] }) =>
              n + (Array.isArray(ws?.workouts) ? ws.workouts.length : 0),
            0,
          )
        : Array.isArray(data?.workouts)
          ? data.workouts.length
          : -1;
      if (previewProfiles === 0 || previewWorkouts < 0) throw new Error("bad");
      if (
        !confirm(
          `导入会覆盖现在的数据(备份里有 ${previewProfiles} 个人物档案、共 ${previewWorkouts} 次训练)。继续吗?`,
        )
      ) {
        return;
      }
      const res = importRootBackup(data);
      if (!res) throw new Error("bad");
      alert(`导入成功（已恢复 ${res.profilesCount} 个人物档案）`);
    } catch {
      alert("这个文件不是有效的备份文件。");
    }
  }

  return (
    <div className="space-y-4">
      <H1 sub="可建立多个人物分类，AI 教练、计划、进食目标与记录完全按当前人物独立运行">我的</H1>

      {/* Multi-profile category switcher & manager */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-bold">👥 人物档案分类</div>
            <div className="text-xs text-sub">
              点卡片切换人物，所有 AI 计划与饮食目标将立刻切换为该人物
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCreating((v) => !v)}
            className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold ${
              creating ? "border border-line bg-white text-sub" : "bg-primary text-white"
            }`}
          >
            {creating ? "取消" : "+ 新建人物"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {profiles.map((ws) => {
            const p = ws.profile;
            const active = p.id === activeProfileId;
            const stats = [
              p.gender === "male" ? "男" : p.gender === "female" ? "女" : "",
              p.heightCm ? `${p.heightCm}cm` : "",
              p.weightKg ? `${p.weightKg}kg` : "",
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => switchProfile(p.id)}
                className={`rounded-2xl border p-3 text-left transition ${
                  active
                    ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                    : "border-line bg-white hover:bg-soft"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="text-lg">{p.avatar || "🧑"}</span>
                    <span className="truncate text-sm font-bold">{p.name || "默认人物"}</span>
                  </div>
                  {active && (
                    <span className="shrink-0 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      当前
                    </span>
                  )}
                </div>
                <div className="mt-1 truncate text-[11px] text-sub">
                  {stats || "待完善身高体重"}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-sub">
                  {p.goal || "未设目标"} · {ws.workouts.length}练 · {ws.meals.length}餐
                </div>
              </button>
            );
          })}
        </div>

        {creating && (
          <form
            onSubmit={handleCreateProfile}
            className="space-y-3 rounded-2xl border border-primary/30 bg-soft p-3"
          >
            <div className="text-xs font-bold text-primary">新建独立人物档案</div>
            <div className="flex flex-wrap gap-1.5">
              {AVATARS.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, avatar: av }))}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-lg ${
                    draft.avatar === av
                      ? "bg-primary/15 ring-2 ring-primary"
                      : "border border-line bg-white"
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-xs font-semibold text-sub">称呼 / 分类名</span>
                <input
                  className={`${input} mt-1 bg-white`}
                  placeholder="例如: 小美 / 老公 / 减脂期"
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                />
              </label>
              <div>
                <span className="text-xs font-semibold text-sub">性别</span>
                <div className="mt-1 grid grid-cols-3 gap-1">
                  {GENDERS.map((g) => (
                    <button
                      key={g.label}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, gender: g.id }))}
                      className={`rounded-xl py-2.5 text-xs font-semibold ${
                        draft.gender === g.id
                          ? "bg-primary text-white"
                          : "border border-line bg-white text-sub"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <label className="block">
                <span className="text-xs font-semibold text-sub">年龄</span>
                <input
                  className={`${input} mt-1 bg-white`}
                  inputMode="numeric"
                  placeholder="26"
                  value={draft.age}
                  onChange={(e) => setDraft((d) => ({ ...d, age: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-sub">身高 cm</span>
                <input
                  className={`${input} mt-1 bg-white`}
                  inputMode="numeric"
                  placeholder="165"
                  value={draft.heightCm}
                  onChange={(e) => setDraft((d) => ({ ...d, heightCm: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-sub">体重 kg</span>
                <input
                  className={`${input} mt-1 bg-white`}
                  inputMode="numeric"
                  placeholder="55"
                  value={draft.weightKg}
                  onChange={(e) => setDraft((d) => ({ ...d, weightKg: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-sub">每周几次</span>
                <input
                  className={`${input} mt-1 bg-white`}
                  inputMode="numeric"
                  placeholder="3"
                  value={draft.daysPerWeek}
                  onChange={(e) => setDraft((d) => ({ ...d, daysPerWeek: e.target.value }))}
                />
              </label>
            </div>
            <div>
              <span className="text-xs font-semibold text-sub">健身目标</span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {GOALS.map((g) => {
                  const on = draft.goal.split("、").includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        const cur = draft.goal.split("、").filter(Boolean);
                        setDraft((d) => ({
                          ...d,
                          goal: (on ? cur.filter((x) => x !== g) : [...cur, g]).join("、"),
                        }));
                      }}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        on ? "bg-primary text-white" : "border border-line bg-white"
                      }`}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-sub">
              <input
                type="checkbox"
                checked={draft.copyEquipment}
                onChange={(e) => setDraft((d) => ({ ...d, copyEquipment: e.target.checked }))}
              />
              复制当前人物的健身房器械配置（在同一家健身房练时很方便）
            </label>
            <button type="submit" className={btnPrimary}>
              创建并切换到该人物
            </button>
          </form>
        )}
      </Card>

      {/* Active profile editor */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-bold">
            {profile.avatar || "🧑"} {profile.name || "默认人物"} · 基本资料
          </div>
          {profiles.length > 1 && (
            <button
              type="button"
              onClick={handleDeleteCurrent}
              className="text-xs font-semibold text-sub underline"
            >
              删除此人物
            </button>
          )}
        </div>

        <div>
          <span className="text-xs font-semibold text-sub">头像图标</span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {AVATARS.map((av) => (
              <button
                key={av}
                type="button"
                onClick={() => set({ avatar: av })}
                className={`flex h-9 w-9 items-center justify-center rounded-full text-lg ${
                  (profile.avatar || "🧑") === av
                    ? "bg-primary/15 ring-2 ring-primary"
                    : "border border-line bg-white"
                }`}
              >
                {av}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {field("name", "怎么称呼这个人物", "例如: 小美 / 阿杰")}
          <div>
            <span className="text-xs font-semibold text-sub">性别（用于 BMR 计算）</span>
            <div className="mt-1 grid grid-cols-3 gap-1">
              {GENDERS.map((g) => (
                <button
                  key={g.label}
                  type="button"
                  onClick={() => set({ gender: g.id })}
                  className={`rounded-xl py-2.5 text-xs font-semibold ${
                    (profile.gender ?? "") === g.id
                      ? "bg-primary text-white"
                      : "border border-line bg-white text-sub"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {field("age", "年龄", "26", "numeric")}
          {field("heightCm", "身高 cm", "165", "numeric")}
          {field("weightKg", "体重 kg", "55", "numeric")}
          {field("daysPerWeek", "每周几次", "3", "numeric")}
        </div>

        <div>
          <span className="text-xs font-semibold text-sub">健身目标（决定训练侧重与每日热量盈亏）</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {GOALS.map((g) => {
              const on = profile.goal.split("、").includes(g);
              return (
                <button
                  key={g}
                  aria-pressed={on}
                  onClick={() => {
                    const cur = profile.goal.split("、").filter(Boolean);
                    set({
                      goal: (on ? cur.filter((x) => x !== g) : [...cur, g]).join("、"),
                    });
                  }}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                    on ? "bg-primary text-white" : "border border-line bg-white"
                  }`}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-sub">健身经验</span>
          <select
            className={`${input} mt-1`}
            value={profile.level}
            onChange={(e) => set({ level: e.target.value })}
          >
            <option>新手(刚开始健身)</option>
            <option>练过几个月</option>
            <option>规律训练一年以上</option>
          </select>
        </label>

        {field("injuries", "伤病或要注意的地方", "例如:右膝旧伤、腰不太好;没有就留空")}
      </Card>

      {/* Auto-calculated nutrition target based on height, weight, gender, age, frequency, goal */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-bold">🥗 专属每日进食目标（随身高体重自动计算）</div>
          <span className="rounded-full bg-soft px-2 py-0.5 text-[11px] font-semibold text-sub">
            {target.missingBodyStats ? "默认参考值" : "已按身体数据计算"}
          </span>
        </div>

        {target.missingBodyStats ? (
          <p className="text-xs leading-relaxed text-sub">
            上面还没有填完整身高/体重（建议再选性别与年龄），目前暂按通用参考值展示；填好后会立即根据你的体重（kg）、身高（cm）、训练频率和目标自动算出每日进食目标。
          </p>
        ) : (
          <p className="text-xs leading-relaxed text-sub">
            基础代谢 BMR <b className="text-ink">{target.bmr} kcal</b> · 每日总消耗 TDEE{" "}
            <b className="text-ink">{target.tdee} kcal</b> · 按「{profile.goal || "保持健康"}」目标推荐每日摄入：
          </p>
        )}

        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="rounded-xl bg-soft p-2.5">
            <div className="text-base font-bold text-primary">{target.calories}</div>
            <div className="text-[11px] text-sub">热量 kcal</div>
          </div>
          <div className="rounded-xl bg-soft p-2.5">
            <div className="text-base font-bold">{target.protein}g</div>
            <div className="text-[11px] text-sub">蛋白质</div>
          </div>
          <div className="rounded-xl bg-soft p-2.5">
            <div className="text-base font-bold">{target.carbs}g</div>
            <div className="text-[11px] text-sub">碳水</div>
          </div>
          <div className="rounded-xl bg-soft p-2.5">
            <div className="text-base font-bold">{target.fat}g</div>
            <div className="text-[11px] text-sub">脂肪</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Link href="/food" className={btnSoft}>
            🥗 去记今日饮食
          </Link>
          <Link href="/history?tab=food" className={btnSoft}>
            📋 看饮食历史记录
          </Link>
        </div>
      </Card>

      <Card className="space-y-3">
        {otherProfilesWithEquipment.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-soft px-3 py-2 text-xs">
            <span className="text-sub">和另一位用同一家健身房？</span>
            <div className="flex flex-wrap gap-1.5">
              {otherProfilesWithEquipment.map((other) => (
                <button
                  key={other.profile.id}
                  type="button"
                  onClick={() => set({ equipment: other.profile.equipment })}
                  className="rounded-lg border border-line bg-white px-2.5 py-1 font-semibold text-primary active:bg-soft"
                >
                  复制「{other.profile.name || "其他人物"}」器械
                </button>
              ))}
            </div>
          </div>
        )}
        <EquipmentSelector
          value={profile.equipment}
          onChange={(equipment) => set({ equipment })}
        />
      </Card>

      <Card>
        <div className="text-sm font-semibold">🧠 教练记住的事（仅当前人物）</div>
        {profile.memory.length === 0 ? (
          <p className="mt-1 text-sm text-sub">
            聊天时提到的长期信息(比如“我不喜欢跑步”),教练会记在这里，并只作用于当前人物。
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {profile.memory.map((m, i) => (
              <li key={i} className="flex items-start justify-between gap-2 text-sm">
                <span>• {m}</span>
                <button
                  className="shrink-0 text-xs text-sub underline"
                  onClick={() => set({ memory: profile.memory.filter((_, j) => j !== i) })}
                >
                  忘掉
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="text-sm font-semibold">⌚ 手表数据(荣耀 / 华为 / Apple Watch 等)</div>
        <p className="mt-1 text-sm leading-relaxed text-sub">
          练完后在手表配套的运动健康 App 里打开这次运动,截一张图;在结束训练时点“上传手表截图”,教练会自动读出时长、卡路里和心率并存进这次记录。也可以手动填。
        </p>
      </Card>

      <Card className="space-y-3">
        <div className="text-sm font-semibold">🔑 访问口令</div>
        <p className="text-sm text-sub">如果部署时设置了口令,在这里填一次,AI 教练和营养师才能用。</p>
        <input
          className={input}
          type="password"
          placeholder="没有设置就留空"
          value={profile.passcode}
          onChange={(e) => set({ passcode: e.target.value })}
        />
      </Card>

      <Card className="space-y-2">
        <div className="text-sm font-semibold">💾 数据备份</div>
        <p className="text-sm text-sub">
          当前共有 {profiles.length} 个人物档案（当前人物：{workouts.length} 次训练 · {meals.length} 条饮食 · 共享 {customExercises.length} 个自导入动作），数据只保存在这台设备的浏览器里。换手机或清理浏览器数据前,记得先导出整份备份。
        </p>
        <div className="flex gap-2">
          <button className={`${btnGhost} flex-1`} onClick={exportData}>
            导出备份
          </button>
          <button className={`${btnGhost} flex-1`} onClick={() => fileRef.current?.click()}>
            导入备份
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importData(f);
            e.target.value = "";
          }}
        />
      </Card>
    </div>
  );
}
