import Link from "next/link";
import Icon from "./Icon";

/** 记录 tab header: switches between the logs and the exercise library. */
export default function RecordSwitch({ on }: { on: "log" | "library" }) {
  const item = (active: boolean) =>
    `flex h-10 items-center justify-center gap-1.5 rounded-xl text-sm font-bold transition ${
      active ? "bg-card text-deep shadow-sm" : "text-sub"
    }`;
  return (
    <nav aria-label="记录" className="grid grid-cols-2 gap-1 rounded-2xl bg-line/60 p-1">
      <Link href="/history" aria-current={on === "log" ? "page" : undefined} className={item(on === "log")}>
        <Icon name="clipboard" size={16} />
        我的记录
      </Link>
      <Link
        href="/library"
        aria-current={on === "library" ? "page" : undefined}
        className={item(on === "library")}
      >
        <Icon name="book" size={16} />
        动作库
      </Link>
    </nav>
  );
}
