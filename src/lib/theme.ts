"use client";
import { useSyncExternalStore } from "react";

/** Colour themes. The CSS variables for each one live in src/app/globals.css. */
export const THEMES = [
  { id: "fresh", label: "清爽绿", desc: "高对比清爽，利落干净", dark: false, bg: "#f1f4f6", card: "#ffffff", primary: "#9fe870", ink: "#163300" },
  { id: "warm", label: "暖色奶油", desc: "温柔奶油色，晚上看也舒服", dark: false, bg: "#fbf6f1", card: "#ffffff", primary: "#e8615a", ink: "#2a2733" },
  { id: "mint", label: "薄荷清新", desc: "清凉薄荷绿，轻松不刺眼", dark: false, bg: "#f2faf6", card: "#ffffff", primary: "#128a66", ink: "#1e2f29" },
  { id: "lavender", label: "薰衣草紫", desc: "柔和紫色，安静专注", dark: false, bg: "#f7f5fd", card: "#ffffff", primary: "#7054e0", ink: "#2a2440" },
  { id: "sakura", label: "樱花粉", desc: "樱花粉，活力又可爱", dark: false, bg: "#fff5f8", card: "#ffffff", primary: "#d6447c", ink: "#3a2630" },
  { id: "frost", label: "科技浅色", desc: "冷静科技蓝，数据感强", dark: false, bg: "#f2f6fc", card: "#ffffff", primary: "#2f6bff", ink: "#14213a" },
] as const;

export type Theme = (typeof THEMES)[number]["id"];
const DEFAULT: Theme = "fresh";
const KEY = "gymcoach:theme";
const listeners = new Set<() => void>();

const isTheme = (v: unknown): v is Theme => THEMES.some((t) => t.id === v);
export const isDark = (t: Theme) => THEMES.find((x) => x.id === t)?.dark ?? false;

/** Gym mode: the dark, high-contrast look used while a workout is open. */
export function setGymMode(on: boolean) {
  const root = document.documentElement;
  if (on) root.dataset.mode = "gym";
  else delete root.dataset.mode;
  const meta = document.querySelector('meta[name="theme-color"]');
  const bg = getComputedStyle(root).getPropertyValue("--c-bg").trim();
  if (meta && bg) meta.setAttribute("content", bg);
}

export function getTheme(): Theme {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const v = localStorage.getItem(KEY);
    return isTheme(v) ? v : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export function setTheme(t: Theme) {
  try {
    localStorage.setItem(KEY, t);
  } catch {
    // storage unavailable: still apply for this visit
  }
  document.documentElement.dataset.theme = t;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEMES.find((x) => x.id === t)!.bg);
  listeners.forEach((l) => l());
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getTheme,
    () => DEFAULT,
  );
}

/** Reads the active theme's colours (for canvas / SVG drawing that cannot use CSS classes). */
export function themeColors() {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string) => cs.getPropertyValue(name).trim();
  return {
    body: v("--c-body"),
    muscle: v("--c-muscle"),
    muscle2: v("--c-muscle-2"),
    primary: v("--c-primary"),
    mint: v("--c-mint"),
    line: v("--c-line"),
  };
}

/** Runs before first paint so the saved theme never flashes. */
export const THEME_INIT_SCRIPT = `try{var k=${JSON.stringify(
  Object.fromEntries(THEMES.map((t) => [t.id, t.bg])),
)},t=localStorage.getItem("${KEY}");if(!k[t])t="${DEFAULT}";document.documentElement.dataset.theme=t;var m=document.querySelector('meta[name="theme-color"]');m&&m.setAttribute("content",k[t])}catch(e){}`;
