"use client";
/* eslint-disable @next/next/no-img-element */
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import ChatThreadsSheet from "@/components/ChatThreadsSheet";
import CoachMascot, { CoachThinking } from "@/components/CoachMascot";
import Icon, { type IconName } from "@/components/Icon";
import MD from "@/components/MD";
import PlanCard from "@/components/PlanCard";
import { planMinutes } from "@/lib/plan-time";
import type { Plan } from "@/lib/types";
import {
  abortCoach,
  fileToJpegDataUrl,
  isCoachBusy,
  sendToCoach,
  useCoachBusy,
  useCoachToolStatus,
  visibleText,
} from "@/lib/actions";
import {
  setState,
  startNewChatThread,
  useApp,
  useStorageWarning,
} from "@/lib/store";
import { canSpeak, speak, stopSpeaking, useDictation } from "@/lib/voice";

/** Suggestions on the empty screen; `photo` opens the camera instead of sending. */
const STARTERS: {
  icon: IconName;
  label: string;
  send?: string;
  photo?: boolean;
  href?: string;
}[] = [
  {
    icon: "calendar",
    label: "安排今日训练",
    send: "帮我安排今天的训练,根据我最近的记录决定练哪里",
  },
  { icon: "target", label: "下次练什么", send: "下次我应该练什么?" },
  {
    icon: "dumbbell",
    label: "学动作做法",
    send: "我想学一个动作的正确做法,你先问我是哪个动作",
  },
  { icon: "camera", label: "拍器械问用法", photo: true },
  { icon: "bulb", label: "新手避坑指南", href: "/learn" },
];

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
      type="button"
      onClick={onClick}
      className="lift flex w-full items-center gap-3 rounded-[22px] bg-card px-3.5 py-3 text-left text-[15px] font-medium active:scale-[0.99]"
    >
      {badge && (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-deep">
          {badge}
        </span>
      )}
      <span className="min-w-0 flex-1">{label}</span>
      <Icon name="arrowRight" size={18} className="text-deep" />
    </button>
  );
}

/** Phones and tablets: Enter makes a new line and the send button sends (like ChatGPT). */
const isTouch = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(pointer: coarse)").matches;

