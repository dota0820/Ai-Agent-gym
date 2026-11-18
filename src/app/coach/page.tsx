"use client";
/* eslint-disable @next/next/no-img-element */
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import MD from "@/components/MD";
import PlanCard from "@/components/PlanCard";
import ProfileChip from "@/components/ProfileChip";
import { fileToJpegDataUrl, sendToCoach, useCoachBusy, visibleText } from "@/lib/actions";
import { setState, useApp } from "@/lib/store";
import { canSpeak, speak, stopSpeaking, useDictation } from "@/lib/voice";

/** Suggestions on the empty screen; `photo` opens the camera instead of sending. */
const STARTERS: { icon: string; label: string; send?: string; photo?: boolean }[] = [
  { icon: "🗓️", label: "帮我安排今天的训练", send: "帮我安排今天的训练,根据我最近的记录决定练哪里" },
  { icon: "🎯", label: "下次我应该练什么?", send: "下次我应该练什么?" },
  { icon: "🏋️", label: "教我一个动作的正确做法", send: "我想学一个动作的正确做法,你先问我是哪个动作" },
  { icon: "📷", label: "拍器械,问怎么用", photo: true },
];

/** The coach's mark: a small animated gradient orb. */
function CoachOrb({ size = 28 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="coach-orb inline-block shrink-0 rounded-full"
      style={{ width: size, height: size }}
    />
  );
}

function ChoiceButton({
  label,
  badge,
  onClick,
}: {
  label: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-line bg-card px-3.5 py-3 text-left text-[15px] active:scale-[0.99] active:border-primary"
    >
      {badge && (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
          {badge}
        </span>
      )}
      <span className="min-w-0 flex-1">{label}</span>
      <span className="shrink-0 text-sub">↗</span>
    </button>
  );
}

/** Phones and tablets: Enter makes a new line and the send button sends (like ChatGPT). */
const isTouch = () =>
  typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

