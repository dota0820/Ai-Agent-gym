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
      className={`lift rounded-3xl bg-card p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function H1({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <header className="mb-4">
      <h1 className="text-[30px] font-bold leading-tight">{children}</h1>
      {sub && <p className="mt-1.5 text-[14px] leading-relaxed text-sub">{sub}</p>}
    </header>
  );
}

export const btn =
  "inline-flex items-center justify-center rounded-full px-5 py-3.5 text-[16px] font-bold transition active:scale-[0.98] disabled:opacity-50";
export const btnPrimary = `${btn} bg-primary text-white`;
export const btnSoft = `${btn} bg-card text-ink`;
export const btnGhost = `${btn} bg-card text-sub`;
export const input =
  "w-full rounded-2xl border border-line bg-surface px-3.5 py-3 outline-none focus:border-deep";

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
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg text-deep">
        <Icon name={icon} size={18} />
      </span>
      <span className="flex-1 font-bold">{title}</span>
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
      <header className="flex items-center gap-3">
        <Link
          href="/me"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card text-ink lift"
          aria-label="返回我的"
        >
          <Icon name="chevronLeft" size={22} />
        </Link>
        <h1 className="text-[26px] font-bold">{title}</h1>
      </header>
      {children}
    </div>
  );
}
