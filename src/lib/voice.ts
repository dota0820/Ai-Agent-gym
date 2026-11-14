"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
function recognitionCtor(): any {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null;
}

/**
 * Speech-to-text using the browser's built-in recognition (Chrome / Edge / Safari).
 * `onText` receives the transcript so far each time it changes.
 */
export function useDictation(onText: (text: string, final: boolean) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const rec = useRef<any>(null);
  const cb = useRef(onText);
  useEffect(() => {
    cb.current = onText;
  });
  const supported = !!recognitionCtor();

  const stop = useCallback(() => rec.current?.stop(), []);

  const start = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    setError("");
    window.speechSynthesis?.cancel();
    const r = new Ctor();
    r.lang = "zh-CN";
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e: any) => {
      let text = "";
      let final = true;
      for (const res of e.results) {
        text += res[0].transcript;
        if (!res.isFinal) final = false;
      }
      cb.current(text, final);
    };
    r.onerror = (e: any) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed")
        setError("没有麦克风权限,请在浏览器设置里允许使用麦克风。");
      else if (e.error === "no-speech") setError("没听到声音,再试一次。");
      else if (e.error !== "aborted") setError("语音识别出错了,请再试一次或改用打字。");
    };
    r.onend = () => {
      setListening(false);
      rec.current = null;
    };
    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      setError("语音识别启动失败,请再试一次。");
    }
  }, []);

  useEffect(() => () => rec.current?.abort(), []);

  return { supported, listening, error, start, stop };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Reads text aloud with the device's built-in voice. */
export function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const clean = text
    .replace(/[*#`>_~]/g, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .trim();
  if (!clean) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = "zh-CN";
  const zh = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith("zh"));
  if (zh) u.voice = zh;
  window.speechSynthesis.speak(u);
}

export const canSpeak = () => typeof window !== "undefined" && !!window.speechSynthesis;
export const stopSpeaking = () => {
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
};
