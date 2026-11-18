"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "./Icon";

const TABS: { href: string; label: string; icon: IconName; also?: string[] }[] = [
  { href: "/", label: "今天", icon: "home" },
  { href: "/coach", label: "教练", icon: "chat" },
  { href: "/food", label: "饮食", icon: "food" },
  // the exercise library lives under 记录 now
  { href: "/history", label: "记录", icon: "clipboard", also: ["/library"] },
  { href: "/me", label: "我的", icon: "user" },
];

export default function TabBar() {
  const path = usePathname();
  if (path.startsWith("/workout")) return null;
  return (
    <nav
      aria-label="主导航"
      className="safe-b fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card/95 backdrop-blur"
    >
      <ul className="mx-auto flex max-w-md">
        {TABS.map((t) => {
          const on =
            t.href === "/"
              ? path === "/"
              : [t.href, ...(t.also ?? [])].some((h) => path.startsWith(h));
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 pt-1.5 pb-2 text-[11px] ${
                  on ? "font-bold text-deep" : "text-sub"
                }`}
              >
                <span
                  className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                    on ? "bg-primary-soft" : ""
                  }`}
                >
                  <Icon name={t.icon} size={20} />
                </span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
