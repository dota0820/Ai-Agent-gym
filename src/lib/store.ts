"use client";
import { useSyncExternalStore } from "react";
import { getProfileGyms } from "./equipment";
import type {
  AppState,
  ChatMsg,
  ChatThread,
  CustomExercise,
  GymEnvironment,
  MealLog,
  PersonWorkspace,
  Profile,
  Workout,
  WorkoutExercise,
} from "./types";

const KEY = "gymcoach:v1";
const MAX_MEAL_THUMBS = 12;
const MAX_CHAT_THREADS = 30;

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function deriveThreadTitle(messages: ChatMsg[]): string {
  const firstUser = messages.find((m) => m.role === "user" && m.text.trim());
  if (!firstUser) return "新对话";
  const clean = firstUser.text.replace(/\s+/g, " ").trim();
  return clean.length > 22 ? `${clean.slice(0, 22)}…` : clean;
}

export function emptyProfile(id = "default", patch: Partial<Profile> = {}): Profile {
  const baseEquipment = patch.equipment ?? "";
  const gyms: GymEnvironment[] =
    Array.isArray(patch.gyms) && patch.gyms.length > 0
      ? patch.gyms
      : [{ id: "gym-1", name: "Gym 1", scene: "", equipment: baseEquipment }];
  const activeGymId =
    patch.activeGymId && gyms.some((g) => g.id === patch.activeGymId)
      ? patch.activeGymId
      : gyms[0].id;
  const activeEquip = gyms.find((g) => g.id === activeGymId)?.equipment ?? baseEquipment;
  return {
    id,
    avatar: "🙂",
    name: "",
    gender: "",
    age: "",
    goal: "",
    level: "新手(刚开始健身)",
    daysPerWeek: "3",
    injuries: "",
    heightCm: "",
    weightKg: "",
    memory: [],
    passcode: "",
    speak: false,
    ...patch,
    gyms,
    activeGymId,
    equipment: activeEquip,
  };
}

export function emptyWorkspace(id = "default", patch: Partial<Profile> = {}): PersonWorkspace {
  return {
    profile: emptyProfile(id, patch),
    plan: null,
    active: null,
    workouts: [],
    chat: [],
    threads: [],
    activeThreadId: null,
    meals: [],
  };
}

interface RootStore {
  activeProfileId: string;
  profiles: PersonWorkspace[];
  customExercises: CustomExercise[];
  passcode: string;
  aiModel: string;
  openRouterKey: string;
}

const DEFAULT_ROOT: RootStore = {
  activeProfileId: "default",
  profiles: [emptyWorkspace("default")],
  customExercises: [],
  passcode: "",
  aiModel: "",
  openRouterKey: "",
};

function project(root: RootStore): AppState {
  const activeWs =
    root.profiles.find((p) => p.profile.id === root.activeProfileId) ?? root.profiles[0];
  return {
    activeProfileId: activeWs.profile.id,
    profiles: root.profiles,
    profile: { ...activeWs.profile, passcode: root.passcode || activeWs.profile.passcode },
    plan: activeWs.plan,
    active: activeWs.active,
    workouts: activeWs.workouts,
    chat: activeWs.chat,
    threads: activeWs.threads ?? [],
    activeThreadId: activeWs.activeThreadId ?? null,
    customExercises: root.customExercises,
    meals: activeWs.meals,
    aiModel: root.aiModel,
    openRouterKey: root.openRouterKey,
  };
}

export const EMPTY: AppState = project(DEFAULT_ROOT);

let rootState: RootStore = DEFAULT_ROOT;
let viewState: AppState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

/** Allow only http/https URLs for external links to prevent javascript:/data: XSS. */
export function safeHttpUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return undefined;
    return u.toString();
  } catch {
    return undefined;
  }
}

/** Allow http/https or safe base64 image data URLs for thumbnails. */
export function safeImageUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) return trimmed;
  return safeHttpUrl(trimmed);
}

