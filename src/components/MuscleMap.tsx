"use client";
import Model, { type IExerciseData } from "react-body-highlighter";
import { MUSCLE_LABEL, type Muscle } from "@/lib/types";

import { useTheme } from "@/lib/theme";

const COLORS = {
  tech: { primary: "#35d8ff", secondary: "#1f6f93", body: "#24324f" },
  warm: { primary: "#e8615a", secondary: "#f6b8a8", body: "#e6dfd8" },
};

/** Front + back body diagram with the target muscles coloured in. */
export default function MuscleMap({
  primary,
  secondary,
}: {
  primary: Muscle[];
  secondary: Muscle[];
}) {
  const { primary: PRIMARY, secondary: SECONDARY, body: BODY } = COLORS[useTheme()];
  // The diagram colours by "frequency": 2 = primary, 1 = secondary.
  const data: IExerciseData[] = [
    { name: "primary", muscles: primary, frequency: 2 },
    { name: "secondary", muscles: secondary.filter((x) => !primary.includes(x)), frequency: 1 },
  ];
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {(["anterior", "posterior"] as const).map((type) => (
          <div key={type} className="text-center">
            <Model
              type={type}
              data={data}
              bodyColor={BODY}
              highlightedColors={[SECONDARY, PRIMARY]}
              style={{ width: "100%", maxWidth: 150, margin: "0 auto", padding: 0 }}
              svgStyle={{ pointerEvents: "none" }}
            />
            <div className="mt-1 text-[11px] text-sub">{type === "anterior" ? "正面" : "背面"}</div>
          </div>
        ))}
      </div>
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex gap-2">
          <dt className="flex shrink-0 items-center gap-1.5 font-semibold">
            <span className="h-3 w-3 rounded-full" style={{ background: PRIMARY }} />
            主要练到
          </dt>
          <dd>{primary.map((x) => MUSCLE_LABEL[x]).join("、")}</dd>
        </div>
        {secondary.length > 0 && (
          <div className="flex gap-2">
            <dt className="flex shrink-0 items-center gap-1.5 font-semibold">
              <span className="h-3 w-3 rounded-full" style={{ background: SECONDARY }} />
              辅助参与
            </dt>
            <dd className="text-sub">{secondary.map((x) => MUSCLE_LABEL[x]).join("、")}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
