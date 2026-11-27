"use client";
/* eslint-disable @next/next/no-img-element */
import Icon from "@/components/Icon";
import NumInput from "@/components/NumInput";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import ProfileChip from "@/components/ProfileChip";
import { fileToJpegDataUrl } from "@/lib/actions";
import {
  computeNutritionTargets,
  defaultMealTypeForHour,
  fmtDateKey,
  localDateKey,
  mealsForDate,
  nutritionContextForCoach,
  shiftDateKey,
  sumMealMacros,
} from "@/lib/nutrition";
import {
  addMealLog,
  aiHeaders,
  removeMealLog,
  setState,
  uid,
  updateMealLog,
  useApp,
  useHydrated,
} from "@/lib/store";
import {
  MEAL_TYPES,
  type MealItem,
  type MealLog,
  type MealType,
} from "@/lib/types";
import { useDictation } from "@/lib/voice";
import { btnGhost, btnPrimary, Card, input } from "@/components/ui";

interface MealDraft {
  editingId?: string;
  loggedAt?: string;
  mealType: MealType;
  summary: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  items: MealItem[];
  advice?: string;
  image?: string;
}

function FoodContent() {
  const { meals, profile, workouts } = useApp();
  const searchParams = useSearchParams();
  const ready = useHydrated();

  const today = localDateKey();
  const rawDate = searchParams.get("date");
  const validParamDate =
    rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : null;
  const [dateKey, setDateKey] = useState(validParamDate ?? today);
  const lastParamDate = useRef(validParamDate);
  useEffect(() => {
    if (validParamDate && validParamDate !== lastParamDate.current) {
      setDateKey(validParamDate);
    }
    lastParamDate.current = validParamDate;
  }, [validParamDate]);
  const [mealType, setMealType] = useState<MealType>(() =>
    defaultMealTypeForHour(),
  );
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<{ full: string; thumb: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<MealDraft | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [editTargets, setEditTargets] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const dictPrefixRef = useRef("");
  const dictation = useDictation((t) => {
    const prefix = dictPrefixRef.current;
    setText(prefix ? `${prefix}${t}` : t);
  });

  if (!ready) return null;

  const targets = computeNutritionTargets(profile);
  const dayMeals = mealsForDate(meals, dateKey);
  const totals = sumMealMacros(dayMeals);
  const dayWorkouts = workouts.filter(
    (w) => localDateKey(w.startedAt) === dateKey,
  );
  const workoutCals = dayWorkouts.reduce(
    (n, w) => n + (w.watch?.calories ?? 0),
    0,
  );

  async function onPickPhoto(file: File) {
    setError("");
    try {
      const [full, thumb] = await Promise.all([
        fileToJpegDataUrl(file, 1440),
        fileToJpegDataUrl(file, 360),
      ]);
      setPhoto({ full, thumb });
    } catch {
      setError("这张照片打不开，换一张试试。");
    }
  }

  async function analyzeMeal() {
    if ((!text.trim() && !photo) || busy) return;
    setBusy(true);
    setError("");
    try {
      const genderLabel =
        profile.gender === "male"
          ? "男"
          : profile.gender === "female"
            ? "女"
            : "未知";
      const ctxLines = [
        `当前人物档案: ${profile.name || "默认人物"} (性别: ${genderLabel}, 年龄: ${profile.age || "?"}岁, 身高: ${profile.heightCm || "?"} cm, 体重: ${profile.weightKg || "?"} kg, 目标: ${profile.goal || "保持健康"}, 每周训练: ${profile.daysPerWeek || "?"} 次)`,
        dayWorkouts.length
          ? `当天训练: ${dayWorkouts.map((w) => w.title).join("、")}${workoutCals ? ` (手表消耗 ${workoutCals} kcal)` : ""}`
          : "当天暂未记录训练",
        nutritionContextForCoach(
          meals.filter((m) => localDateKey(m.loggedAt) === dateKey),
          profile,
        ),
      ].join("\n");

      const res = await fetch("/api/nutrition", {
        method: "POST",
        headers: aiHeaders(),
        body: JSON.stringify({
          text: text.trim() || undefined,
          image: photo?.full,
          mealType,
          context: ctxLines,
        }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j) {
        setError(j?.error ?? "分析失败，请再试一次。");
        return;
      }
      if (!j.is_food) {
        setError(
          "这看起来不太像食物或饮品哦，请拍餐食照片或文字描述吃了什么。",
        );
        return;
      }
      setDraft({
        mealType,
        summary: j.summary || text.trim() || "一餐饮食",
        calories: Math.round(j.total?.calories ?? 0),
        protein: Math.round((j.total?.protein ?? 0) * 10) / 10,
        carbs: Math.round((j.total?.carbs ?? 0) * 10) / 10,
        fat: Math.round((j.total?.fat ?? 0) * 10) / 10,
        items: Array.isArray(j.items) ? j.items : [],
        advice: j.advice,
        image: photo?.thumb,
      });
    } catch {
      setError("网络出错了，请稍后再试。");
    } finally {
      setBusy(false);
    }
  }

  function openManualDraft(type: MealType = mealType) {
    setError("");
    setManualMode(true);
    setMealType(type);
    setDraft({
      mealType: type,
      summary: text.trim() || "手动记录一餐",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      items: [],
      image: photo?.thumb,
    });
  }

  function startEditMeal(m: MealLog) {
    setError("");
    setManualMode(false);
    setDraft({
      editingId: m.id,
      loggedAt: m.loggedAt,
      mealType: m.mealType,
      summary: m.summary,
      calories: m.calories,
      protein: m.protein,
      carbs: m.carbs,
      fat: m.fat,
      items: m.items.map((x) => ({ ...x })),
      advice: m.advice,
      image: m.image,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function saveDraft() {
    if (!draft) return;
    const isToday = dateKey === today;
    const loggedAt =
      draft.loggedAt ??
      (isToday
        ? new Date().toISOString()
        : new Date(`${dateKey}T12:00:00`).toISOString());
    const meal: MealLog = {
      id: draft.editingId ?? uid(),
      loggedAt,
      mealType: draft.mealType,
      summary: draft.summary.trim() || "一餐饮食",
      calories: Math.max(0, Math.round(draft.calories)),
      protein: Math.max(0, Math.round(draft.protein * 10) / 10),
      carbs: Math.max(0, Math.round(draft.carbs * 10) / 10),
      fat: Math.max(0, Math.round(draft.fat * 10) / 10),
      items:
        draft.items.length > 0
          ? draft.items
          : [
              {
                name: draft.summary.trim() || "一餐饮食",
                calories: Math.max(0, Math.round(draft.calories)),
                protein: Math.max(0, Math.round(draft.protein * 10) / 10),
                carbs: Math.max(0, Math.round(draft.carbs * 10) / 10),
                fat: Math.max(0, Math.round(draft.fat * 10) / 10),
              },
            ],
      advice: draft.advice,
      image: draft.image,
      note: text.trim() || undefined,
    };
    if (draft.editingId) updateMealLog(meal);
    else addMealLog(meal);
    setDraft(null);
    setManualMode(false);
    setText("");
    setPhoto(null);
  }

  function updateItemMacro(
    idx: number,
    key: "calories" | "protein" | "carbs" | "fat",
    val: number,
  ) {
    if (!draft) return;
    const items = draft.items.map((it, i) =>
      i === idx ? { ...it, [key]: val } : it,
    );
    const calories = items.reduce((s, x) => s + (x.calories || 0), 0);
    const protein =
      Math.round(items.reduce((s, x) => s + (x.protein || 0), 0) * 10) / 10;
    const carbs =
      Math.round(items.reduce((s, x) => s + (x.carbs || 0), 0) * 10) / 10;
    const fat =
      Math.round(items.reduce((s, x) => s + (x.fat || 0), 0) * 10) / 10;
    setDraft({
      ...draft,
      items,
      calories: Math.round(calories),
      protein,
      carbs,
      fat,
    });
  }

  function updateTarget(
    key: "calories" | "protein" | "carbs" | "fat",
    raw: string,
  ) {
    const num = raw.trim() === "" ? null : Math.max(0, Number(raw));
    if (num !== null && isNaN(num)) return;
    setState((s) => ({
      ...s,
      profile: {
        ...s.profile,
        nutritionTarget: {
          ...s.profile.nutritionTarget,
          [key]: num,
        },
      },
    }));
  }

  const askCoachPrompt = `我现在已摄入 ${totals.calories} 千卡（蛋白质 ${totals.protein}g、碳水 ${totals.carbs}g、脂肪 ${totals.fat}g），目标是 ${targets.calories} 千卡、蛋白质 ${targets.protein}g。请根据我今天的状态建议下一餐吃什么好？`;

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between gap-2">
        <ProfileChip />
        <div className="flex shrink-0 items-center gap-1 rounded-full border border-line bg-card p-1 text-xs font-semibold">
          <button
            type="button"
            className="px-2 py-1 text-sub"
            aria-label="前一天"
            onClick={() => setDateKey(shiftDateKey(dateKey, -1))}
          >
            ‹
          </button>
          <span className="px-1">{fmtDateKey(dateKey)}</span>
          <button
            type="button"
            className="px-2 py-1 text-sub disabled:opacity-30"
            aria-label="后一天"
            disabled={dateKey >= today}
            onClick={() => setDateKey(shiftDateKey(dateKey, 1))}
          >
            ›
          </button>
        </div>
      </div>

      {/* energy hero */}
      <div className="relative overflow-hidden rounded-[28px] bg-forest p-5 text-white">
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[13px] font-bold">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            {dateKey === today
              ? "今日能量结算"
              : `${fmtDateKey(dateKey)}能量结算`}
          </span>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-primary">
            {totals.calories > targets.calories
              ? "已超出目标"
              : totals.calories
                ? "进行中"
                : "还没开始"}
          </span>
        </div>
        <div className="relative mt-4 flex items-baseline gap-2">
          <span className="display-num text-[48px] leading-none">
            {totals.calories.toLocaleString()}
          </span>
          <span className="text-[15px] text-white/60">
            / {targets.calories.toLocaleString()} kcal
          </span>
        </div>
        <p className="relative mt-2 text-[13px] text-white/75">
          还可摄入{" "}
          <span className="display-num text-[20px] text-primary">
            {Math.max(0, targets.calories - totals.calories).toLocaleString()}
          </span>{" "}
          kcal · 目标达成{" "}
          {Math.min(
            100,
            Math.round((totals.calories / Math.max(1, targets.calories)) * 100),
          )}
          %
        </p>
        <div className="relative mt-4 flex h-2.5 gap-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-primary"
            style={{
              width: `${Math.min(100, Math.round((totals.calories / Math.max(1, targets.calories)) * 100))}%`,
            }}
          />
          {workoutCals > 0 && (
            <div
              className="h-full rounded-full bg-white/40"
              style={{
                width: `${Math.min(30, Math.round((workoutCals / Math.max(1, targets.calories)) * 100))}%`,
              }}
            />
          )}
        </div>
        <div className="relative mt-2 flex justify-between text-[11px] text-white/65">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" />
            饮食摄入 {totals.calories} kcal
          </span>
          {workoutCals > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-white/40" />
              运动消耗 -{workoutCals} kcal
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            if (draft) setDraft(null);
            setTimeout(() => fileRef.current?.click(), 0);
          }}
          className="relative mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-[16px] font-bold text-forest shadow-[0_8px_24px_rgba(159,232,112,0.25)]"
        >
          <Icon name="camera" size={22} />
          AI 拍照识餐
        </button>
      </div>

      {/* macros */}
      <div className="lift space-y-4 rounded-[28px] bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-forest">
              <Icon name="nutrition" size={21} />
            </span>
            <h2 className="text-[17px] font-bold">三大营养素</h2>
          </div>
          <button
            type="button"
            className="rounded-full bg-bg px-3 py-1.5 text-[12px] font-bold text-forest"
            onClick={() => setEditTargets(!editTargets)}
          >
            {editTargets ? "完成" : "改目标"}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              ["蛋白质", totals.protein, targets.protein, "#2f6c00"],
              ["碳水", totals.carbs, targets.carbs, "#6fae45"],
              ["脂肪", totals.fat, targets.fat, "#9fe870"],
            ] as const
          ).map(([l, v, t, c]) => {
            const p = t ? Math.min(100, Math.round((v / t) * 100)) : 0;
            const gap = Math.round(t - v);
            return (
              <div key={l}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[12px] font-semibold text-sub">
                    {l}
                  </span>
                  <span className="text-[11px] font-bold" style={{ color: c }}>
                    {p}%
                  </span>
                </div>
                <div className="mt-1 flex items-baseline">
                  <span className="display-num text-[22px] leading-none text-forest">
                    {Math.round(v)}
                  </span>
                  <span className="text-[11px] text-sub">/{t}g</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${p}%`, background: c }}
                  />
                </div>
                <div
                  className={`mt-1.5 text-[11px] ${gap > 0 && l === "蛋白质" ? "font-bold text-deep" : "text-sub"}`}
                >
                  {gap > 0
                    ? `${l === "蛋白质" ? "缺口" : "余"} ${gap}g`
                    : "已达标"}
                </div>
              </div>
            );
          })}
        </div>

        {editTargets && (
          <div className="space-y-2 border-t border-line pt-3">
            <div className="flex items-center justify-between text-xs text-sub">
              <span>每日目标（留空自动算）</span>
              {targets.isCustom && (
                <button
                  type="button"
                  className="text-deep underline"
                  onClick={() =>
                    setState((s) => ({
                      ...s,
                      profile: { ...s.profile, nutritionTarget: undefined },
                    }))
                  }
                >
                  恢复默认
                </button>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  ["calories", "热量"],
                  ["protein", "蛋白"],
                  ["carbs", "碳水"],
                  ["fat", "脂肪"],
                ] as const
              ).map(([k, lbl]) => (
                <label key={k} className="block">
                  <span className="text-xs text-sub">{lbl}</span>
                  <input
                    className={`${input} mt-1 px-2 py-1.5 text-center text-sm`}
                    inputMode="numeric"
                    placeholder={String(targets[k])}
                    value={profile.nutritionTarget?.[k] ?? ""}
                    onChange={(e) => updateTarget(k, e.target.value)}
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-line pt-2.5 text-xs">
          {dayWorkouts.length > 0 ? (
            <span className="truncate font-semibold text-mint">
              已练：{dayWorkouts.map((w) => w.title).join("、")}
              {workoutCals > 0 ? ` · ${workoutCals} kcal` : ""}
            </span>
          ) : (
            <span className="text-sub">{fmtDateKey(dateKey)}摄入</span>
          )}
          <Link
            href={`/coach?q=${encodeURIComponent(askCoachPrompt)}`}
            className="shrink-0 font-semibold text-deep"
          >
            问下一餐 ›
          </Link>
        </div>
      </div>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[15px] font-bold">
            <Icon name="addPhoto" size={20} className="text-deep" />
            记一餐
          </div>
          {!draft && (
            <button
              type="button"
              className="text-xs font-semibold text-sub"
              onClick={() => openManualDraft()}
            >
              手动填
            </button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {MEAL_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setMealType(t.id);
                if (draft) setDraft({ ...draft, mealType: t.id });
              }}
              className={`rounded-xl py-2 text-xs font-semibold ${
                (draft ? draft.mealType : mealType) === t.id
                  ? "bg-forest text-white"
                  : "bg-bg text-ink"
              }`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {!draft ? (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onPickPhoto(f);
                e.target.value = "";
              }}
            />

            {photo && (
              <div className="flex items-center gap-3 rounded-2xl border border-line bg-bg p-2">
                <img
                  src={photo.thumb}
                  alt="食物照片"
                  className="h-14 w-14 rounded-xl object-cover"
                />
                <div className="flex-1 text-xs text-sub">
                  已选照片，可补说明
                </div>
                <button
                  type="button"
                  className="px-2 text-xs text-sub"
                  onClick={() => setPhoto(null)}
                >
                  移除
                </button>
              </div>
            )}

            <textarea
              className={`${input} min-h-[60px]`}
              rows={2}
              placeholder="拍食物或写吃了什么…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />

            <div className="flex gap-2">
              <button
                type="button"
                className={`${btnGhost} flex-1 text-sm`}
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                <Icon name="camera" size={18} className="mr-1.5" />
                {photo ? "换图" : "拍照"}
              </button>
              {dictation.supported && (
                <button
                  type="button"
                  className={`${btnGhost} px-4 text-sm ${dictation.listening ? "border-primary text-deep" : ""}`}
                  disabled={busy}
                  onClick={() => {
                    if (dictation.listening) {
                      dictation.stop();
                    } else {
                      dictPrefixRef.current = text.trim()
                        ? `${text.trim()} `
                        : "";
                      dictation.start();
                    }
                  }}
                >
                  <Icon
                    name={dictation.listening ? "stop" : "mic"}
                    size={18}
                    className="mr-1"
                  />
                  {dictation.listening ? "停止" : "语音"}
                </button>
              )}
              <button
                type="button"
                className={`${btnPrimary} flex-1 text-sm`}
                disabled={busy || (!text.trim() && !photo)}
                onClick={() => void analyzeMeal()}
              >
                <Icon name="sparkles" size={17} className="mr-1" />
                {busy ? "分析中…" : "AI 扫描"}
              </button>
            </div>

            {dictation.error && (
              <p className="text-xs text-deep">{dictation.error}</p>
            )}
            {error && (
              <div className="rounded-xl bg-primary-soft px-3 py-2 text-xs text-deep">
                {error}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3 border-t border-line pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-deep">
                {manualMode ? "手动记录" : "扫描结果"}
              </span>
              <button
                type="button"
                className="text-xs text-sub"
                onClick={() => {
                  setDraft(null);
                  setManualMode(false);
                }}
              >
                取消
              </button>
            </div>

            {draft.advice && (
              <div className="rounded-xl bg-mint-soft px-3 py-2 text-xs leading-relaxed text-mint">
                {draft.advice}
              </div>
            )}

            <label className="block">
              <span className="text-xs text-sub">餐名</span>
              <input
                className={`${input} mt-1`}
                value={draft.summary}
                onChange={(e) =>
                  setDraft({ ...draft, summary: e.target.value })
                }
              />
            </label>

            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  ["calories", "热量"],
                  ["protein", "蛋白 g"],
                  ["carbs", "碳水 g"],
                  ["fat", "脂肪 g"],
                ] as const
              ).map(([k, lbl]) => (
                <label key={k} className="block">
                  <span className="text-xs text-sub">{lbl}</span>
                  <NumInput
                    decimal={k !== "calories"}
                    className={`${input} mt-1 px-2 py-1.5 text-center text-sm font-semibold`}
                    value={draft[k]}
                    onChange={(v) => setDraft({ ...draft, [k]: v ?? 0 })}
                  />
                </label>
              ))}
            </div>

            {draft.items.length > 0 && (
              <details
                className="rounded-xl border border-line bg-bg px-3 py-2"
                open
              >
                <summary className="cursor-pointer text-xs font-semibold text-sub">
                  明细 ({draft.items.length})
                </summary>
                <div className="mt-2 space-y-2">
                  {draft.items.map((it, idx) => (
                    <div key={idx} className="rounded-xl bg-card p-2 text-xs">
                      <div className="font-semibold">
                        {it.name}
                        {it.portion ? (
                          <span className="ml-1 font-normal text-sub">
                            ({it.portion})
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                        {(
                          [
                            ["calories", "kcal"],
                            ["protein", "蛋白"],
                            ["carbs", "碳水"],
                            ["fat", "脂肪"],
                          ] as const
                        ).map(([k, u]) => (
                          <label key={k} className="block">
                            <span className="text-xs text-sub">{u}</span>
                            <NumInput
                              decimal={k !== "calories"}
                              className="w-full rounded-lg border border-line bg-bg px-1.5 py-1 text-center text-xs"
                              value={it[k]}
                              onChange={(v) => updateItemMacro(idx, k, v ?? 0)}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}

            <button
              type="button"
              className={`${btnPrimary} w-full`}
              onClick={saveDraft}
            >
              {draft.editingId ? "保存修改" : "保存"}
            </button>
          </div>
        )}
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between px-1 pt-1">
          <h2 className="text-[18px] font-bold">分餐记录</h2>
          <span className="text-[12px] font-semibold text-sub">
            {fmtDateKey(dateKey)} · {dayMeals.length} 餐
          </span>
        </div>

        {(["breakfast", "lunch", "snack", "dinner"] as const).map((type) => {
          const mt = MEAL_TYPES.find((x) => x.id === type)!;
          const list = dayMeals.filter((m) => m.mealType === type);
          const sum = sumMealMacros(list);
          const icon = (
            {
              breakfast: "sunrise",
              lunch: "sun",
              snack: "bolt",
              dinner: "moon",
            } as const
          )[type];
          if (!list.length) {
            return (
              <div
                key={type}
                className="rounded-[28px] border border-dashed border-line bg-bg p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-sub">
                    <Icon name={icon} size={21} />
                  </span>
                  <span className="flex-1 text-[16px] font-bold text-sub">
                    {mt.label}(待记录)
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      openManualDraft(type);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-forest text-[13px] font-bold text-white"
                  >
                    <Icon name="plus" size={18} />
                    录入{mt.label}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMealType(type);
                      if (draft) setDraft(null);
                      setTimeout(() => fileRef.current?.click(), 0);
                    }}
                    className="lift flex h-11 items-center justify-center gap-1.5 rounded-full bg-card text-[13px] font-bold text-forest"
                  >
                    <Icon name="camera" size={18} />
                    拍照录入
                  </button>
                </div>
              </div>
            );
          }
          return (
            <div
              key={type}
              className="lift space-y-3 rounded-[28px] bg-card p-4"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-forest">
                  <Icon name={icon} size={21} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[18px] font-bold text-forest">
                    {mt.label}
                  </div>
                  <div className="text-[12px] text-sub">
                    {list
                      .map((m) =>
                        new Date(m.loggedAt).toTimeString().slice(0, 5),
                      )
                      .join(" · ")}{" "}
                    记录
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline justify-end gap-1 text-forest">
                    <span className="display-num text-[24px] leading-none">
                      {sum.calories}
                    </span>
                    <span className="text-[12px]">kcal</span>
                  </div>
                  <div className="mt-1 text-[11px] font-bold text-deep">
                    蛋 {Math.round(sum.protein)}g · 碳 {Math.round(sum.carbs)}g
                  </div>
                </div>
              </div>
              {list.map((m) => (
                <div key={m.id} className="space-y-2 rounded-2xl bg-bg p-3">
                  <div className="flex items-start gap-3">
                    {m.image && (
                      <img
                        src={m.image}
                        alt={m.summary}
                        className="h-16 w-16 shrink-0 rounded-xl object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-bold">{m.summary}</div>
                      <div className="mt-0.5 text-[12px] text-sub tabular-nums">
                        {m.calories} kcal · 蛋白 {m.protein}g · 碳水 {m.carbs}g
                        · 脂肪 {m.fat}g
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="编辑"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card text-forest"
                      onClick={() => startEditMeal(m)}
                    >
                      <Icon name="pen" size={17} />
                    </button>
                  </div>
                  {m.items.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.items.map((it, idx) => (
                        <span
                          key={idx}
                          className="rounded-full bg-card px-2.5 py-1 text-[11px] font-semibold"
                        >
                          {it.name}
                          {it.portion ? ` ${it.portion}` : ""}
                        </span>
                      ))}
                    </div>
                  )}
                  {m.advice && (
                    <p className="rounded-xl bg-primary-soft px-3 py-2 text-[12px] leading-relaxed text-forest">
                      {m.advice}
                    </p>
                  )}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="text-[11px] text-sub underline"
                      onClick={() => {
                        if (confirm(`删除「${m.summary}」这条饮食记录？`))
                          removeMealLog(m.id);
                      }}
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </section>
    </div>
  );
}

export default function FoodPage() {
  return (
    <Suspense fallback={null}>
      <FoodContent />
    </Suspense>
  );
}
