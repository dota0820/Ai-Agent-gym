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
import { MEAL_TYPES, type MealItem, type MealLog, type MealType } from "@/lib/types";
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

function MacroBar({
  label,
  val,
  target,
  unit,
  barColor,
}: {
  label: string;
  val: number;
  target: number;
  unit: string;
  barColor: string;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((val / target) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-semibold text-ink">{label}</span>
        <span className="tabular-nums text-sub">
          <strong className="text-ink">{Math.round(val)}</strong> / {target} {unit}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-bg">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function FoodContent() {
  const { meals, profile, workouts } = useApp();
  const searchParams = useSearchParams();
  const ready = useHydrated();

  const today = localDateKey();
  const rawDate = searchParams.get("date");
  const validParamDate = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : null;
  const [dateKey, setDateKey] = useState(validParamDate ?? today);
  const lastParamDate = useRef(validParamDate);
  useEffect(() => {
    if (validParamDate && validParamDate !== lastParamDate.current) {
      setDateKey(validParamDate);
    }
    lastParamDate.current = validParamDate;
  }, [validParamDate]);
  const [mealType, setMealType] = useState<MealType>(() => defaultMealTypeForHour());
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<{ full: string; thumb: string } | null>(null);
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
  const dayWorkouts = workouts.filter((w) => localDateKey(w.startedAt) === dateKey);
  const workoutCals = dayWorkouts.reduce((n, w) => n + (w.watch?.calories ?? 0), 0);

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
        profile.gender === "male" ? "男" : profile.gender === "female" ? "女" : "未知";
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
        setError("这看起来不太像食物或饮品哦，请拍餐食照片或文字描述吃了什么。");
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

  function openManualDraft() {
    setError("");
    setManualMode(true);
    setDraft({
      mealType,
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
      (isToday ? new Date().toISOString() : new Date(`${dateKey}T12:00:00`).toISOString());
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

  function updateItemMacro(idx: number, key: "calories" | "protein" | "carbs" | "fat", val: number) {
    if (!draft) return;
    const items = draft.items.map((it, i) => (i === idx ? { ...it, [key]: val } : it));
    const calories = items.reduce((s, x) => s + (x.calories || 0), 0);
    const protein = Math.round(items.reduce((s, x) => s + (x.protein || 0), 0) * 10) / 10;
    const carbs = Math.round(items.reduce((s, x) => s + (x.carbs || 0), 0) * 10) / 10;
    const fat = Math.round(items.reduce((s, x) => s + (x.fat || 0), 0) * 10) / 10;
    setDraft({ ...draft, items, calories: Math.round(calories), protein, carbs, fat });
  }

  function updateTarget(key: "calories" | "protein" | "carbs" | "fat", raw: string) {
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

      <Card className="space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="num flex items-baseline gap-1.5 leading-none">
            <span className="text-5xl font-bold tracking-tight text-ink">{totals.calories}</span>
            <span className="text-lg font-semibold text-sub">/ {targets.calories}</span>
            <span className="text-xs font-semibold text-sub">kcal</span>
          </div>
          <button
            type="button"
            className="mt-1 rounded-full bg-bg px-3 py-1 text-xs font-semibold text-sub"
            onClick={() => setEditTargets(!editTargets)}
          >
            {editTargets ? "完成" : "目标"}
          </button>
        </div>

        <div className="h-2.5 overflow-hidden rounded-full bg-bg">
          <div
            className={`h-full rounded-full transition-all ${
              totals.calories > targets.calories * 1.1 ? "bg-amber-500" : "bg-primary"
            }`}
            style={{
              width: `${Math.min(100, Math.round((totals.calories / Math.max(1, targets.calories)) * 100))}%`,
            }}
          />
        </div>

        <div className="space-y-2.5">
          <MacroBar label="蛋白质" val={totals.protein} target={targets.protein} unit="g" barColor="bg-[#2563eb]" />
          <MacroBar label="碳水" val={totals.carbs} target={targets.carbs} unit="g" barColor="bg-amber-500" />
          <MacroBar label="脂肪" val={totals.fat} target={targets.fat} unit="g" barColor="bg-[#9333ea]" />
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
                  <span className="text-[11px] text-sub">{lbl}</span>
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
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm font-bold">
            <Icon name="camera" size={16} className="text-deep" />
            拍照扫描
          </div>
          {!draft && (
            <button
              type="button"
              className="text-xs font-semibold text-sub"
              onClick={openManualDraft}
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
                  ? "bg-primary text-white"
                  : "border border-line bg-bg text-ink"
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
                <img src={photo.thumb} alt="食物照片" className="h-14 w-14 rounded-xl object-cover" />
                <div className="flex-1 text-xs text-sub">已选照片，可补说明</div>
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
                      dictPrefixRef.current = text.trim() ? `${text.trim()} ` : "";
                      dictation.start();
                    }
                  }}
                >
                  <Icon name={dictation.listening ? "stop" : "mic"} size={18} className="mr-1" />
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

            {dictation.error && <p className="text-xs text-deep">{dictation.error}</p>}
            {error && (
              <div className="rounded-xl bg-primary-soft px-3 py-2 text-xs text-deep">{error}</div>
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
                onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
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
                  <span className="text-[11px] text-sub">{lbl}</span>
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
              <details className="rounded-xl border border-line bg-bg px-3 py-2" open>
                <summary className="cursor-pointer text-xs font-semibold text-sub">
                  明细 ({draft.items.length})
                </summary>
                <div className="mt-2 space-y-2">
                  {draft.items.map((it, idx) => (
                    <div key={idx} className="rounded-xl bg-card p-2 text-xs">
                      <div className="font-semibold">
                        {it.name}
                        {it.portion ? <span className="ml-1 font-normal text-sub">({it.portion})</span> : null}
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
                            <span className="text-[10px] text-sub">{u}</span>
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

            <button type="button" className={`${btnPrimary} w-full`} onClick={saveDraft}>
              {draft.editingId ? "保存修改" : "保存"}
            </button>
          </div>
        )}
      </Card>

      <section className="space-y-2.5">
        <div className="text-xs font-semibold text-sub">
          {fmtDateKey(dateKey)} · {dayMeals.length} 餐
        </div>

        {dayMeals.length === 0 ? (
          <Card>
            <p className="py-2 text-center text-sm text-sub">暂无记录</p>
          </Card>
        ) : (
          dayMeals.map((m) => {
            const mt = MEAL_TYPES.find((x) => x.id === m.mealType) ?? MEAL_TYPES[3];
            const time = new Date(m.loggedAt).toTimeString().slice(0, 5);
            return (
              <Card key={m.id} className="space-y-2">
                <div className="flex items-start gap-3">
                  {m.image && (
                    <img
                      src={m.image}
                      alt={m.summary}
                      className="h-16 w-16 shrink-0 rounded-xl object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-deep">
                        {mt.emoji} {mt.label} · {time}
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="min-h-8 text-xs font-semibold text-deep"
                          onClick={() => startEditMeal(m)}
                        >
                          编辑
                        </button>
                        <button
                          type="button"
                          className="min-h-8 text-xs text-sub underline"
                          onClick={() => {
                            if (confirm(`删除「${m.summary}」这条饮食记录？`)) {
                              removeMealLog(m.id);
                            }
                          }}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                    <div className="mt-1 font-bold">{m.summary}</div>
                    <div className="mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5 text-xs text-sub tabular-nums">
                      <span className="font-semibold text-ink">{m.calories} kcal</span>
                      <span>蛋白 {m.protein}g</span>
                      <span>碳水 {m.carbs}g</span>
                      <span>脂肪 {m.fat}g</span>
                    </div>
                  </div>
                </div>

                {m.advice && (
                  <p className="rounded-xl bg-mint-soft px-3 py-2 text-xs leading-relaxed text-mint">
                    {m.advice}
                  </p>
                )}

                {m.items.length > 1 && (
                  <details className="text-xs text-sub">
                    <summary className="cursor-pointer font-semibold">
                      查看单品明细 ({m.items.length})
                    </summary>
                    <ul className="mt-1.5 space-y-1 pl-2">
                      {m.items.map((it, idx) => (
                        <li key={idx} className="flex justify-between gap-2">
                          <span>
                            • {it.name}
                            {it.portion ? ` (${it.portion})` : ""}
                          </span>
                          <span className="shrink-0 tabular-nums">
                            {it.calories} kcal · 蛋{it.protein} / 碳{it.carbs} / 脂{it.fat}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </Card>
            );
          })
        )}
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
