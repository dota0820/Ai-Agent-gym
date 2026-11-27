"use client";
import { useSyncExternalStore } from "react";

/** Colour themes. The CSS variables for each one live in src/app/globals.css. */
export const THEMES = [
  { id: "fresh", label: "清爽绿", desc: "高对比清爽，利落干净", dark: false, bg: "#f1f4f6", card: "#ffffff", primary: "#9fe870", ink: "#163300" },
  { id: "coral", label: "珊瑚粉", desc: "白底配珊瑚粉，干净又温暖", dark: false, bg: "#f7f7f7", card: "#ffffff", primary: "#ff385c", ink: "#222222" },
  { id: "blossom", label: "樱花粉白", desc: "柔和樱花粉，甜而不腻", dark: false, bg: "#fff6f8", card: "#ffffff", primary: "#f06292", ink: "#5b2a3c" },
  { id: "mono", label: "黑白极简", desc: "只有黑和白，最专注", dark: false, bg: "#f4f4f4", card: "#ffffff", primary: "#111111", ink: "#111111" },
  { id: "orange", label: "活力橙", desc: "明亮橙色，一看就有劲", dark: false, bg: "#fff8f2", card: "#ffffff", primary: "#ff6b00", ink: "#3b1f0b" },
  { id: "peach", label: "蜜桃橙", desc: "温柔蜜桃色，暖暖的", dark: false, bg: "#fff7f3", card: "#ffffff", primary: "#ff8a65", ink: "#4a2c25" },
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
