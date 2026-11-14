"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import MD from "@/components/MD";
import PlanCard from "@/components/PlanCard";
import { sendToCoach, useCoachBusy } from "@/lib/actions";
import { setState, useApp, useHydrated } from "@/lib/store";

const STARTERS = [
  "今天想练背,帮我安排一下",
  "我是完全的新手,第一次去健身房应该做什么?",
  "下次我应该练什么?",
  "高位下拉我总是手臂酸、背没感觉,怎么办?",
];

function Coach() {
  const { chat } = useApp();
  const ready = useHydrated();
  const busy = useCoachBusy();
  const [text, setText] = useState("");
  const params = useSearchParams();
  const router = useRouter();
  const endRef = useRef<HTMLDivElement>(null);
  const sentQ = useRef<string | null>(null);

  const q = params.get("q");
  useEffect(() => {
    if (!ready || !q || sentQ.current === q) return;
    sentQ.current = q;
    router.replace("/coach");
    void sendToCoach(q);
  }, [ready, q, router]);

  const lastLen = chat[chat.length - 1]?.text.length ?? 0;
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [chat.length, lastLen]);

  const submit = () => {
    if (!text.trim() || busy) return;
    void sendToCoach(text);
    setText("");
  };

  if (!ready) return null;

  return (
    <div className="flex flex-col">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI 教练</h1>
          <p className="text-sm text-sub">问动作、排计划、聊下次练什么</p>
        </div>
        {chat.length > 0 && (
          <button
            className="text-sm text-sub underline"
            onClick={() => {
              if (confirm("清空聊天记录?(训练记录和计划不会被删除)"))
                setState((s) => ({ ...s, chat: [] }));
            }}
          >
            清空
          </button>
        )}
      </header>

      {chat.length === 0 && (
        <div className="space-y-2">
          <p className="rounded-2xl bg-card p-4 text-[15px] leading-relaxed">
            嗨,我是你的健身教练 💪 告诉我今天想练哪里,我会看你之前的记录,帮你排好动作、组数和重量,每个动作都有详细做法。
          </p>
          {STARTERS.map((s) => (
            <button
              key={s}
              onClick={() => void sendToCoach(s)}
              className="block w-full rounded-2xl border border-line bg-card px-4 py-3 text-left text-[15px] active:scale-[0.99]"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3 pb-24">
        {chat.map((m, i) => {
          const streaming = busy && i === chat.length - 1 && m.role === "assistant";
          return m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[15px] text-white">
                {m.text}
              </div>
            </div>
          ) : (
            <div key={m.id} className="space-y-2">
              {(m.text || streaming) && (
                <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-card px-4 py-2.5">
                  {m.text ? (
                    <MD text={m.text} />
                  ) : (
                    <span className="animate-pulse text-sm text-sub">教练正在想…</span>
                  )}
                </div>
              )}
              {m.plan && <PlanCard plan={m.plan} />}
              {m.logged && (
                <div className="inline-block rounded-full bg-mint-soft px-3 py-1 text-xs font-semibold text-mint">
                  ✓ 已记录:{m.logged}
                </div>
              )}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="fixed inset-x-0 bottom-[calc(58px+env(safe-area-inset-bottom))] z-10 bg-gradient-to-t from-bg via-bg to-transparent px-4 pt-4 pb-2">
        <div className="mx-auto flex max-w-md items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="跟教练说点什么…"
            aria-label="给教练发消息"
            className="max-h-32 min-h-[46px] flex-1 resize-none rounded-2xl border border-line bg-white px-4 py-2.5 outline-none focus:border-primary"
          />
          <button
            onClick={submit}
            disabled={busy || !text.trim()}
            className="h-[46px] shrink-0 rounded-2xl bg-primary px-4 font-semibold text-white disabled:opacity-40"
          >
            {busy ? "…" : "发送"}
          </button>
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
