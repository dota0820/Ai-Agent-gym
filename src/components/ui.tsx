import Link from "next/link";
import type { ReactNode } from "react";
import Icon, { type IconName } from "./Icon";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-line bg-card p-4 ${className}`}
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
export const btnSoft = `${btn} bg-primary-soft text-deep`;
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
  icon: IconName;
  title: string;
  value?: ReactNode;
}) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3.5 active:bg-bg">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-deep">
        <Icon name={icon} size={18} />
      </span>
      <span className="flex-1 font-semibold">{title}</span>
      {value && <span className="max-w-[45%] truncate text-sm text-sub">{value}</span>}
      <span className="text-sub">
        <Icon name="chevronRight" size={18} />
      </span>
    </Link>
  );
}

export function SubPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <Link
          href="/me"
          className="-ml-2 flex h-11 w-11 items-center justify-center text-sub"
          aria-label="返回我的"
        >
          <Icon name="chevronLeft" size={22} />
        </Link>
        <h1 className="text-xl font-bold">{title}</h1>
      </header>
      {children}
    </div>
  );
}
