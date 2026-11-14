import Link from "next/link";
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
  "w-full rounded-xl border border-line bg-surface px-3 py-2.5 outline-none focus:border-primary";

export function Row({
  href,
  icon,
  title,
  value,
}: {
  href: string;
  icon: string;
  title: string;
  value?: ReactNode;
}) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3.5 active:bg-bg">
      <span className="text-lg">{icon}</span>
      <span className="flex-1 font-semibold">{title}</span>
      {value && <span className="max-w-[45%] truncate text-sm text-sub">{value}</span>}
      <span className="text-sub">›</span>
    </Link>
  );
}

export function SubPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <Link href="/me" className="-ml-2 px-2 py-1 text-xl text-sub" aria-label="返回我的">
          ‹
        </Link>
        <h1 className="text-xl font-bold">{title}</h1>
      </header>
      {children}
    </div>
  );
}
