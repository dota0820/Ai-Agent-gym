import { EX_BY_ID, videoUrl } from "@/lib/exercises";
import type { Guide as G } from "@/lib/types";
import ExerciseAnim from "./ExerciseAnim";

export function guideFor(item: {
  exerciseId?: string;
  custom?: G;
}): G | null {
  if (item.exerciseId && EX_BY_ID[item.exerciseId])
    return EX_BY_ID[item.exerciseId];
  return item.custom ?? null;
}

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
  const lib = "id" in guide ? EX_BY_ID[(guide as { id: string }).id] : undefined;
  return (
    <div className="space-y-3 text-[14px] leading-relaxed">
      {showAnim && lib && (
        <ExerciseAnim id={lib.id} name={lib.name} note={lib.imageNote} compact />
      )}
      <Row label="器械">{guide.equipment}</Row>
      <Row label="怎么准备">{guide.setup}</Row>
      <div>
        <Label>一步一步做</Label>
        <ol className="mt-1 space-y-1.5">
          {guide.steps.map((s, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[11px] font-bold text-primary">
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </div>
      {guide.mistakes.length > 0 && (
        <div>
          <Label>常见错误</Label>
          <ul className="mt-1 space-y-1">
            {guide.mistakes.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="shrink-0">⚠️</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="rounded-xl bg-mint-soft px-3 py-2 text-mint">
        <span className="font-semibold">应该哪里有感觉:</span>
        {guide.feel}
      </div>
      <a
        href={videoUrl(name, nameEn)}
        target="_blank"
        rel="noreferrer"
        className="inline-block text-sm font-semibold text-primary underline underline-offset-2"
      >
        ▶ 看示范视频
      </a>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-semibold text-sub">{children}</div>;
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
