export type Group =
  | "back"
  | "chest"
  | "legs"
  | "glutes"
  | "shoulders"
  | "arms"
  | "core"
  | "cardio";

export const GROUPS: { id: Group; label: string; emoji: string }[] = [
  { id: "back", label: "背", emoji: "🦋" },
  { id: "chest", label: "胸", emoji: "💗" },
  { id: "legs", label: "腿", emoji: "🦵" },
  { id: "glutes", label: "臀", emoji: "🍑" },
  { id: "shoulders", label: "肩", emoji: "🤸" },
  { id: "arms", label: "手臂", emoji: "💪" },
  { id: "core", label: "核心", emoji: "🔥" },
  { id: "cardio", label: "有氧", emoji: "🏃" },
];

export interface Guide {
  equipment: string;
  setup: string;
  steps: string[];
  mistakes: string[];
  feel: string;
}

export interface Exercise extends Guide {
  id: string;
  name: string;
  nameEn: string;
  group: Group;
  startWeight: string;
}

export interface PlanItem {
  exerciseId?: string;
  name: string;
  nameEn?: string;
  sets: number;
  reps: string;
  restSec: number;
  weight?: string;
  note?: string;
  custom?: Guide;
}

export interface Plan {
  id: string;
  title: string;
  focus: string;
  note?: string;
  createdAt: string;
  items: PlanItem[];
}

export interface SetLog {
  weight: number | null;
  reps: number | null;
  done: boolean;
}

export interface WorkoutExercise {
  exerciseId?: string;
  name: string;
  nameEn?: string;
  target?: string;
  restSec?: number;
  note?: string;
  custom?: Guide;
  sets: SetLog[];
}

export interface WatchData {
  durationMin?: number | null;
  calories?: number | null;
  avgHr?: number | null;
  maxHr?: number | null;
  source: "manual" | "screenshot";
}

export interface Workout {
  id: string;
  title: string;
  focus: string;
  startedAt: string;
  endedAt?: string;
  exercises: WorkoutExercise[];
  feeling?: number;
  notes?: string;
  watch?: WatchData;
}

export interface Profile {
  name: string;
  goal: string;
  level: string;
  daysPerWeek: string;
  equipment: string;
  injuries: string;
  heightCm: string;
  weightKg: string;
  memory: string[];
  passcode: string;
}

export interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  text: string;
  plan?: Plan;
  logged?: string;
  ts: string;
}

export interface AppState {
  profile: Profile;
  plan: Plan | null;
  active: Workout | null;
  workouts: Workout[];
  chat: ChatMsg[];
}
