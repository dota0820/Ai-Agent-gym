"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isCoachBusy } from "@/lib/actions";
import { startNewChatThread } from "@/lib/store";
import Icon, { type IconName } from "./Icon";

const TABS: { href: string; label: string; icon: IconName; also?: string[] }[] =
  [
    { href: "/", label: "今天", icon: "bolt" },
    { href: "/coach", label: "教练", icon: "robot" },
    { href: "/food", label: "饮食", icon: "nutrition" },
    // the exercise library lives under 记录 now
    {
      href: "/history",
      label: "记录",
      icon: "chart",
      also: ["/library", "/learn"],
    },
    { href: "/me", label: "我的", icon: "account" },
  ];

export default function TabBar() {
  const path = usePathname();
  if (path.startsWith("/workout")) return null;
  return (
    <nav
      aria-label="主导航"
      className="safe-b fixed inset-x-0 bottom-0 z-20 bg-card/95 shadow-[0_-2px_16px_rgba(22,51,0,0.05)] backdrop-blur-xl"
    >
      <div className="px-6">
        <ul className="mx-auto flex max-w-md">
          {TABS.map((t) => {
            const on =
              t.href === "/"
                ? path === "/" || path.startsWith("/plan")
                : [t.href, ...(t.also ?? [])].some((h) => path.startsWith(h));
            return (
              <li key={t.href} className="flex-1">
                <Link
                  href={t.href}
                  aria-current={on ? "page" : undefined}
                  onClick={() => {
                    if (
                      t.href === "/coach" &&
                      path === "/coach" &&
                      !isCoachBusy()
                    ) {
                      startNewChatThread();
                    }
                  }}
                  className={`flex flex-col items-center gap-1 pt-3 pb-2 text-[11px] ${
                    on ? "font-bold text-forest" : "text-sub"
                  }`}
                >
                  <span
                    className={`flex h-[33px] w-[52px] items-center justify-center rounded-full transition-colors ${
                      on ? "bg-primary text-forest" : ""
                    }`}
                  >
                    <Icon name={t.icon} size={24} fill={on} />
                  </span>
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
