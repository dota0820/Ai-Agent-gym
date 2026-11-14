import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-line bg-card p-4 shadow-[0_1px_2px_rgba(42,39,51,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

export function H1({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <header className="mb-4">
      <h1 className="text-2xl font-bold tracking-tight">{children}</h1>
      {sub && <p className="mt-1 text-sm text-sub">{sub}</p>}
    </header>
  );
}

export const btn =
  "inline-flex items-center justify-center rounded-xl px-4 py-3 text-[15px] font-semibold transition active:scale-[0.98] disabled:opacity-50";
export const btnPrimary = `${btn} bg-primary text-white`;
export const btnSoft = `${btn} bg-primary-soft text-primary`;
export const btnGhost = `${btn} border border-line bg-card text-ink`;
export const input =
  "w-full rounded-xl border border-line bg-white px-3 py-2.5 outline-none focus:border-primary";