function Coach() {
  const { chat, threads, activeThreadId, profile, plan } = useApp();
  const busy = useCoachBusy();
  const toolStatus = useCoachToolStatus();
  const storageWarning = useStorageWarning();
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<{ full: string; thumb: string } | null>(
    null,
  );
  const [photoErr, setPhotoErr] = useState("");
  const [showThreads, setShowThreads] = useState(false);
  const params = useSearchParams();
  const router = useRouter();
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const sentQ = useRef<string | null>(null);
  const didFreshMount = useRef(false);
  const dictPrefixRef = useRef("");
  const dictation = useDictation((t) => {
    const prefix = dictPrefixRef.current;
    setText(prefix ? `${prefix}${t}` : t);
  });

  const q = params.get("q");
  useEffect(() => {
    if (didFreshMount.current) return;
    didFreshMount.current = true;
    if (!q && !isCoachBusy()) {
      startNewChatThread();
    }
  }, [q]);

  useEffect(() => {
    if (!q || sentQ.current === q) return;
    sentQ.current = q;
    router.replace("/coach");
    startNewChatThread();
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
    return () =>
      els.forEach((e, i) => (e.style.overscrollBehaviorY = before[i]));
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
      setPhotoErr("这张照片打不开，换一张试试。");
    }
  }

  const hour = new Date().getHours();
  const hello = hour < 11 ? "早上好" : hour < 18 ? "下午好" : "晚上好";
  const canSend = !busy && (!!text.trim() || !!photo);
  const currentThread = threads.find((t) => t.id === activeThreadId);
  const iconBtn =
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sub active:bg-primary-soft disabled:opacity-40";

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-20 -mx-4 -mt-5 mb-4 bg-bg/95 px-4 pt-3 backdrop-blur-md">
        <div className="flex items-start justify-between gap-2 border-b border-line pb-4">
          <div className="min-w-0">
            <h1 className="text-[29px] font-bold leading-tight">
              你的 AI 教练
            </h1>
            <div className="mt-2 flex items-center gap-2 text-[12px] text-sub">
              <span
                className={`h-[7px] w-[7px] shrink-0 rounded-full bg-ink ${busy ? "animate-pulse" : ""}`}
              />
              <span className="truncate">
                {busy
                  ? toolStatus || "思考中…"
                  : currentThread?.title || "懂你的目标，也懂你的状态"}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canSpeak() && (
              <button
                type="button"
                aria-pressed={profile.speak}
                aria-label={profile.speak ? "关闭朗读" : "朗读教练的回复"}
                onClick={() => {
                  if (profile.speak) stopSpeaking();
                  else speak("好的,我会把回复读给你听");
                  setState((s) => ({
                    ...s,
                    profile: { ...s.profile, speak: !s.profile.speak },
                  }));
                }}
                className={`flex h-[43px] w-[43px] items-center justify-center rounded-full lift ${
                  profile.speak ? "bg-primary text-ink" : "bg-card text-sub"
                }`}
              >
                <Icon name={profile.speak ? "volume" : "mute"} size={18} />
              </button>
            )}
            {chat.length > 0 && (
              <button
                type="button"
                aria-label="新对话"
                disabled={busy}
                onClick={() => {
                  stopSpeaking();
                  startNewChatThread();
                }}
                className="flex h-[43px] w-[43px] items-center justify-center lift rounded-full bg-card text-ink active:bg-primary-soft disabled:opacity-40"
              >
                <Icon name="pen" size={18} />
              </button>
            )}
            <button
              type="button"
              aria-label="对话记录"
              onClick={() => setShowThreads(true)}
              className="relative flex h-[43px] w-[43px] shrink-0 items-center justify-center lift rounded-full bg-card text-ink active:bg-primary-soft"
            >
              <Icon name="history" size={22} />
              {threads.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold">
                  {threads.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {storageWarning && (
        <div className="mb-3 rounded-2xl border border-primary/30 bg-primary-soft px-3.5 py-2.5 text-xs font-semibold text-deep">
          {storageWarning}
        </div>
      )}

      {chat.length === 0 ? (
        <div className="flex min-h-[calc(100dvh-230px)] flex-col pb-[96px]">
          <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
            <span className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-soft">
              <CoachMascot size={72} label="哑铃教练" />
            </span>
            <h2 className="mt-5 text-[28px] font-bold leading-tight">
              {hello}
              {profile.name ? `，${profile.name}` : ""}
            </h2>
            <p className="mt-2 text-[15px] text-sub">今天想练什么？</p>
          </div>
          <div className="space-y-2">
            {STARTERS.map((s) => (
              <button
                key={s.label}
                onClick={() =>
                  s.href
                    ? router.push(s.href)
                    : s.photo
                      ? fileRef.current?.click()
                      : s.send && void sendToCoach(s.send)
                }
                className="lift flex w-full items-center gap-3.5 rounded-[22px] bg-card px-3 py-2.5 text-left text-[15px] font-semibold text-forest active:scale-[0.99]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-deep">
                  <Icon name={s.icon} size={21} />
                </span>
                <span className="flex-1">{s.label}</span>
                <Icon name="chevronRight" size={20} className="text-sub" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6 pt-1 pb-32">
          {chat.map((m, i) => {
            const isLast = i === chat.length - 1;
            const streaming = busy && isLast && m.role === "assistant";
            const shown = m.role === "assistant" ? visibleText(m.text) : m.text;
            return m.role === "user" ? (
              <div key={m.id} className="flex flex-col items-end gap-1.5">
                {m.image ? (
                  <img
                    src={m.image}
                    alt="你发的照片"
                    className="max-h-56 max-w-[70%] rounded-3xl"
                  />
                ) : m.image === "" ? (
                  <span className="flex items-center gap-1 text-xs text-sub">
                    <Icon name="camera" size={14} />
                    照片(已不保留预览)
                  </span>
                ) : null}
                {m.text.trim() && (
                  <div className="msg-user max-w-[82%] whitespace-pre-wrap rounded-[28px] rounded-br-md px-5 py-3.5 text-[15px] leading-relaxed">
                    {m.text}
                  </div>
                )}
              </div>
            ) : (
              <div key={m.id} className="space-y-3">
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-[12px] font-bold text-sub">
                    <CoachMascot size={20} />
                    AI 教练
                  </div>
                  {(shown || streaming) &&
                    (shown ? (
                      <div>
                        <div className="msg-ai text-[15px]">
                          <MD text={shown} />
                        </div>
                        {streaming && toolStatus && (
                          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-deep">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                            {toolStatus}
                          </div>
                        )}
                      </div>
                    ) : (
                      <CoachThinking statusText={toolStatus} />
                    ))}
                  {m.plan && (
                    <ChatPlan plan={m.plan} current={m.plan.id === plan?.id} />
                  )}
                  {(m.logged || m.exerciseAdded || m.mealLogged) && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.logged && (
                        <div className="inline-flex items-center rounded-full bg-mint-soft px-3 py-1 text-xs font-semibold text-mint">
                          <Icon
                            name="check"
                            size={13}
                            stroke={3}
                            className="mr-1 inline"
                          />
                          已记录：{m.logged}
                        </div>
                      )}
                      {m.exerciseAdded && (
                        <div className="inline-flex items-center rounded-full bg-mint-soft px-3 py-1 text-xs font-semibold text-mint">
                          <Icon
                            name="check"
                            size={13}
                            stroke={3}
                            className="mr-1 inline"
                          />
                          已加入动作库：{m.exerciseAdded}
                        </div>
                      )}
                      {m.mealLogged && (
                        <div className="inline-flex items-center rounded-full bg-mint-soft px-3 py-1 text-xs font-semibold text-mint">
                          <Icon
                            name="check"
                            size={13}
                            stroke={3}
                            className="mr-1 inline"
                          />
                          已记录饮食：{m.mealLogged}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {isLast && !busy && m.choices && m.choices.length > 0 && (
                  <div
                    className="flex flex-col gap-2"
                    role="group"
                    aria-label="快捷回复"
                  >
                    {m.choices.map((c, k) => (
                      <ChoiceButton
                        key={c}
                        label={c}
                        badge={"ABCD"[k]}
                        onClick={() => submit(c)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      )}

      <div className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-10 bg-gradient-to-t from-bg via-bg/92 to-transparent px-4 pt-5 pb-2">
        <div className="mx-auto max-w-md">
          {(photo || photoErr || dictation.error || dictation.listening) && (
            <div className="mb-2 flex items-center gap-3 rounded-2xl border border-line bg-card p-2 text-sm">
              {photo && (
                <>
                  <img
                    src={photo.thumb}
                    alt="待发送的照片"
                    className="h-14 w-14 rounded-xl object-cover"
                  />
                  <span className="flex-1 text-sub">已选照片，可补文字</span>
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center text-sub"
                    aria-label="移除照片"
                    onClick={() => setPhoto(null)}
                  >
                    <Icon name="x" size={18} />
                  </button>
                </>
              )}
              {!photo && dictation.listening && (
                <span className="flex flex-1 animate-pulse items-center gap-1.5 px-2 font-semibold text-deep">
                  <Icon name="mic" size={16} />
                  聆听中…
                </span>
              )}
              {!photo &&
                !dictation.listening &&
                (photoErr || dictation.error) && (
                  <span className="flex-1 px-2 text-sub">
                    {photoErr || dictation.error}
                  </span>
                )}
            </div>
          )}
          <div className="chat-bar flex items-end gap-1 rounded-full p-[7px]">
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
              type="button"
              className={`${iconBtn} text-ink`}
              aria-label="拍照或选照片发给教练"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              <Icon name="plus" size={22} />
            </button>
            <textarea
              ref={boxRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                // Computer keyboard: Enter sends, Shift+Enter makes a new line.
                // Phone keyboard: Enter always makes a new line; tap ↑ to send.
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing &&
                  !isTouch()
                ) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              enterKeyHint="enter"
              placeholder="向 AI 私教提问或调整计划…"
              aria-label="给教练发消息"
              className="max-h-[168px] min-h-10 min-w-0 flex-1 resize-none bg-transparent px-1 py-2 text-[16px] leading-6 outline-none placeholder:text-sub"
            />
            {dictation.supported && (
              <button
                type="button"
                className={`${iconBtn} ${dictation.listening ? "bg-primary text-white" : ""}`}
                aria-label={dictation.listening ? "停止语音输入" : "语音输入"}
                aria-pressed={dictation.listening}
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
                <Icon name={dictation.listening ? "stop" : "mic"} size={20} />
              </button>
            )}
            <button
              type="button"
              onClick={() => (busy ? abortCoach() : submit())}
              disabled={!busy && !canSend}
              aria-label={busy ? "停止生成" : "发送"}
              className="send-btn flex h-[44px] w-[44px] shrink-0 shadow-[0_4px_14px_color-mix(in_srgb,var(--c-primary)_45%,transparent)] items-center justify-center rounded-full transition disabled:opacity-30"
            >
              {busy ? (
                <span className="h-3 w-3 rounded-[3px] bg-[var(--c-on-accent)]" />
              ) : (
                <Icon name="up" size={20} stroke={2.5} />
              )}
            </button>
          </div>
          <p className="mt-1.5 text-center text-xs text-sub">
            AI 仅供参考，不适请停止
          </p>
        </div>
      </div>

      {showThreads && (
        <ChatThreadsSheet
          disabled={busy}
          onClose={() => setShowThreads(false)}
        />
      )}
    </div>
  );
}

/** A plan the coach saved: stats and one button, like a receipt. */
function ChatPlan({ plan, current }: { plan: Plan; current: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const sets = plan.items.reduce((n, it) => n + it.sets, 0);
  return (
    <div className="space-y-3">
      <div className="lift rounded-[22px] bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-[15px] font-bold text-forest">
            今日定制 · {plan.title}
          </span>
          <span className="shrink-0 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold text-forest">
            {current ? "AI 推荐" : "之前的计划"}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { v: plan.items.length, u: "个", l: "动作" },
            { v: planMinutes(plan), u: "分", l: "预估时长" },
            { v: sets, u: "组", l: "训练总量" },
          ].map((x) => (
            <div
              key={x.l}
              className="lift rounded-2xl bg-card py-2.5 text-center"
            >
              <div className="flex items-baseline justify-center gap-0.5 text-forest">
                <span className="display-num text-[22px] leading-none">
                  {x.v}
                </span>
                <span className="text-[12px] font-semibold">{x.u}</span>
              </div>
              <div className="mt-1 text-[11px] font-semibold text-sub">
                {x.l}
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => (current ? router.push("/plan") : setOpen(!open))}
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-[15px] font-bold text-forest"
        >
          <Icon
            name={current ? "checkCircle" : open ? "x" : "chevronDown"}
            size={20}
          />
          {current ? "查看并开始" : open ? "收起" : "展开计划"}
        </button>
      </div>
      {open && !current && <PlanCard plan={plan} />}
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
