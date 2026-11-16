"use client";
import { useSyncExternalStore } from "react";
import { formatGymsContext } from "./equipment";
import { allExerciseNamesForPrompt, findExerciseById } from "./exercise-lookup";
import { customExerciseFromGuide, guideFromCoach } from "./custom-exercise";
import { nutritionContextForCoach } from "./nutrition";
import { parseRepRange, targetRirWords } from "./rir";
import {
  addCustomExercise,
  addMealLog,
  aiHeaders,
  getState,
  historyForCoach,
  lastPerformance,
  setsSummary,
  setState,
  setStateForProfile,
  uid,
} from "./store";
import type { ChatMsg, Guide, MealLog, Plan, Workout, WorkoutExercise } from "./types";

// ───────── workouts ─────────

function firstNumber(s?: string): number | null {
  const m = s ? /(\d+(?:\.\d+)?)/.exec(s) : null;
  return m ? Number(m[1]) : null;
}

export function newExercise(
  base: {
    exerciseId?: string;
    name: string;
    nameEn?: string;
    custom?: Guide;
  },
  opts: {
    sets?: number;
    reps?: string;
    restSec?: number;
    weight?: string;
    note?: string;
    targetRir?: number;
  } = {},
): WorkoutExercise {
  const last = lastPerformance(getState().workouts, base);
  const lastDone = last?.exercise.sets.filter((s) => s.done) ?? [];
  const n = opts.sets ?? (lastDone.length || 3);
  const planned = /kg|公斤/i.test(opts.weight ?? "") ? firstNumber(opts.weight) : null;
  return {
    ...base,
    target: opts.reps
      ? `${n} 组 × ${opts.reps}${opts.weight ? ` · ${opts.weight}` : ""}${
          opts.targetRir != null ? ` · ${targetRirWords(opts.targetRir)}` : ""
        }`
      : undefined,
    targetRir: opts.targetRir,
    repRange: parseRepRange(opts.reps),
    restSec: opts.restSec ?? 75,
    note: opts.note,
    sets: Array.from({ length: n }, (_, i) => ({
      weight: planned ?? lastDone[Math.min(i, lastDone.length - 1)]?.weight ?? null,
      reps: null,
      done: false,
    })),
  };
}

export function startFromPlan(plan: Plan) {
  const w: Workout = {
    id: uid(),
    title: plan.title,
    focus: plan.focus,
    startedAt: new Date().toISOString(),
    exercises: plan.items.map((it) =>
      newExercise(
        { exerciseId: it.exerciseId, name: it.name, nameEn: it.nameEn, custom: it.custom },
        {
          sets: it.sets,
          reps: it.reps,
          restSec: it.restSec,
          weight: it.weight,
          note: it.note,
          targetRir: it.targetRir,
        },
      ),
    ),
  };
  setState((s) => ({ ...s, active: w }));
}

export function startFree() {
  setState((s) => ({
    ...s,
    active: {
      id: uid(),
      title: "自由训练",
      focus: "自由",
      startedAt: new Date().toISOString(),
      exercises: [],
    },
  }));
}

/** Starts a new session with the same exercises as an earlier one (weights prefilled from it). */
export function repeatWorkout(w: Workout) {
  const next: Workout = {
    id: uid(),
    title: w.title,
    focus: w.focus,
    startedAt: new Date().toISOString(),
    exercises: w.exercises.map((e) => ({
      ...newExercise(
        { exerciseId: e.exerciseId, name: e.name, nameEn: e.nameEn, custom: e.custom },
        {
          sets: e.sets.filter((s) => s.done).length || e.sets.length,
          restSec: e.restSec,
          targetRir: e.targetRir,
        },
      ),
      repRange: e.repRange,
      target: e.target,
    })),
  };
  setState((s) => ({ ...s, active: next }));
}

// ───────── coach chat ─────────

let busy = false;
const busyListeners = new Set<() => void>();
function setBusy(b: boolean) {
  busy = b;
  busyListeners.forEach((l) => l());
}
export function useCoachBusy() {
  return useSyncExternalStore(
    (l) => {
      busyListeners.add(l);
      return () => busyListeners.delete(l);
    },
    () => busy,
    () => false,
  );
}

