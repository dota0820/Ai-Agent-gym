"use client";
import { useEffect, useState } from "react";

/**
 * The coach's mark: a small round dumbbell with a face. Colours follow the
 * active theme. `thinking` squints the eyes and makes it "lift" (see globals.css).
 */
export default function CoachMascot({
  size = 36,
  thinking = false,
  label,
}: {
  size?: number;
  thinking?: boolean;
  label?: string;
}) {
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  return (
    <span className={`inline-flex shrink-0 ${thinking ? "mascot-lift" : ""}`}>
      <svg width={size} height={size} viewBox="0 0 40 40" {...a11y}>
        <rect x="2" y="13" width="5" height="14" rx="2.5" fill="var(--c-primary)" />
        <rect x="33" y="13" width="5" height="14" rx="2.5" fill="var(--c-primary)" />
        <rect x="6" y="8" width="7" height="24" rx="3.5" fill="var(--c-primary)" />
        <rect x="27" y="8" width="7" height="24" rx="3.5" fill="var(--c-primary)" />
        <rect x="8" y="10.5" width="2" height="7" rx="1" fill="#fff" opacity="0.5" />
        <rect x="29" y="10.5" width="2" height="7" rx="1" fill="#fff" opacity="0.5" />
        <rect x="12" y="14" width="16" height="12" rx="6" fill="#fff" stroke="var(--c-primary)" strokeWidth="2" />
        {thinking ? (
          <>
            <path d="M15.8 19.4q1.2-1.2 2.4 0" stroke="#2a2733" strokeWidth="1.3" fill="none" strokeLinecap="round" />
            <path d="M21.8 19.4q1.2-1.2 2.4 0" stroke="#2a2733" strokeWidth="1.3" fill="none" strokeLinecap="round" />
            <circle cx="20" cy="22.6" r="1.1" fill="#2a2733" />
          </>
        ) : (
          <>
            <circle cx="17" cy="19.2" r="1.3" fill="#2a2733" />
            <circle cx="23" cy="19.2" r="1.3" fill="#2a2733" />
            <path d="M18.4 22.1q1.6 1.4 3.2 0" stroke="#2a2733" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          </>
        )}
        <circle cx="15.2" cy="21.8" r="1.3" fill="var(--c-muscle-2)" />
        <circle cx="24.8" cy="21.8" r="1.3" fill="var(--c-muscle-2)" />
      </svg>
    </span>
  );
}

/** The "coach is thinking" row: lifting mascot, shimmering line, bouncing dots. */
const THINKING_LINES = ["正在思考…", "正在翻看你最近的记录…", "正在想怎么帮你安排…", "马上就好…"];

export function CoachThinking() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, THINKING_LINES.length - 1)), 2600);
    return () => clearInterval(t);
  }, []);
  const text = THINKING_LINES[i];
  return (
    <div role="status" aria-label="教练正在思考" className="flex items-center gap-3">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft">
        <CoachMascot size={36} thinking />
      </span>
      <div className="flex flex-col gap-1.5">
        <span className="thinking text-[15px] font-semibold">{text}</span>
        <span className="flex gap-1.5" aria-hidden>
          <span className="dot-bounce h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="dot-bounce h-1.5 w-1.5 rounded-full bg-primary [animation-delay:0.15s]" />
          <span className="dot-bounce h-1.5 w-1.5 rounded-full bg-primary [animation-delay:0.3s]" />
        </span>
      </div>
    </div>
  );
}
