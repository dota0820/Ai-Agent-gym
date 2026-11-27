"use client";
import { useState } from "react";
import type { ExerciseProgress } from "@/lib/analytics";

export default function ProgressChart({ items }: { items: ExerciseProgress[] }) {
  const [selectedKey, setSelectedKey] = useState(items[0]?.key ?? "");
  const [metric, setMetric] = useState<"weight" | "volume">("weight");

  if (!items.length) return null;
  const active = items.find((x) => x.key === selectedKey) ?? items[0];
  const pts = active.points;

  const values = pts.map((p) => (metric === "weight" ? p.maxWeight : p.volume));
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const span = maxVal - minVal || 1;

  const W = 320;
  const H = 108;
  const padX = 16;
  const padTop = 14;
  const padBottom = 22;
  const plotW = W - padX * 2;
  const plotH = H - padTop - padBottom;

  const coords = pts.map((p, i) => {
    const v = metric === "weight" ? p.maxWeight : p.volume;
    const x = pts.length === 1 ? W / 2 : padX + (i / (pts.length - 1)) * plotW;
    const y = padTop + plotH - ((v - minVal) / span) * plotH;
    return { x, y, v, label: p.label };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${H - padBottom} L${coords[0].x.toFixed(1)},${H - padBottom} Z`;

  const delta = metric === "weight" ? active.deltaWeight : active.deltaVolume;
  const latest = metric === "weight" ? active.latestWeight : active.latestVolume;
  const unit = metric === "weight" ? "kg" : "kg";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="num text-3xl font-bold leading-none text-ink">
            {latest}
            <span className="ml-0.5 text-sm font-semibold text-sub">{unit}</span>
          </span>
          {delta !== 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                delta > 0 ? "bg-mint-soft text-mint" : "bg-primary-soft text-deep"
              }`}
            >
              {delta > 0 ? `+${delta}` : delta} {unit}
            </span>
          )}
        </div>
        <div className="flex rounded-full bg-bg p-0.5 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setMetric("weight")}
            className={`rounded-full px-2.5 py-1 transition ${
              metric === "weight" ? "bg-card text-ink shadow-xs" : "text-sub"
            }`}
          >
            重量
          </button>
          <button
            type="button"
            onClick={() => setMetric("volume")}
            className={`rounded-full px-2.5 py-1 transition ${
              metric === "volume" ? "bg-card text-ink shadow-xs" : "text-sub"
            }`}
          >
            容量
          </button>
        </div>
      </div>

      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            onClick={() => setSelectedKey(it.key)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
              it.key === active.key
                ? "bg-primary text-white"
                : "border border-line bg-bg text-sub"
            }`}
          >
            {it.name}
          </button>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-28 w-full overflow-visible"
        role="img"
        aria-label={`${active.name} 进步曲线`}
      >
        <defs>
          <linearGradient id="prog-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--c-primary)" stopOpacity="0.24" />
            <stop offset="100%" stopColor="var(--c-primary)" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        <line
          x1={padX}
          y1={H - padBottom}
          x2={W - padX}
          y2={H - padBottom}
          stroke="var(--c-line)"
          strokeWidth="1"
        />
        <path d={areaPath} fill="url(#prog-fill)" />
        <path
          d={linePath}
          fill="none"
          stroke="var(--c-deep)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {coords.map((c, i) => {
          const isEdge = i === 0 || i === coords.length - 1;
          return (
            <g key={`${c.label}-${i}`}>
              <circle
                cx={c.x}
                cy={c.y}
                r={i === coords.length - 1 ? 4.2 : 2.8}
                fill={i === coords.length - 1 ? "var(--c-primary)" : "var(--c-card)"}
                stroke="var(--c-deep)"
                strokeWidth="2"
              />
              {isEdge && (
                <text
                  x={c.x}
                  y={H - 5}
                  textAnchor={i === 0 ? "start" : "end"}
                  fill="var(--c-sub)"
                  fontSize="10"
                >
                  {c.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