function sanitizeCustomExercises(list: unknown): CustomExercise[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((x): x is CustomExercise => !!x && typeof x === "object" && typeof (x as CustomExercise).id === "string" && typeof (x as CustomExercise).name === "string")
    .map((x) => ({
      ...x,
      sourceUrl: safeHttpUrl(x.sourceUrl),
      imageUrl: safeImageUrl(x.imageUrl),
      cues: Array.isArray(x.cues) ? x.cues : [],
      steps: Array.isArray(x.steps) ? x.steps : [],
      mistakes: Array.isArray(x.mistakes) ? x.mistakes : [],
      primary: Array.isArray(x.primary) ? x.primary : [],
      secondary: Array.isArray(x.secondary) ? x.secondary : [],
      alsoIn: Array.isArray(x.alsoIn) ? x.alsoIn : [],
    }));
}

function syncWorkspaceThreads(ws: PersonWorkspace): PersonWorkspace {
  const rawThreads = ws.threads ?? [];
  if (!ws.chat.length) {
    return { ...ws, threads: rawThreads.slice(0, MAX_CHAT_THREADS) };
  }
  const activeId = ws.activeThreadId || `t-${uid()}`;
  const updatedAt = ws.chat[ws.chat.length - 1]?.ts || new Date().toISOString();
  const existing = rawThreads.find((t) => t.id === activeId);
  const title =
    existing?.title && existing.title !== "新对话"
      ? existing.title
      : deriveThreadTitle(ws.chat);
  const current: ChatThread = {
    id: activeId,
    title,
    updatedAt,
    messages: ws.chat,
  };
  const others = rawThreads
    .filter((t) => t.id !== activeId)
    .map((t, idx) =>
      // Strip base64 thumbnails from older archived threads beyond top 4 to keep localStorage lean
      idx < 4
        ? t
        : {
            ...t,
            messages: t.messages.map((m) => (m.image ? { ...m, image: "" } : m)),
          },
    );
  const threads = [current, ...others].slice(0, MAX_CHAT_THREADS);
  return {
    ...ws,
    activeThreadId: activeId,
    threads,
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function normalizeWorkspace(raw: any, fallbackId: string, sharedPasscode: string): PersonWorkspace {
  const base = emptyWorkspace(raw?.profile?.id || fallbackId);
  const p = raw?.profile ?? {};
  const merged: Profile = {
    ...base.profile,
    ...p,
    id: p.id || fallbackId,
    memory: Array.isArray(p.memory) ? p.memory : [],
    passcode: sharedPasscode || p.passcode || "",
  };
  const { gyms, activeGym } = getProfileGyms(merged);
  const chat: ChatMsg[] = Array.isArray(raw?.chat) ? raw.chat : [];
  const rawThreads: ChatThread[] = Array.isArray(raw?.threads)
    ? raw.threads.filter(
        (t: any) => t && typeof t.id === "string" && Array.isArray(t.messages),
      )
    : [];
  const activeThreadId =
    typeof raw?.activeThreadId === "string" ? raw.activeThreadId : null;

  return syncWorkspaceThreads({
    profile: {
      ...merged,
      gyms,
      activeGymId: activeGym.id,
      equipment: activeGym.equipment,
    },
    plan: raw?.plan ?? null,
    active: raw?.active ?? null,
    workouts: Array.isArray(raw?.workouts) ? raw.workouts : [],
    chat,
    threads: rawThreads,
    activeThreadId,
    meals: Array.isArray(raw?.meals) ? raw.meals : [],
  });
}

function parseRootData(p: any): RootStore | null {
  if (!p || typeof p !== "object") return null;

  // Multi-profile format
  if (Array.isArray(p.profiles) && p.profiles.length > 0) {
    const passcode = typeof p.passcode === "string" ? p.passcode : (p.profiles[0]?.profile?.passcode ?? "");
    const profiles: PersonWorkspace[] = p.profiles.map((w: any, idx: number) =>
      normalizeWorkspace(w, idx === 0 ? "default" : `p-${idx}`, passcode),
    );
    const activeProfileId = profiles.some((w) => w.profile.id === p.activeProfileId)
      ? p.activeProfileId
      : profiles[0].profile.id;
    return {
      activeProfileId,
      profiles,
      customExercises: sanitizeCustomExercises(p.customExercises),
      passcode,
      aiModel: typeof p.aiModel === "string" ? p.aiModel : "",
      openRouterKey: typeof p.openRouterKey === "string" ? p.openRouterKey : "",
    };
  }

  // Legacy single-profile format
  if (p.profile) {
    const passcode = typeof p.profile.passcode === "string" ? p.profile.passcode : "";
    const ws = normalizeWorkspace(p, "default", passcode);
    return {
      activeProfileId: ws.profile.id,
      profiles: [ws],
      customExercises: sanitizeCustomExercises(p.customExercises),
      passcode,
      aiModel: typeof p.aiModel === "string" ? p.aiModel : "",
      openRouterKey: typeof p.openRouterKey === "string" ? p.openRouterKey : "",
    };
  }

  return null;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

let storageWarning = "";
let persistTimer: ReturnType<typeof setTimeout> | null = null;
const warningListeners = new Set<() => void>();

function setStorageWarning(msg: string) {
  if (storageWarning === msg) return;
  storageWarning = msg;
  warningListeners.forEach((l) => l());
}

export function useStorageWarning(): string {
  return useSyncExternalStore(
    (l) => {
      warningListeners.add(l);
      return () => warningListeners.delete(l);
    },
    () => storageWarning,
    () => "",
  );
}

function writeStorageNow() {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(rootState));
    setStorageWarning("");
  } catch {
    setStorageWarning("浏览器本地存储空间已满，新记录可能无法保存。请到「我的 → 备份与设置」导出备份并清理旧聊天/图片。");
  }
}

export function flushPersist() {
  if (typeof window === "undefined") return;
  writeStorageNow();
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = parseRootData(JSON.parse(raw));
      if (parsed) {
        rootState = parsed;
        viewState = project(rootState);
      }
    }
  } catch {
    // corrupted or unavailable storage: start fresh
  }
}