function Coach() {
  const { chat, profile } = useApp();
  const busy = useCoachBusy();
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<{ full: string; thumb: string } | null>(null);
  const [photoErr, setPhotoErr] = useState("");
  const params = useSearchParams();
  const router = useRouter();
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const sentQ = useRef<string | null>(null);
  const dictation = useDictation((t) => setText(t));

  const q = params.get("q");
  useEffect(() => {
    if (!q || sentQ.current === q) return;
    sentQ.current = q;
    router.replace("/coach");
    void sendToCoach(q);
  }, [q, router]);

  // Follow the reply as it streams only while the user is at the bottom. If they
  // scroll up to read, leave the view alone instead of yanking it down.
  const stick = useRef(true);
  useEffect(() => {
    const onScroll = () => {
      // distance from the end of the conversation to the bottom of the screen
      const end = endRef.current?.getBoundingClientRect().bottom ?? 0;
      stick.current = end - window.innerHeight < 160;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const lastLen = chat[chat.length - 1]?.text.length ?? 0;
  useEffect(() => {
    if (stick.current) endRef.current?.scrollIntoView({ block: "end" });
  }, [chat.length, lastLen]);

  // Stop the phone browser's pull-to-refresh from reloading the chat while scrolling up.
  useEffect(() => {
    const els = [document.documentElement, document.body];
    const before = els.map((e) => e.style.overscrollBehaviorY);
    els.forEach((e) => (e.style.overscrollBehaviorY = "contain"));
    return () => els.forEach((e, i) => (e.style.overscrollBehaviorY = before[i]));
  }, []);

  // Grow the input with its text, up to about six lines.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [text]);

  // Read the reply aloud once it has finished streaming.
  const wasBusy = useRef(false);
  useEffect(() => {
    if (wasBusy.current && !busy && profile.speak) {
      const last = chat[chat.length - 1];
      if (last?.role === "assistant") speak(visibleText(last.text));
    }
    wasBusy.current = busy;
  }, [busy, chat, profile.speak]);
  useEffect(() => stopSpeaking, []);

  const submit = (override?: string) => {
    const t = override ?? text;
    if ((!t.trim() && !photo) || busy) return;
    stopSpeaking();
    dictation.stop();
    stick.current = true; // a new message always scrolls into view
    void sendToCoach(t, photo ?? undefined);
    setText("");
    setPhoto(null);
  };

  async function onPhoto(file: File) {
    setPhotoErr("");
    try {
      const [full, thumb] = await Promise.all([
        fileToJpegDataUrl(file, 1568),
        fileToJpegDataUrl(file, 360),
      ]);
      setPhoto({ full, thumb });
      boxRef.current?.focus();
    } catch {
      setPhotoErr("这张照片打不开,换一张试试。");
    }
  }

  const hour = new Date().getHours();
  const hello = hour < 11 ? "早上好" : hour < 18 ? "下午好" : "晚上好";
  const canSend = !busy && (!!text.trim() || !!photo);
  const iconBtn =
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[19px] text-sub active:bg-primary-soft disabled:opacity-40";

  return (
    <div className="flex flex-col">
      {/* soft glow behind the page, like the ChatGPT / Claude apps */}
      <div aria-hidden className="coach-glow pointer-events-none fixed inset-0 -z-10" />

      <header className="sticky top-0 z-20 -mx-4 -mt-5 mb-2 flex items-center justify-between gap-2 px-4 pt-3 pb-2 backdrop-blur-md">
        <ProfileChip />
        <div className="flex shrink-0 items-center gap-1">
          {canSpeak() && (
            <button
              aria-pressed={profile.speak}
              aria-label={profile.speak ? "关闭朗读" : "朗读教练的回复"}
              onClick={() => {
                if (profile.speak) stopSpeaking();
                else speak("好的,我会把回复读给你听");
                setState((s) => ({ ...s, profile: { ...s.profile, speak: !s.profile.speak } }));
              }}
              className={`flex h-10 w-10 items-center justify-center rounded-full border text-base ${
                profile.speak
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-line bg-card text-sub"
              }`}
            >
              {profile.speak ? "🔊" : "🔈"}
            </button>
          )}
          {chat.length > 0 && (
            <button
              aria-label="新对话"
              onClick={() => {
                if (confirm("开始新对话?(聊天记录会清空,训练记录和计划不会被删除)"))
                  setState((s) => ({ ...s, chat: [] }));
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card text-base text-ink"
            >
              ✎
            </button>
          )}
        </div>
      </header>

      {chat.length === 0 ? (
        <div className="flex min-h-[calc(100dvh-150px)] flex-col pb-[118px]">
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <CoachOrb size={64} />
            <h1 className="coach-hello mt-5 text-[28px] font-bold leading-tight tracking-tight">
              {hello}{profile.name ? `,${profile.name}` : ""}
            </h1>
            <p className="mt-2 text-[15px] text-sub">我是你的 AI 健身教练,今天想练什么?</p>
          </div>
          <div className="space-y-1">
            {STARTERS.map((s) => (
              <button
                key={s.label}
                onClick={() =>
                  s.photo ? fileRef.current?.click() : s.send && void sendToCoach(s.send)
                }
                className="flex w-full items-center gap-3.5 rounded-2xl px-2 py-3 text-left text-[16px] text-ink active:bg-primary-soft"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-card text-lg">
                  {s.icon}
                </span>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6 pt-2 pb-44">
          {chat.map((m, i) => {
            const isLast = i === chat.length - 1;
            const streaming = busy && isLast && m.role === "assistant";
            const shown = m.role === "assistant" ? visibleText(m.text) : m.text;
            return m.role === "user" ? (
              <div key={m.id} className="flex flex-col items-end gap-1.5">
                {m.image ? (
                  <img src={m.image} alt="你发的照片" className="max-h-56 max-w-[70%] rounded-3xl" />
                ) : m.image === "" ? (
                  <span className="text-xs text-sub">📷 照片(已不保留预览)</span>
                ) : null}
                <div className="msg-user max-w-[82%] whitespace-pre-wrap rounded-3xl px-4 py-2.5 text-[16px] leading-relaxed">
                  {m.text}
                </div>
              </div>
            ) : (
              <div key={m.id} className="space-y-3">
                {(shown || streaming) && (
                  <div>
                    <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-sub">
                      <CoachOrb size={20} />
                      AI 教练
                    </div>
                    {shown ? (
                      <div className="msg-ai text-[16px]">
                        <MD text={shown} />
                      </div>
                    ) : (
                      <span className="thinking text-[15px] font-medium">正在思考…</span>
                    )}
                  </div>
                )}
                {m.plan && <PlanCard plan={m.plan} />}
                {m.logged && (
                  <div className="inline-block rounded-full bg-mint-soft px-3 py-1 text-xs font-semibold text-mint">
                    ✓ 已记录:{m.logged}
                  </div>
                )}
                {m.exerciseAdded && (
                  <div className="inline-block rounded-full bg-mint-soft px-3 py-1 text-xs font-semibold text-mint">
                    ✓ 已加入动作库:{m.exerciseAdded}
                  </div>
                )}
                {m.mealLogged && (
                  <div className="inline-block rounded-full bg-mint-soft px-3 py-1 text-xs font-semibold text-mint">
                    🥗 已记录饮食:{m.mealLogged}
                  </div>
                )}
                {isLast && !busy && m.choices && m.choices.length > 0 && (
                  <div className="flex flex-col gap-2" role="group" aria-label="快捷回复">
                    {m.choices.map((c, k) => (
                      <ChoiceButton key={c} label={c} badge={"ABCD"[k]} onClick={() => submit(c)} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      )}

      <div className="fixed inset-x-0 bottom-[calc(58px+env(safe-area-inset-bottom))] z-10 bg-gradient-to-t from-bg via-bg/90 to-transparent px-4 pt-6 pb-2">
        <div className="mx-auto max-w-md">
          {(photo || photoErr || dictation.error || dictation.listening) && (
            <div className="mb-2 flex items-center gap-3 rounded-2xl border border-line bg-card p-2 text-sm">
              {photo && (
                <>
                  <img src={photo.thumb} alt="待发送的照片" className="h-14 w-14 rounded-xl object-cover" />
                  <span className="flex-1 text-sub">照片已选好,可以再补一句话,然后点发送</span>
                  <button className="px-2 text-sub" aria-label="移除照片" onClick={() => setPhoto(null)}>
                    ✕
                  </button>
                </>
              )}
              {!photo && dictation.listening && (
                <span className="flex-1 animate-pulse px-2 font-semibold text-primary">
                  🎙 正在听…说完会自动停
                </span>
              )}
              {!photo && !dictation.listening && (photoErr || dictation.error) && (
                <span className="flex-1 px-2 text-sub">{photoErr || dictation.error}</span>
              )}
            </div>
          )}
          <div className="chat-bar flex items-end gap-1 rounded-[28px] p-1.5">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onPhoto(f);
                e.target.value = "";
              }}
            />
            <button
              className={`${iconBtn} text-[24px] font-light text-ink`}
              aria-label="拍照或选照片发给教练"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              +
            </button>
            <textarea
              ref={boxRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                // Computer keyboard: Enter sends, Shift+Enter makes a new line.
                // Phone keyboard: Enter always makes a new line; tap ↑ to send.
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !isTouch()) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              enterKeyHint="enter"
              placeholder="问问 AI 教练…"
              aria-label="给教练发消息"
              className="max-h-[168px] min-h-10 min-w-0 flex-1 resize-none bg-transparent px-1 py-2 text-[16px] leading-6 outline-none placeholder:text-sub"
            />
            {dictation.supported && (
              <button
                className={`${iconBtn} ${dictation.listening ? "bg-primary text-white" : ""}`}
                aria-label={dictation.listening ? "停止语音输入" : "语音输入"}
                aria-pressed={dictation.listening}
                disabled={busy}
                onClick={() => (dictation.listening ? dictation.stop() : dictation.start())}
              >
                {dictation.listening ? "■" : "🎙"}
              </button>
            )}
            <button
              onClick={() => submit()}
              disabled={!canSend}
              aria-label="发送"
              className="send-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white transition disabled:opacity-30"
            >
              {busy ? <span className="h-3 w-3 rounded-[3px] bg-white" /> : "↑"}
            </button>
          </div>
          <p className="mt-1.5 text-center text-[11px] text-sub">
            AI 教练也会出错,关节痛或身体不舒服请先停下来
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CoachPage() {
  return (
    <Suspense>
      <Coach />
    </Suspense>
  );
}
