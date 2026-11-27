"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isCoachBusy } from "@/lib/actions";
import { startNewChatThread } from "@/lib/store";
import Icon, { type IconName } from "./Icon";

const TABS: { href: string; label: string; icon: IconName; also?: string[] }[] =
  [
    { href: "/", label: "今天", icon: "home" },
    { href: "/coach", label: "教练", icon: "chat" },
    { href: "/food", label: "饮食", icon: "food" },
    // the exercise library lives under 记录 now
    {
      href: "/history",
      label: "记录",
      icon: "clipboard",
      also: ["/library", "/learn"],
    },
    { href: "/me", label: "我的", icon: "user" },
  ];

export default function TabBar() {
  const path = usePathname();
  if (path.startsWith("/workout")) return null;
  return (
    <nav
      aria-label="主导航"
      className="safe-b fixed inset-x-0 bottom-0 z-20 bg-bg/95 backdrop-blur"
    >
      <div className="px-6">
        <ul className="mx-auto flex max-w-md border-t border-line">
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
                    on ? "font-bold text-ink" : "text-sub"
                  }`}
                >
                  <span
                    className={`flex h-[33px] w-[52px] items-center justify-center rounded-full transition-colors ${
                      on ? "bg-primary text-ink" : ""
                    }`}
                  >
                    <Icon name={t.icon} size={22} />
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