function commit(nextRoot: RootStore, opts?: { deferPersist?: boolean }) {
  rootState = nextRoot;
  viewState = project(rootState);
  if (opts?.deferPersist) {
    if (!persistTimer) {
      persistTimer = setTimeout(writeStorageNow, 600);
    }
  } else {
    writeStorageNow();
  }
  listeners.forEach((l) => l());
}

export function getState(): AppState {
  load();
  return viewState;
}

export function setState(fn: (s: AppState) => AppState) {
  load();
  const prev = viewState;
  const next = fn(prev);
  const passcode =
    next.profile.passcode !== prev.profile.passcode ? next.profile.passcode : rootState.passcode;

  const updatedProfiles = next.profiles.map((ws) => {
    if (ws.profile.id !== next.activeProfileId) {
      return passcode === rootState.passcode
        ? ws
        : { ...ws, profile: { ...ws.profile, passcode } };
    }
    return syncWorkspaceThreads({
      profile: { ...next.profile, id: ws.profile.id, passcode },
      plan: next.plan,
      active: next.active,
      workouts: next.workouts,
      chat: next.chat,
      threads: next.threads,
      activeThreadId: next.activeThreadId,
      meals: next.meals,
    });
  });

  commit({
    activeProfileId: next.activeProfileId,
    profiles: updatedProfiles,
    customExercises: next.customExercises,
    passcode,
    aiModel: next.aiModel,
    openRouterKey: next.openRouterKey,
  });
}

export function setAiModel(id: string) {
  load();
  commit({ ...rootState, aiModel: id });
}

export function setOpenRouterKey(key: string) {
  load();
  const trimmed = key.trim();
  // If user clears the key in /me/ai and the legacy passcode field also held an sk-or- key, clear that too.
  const clearLegacyPass = !trimmed && rootState.passcode.trim().startsWith("sk-or-");
  const nextPasscode = clearLegacyPass ? "" : rootState.passcode;
  const nextProfiles = clearLegacyPass
    ? rootState.profiles.map((ws) => ({ ...ws, profile: { ...ws.profile, passcode: "" } }))
    : rootState.profiles;
  commit({ ...rootState, openRouterKey: trimmed, passcode: nextPasscode, profiles: nextProfiles });
}

