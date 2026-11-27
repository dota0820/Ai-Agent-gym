"use client";
import { useEffect } from "react";
import {
  deleteChatThread,
  localDateStr,
  selectChatThread,
  startNewChatThread,
  useApp,
} from "@/lib/store";
import type { ChatThread } from "@/lib/types";
import Icon from "./Icon";

function groupLabel(iso: string, today: string, yesterday: string): string {
  const d = localDateStr(iso);
  if (d === today) return "今天";
  if (d === yesterday) return "昨天";
  return "更早";
}

export default function ChatThreadsSheet({
  onClose,
  disabled = false,
}: {
  onClose: () => void;
  disabled?: boolean;
}) {
  const { threads, activeThreadId } = useApp();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const now = new Date();
  const today = localDateStr(now);
  const yestDate = new Date(now);
  yestDate.setDate(now.getDate() - 1);
  const yesterday = localDateStr(yestDate);

  const groups: { label: string; list: ChatThread[] }[] = [];
  for (const t of threads) {
    const lbl = groupLabel(t.updatedAt, today, yesterday);
    const hit = groups.find((g) => g.label === lbl);
    if (hit) hit.list.push(t);
    else groups.push({ label: lbl, list: [t] });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/45 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="safe-b rise-in mx-auto flex max-h-[82dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-bg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="对话记录"
      >
        <div className="flex justify-center pt-2.5 pb-1">
          <span className="h-1 w-10 rounded-full bg-line" aria-hidden />
        </div>

        <div className="flex shrink-0 items-center justify-between border-b border-line px-4 pb-3 pt-1">
          <h2 className="text-base font-bold">对话记录</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                startNewChatThread();
                onClose();
              }}
              className="inline-flex min-h-9 items-center gap-1 rounded-full bg-primary px-3 text-xs font-bold text-white disabled:opacity-40"
            >
              <Icon name="plus" size={14} stroke={2.5} />
              新对话
            </button>
            <button
              type="button"
              aria-label="关闭"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-sub active:bg-line/50"
            >
              <Icon name="x" size={18} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-4">
          {threads.length === 0 ? (
            <p className="py-10 text-center text-sm text-sub">暂无历史对话</p>
          ) : (
            groups.map((g) => (
              <div key={g.label} className="space-y-1.5">
                <div className="px-1 text-[11px] font-semibold text-sub">{g.label}</div>
                <ul className="space-y-1.5">
                  {g.list.map((t) => {
                    const active = t.id === activeThreadId;
                    const count = t.messages.filter((m) => m.role === "user").length;
                    return (
                      <li
                        key={t.id}
                        className={`flex items-center gap-1 rounded-2xl border pr-1.5 transition ${
                          active
                            ? "border-primary bg-primary-soft/60"
                            : "border-line bg-card"
                        }`}
                      >
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            selectChatThread(t.id);
                            onClose();
                          }}
                          className="min-w-0 flex-1 px-3.5 py-2.5 text-left disabled:opacity-50"
                        >
                          <div className="truncate text-sm font-semibold text-ink">
                            {t.title || "新对话"}
                          </div>
                          <div className="mt-0.5 text-[11px] text-sub">
                            {count} 轮提问 · {t.updatedAt.slice(5, 10).replace("-", "/")}
                          </div>
                        </button>
                        <button
                          type="button"
                          aria-label={`删除对话 ${t.title}`}
                          disabled={disabled}
                          onClick={() => {
                            if (confirm(`删除「${t.title}」这段对话？`)) {
                              deleteChatThread(t.id);
                            }
                          }}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sub active:bg-bg disabled:opacity-40"
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
