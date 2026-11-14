"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "今天", icon: "🏠" },
  { href: "/coach", label: "教练", icon: "💬" },
  { href: "/history", label: "记录", icon: "📒" },
  { href: "/library", label: "动作", icon: "📖" },
  { href: "/me", label: "我的", icon: "🙂" },
];

export default function TabBar() {
  const path = usePathname();
  if (path.startsWith("/workout")) return null;
  return (
    <nav className="safe-b fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card/95 backdrop-blur">
      <ul className="mx-auto flex max-w-md">
        {TABS.map((t) => {
          const on = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${
                  on ? "font-semibold text-primary" : "text-sub"
                }`}
              >
                <span className={`text-xl ${on ? "" : "opacity-60 grayscale"}`}>
                  {t.icon}
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