/** Shared headers for all /api/* AI endpoints. */
export function aiHeaders(): Record<string, string> {
  const s = getState();
  const pass = s.profile.passcode.trim();
  // API keys are plain ASCII; drop stray spaces, line breaks or invisible
  // characters picked up when pasting (they make the browser reject the request).
  const ascii = (v: string) => v.replace(/[^\x21-\x7E]/g, "");
  const orKey = ascii(s.openRouterKey) || (pass.startsWith("sk-or-") ? ascii(pass) : "");
  const appPass = pass.startsWith("sk-or-") ? "" : pass;
  return {
    "Content-Type": "application/json",
    // header values must be Latin-1, so a passcode with Chinese characters is URL-encoded
    ...(appPass ? { "x-app-passcode": encodeURIComponent(appPass) } : {}),
    ...(s.aiModel ? { "x-ai-model": ascii(s.aiModel) } : {}),
    ...(orKey ? { "x-openrouter-key": orKey } : {}),
  };
}

/** Update a specific profile workspace safely (e.g., streaming AI responses even if user switched profile). */
export function setStateForProfile(
  profileId: string,
  fn: (ws: PersonWorkspace) => PersonWorkspace,
  opts?: { deferPersist?: boolean },
) {
  load();
  const profiles = rootState.profiles.map((ws) =>
    ws.profile.id === profileId ? syncWorkspaceThreads(fn(ws)) : ws,
  );
  commit({ ...rootState, profiles }, opts);
}

/** Archives the current chat into `threads` (if non-empty) and opens a fresh conversation. */
export function startNewChatThread() {
  load();
  const activeId = rootState.activeProfileId;
  const current = rootState.profiles.find((ws) => ws.profile.id === activeId);
  if (!current || (current.chat.length === 0 && current.activeThreadId === null)) return;
  const profiles = rootState.profiles.map((ws) => {
    if (ws.profile.id !== activeId) return ws;
    const synced = syncWorkspaceThreads(ws);
    return {
      ...synced,
      chat: [],
      activeThreadId: null,
    };
  });
  commit({ ...rootState, profiles });
}

/** Switches the active conversation to an existing thread from history. */
export function selectChatThread(threadId: string) {
  load();
  const activeId = rootState.activeProfileId;
  const profiles = rootState.profiles.map((ws) => {
    if (ws.profile.id !== activeId) return ws;
    const synced = syncWorkspaceThreads(ws);
    const hit = (synced.threads ?? []).find((t) => t.id === threadId);
    if (!hit) return synced;
    return {
      ...synced,
      chat: hit.messages,
      activeThreadId: hit.id,
    };
  });
  commit({ ...rootState, profiles });
}

/** Deletes a saved conversation thread; clears the view if it was currently open. */
export function deleteChatThread(threadId: string) {
  load();
  const activeId = rootState.activeProfileId;
  const profiles = rootState.profiles.map((ws) => {
    if (ws.profile.id !== activeId) return ws;
    const remaining = (ws.threads ?? []).filter((t) => t.id !== threadId);
    const wasActive = ws.activeThreadId === threadId;
    return {
      ...ws,
      threads: remaining,
      chat: wasActive ? [] : ws.chat,
      activeThreadId: wasActive ? null : ws.activeThreadId,
    };
  });
  commit({ ...rootState, profiles });
}

export function switchProfile(profileId: string) {
  load();
  if (!rootState.profiles.some((w) => w.profile.id === profileId)) return;
  commit({ ...rootState, activeProfileId: profileId });
}

export function createProfile(patch: Partial<Profile>, copyEquipment = true): string {
  load();
  const id = `p-${uid()}`;
  const activeProfile = viewState.profile;
  const activeEquip = activeProfile.equipment;
  const copiedGyms =
    copyEquipment && !patch.gyms
      ? getProfileGyms(activeProfile).gyms.map((g) => ({
          ...g,
          details: g.details ? { ...g.details } : undefined,
        }))
      : patch.gyms;
  const ws = emptyWorkspace(id, {
    ...patch,
    id,
    equipment: copyEquipment && !patch.equipment ? activeEquip : (patch.equipment ?? ""),
    gyms: copiedGyms,
    activeGymId: copyEquipment && !patch.activeGymId ? activeProfile.activeGymId : patch.activeGymId,
    passcode: rootState.passcode,
  });
  commit({
    ...rootState,
    activeProfileId: id,
    profiles: [...rootState.profiles, ws],
  });
  return id;
}

