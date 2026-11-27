import Link from "next/link";
import Icon, { type IconName } from "./Icon";

const ITEMS: { id: "log" | "library" | "learn"; href: string; label: string; icon: IconName }[] = [
  { id: "log", href: "/history", label: "记录", icon: "clipboard" },
  { id: "library", href: "/library", label: "动作库", icon: "book" },
  { id: "learn", href: "/learn", label: "指南", icon: "bulb" },
];

/** 记录 tab header: switches between the logs, the exercise library and the pitfalls guide. */
export default function RecordSwitch({ on }: { on: "log" | "library" | "learn" }) {
  const item = (active: boolean) =>
    `flex h-10 items-center justify-center gap-1 rounded-xl text-[13px] font-bold transition ${
      active ? "bg-card text-deep shadow-sm" : "text-sub"
    }`;
  return (
    <nav aria-label="记录" className="grid grid-cols-3 gap-1 rounded-2xl bg-line/60 p-1">
      {ITEMS.map((x) => (
        <Link
          key={x.id}
          href={x.href}
          aria-current={on === x.id ? "page" : undefined}
          className={item(on === x.id)}
        >
          <Icon name={x.icon} size={15} />
          {x.label}
        </Link>
      ))}
    </nav>
  );
}
