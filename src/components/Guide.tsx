import Link from "next/link";
import { wrongFeel } from "@/lib/exercise-extras";
import { EX_BY_ID, videoUrl } from "@/lib/exercises";
import type { Exercise, Guide as G } from "@/lib/types";
import AttachmentTip from "./AttachmentTip";
import ExerciseAnim from "./ExerciseAnim";

export function guideFor(item: { exerciseId?: string; custom?: G }): G | null {
  if (item.exerciseId && EX_BY_ID[item.exerciseId]) return EX_BY_ID[item.exerciseId];
  return item.custom ?? null;
}

/**
 * How to do an exercise. Library exercises lead with the three key points in
 * large type; the long step-by-step text is tucked behind a tap.
 */
export default function Guide({
  guide,
  name,
  nameEn,
  showAnim = true,
}: {
  guide: G;
  name: string;
  nameEn?: string;
  /** Show the looping demo photos when the guide is a library exercise. */
  showAnim?: boolean;
}) {
  const lib: Exercise | undefined =
    "id" in guide ? EX_BY_ID[(guide as { id: string }).id] : undefined;
  const hasCues = !!lib && lib.cues.length > 0;

  return (
    <div className="space-y-4">
      {showAnim && lib && (
        <ExerciseAnim id={lib.id} name={lib.name} note={lib.imageNote} compact />
      )}

      {hasCues && (
        <div>
          <Label>记住这 3 点</Label>
          <ol className="mt-2 space-y-2">
            {lib.cues.map((c, i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-2xl bg-primary-soft px-3 py-3 text-[18px] font-bold leading-snug"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-base text-white">
                  {i + 1}
                </span>
                {c}
              </li>
            ))}
          </ol>
        </div>
      )}

      {lib?.attachment && <AttachmentTip attachment={lib.attachment} />}

      <div>
        <Label>怎么准备</Label>
        <p className="mt-1 text-[17px] leading-[1.75]">{guide.setup}</p>
        <p className="mt-1 text-sm text-sub">器械:{guide.equipment}</p>
      </div>

      <div className="rounded-2xl bg-mint-soft px-3 py-2.5 text-[16px] leading-relaxed text-mint">
        <span className="font-bold">哪里该有感觉:</span>
        {guide.feel}
      </div>

      <details className="group rounded-2xl border border-line" open={!hasCues}>
        <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-3 text-[16px] font-semibold">
          完整步骤({guide.steps.length} 步)
          <span className="text-sub group-open:rotate-180">▾</span>
        </summary>
        <ol className="space-y-3 px-3 pb-3">
          {guide.steps.map((s, i) => (
            <li key={i} className="flex gap-2.5 text-[17px] leading-[1.7]">
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[13px] font-bold text-primary">
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </details>

      {guide.mistakes.length > 0 && (
        <details className="group rounded-2xl border border-line">
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-3 text-[16px] font-semibold">
            ⚠️ 常见错误({guide.mistakes.length})
            <span className="text-sub group-open:rotate-180">▾</span>
          </summary>
          <ul className="space-y-2 px-3 pb-3">
            {guide.mistakes.map((s, i) => (
              <li key={i} className="text-[16px] leading-relaxed">
                • {s}
              </li>
            ))}
          </ul>
        </details>
      )}

      {lib && wrongFeel(lib).length > 0 && (
        <div>
          <Label>感觉不对?点一下问教练</Label>
          <div className="mt-2 space-y-2">
            {wrongFeel(lib).map((w) => (
              <Link
                key={w}
                href={`/coach?q=${encodeURIComponent(`我做${lib.name}(${lib.nameEn})的时候,${w}。是哪里做错了?怎么改?`)}`}
                className="flex items-center justify-between gap-2 rounded-2xl border border-primary/40 bg-white px-3 py-3 text-[16px] font-semibold text-primary active:scale-[0.99]"
              >
                <span>{w}?</span>
                <span className="shrink-0 text-sm">问教练 ›</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <a
        href={videoUrl(name, nameEn)}
        target="_blank"
        rel="noreferrer"
        className="inline-block text-[15px] font-semibold text-primary underline underline-offset-2"
      >
        ▶ 看示范视频
      </a>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[13px] font-semibold text-sub">{children}</div>;
}
