"use client";
import { useSyncExternalStore } from "react";

export type Theme = "tech" | "warm";
const KEY = "gymcoach:theme";
const listeners = new Set<() => void>();

export function getTheme(): Theme {
  if (typeof window === "undefined") return "tech";
  try {
    return localStorage.getItem(KEY) === "warm" ? "warm" : "tech";
  } catch {
    return "tech";
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
    ?.setAttribute("content", t === "tech" ? "#060a13" : "#fbf6f1");
  listeners.forEach((l) => l());
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getTheme,
    () => "tech",
  );
}

/** Runs before first paint so the saved theme never flashes. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${KEY}")==="warm"?"warm":"tech";document.documentElement.dataset.theme=t;if(t==="warm"){var m=document.querySelector('meta[name="theme-color"]');m&&m.setAttribute("content","#fbf6f1")}}catch(e){}`;
