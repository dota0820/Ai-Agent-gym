"use client";
import { useRef } from "react";
import { btnGhost, Card, H1, input } from "@/components/ui";
import { EMPTY, getState, setState, useApp, useHydrated } from "@/lib/store";
import type { Profile } from "@/lib/types";

const GOALS = ["减脂", "增肌塑形", "练翘臀", "改善体态", "保持健康"];

export default function Me() {
  const { profile, workouts } = useApp();
  const ready = useHydrated();
  const fileRef = useRef<HTMLInputElement>(null);
  if (!ready) return null;
  const set = (patch: Partial<Profile>) =>
    setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));

  const field = (key: keyof Profile, label: string, placeholder = "", mode?: "numeric") => (
    <label className="block">
      <span className="text-xs font-semibold text-sub">{label}</span>
      <input
        className={`${input} mt-1`}
        placeholder={placeholder}
        inputMode={mode}
        value={profile[key] as string}
        onChange={(e) => set({ [key]: e.target.value })}
      />
    </label>
  );

  function exportData() {
    const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `健身记录-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importData(file: File) {
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.workouts) || !data.profile) throw new Error("bad");
      if (!confirm(`导入会覆盖现在的数据(备份里有 ${data.workouts.length} 次训练)。继续吗?`))
        return;
      setState(() => ({ ...EMPTY, ...data, profile: { ...EMPTY.profile, ...data.profile } }));
      alert("导入成功");
    } catch {
      alert("这个文件不是有效的备份文件。");
    }
  }

  return (
    <div className="space-y-4">
      <H1 sub="教练会根据这些信息来安排训练,填完自动保存">我的</H1>

      <Card className="space-y-3">
        {field("name", "怎么称呼你", "例如:小美")}
        <div>
          <span className="text-xs font-semibold text-sub">健身目标</span>
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
        <div className="grid grid-cols-3 gap-2">
          {field("daysPerWeek", "每周几次", "3", "numeric")}
          {field("heightCm", "身高 cm", "", "numeric")}
          {field("weightKg", "体重 kg", "", "numeric")}
        </div>
        {field("equipment", "健身房有什么器械", "例如:器械齐全 / 只有哑铃和跑步机")}
        {field("injuries", "伤病或要注意的地方", "例如:右膝旧伤、腰不太好;没有就留空")}
      </Card>

      <Card>
        <div className="text-sm font-semibold">🧠 教练记住的事</div>
        {profile.memory.length === 0 ? (
          <p className="mt-1 text-sm text-sub">
            聊天时提到的长期信息(比如“我不喜欢跑步”),教练会记在这里。
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
        <p className="text-sm text-sub">如果部署时设置了口令,在这里填一次,AI 教练才能用。</p>
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
          所有记录({workouts.length} 次训练)都只保存在这台手机的浏览器里。换手机或清理浏览器数据前,记得先导出备份。
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
