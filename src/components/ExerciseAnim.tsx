"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { exerciseImages } from "@/lib/exercises";

/**
 * Loops between the start and end position photos of an exercise.
 * Tap to pause / resume; paused shows both positions side by side.
 */
export default function ExerciseAnim({
  id,
  name,
  note,
  compact = false,
}: {
  id: string;
  name: string;
  note?: string;
  compact?: boolean;
}) {
  const [a, b] = exerciseImages(id);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setFrame((f) => 1 - f), 1100);
    return () => clearInterval(t);
  }, [playing]);

  if (failed) return null;

  return (
    <figure>
      <button
        type="button"
        onClick={() => setPlaying(!playing)}
        aria-label={playing ? `暂停${name}动作示范` : `播放${name}动作示范`}
        className="relative block w-full overflow-hidden rounded-2xl bg-[#141418]"
      >
        {playing ? (
          <div className="relative aspect-[3/2] w-full">
            {[a, b].map((src, i) => (
              <img
                key={src}
                src={src}
                alt={i === 0 ? `${name} 起始姿势` : `${name} 发力到位姿势`}
                onError={() => setFailed(true)}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
                  frame === i ? "opacity-100" : "opacity-0"
                }`}
              />
            ))}
            <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white">
              {frame === 0 ? "① 起始" : "② 发力到位"}
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-0.5">
            {[a, b].map((src, i) => (
              <div key={src} className="relative">
                <img src={src} alt="" className="aspect-[3/2] w-full object-cover" />
                <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white">
                  {i === 0 ? "① 起始" : "② 发力到位"}
                </span>
              </div>
            ))}
          </div>
        )}
        <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white">
          {playing ? "点一下暂停,看两张对比" : "▶ 点一下播放"}
        </span>
      </button>
      {note && !compact && <figcaption className="mt-1.5 text-xs text-sub">ℹ️ {note}</figcaption>}
      {note && compact && <figcaption className="mt-1 text-[11px] text-sub">{note}</figcaption>}
    </figure>
  );
}
