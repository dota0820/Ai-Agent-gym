"use client";
import { useState } from "react";

const parse = (t: string): number | null => {
  const n = Number(t.replace(",", "."));
  return t.trim() === "" || isNaN(n) ? null : n;
};

/**
 * Number field that keeps what the user typed (e.g. "22." or "7,5") while
 * reporting the parsed value, so decimals can be entered normally.
 */
export default function NumInput({
  value,
  onChange,
  decimal = false,
  ...rest
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  decimal?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [text, setText] = useState(value == null ? "" : String(value));
  const [seen, setSeen] = useState(value);
  // value changed from outside (e.g. weight carried over to the next set)
  if (value !== seen) {
    setSeen(value);
    if (parse(text) !== value) setText(value == null ? "" : String(value));
  }
  return (
    <input
      {...rest}
      type="text"
      inputMode={decimal ? "decimal" : "numeric"}
      value={text}
      onChange={(e) => {
        const t = e.target.value;
        if (!(decimal ? /^\d*[.,]?\d*$/ : /^\d*$/).test(t)) return;
        setText(t);
        const v = parse(t);
        setSeen(v);
        onChange(v);
      }}
    />
  );
}
