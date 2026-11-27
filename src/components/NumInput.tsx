"use client";
import { useState } from "react";

const parse = (t: string): number | null => {
  const cleaned = t.trim().replace(",", ".");
  if (!cleaned || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isNaN(n) ? null : n;
};

/**
 * Number field that keeps what the user typed (e.g. "22." or "7,5") while
 * reporting the parsed value, so decimals can be entered normally.
 * Pass `step` to show compact +/- stepper buttons for one-handed gym entry.
 */
export default function NumInput({
  value,
  onChange,
  decimal = false,
  step,
  min = 0,
  className = "",
  onFocus,
  onBlur,
  ...rest
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  decimal?: boolean;
  step?: number;
  min?: number;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [draft, setDraft] = useState<{ base: number | null; text: string } | null>(null);
  const text =
    draft && draft.base === value ? draft.text : value == null ? "" : String(value);

  const bump = (delta: number) => {
    const base = value ?? 0;
    const next = Math.max(min, Math.round((base + delta) * 100) / 100);
    setDraft(null);
    onChange(next);
  };

  const inputEl = (
    <input
      {...rest}
      type="text"
      inputMode={decimal ? "decimal" : "numeric"}
      value={text}
      className={className}
      onFocus={(e) => {
        e.currentTarget.select();
        onFocus?.(e);
      }}
      onBlur={(e) => {
        const v = parse(text);
        setDraft(null);
        if (v != null && v < min) onChange(min);
        onBlur?.(e);
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d.,]/g, "");
        if (!(decimal ? /^\d*[.,]?\d*$/ : /^\d*$/).test(raw)) return;
        const parsed = parse(raw);
        setDraft({ base: parsed, text: raw });
        onChange(parsed);
      }}
    />
  );

  if (!step) return inputEl;

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="减少"
        onClick={() => bump(-step)}
        className="flex h-10 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-bg text-sm font-bold text-sub active:bg-primary-soft active:text-deep"
      >
        −
      </button>
      <div className="min-w-0 flex-1">{inputEl}</div>
      <button
        type="button"
        aria-label="增加"
        onClick={() => bump(step)}
        className="flex h-10 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-bg text-sm font-bold text-sub active:bg-primary-soft active:text-deep"
      >
        +
      </button>
    </div>
  );
}
