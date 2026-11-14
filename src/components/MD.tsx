import type { ReactNode } from "react";

function inline(s: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i}>{p.slice(2, -2)}</strong>
    ) : (
      p
    ),
  );
}

/** Tiny markdown renderer: paragraphs, headings, bullet / numbered lists, bold. */
export default function MD({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const L = list;
    const Tag = L.ordered ? "ol" : "ul";
    out.push(
      <Tag
        key={out.length}
        className={`my-1 space-y-1 pl-5 ${L.ordered ? "list-decimal" : "list-disc"}`}
      >
        {L.items.map((it, i) => (
          <li key={i}>{inline(it)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const ul = /^\s*[-*•]\s+(.*)/.exec(line);
    const ol = /^\s*\d+[.)、]\s*(.*)/.exec(line);
    if (ul || ol) {
      const ordered = !ul;
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list.items.push((ul ?? ol)![1]);
      continue;
    }
    flush();
    if (!line.trim()) continue;
    const h = /^#{1,4}\s+(.*)/.exec(line);
    out.push(
      h ? (
        <p key={out.length} className="mt-2 font-bold">
          {inline(h[1])}
        </p>
      ) : (
        <p key={out.length} className="my-1">
          {inline(line)}
        </p>
      ),
    );
  }
  flush();
  return <div className="text-[15px] leading-relaxed">{out}</div>;
}