export function switchProfileGym(gymId: string) {
  setState((s) => {
    const { gyms } = getProfileGyms(s.profile);
    const hit = gyms.find((g) => g.id === gymId);
    if (!hit) return s;
    return {
      ...s,
      profile: {
        ...s.profile,
        gyms,
        activeGymId: hit.id,
        equipment: hit.equipment,
      },
    };
  });
}

export function saveProfileGyms(gyms: GymEnvironment[], activeGymId?: string) {
  setState((s) => {
    const normalized =
      gyms.length > 0 ? gyms : [{ id: "gym-1", name: "Gym 1", scene: "", equipment: "" }];
    const active =
      normalized.find((g) => g.id === (activeGymId ?? s.profile.activeGymId)) ?? normalized[0];
    return {
      ...s,
      profile: {
        ...s.profile,
        gyms: normalized,
        activeGymId: active.id,
        equipment: active.equipment,
      },
    };
  });
}

export function deleteProfile(profileId: string) {
  load();
  if (rootState.profiles.length <= 1) return;
  const remaining = rootState.profiles.filter((w) => w.profile.id !== profileId);
  const activeProfileId =
    rootState.activeProfileId === profileId ? remaining[0].profile.id : rootState.activeProfileId;
  commit({ ...rootState, activeProfileId, profiles: remaining });
}

export function exportRootBackup(): RootStore {
  load();
  return {
    ...rootState,
    passcode: "",
    openRouterKey: "",
    profiles: rootState.profiles.map((ws) => ({
      ...ws,
      profile: { ...ws.profile, passcode: "" },
    })),
  };
}

export function importRootBackup(rawData: unknown): { profilesCount: number; workoutsCount: number } | null {
  load();
  const parsed = parseRootData(rawData);
  if (!parsed) return null;
  // Preserve current device's passcode / OpenRouter key if the imported backup has them stripped.
  const passcode = parsed.passcode || rootState.passcode;
  const openRouterKey = parsed.openRouterKey || rootState.openRouterKey;
  const profiles = parsed.profiles.map((ws) => ({
    ...ws,
    profile: { ...ws.profile, passcode: ws.profile.passcode || passcode },
  }));
  commit({ ...parsed, passcode, openRouterKey, profiles });
  const workoutsCount = parsed.profiles.reduce((n, w) => n + w.workouts.length, 0);
  return { profilesCount: parsed.profiles.length, workoutsCount };
}

export function addCustomExercise(ex: CustomExercise) {
  const safeEx: CustomExercise = {
    ...ex,
    sourceUrl: safeHttpUrl(ex.sourceUrl),
    imageUrl: safeImageUrl(ex.imageUrl),
  };
  setState((s) => ({
    ...s,
    customExercises: [safeEx, ...s.customExercises.filter((x) => x.id !== safeEx.id)],
  }));
}

export function updateCustomExercise(ex: CustomExercise) {
  const safeEx: CustomExercise = {
    ...ex,
    sourceUrl: safeHttpUrl(ex.sourceUrl),
    imageUrl: safeImageUrl(ex.imageUrl),
  };
  setState((s) => ({
    ...s,
    customExercises: s.customExercises.map((x) => (x.id === safeEx.id ? safeEx : x)),
  }));
}

export function removeCustomExercise(id: string) {
  setState((s) => ({
    ...s,
    customExercises: s.customExercises.filter((x) => x.id !== id),
  }));
}

export function pruneMealImages(meals: MealLog[]): MealLog[] {
  let kept = 0;
  return [...meals]
    .reverse()
    .map((m) => {
      if (!m.image) return m;
      kept++;
      return kept > MAX_MEAL_THUMBS ? { ...m, image: undefined } : m;
    })
    .reverse();
}

export function addMealLog(meal: MealLog, profileId?: string) {
  if (profileId) {
    setStateForProfile(profileId, (ws) => ({
      ...ws,
      meals: pruneMealImages([...ws.meals, meal]),
    }));
    return;
  }
  setState((s) => ({
    ...s,
    meals: pruneMealImages([...s.meals, meal]),
  }));
}