function buildContext(): string {
  const s = getState();
  const p = s.profile;
  const now = new Date();
  const genderLabel = p.gender === "male" ? "男" : p.gender === "female" ? "女" : "(未填)";
  const lines = [
    `今天是 ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")},星期${"日一二三四五六"[now.getDay()]}。`,
    "",
    `## 当前人物档案: ${p.avatar || "🧑"} ${p.name || "默认人物"} (ID: ${p.id})`,
    "说明: 以下所有记忆、计划、训练记录、饮食记录均仅属于当前人物档案。所有训练安排、重量建议和营养指导必须严格匹配此人物的身体数据与目标。",
    `称呼: ${p.name || "(未填)"}`,
    `性别 / 年龄: ${genderLabel} / ${p.age ? `${p.age} 岁` : "(未填)"}`,
    `目标: ${p.goal || "(未填)"}`,
    `经验: ${p.level || "(未填)"}`,
    `每周计划去健身房: ${p.daysPerWeek || "?"} 次`,
    `身高/体重: ${p.heightCm || "?"} cm / ${p.weightKg || "?"} kg`,
    `健身房环境与器械:\n${formatGymsContext(p)}`,
    `伤病/注意事项: ${p.injuries || "(无)"}`,
    "",
    "## 你之前记住的事",
    p.memory.length ? p.memory.map((m) => `- ${m}`).join("\n") : "(暂无)",
    "",
    "## App 里当前的计划",
    s.plan
      ? `${s.plan.title}(${s.plan.createdAt.slice(0, 10)} 制定): ${s.plan.items
          .map((i) => `${i.name} ${i.sets}×${i.reps}${i.weight ? ` ${i.weight}` : ""}`)
          .join(";")}`
      : "(暂无)",
    s.active
      ? `\n用户此刻正在进行一次训练「${s.active.title}」(还没保存),目前的进度:\n${
          s.active.exercises
            .map((e) => {
              const done = e.sets.filter((x) => x.done).length;
              return `- ${e.name}${e.exerciseId ? ` [${e.exerciseId}]` : ""}: ${
                done ? setsSummary(e) : "还没开始"
              }(已完成 ${done}/${e.sets.length} 组)`;
            })
            .join("\n") || "(还没有添加动作)"
        }`
      : "",
    "",
    "## 最近的训练记录(新的在前)",
    historyForCoach(s.workouts),
    "",
    "## 用户自定义的动作库",
    allExerciseNamesForPrompt(s.customExercises),
    "",
    "## 今日饮食与营养师参考目标",
    nutritionContextForCoach(s.meals, p),
  ];
  return lines.join("\n");
}

function historyForApi(chat: ChatMsg[]) {
  const msgs = chat
    .slice(-24)
    .map((m) => {
      let text = m.text.trim();
      if (m.plan)
        text += `\n[已保存计划「${m.plan.title}」: ${m.plan.items
          .map((i) => `${i.name} ${i.sets}×${i.reps}`)
          .join(";")}]`;
      if (m.logged) text += `\n[已记录训练: ${m.logged}]`;
      if (m.mealLogged) text += `\n[已记录饮食: ${m.mealLogged}]`;
      if (m.image !== undefined) text += "\n[用户在这条消息里发了一张照片]";
      return { role: m.role, text: text.trim() };
    })
    .filter((m) => m.text);
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  return msgs;
}

const CHOICES_RE = /<choices>([\s\S]*?)<\/choices>/gi;

/** Text with the coach's <choices> line (complete or still streaming) removed. */
export function visibleText(raw: string): string {
  let t = raw.replace(CHOICES_RE, "");
  const open = t.search(/<choices/i);
  if (open >= 0) t = t.slice(0, open);
  // a tag that has only partly arrived, e.g. "<cho"
  const m = /<[a-z]{0,7}$/i.exec(t);
  if (m && "<choices".startsWith(m[0].toLowerCase())) t = t.slice(0, m.index);
  return t.trim();
}

