import type { Exercise } from "./types";

type Meta = Pick<Exercise, "sub" | "alsoIn" | "primary" | "secondary" | "imageNote">;

const m = (
  sub: string,
  primary: Meta["primary"],
  secondary: Meta["secondary"] = [],
  alsoIn: string[] = [],
  imageNote?: string,
): Meta => ({ sub, primary, secondary, alsoIn, imageNote });

/** Sub-category, target muscles and photo notes for every exercise in the library. */
export const EXERCISE_META: Record<string, Meta> = {
  // back
  "lat-pulldown": m("middle", ["upper-back"], ["biceps", "back-deltoids"]),
  "seated-row": m("middle", ["upper-back"], ["trapezius", "biceps", "back-deltoids"], ["back/upper"]),
  "assisted-pullup": m("middle", ["upper-back"], ["biceps", "forearm"], [],
    "图中是用弹力带辅助的版本,器械辅助版的动作轨迹完全一样。"),
  "db-row": m("middle", ["upper-back"], ["biceps", "back-deltoids", "trapezius"]),
  "straight-arm-pulldown": m("middle", ["upper-back"], ["triceps", "back-deltoids"]),
  "db-shrug": m("upper", ["trapezius"], ["forearm"]),
  "face-pull": m("rear", ["back-deltoids"], ["trapezius", "upper-back"], ["back/upper", "shoulders/rear"]),
  "back-extension": m("lower", ["lower-back"], ["gluteal", "hamstring"]),
  superman: m("lower", ["lower-back"], ["gluteal"]),
  // chest
  "chest-press": m("middle", ["chest"], ["triceps", "front-deltoids"]),
  "db-bench": m("middle", ["chest"], ["triceps", "front-deltoids"]),
  "incline-db-press": m("upper", ["chest"], ["front-deltoids", "triceps"]),
  "decline-db-press": m("lower", ["chest"], ["triceps", "front-deltoids"]),
  "pec-fly": m("middle", ["chest"], ["front-deltoids"]),
  "cable-fly-high": m("lower", ["chest"], ["front-deltoids"]),
  "cable-fly-low": m("upper", ["chest"], ["front-deltoids"]),
  "knee-pushup": m("middle", ["chest"], ["triceps", "front-deltoids", "abs"], [],
    "图中是标准俯卧撑;跪姿版就是把膝盖放在地上,其他完全一样。"),
  // legs
  "leg-press": m("front", ["quadriceps"], ["gluteal", "hamstring"]),
  "goblet-squat": m("front", ["quadriceps"], ["gluteal", "abs"], ["glutes/main"]),
  "leg-extension": m("front", ["quadriceps"]),
  "leg-curl": m("back", ["hamstring"], ["calves"]),
  "db-rdl": m("back", ["hamstring"], ["gluteal", "lower-back"], ["glutes/main"]),
  lunge: m("front", ["quadriceps"], ["gluteal", "hamstring"], ["glutes/main"]),
  "calf-raise": m("calves", ["calves"]),
  "hip-adduction": m("inner", ["adductor"]),
  // glutes
  "hip-thrust": m("main", ["gluteal"], ["hamstring"], [],
    "图中用的是杠铃;新手先徒手或把一只哑铃放在髋部,动作一样。"),
  "glute-bridge": m("main", ["gluteal"], ["hamstring"]),
  "hip-abduction": m("side", ["abductors"], ["gluteal"]),
  "cable-kickback": m("main", ["gluteal"], ["hamstring"]),
  // shoulders
  "db-shoulder-press": m("front", ["front-deltoids"], ["triceps", "trapezius"]),
  "machine-shoulder-press": m("front", ["front-deltoids"], ["triceps"]),
  "front-raise": m("front", ["front-deltoids"]),
  "lateral-raise": m("side", ["front-deltoids"], ["trapezius"]),
  "rear-delt-fly": m("rear", ["back-deltoids"], ["trapezius", "upper-back"], ["back/rear"]),
  // arms
  "db-curl": m("biceps", ["biceps"], ["forearm"]),
  "hammer-curl": m("biceps", ["biceps"], ["forearm"]),
  "triceps-pushdown": m("triceps", ["triceps"]),
  "overhead-triceps": m("triceps", ["triceps"]),
  // core
  plank: m("deep", ["abs"], ["obliques", "front-deltoids"], [],
    "第一张是准备姿势,第二张是要保持住的支撑姿势。"),
  "dead-bug": m("deep", ["abs"], ["obliques"]),
  crunch: m("upper", ["abs"]),
  "leg-raise": m("lower", ["abs"], ["quadriceps"]),
  "russian-twist": m("obliques", ["obliques"], ["abs"]),
  // cardio
  "treadmill-walk": m("", ["quadriceps", "gluteal"], ["calves", "hamstring"]),
  elliptical: m("", ["quadriceps", "gluteal"], ["hamstring", "calves"]),
};