export function updateMealLog(meal: MealLog) {
  setState((s) => ({
    ...s,
    meals: s.meals.map((x) => (x.id === meal.id ? meal : x)),
  }));
}

export function removeMealLog(id: string) {
  setState((s) => ({
    ...s,
    meals: s.meals.filter((x) => x.id !== id),
  }));
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useApp(): AppState {
  return useSyncExternalStore(subscribe, getState, () => EMPTY);
}

/** false during SSR/hydration, true once localStorage data is readable */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function sameExercise(
  a: { exerciseId?: string; name: string },
  b: { exerciseId?: string; name: string },
) {
  if (a.exerciseId && b.exerciseId) return a.exerciseId === b.exerciseId;
  return a.name.trim().toLowerCase() === b.name.trim().toLowerCase();
}

/** Most recent logged performance of an exercise (optionally before a date). */
export function lastPerformance(
  workouts: Workout[],
  ex: { exerciseId?: string; name: string },
  beforeIso?: string,
): { workout: Workout; exercise: WorkoutExercise } | null {
  const sorted = [...workouts].sort((a, b) =>
    b.startedAt.localeCompare(a.startedAt),
  );
  for (const w of sorted) {
    if (beforeIso && w.startedAt >= beforeIso) continue;
    const hit = w.exercises.find(
      (e) => sameExercise(e, ex) && e.sets.some((s) => s.done),
    );
    if (hit) return { workout: w, exercise: hit };
  }
  return null;
}

export function setsSummary(e: WorkoutExercise): string {
  const done = e.sets.filter((s) => s.done);
  if (!done.length) return "未完成";
  return done
    .map(
      (s) =>
        `${s.weight ? `${s.weight}kg` : "自重"}×${s.reps ?? "?"}${
          s.rir != null ? ` RIR${s.rir >= 4 ? "4+" : s.rir}` : ""
        }`,
    )
    .join("  ");
}

export function volume(w: Workout): number {
  let v = 0;
  for (const e of w.exercises)
    for (const s of e.sets) if (s.done) v += (s.weight ?? 0) * (s.reps ?? 0);
  return Math.round(v);
}

export function localDateStr(iso?: string | Date): string {
  const d = iso instanceof Date ? iso : iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "未知日期";
  const wk = "日一二三四五六"[d.getDay()];
  return `${d.getMonth() + 1}月${d.getDate()}日 周${wk}`;
}

export function durationMin(w: Workout): number | null {
  if (w.watch?.durationMin != null && w.watch.durationMin > 0) return w.watch.durationMin;
  if (!w.endedAt) return null;
  const diff = new Date(w.endedAt).getTime() - new Date(w.startedAt).getTime();
  if (Number.isNaN(diff) || diff <= 0) return null;
  return Math.max(1, Math.round(diff / 60000));
}

/** Compact text summary of history for the AI coach. */
export function historyForCoach(workouts: Workout[], n = 8): string {
  const sorted = [...workouts]
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, n);
  if (!sorted.length) return "(还没有任何训练记录)";
  return sorted
    .map((w) => {
      const dur = durationMin(w);
      const head = `【${localDateStr(w.startedAt) || w.startedAt.slice(0, 10)} ${w.title}】${
        dur ? ` ${dur}分钟` : ""
      }${w.watch?.calories ? ` ${w.watch.calories}千卡` : ""}${
        w.watch?.avgHr ? ` 平均心率${w.watch.avgHr}` : ""
      }${w.watch?.maxHr ? ` 最高心率${w.watch.maxHr}` : ""}${
        w.feeling ? ` 感受${w.feeling}/5` : ""
      }`;
      const body = w.exercises
        .map(
          (e) =>
            `- ${e.name}${e.exerciseId ? ` [${e.exerciseId}]` : ""}: ${setsSummary(e)}`,
        )
        .join("\n");
      return `${head}\n${body}${w.notes ? `\n备注: ${w.notes}` : ""}`;
    })
    .join("\n\n");
}