function extractChoices(raw: string): string[] {
  const all = [...raw.matchAll(CHOICES_RE)];
  const last = all[all.length - 1];
  if (!last) return [];
  return last[1]
    .split(/[|｜\n]/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 4);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function toPlan(p: any): Plan {
  const customExercises = getState().customExercises;
  return {
    id: uid(),
    title: p.title,
    focus: p.focus,
    note: p.note,
    createdAt: new Date().toISOString(),
    items: (p.exercises ?? []).map((e: any) => {
      const lib = findExerciseById(e.exercise_id, customExercises);
      const c = e.custom_instructions;
      return {
        exerciseId: lib ? lib.id : undefined,
        name: lib ? lib.name : e.name,
        nameEn: lib ? lib.nameEn : e.name_en,
        sets: e.sets,
        reps: e.reps,
        restSec: e.rest_seconds,
        weight: e.suggested_weight,
        note: e.coach_note,
        targetRir: typeof e.target_rir === "number" ? e.target_rir : undefined,
        custom: !lib && c ? guideFromCoach(c) : undefined,
      };
    }),
  };
}

function toWorkout(w: any): Workout {
  const customExercises = getState().customExercises;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(w.date) ? new Date(`${w.date}T12:00:00`) : new Date();
  const iso = (isNaN(d.getTime()) ? new Date() : d).toISOString();
  return {
    id: uid(),
    title: w.title,
    focus: w.focus,
    startedAt: iso,
    endedAt: iso,
    notes: w.notes,
    exercises: (w.exercises ?? []).map((e: any) => {
      const lib = findExerciseById(e.exercise_id, customExercises);
      return {
        exerciseId: lib?.id,
        name: lib ? lib.name : e.name,
        nameEn: lib?.nameEn,
        sets: (e.sets ?? []).map((s: any) => ({
          weight: s.weight_kg ?? null,
          reps: s.reps ?? null,
          rir: typeof s.rir === "number" ? Math.max(0, Math.min(4, s.rir)) : null,
          done: true,
        })),
      };
    }),
  };
}

function toMeal(m: any): MealLog {
  const calories = Math.max(0, Math.round(Number(m.calories) || 0));
  const protein = Math.max(0, Math.round((Number(m.protein) || 0) * 10) / 10);
  const carbs = Math.max(0, Math.round((Number(m.carbs) || 0) * 10) / 10);
  const fat = Math.max(0, Math.round((Number(m.fat) || 0) * 10) / 10);
  return {
    id: uid(),
    loggedAt: new Date().toISOString(),
    mealType: m.meal_type ?? "snack",
    summary: m.summary || "一餐饮食",
    calories,
    protein,
    carbs,
    fat,
    items: [
      {
        name: m.summary || "一餐饮食",
        calories,
        protein,
        carbs,
        fat,
      },
    ],
    advice: m.advice,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const MAX_THUMBS = 8;

export async function sendToCoach(text: string, photo?: { full: string; thumb: string }) {
  text = text.trim() || (photo ? "帮我看看这张照片" : "");
  if (!text || busy) return;
  const targetProfileId = getState().activeProfileId;
  setBusy(true);
  const ts = new Date().toISOString();
  const aid = uid();
  const patchTargetMsg = (fn: (m: ChatMsg) => ChatMsg) =>
    setStateForProfile(targetProfileId, (ws) => ({
      ...ws,
      chat: ws.chat.map((m) => (m.id === aid ? fn(m) : m)),
    }));
  const initialContext = buildContext();

  setStateForProfile(targetProfileId, (ws) => ({
    ...ws,
    chat: [
      ...ws.chat,
      { id: uid(), role: "user", text, ts, image: photo?.thumb },
      { id: aid, role: "assistant", text: "", ts },
    ],
  }));
  if (photo) {
    // keep storage small: only the most recent photos keep their thumbnail
    setStateForProfile(targetProfileId, (ws) => {
      let kept = 0;
      const chat = [...ws.chat].reverse().map((m) => {
        if (!m.image) return m;
        kept++;
        return kept > MAX_THUMBS ? { ...m, image: "" } : m;
      });
      return { ...ws, chat: chat.reverse() };
    });
  }
  const fail = (msg: string) =>
    patchTargetMsg((m) => ({ ...m, text: (m.text ? m.text + "\n\n" : "") + `⚠️ ${msg}` }));

  // Which step failed decides what we tell the user.
  let stage: "send" | "stream" = "send";
  let received = false;
  try {
    const s = getState();
    const targetWs = s.profiles.find((p) => p.profile.id === targetProfileId);
    const chatSnapshot = targetWs ? targetWs.chat : s.chat;
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: aiHeaders(),
      body: JSON.stringify({
        messages: historyForApi(chatSnapshot.filter((m) => m.id !== aid)),
        context: initialContext,
        image: photo?.full,
      }),
    });
    if (!res.ok || !res.body) {
      const j = await res.json().catch(() => null);
      fail(
        j?.error ??
          (res.status === 413
            ? "照片或内容太大了,换一张小一点的照片再试。"
            : res.status === 504 || res.status === 408
              ? "教练想得太久,服务器超时了。请再发一次,或把问题说短一点。"
              : `服务器出错了(${res.status}),请稍后再试。`),
      );
      return;
    }
    stage = "stream";
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    const handle = (line: string) => {
      if (!line.trim()) return;
      let ev;
      try {
        ev = JSON.parse(line);
      } catch {
        return; // a cut-off line at the end of a broken stream
      }
      received = true;
      try {
        if (ev.type === "text") {
          patchTargetMsg((m) => ({ ...m, text: m.text + ev.text }));
        } else if (ev.type === "plan") {
          const plan = toPlan(ev.plan);
          setStateForProfile(targetProfileId, (ws) => ({ ...ws, plan }));
          patchTargetMsg((m) => ({ ...m, plan }));
        } else if (ev.type === "workout") {
          const w = toWorkout(ev.workout);
          setStateForProfile(targetProfileId, (ws) => ({ ...ws, workouts: [...ws.workouts, w] }));
          patchTargetMsg((m) => ({ ...m, logged: w.title }));
        } else if (ev.type === "meal") {
          const meal = toMeal(ev.meal);
          addMealLog(meal, targetProfileId);
          patchTargetMsg((m) => ({
            ...m,
            mealLogged: `${meal.summary} (${meal.calories} kcal · 蛋白 ${meal.protein}g)`,
          }));
        } else if (ev.type === "exercise") {
          const ex = customExerciseFromGuide(
            ev.exercise.name,
            ev.exercise.name_en,
            guideFromCoach(ev.exercise),
          );
          addCustomExercise(ex);
          patchTargetMsg((m) => ({ ...m, exerciseAdded: ex.name }));
        } else if (ev.type === "memory") {
          setStateForProfile(targetProfileId, (ws) => ({
            ...ws,
            profile: { ...ws.profile, memory: [...ws.profile.memory, ev.note] },
          }));
        } else if (ev.type === "error") {
          fail(ev.error);
        }
      } catch (err) {
        // one bad event must not throw away the rest of the reply
        console.error("coach event failed", ev?.type, err);
        if (ev.type !== "text") fail("教练的这一步没能保存到 App,请让教练再做一次。");
      }
    };
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        handle(buf.slice(0, i));
        buf = buf.slice(i + 1);
      }
    }
    handle(buf);
  } catch (err) {
    console.error("coach request failed", stage, err);
    const detail = err instanceof Error && err.message ? `(${err.message.slice(0, 80)})` : "";
    if (typeof navigator !== "undefined" && navigator.onLine === false)
      fail("手机现在没有网络,连上网后再发一次。");
    else if (stage === "send")
      fail(`连不上 App 的服务器,消息没有发出去。请检查网络后再发一次。${detail}`);
    else if (received)
      fail("回复传到一半断了(可能是网络不稳,或教练想得太久超时)。上面是已经收到的部分,请再发一次。");
    else fail(`服务器没有回应就断开了,请再发一次。${detail}`);
  } finally {
    patchTargetMsg((m) => {
      const choices = extractChoices(m.text);
      return {
        ...m,
        choices: choices.length ? choices : undefined,
        text:
          visibleText(m.text) ||
          (m.plan || m.logged || m.mealLogged || m.exerciseAdded ? "" : "⚠️ 教练没有回复,请再试一次。"),
      };
    });
    setBusy(false);
  }
}

export async function fileToJpegDataUrl(file: File, max = 1568): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}

/**
 * Saves an off-library exercise from the current plan or in-progress workout
 * into the user's library and points every matching item at the saved copy.
 */
export function saveToLibrary(item: { name: string; nameEn?: string; custom?: Guide }): string | null {
  if (!item.custom) return null;
  const ex = customExerciseFromGuide(item.name, item.nameEn, item.custom);
  addCustomExercise(ex);
  const link = <T extends { name: string; exerciseId?: string; custom?: Guide }>(x: T): T =>
    !x.exerciseId && x.name === item.name ? { ...x, exerciseId: ex.id, custom: undefined } : x;
  setState((s) => ({
    ...s,
    plan: s.plan ? { ...s.plan, items: s.plan.items.map(link) } : s.plan,
    active: s.active ? { ...s.active, exercises: s.active.exercises.map(link) } : s.active,
    chat: s.chat.map((m) =>
      m.plan ? { ...m, plan: { ...m.plan, items: m.plan.items.map(link) } } : m,
    ),
  }));
  return ex.id;
}
