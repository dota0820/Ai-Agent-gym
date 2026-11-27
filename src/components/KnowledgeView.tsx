"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { exerciseThumbnail, findExerciseById } from "@/lib/exercise-lookup";
import {
  detectivePrompt,
  KNOWLEDGE,
  KNOWLEDGE_CATEGORIES,
  type KnowledgeArticle,
  type KnowledgeCategory,
} from "@/lib/knowledge";
import { useApp } from "@/lib/store";

const coachLink = (q: string) => `/coach?q=${encodeURIComponent(q)}`;

function Card({
  a,
  open,
  onToggle,
}: {
  a: KnowledgeArticle;
  open: boolean;
  onToggle: () => void;
}) {
  const { customExercises } = useApp();
  const cat = KNOWLEDGE_CATEGORIES.find((c) => c.id === a.category)!;
  const exercises = a.exercises
    .map((id) => findExerciseById(id, customExercises))
    .filter((e): e is NonNullable<typeof e> => !!e);

  return (
    <li
      id={`k-${a.id}`}
      className="scroll-mt-4 overflow-hidden rounded-2xl border border-line bg-card"
    >
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left"
      >
        <span aria-hidden className="mt-0.5 text-lg">
          {cat.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-bold leading-snug">
            {a.title}
          </span>
          <span className="mt-1.5 block rounded-xl bg-primary-soft px-3 py-2 text-[14px] leading-relaxed text-ink">
            💡 {a.truth}
          </span>
        </span>
        <span
          className={`mt-1 shrink-0 text-sub transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-line px-4 pt-3 pb-4">
          <section>
            <h3 className="text-[13px] font-semibold text-sub">常见原因</h3>
            <ul className="mt-1.5 space-y-1.5">
              {a.causes.map((c) => (
                <li key={c} className="flex gap-2 text-[15px] leading-relaxed">
                  <span className="shrink-0 text-sub">•</span>
                  {c}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-[13px] font-semibold text-sub">
              下次去健身房马上试
            </h3>
            <ol className="mt-1.5 space-y-2">
              {a.fixes.map((f, i) => (
                <li
                  key={f}
                  className="flex gap-2.5 text-[15px] leading-relaxed"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mint-soft text-xs font-bold text-mint">
                    {i + 1}
                  </span>
                  {f}
                </li>
              ))}
            </ol>
          </section>

          {exercises.length > 0 && (
            <section>
              <h3 className="text-[13px] font-semibold text-sub">看动作示范</h3>
              <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
                {exercises.map((e) => {
                  const thumb = exerciseThumbnail(e);
                  return (
                    <Link
                      key={e.id}
                      href={`/library/${e.id}`}
                      className="w-[112px] shrink-0 overflow-hidden rounded-xl border border-line bg-surface"
                    >
                      {thumb ? (
                        <img
                          src={thumb}
                          alt=""
                          loading="lazy"
                          className="aspect-[3/2] w-full bg-bg object-cover"
                        />
                      ) : (
                        <span className="flex aspect-[3/2] w-full items-center justify-center bg-bg text-xl">
                          ▶
                        </span>
                      )}
                      <span className="block truncate px-2 py-1.5 text-xs font-semibold">
                        {e.name}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          <div className="grid grid-cols-2 gap-2">
            {a.detective && (
              <Link
                href={coachLink(detectivePrompt(a.detective))}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-primary/40 bg-primary-soft px-3 py-2.5 text-sm font-semibold text-deep"
              >
                🔍 发力侦探
              </Link>
            )}
            <Link
              href={coachLink(a.ask)}
              className={`flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-white ${
                a.detective ? "" : "col-span-2"
              }`}
            >
              💬 问 AI 教练
            </Link>
          </div>
        </div>
      )}
    </li>
  );
}

/**
 * Beginner pitfalls as foldable quick cards. Filter by category; collapsed cards
 * show the one-line truth, expanded ones the causes, fixes, demos and coach links.
 * `initialOpen` opens (and scrolls to) one card, e.g. from an exercise page.
 */
export default function KnowledgeView({
  initialOpen,
}: {
  initialOpen?: string;
}) {
  const start = KNOWLEDGE.find((a) => a.id === initialOpen);
  const [cat, setCat] = useState<KnowledgeCategory | "all">("all");
  const [open, setOpen] = useState<string | null>(start?.id ?? null);
  const scrolled = useRef(false);

  useEffect(() => {
    if (!start || scrolled.current) return;
    scrolled.current = true;
    document
      .getElementById(`k-${start.id}`)
      ?.scrollIntoView({ block: "start" });
  }, [start]);

  const list =
    cat === "all" ? KNOWLEDGE : KNOWLEDGE.filter((a) => a.category === cat);
  const chip = (on: boolean) =>
    `shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold ${
      on ? "bg-primary text-white" : "border border-line bg-card text-ink"
    }`;

  return (
    <div className="space-y-3">
      <div
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
        role="tablist"
        aria-label="分类"
      >
        <button
          role="tab"
          aria-selected={cat === "all"}
          className={chip(cat === "all")}
          onClick={() => setCat("all")}
        >
          全部 {KNOWLEDGE.length}
        </button>
        {KNOWLEDGE_CATEGORIES.map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={cat === c.id}
            className={chip(cat === c.id)}
            onClick={() => setCat(c.id)}
          >
            {c.emoji} {c.label}{" "}
            {KNOWLEDGE.filter((a) => a.category === c.id).length}
          </button>
        ))}
      </div>
      <ul className="space-y-2.5">
        {list.map((a) => (
          <Card
            key={a.id}
            a={a}
            open={open === a.id}
            onToggle={() => setOpen(open === a.id ? null : a.id)}
          />
        ))}
      </ul>
    </div>
  );
}
