"use client";
import { useSyncExternalStore } from "react";
import { formatGymsContext } from "./equipment";
import { allExerciseNamesForPrompt, findExerciseById } from "./exercise-lookup";
import { customExerciseFromGuide, guideFromCoach } from "./custom-exercise";
import { nutritionContextForCoach } from "./nutrition";
import { parseRepRange, planNextSession, targetRirWords } from "./rir";
import {
  addCustomExercise,
  addMealLog,
  aiHeaders,
  flushPersist,
  getState,
  historyForCoach,
  lastPerformance,
  localDateStr,
  setsSummary,
  setState,
  setStateForProfile,
  uid,
} from "./store";
import type { ChatMsg, Guide, MealLog, Plan, Workout, WorkoutExercise } from "./types";

// ───────── workouts ─────────

function parseWeightKg(s?: string): number | null {
  if (!s) return null;
  const m = /(\d+(?:\.\d+)?)\s*(?:kg|公斤)/i.exec(s);
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
    /** When the plan was made: a session done after that overrides the plan's weight. */
    plannedAt?: string;
  } = {},
): WorkoutExercise {
  const state = getState();
  const last = lastPerformance(state.workouts, base);
  const lastDone = last?.exercise.sets.filter((s) => s.done) ?? [];
  const n = opts.sets ?? (lastDone.length || 3);
  const repRange = parseRepRange(opts.reps) ?? last?.exercise.repRange;
  const lib = findExerciseById(base.exerciseId, state.customExercises);
  // progress from last time unless the plan was written after that session
  const planIsNewer = !!opts.plannedAt && (!last || last.workout.startedAt < opts.plannedAt);
  const next =
    last && !planIsNewer
      ? planNextSession(lastDone, opts.targetRir ?? last.exercise.targetRir ?? 2, repRange, lib)
      : undefined;
  const planned = planIsNewer || !last ? parseWeightKg(opts.weight) : undefined;
  const nextWeights = next?.weights;
  const shownWeight = next?.weight != null ? `${next.weight}kg` : planned != null || !last ? opts.weight : undefined;
  return {
    ...base,
    target: opts.reps
      ? `${n} 组 × ${opts.reps}${shownWeight ? ` · ${shownWeight}` : ""}${
          opts.targetRir != null ? ` · ${targetRirWords(opts.targetRir)}` : ""
        }`
      : undefined,
    targetRir: opts.targetRir,
    repRange,
    restSec: opts.restSec ?? 75,
    note: opts.note,
    sets: Array.from({ length: n }, (_, i) => ({
      weight:
        planned ??
        nextWeights?.[Math.min(i, nextWeights.length - 1)] ??
        lastDone[Math.min(i, lastDone.length - 1)]?.weight ??
        null,
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
          plannedAt: plan.createdAt,
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
          reps: e.repRange ? `${e.repRange[0]}-${e.repRange[1]}` : undefined,
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

const TOOL_LABELS: Record<string, string> = {
  save_workout_plan: "正在为你排训练计划…",
  log_workout: "正在记录这次训练…",
  log_meal: "正在记录饮食与营养…",
  save_custom_exercise: "正在保存到动作库…",
  remember_note: "正在记住你的偏好…",
};

let busy = false;
let activeTool = "";
let activeAbort: AbortController | null = null;
const busyListeners = new Set<() => void>();
const toolListeners = new Set<() => void>();

function setBusy(b: boolean) {
  busy = b;
  busyListeners.forEach((l) => l());
}
function setActiveTool(label: string) {
  if (activeTool === label) return;
  activeTool = label;
  toolListeners.forEach((l) => l());
}
export function isCoachBusy() {
  return busy;
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
export function useCoachToolStatus() {
  return useSyncExternalStore(
    (l) => {
      toolListeners.add(l);
      return () => toolListeners.delete(l);
    },
    () => activeTool,
    () => "",
  );
}
export function abortCoach() {
  if (activeAbort) {
    activeAbort.abort();
    activeAbort = null;
  }
}

const MAX_CONTEXT_CHARS = 18_500;

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
    p.memory.length ? p.memory.slice(-30).map((m) => `- ${m}`).join("\n") : "(暂无)",
    "",
    "## App 里当前的计划",
    s.plan
      ? `${s.plan.title}(${localDateStr(s.plan.createdAt) || s.plan.createdAt.slice(0, 10)} 制定): ${s.plan.items
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
    historyForCoach(s.workouts),,
    "",
    "## 每个动作的下次进步目标(App 按双重递增法算出,排计划时以此为准)",
    progressionForCoach(s.workouts, s.customExercises),
    "",
    "## 用户自定义的动作库",
    allExerciseNamesForPrompt(s.customExercises),
    "",
    "## 今日饮食与营养师参考目标",
    nutritionContextForCoach(s.meals, p),
  ];
  const full = lines.join("\n");
  return full.length > MAX_CONTEXT_CHARS ? full.slice(0, MAX_CONTEXT_CHARS) + "\n...(部分历史已省略)" : full;
}

/** One line per recently trained exercise: what to do next time to beat last time. */
function progressionForCoach(workouts: Workout[], custom: ReturnType<typeof getState>["customExercises"]): string {
  const seen = new Set<string>();
  const lines: string[] = [];
  const sorted = [...workouts].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  for (const w of sorted) {
    for (const e of w.exercises) {
      const key = e.exerciseId ?? e.name;
      if (seen.has(key) || !e.sets.some((x) => x.done)) continue;
      seen.add(key);
      const lib = findExerciseById(e.exerciseId, custom);
      const next = planNextSession(e.sets, e.targetRir ?? 2, e.repRange, lib);
      if (next) lines.push(`- ${e.name}${e.exerciseId ? ` [${e.exerciseId}]` : ""}: ${next.text}`);
      if (lines.length >= 15) return lines.join("\n");
    }
  }
  return lines.join("\n") || "(还没有记录)";
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
      return { role: m.role, text: text.trim().slice(0, 7500) };
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
  const initState = getState();
  const targetProfileId = initState.activeProfileId;
  const targetThreadId = initState.activeThreadId || `t-${uid()}`;
  const controller = new AbortController();
  activeAbort = controller;
  setBusy(true);
  setActiveTool("");
  const ts = new Date().toISOString();
  const aid = uid();

  const patchThreadMessages = (
    fn: (msgs: ChatMsg[]) => ChatMsg[],
    deferPersist = false,
  ) =>
    setStateForProfile(
      targetProfileId,
      (ws) => {
        const isCurrent = (ws.activeThreadId || targetThreadId) === targetThreadId;
        if (isCurrent) {
          return {
            ...ws,
            activeThreadId: targetThreadId,
            chat: fn(ws.chat),
          };
        }
        return {
          ...ws,
          threads: (ws.threads ?? []).map((t) =>
            t.id === targetThreadId ? { ...t, updatedAt: new Date().toISOString(), messages: fn(t.messages) } : t,
          ),
        };
      },
      { deferPersist },
    );

  const patchTargetMsg = (fn: (m: ChatMsg) => ChatMsg, deferPersist = false) =>
    patchThreadMessages((msgs) => msgs.map((m) => (m.id === aid ? fn(m) : m)), deferPersist);

  const initialContext = buildContext();

  patchThreadMessages((msgs) => [
    ...msgs,
    { id: uid(), role: "user", text, ts, image: photo?.thumb },
    { id: aid, role: "assistant", text: "", ts },
  ]);

  if (photo) {
    // keep storage small: only the most recent photos keep their thumbnail
    patchThreadMessages((msgs) => {
      let kept = 0;
      const pruned = [...msgs].reverse().map((m) => {
        if (!m.image) return m;
        kept++;
        return kept > MAX_THUMBS ? { ...m, image: "" } : m;
      });
      return pruned.reverse();
    });
  }
  const fail = (msg: string) =>
    patchTargetMsg((m) => ({ ...m, text: (m.text ? m.text + "\n\n" : "") + `⚠️ ${msg}` }));

  // Which step failed decides what we tell the user.
  let stage: "send" | "stream" = "send";
  let received = false;
  let abortedByUser = false;
  try {
    const s = getState();
    const targetWs = s.profiles.find((p) => p.profile.id === targetProfileId);
    const threadHit = targetWs?.threads?.find((t) => t.id === targetThreadId);
    const chatSnapshot = threadHit ? threadHit.messages : targetWs ? targetWs.chat : s.chat;
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: aiHeaders(),
      signal: controller.signal,
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
          setActiveTool("");
          patchTargetMsg((m) => ({ ...m, text: m.text + ev.text }), true);
        } else if (ev.type === "tool") {
          setActiveTool(TOOL_LABELS[ev.name] ?? "正在处理操作…");
        } else if (ev.type === "plan") {
          setActiveTool("");
          const plan = toPlan(ev.plan);
          setStateForProfile(targetProfileId, (ws) => ({ ...ws, plan }));
          patchTargetMsg((m) => ({ ...m, plan }));
        } else if (ev.type === "workout") {
          setActiveTool("");
          const w = toWorkout(ev.workout);
          setStateForProfile(targetProfileId, (ws) => ({ ...ws, workouts: [...ws.workouts, w] }));
          patchTargetMsg((m) => ({ ...m, logged: w.title }));
        } else if (ev.type === "meal") {
          setActiveTool("");
          const meal = toMeal(ev.meal);
          addMealLog(meal, targetProfileId);
          patchTargetMsg((m) => ({
            ...m,
            mealLogged: `${meal.summary} (${meal.calories} kcal · 蛋白 ${meal.protein}g)`,
          }));
        } else if (ev.type === "exercise") {
          setActiveTool("");
          const ex = customExerciseFromGuide(
            ev.exercise.name,
            ev.exercise.name_en,
            guideFromCoach(ev.exercise),
          );
          addCustomExercise(ex);
          patchTargetMsg((m) => ({ ...m, exerciseAdded: ex.name }));
        } else if (ev.type === "memory") {
          setActiveTool("");
          setStateForProfile(targetProfileId, (ws) => ({
            ...ws,
            profile: { ...ws.profile, memory: [...ws.profile.memory, ev.note] },
          }));
        } else if (ev.type === "error") {
          setActiveTool("");
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
    buf += dec.decode();
    handle(buf);
  } catch (err) {
    if (controller.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) {
      abortedByUser = true;
    } else {
      console.error("coach request failed", stage, err);
      const detail = err instanceof Error && err.message ? `(${err.message.slice(0, 80)})` : "";
      if (typeof navigator !== "undefined" && navigator.onLine === false)
        fail("手机现在没有网络,连上网后再发一次。");
      else if (stage === "send")
        fail(`连不上 App 的服务器,消息没有发出去。请检查网络后再发一次。${detail}`);
      else if (received)
        fail("回复传到一半断了(可能是网络不稳,或教练想得太久超时)。上面是已经收到的部分,请再发一次。");
      else fail(`服务器没有回应就断开了,请再发一次。${detail}`);
    }
  } finally {
    if (activeAbort === controller) activeAbort = null;
    setActiveTool("");
    patchTargetMsg((m) => {
      const choices = extractChoices(m.text);
      const cleaned = visibleText(m.text);
      return {
        ...m,
        choices: choices.length ? choices : undefined,
        text:
          cleaned ||
          (abortedByUser
            ? "(已停止生成)"
            : m.plan || m.logged || m.mealLogged || m.exerciseAdded
              ? ""
              : "⚠️ 教练没有回复,请再试一次。"),
      };
    });
    flushPersist();
    setBusy(false);
  }
}

export async function fileToJpegDataUrl(file: File, max = 1568): Promise<string> {
  const bmp = await createImageBitmap(file);
  try {
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85);
  } finally {
    bmp.close();
  }
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
    threads: s.threads.map((t) => ({
      ...t,
      messages: t.messages.map((m) =>
        m.plan ? { ...m, plan: { ...m.plan, items: m.plan.items.map(link) } } : m,
      ),
    })),
  }));
  return ex.id;
}
