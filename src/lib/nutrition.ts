import type { MealLog, MealType, Profile } from "./types";

/** Local calendar date key YYYY-MM-DD (avoids UTC day-shift bugs). */
export function localDateKey(d: Date | string = new Date()): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return localDateKey(new Date());
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function shiftDateKey(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, (d || 1) + deltaDays);
  return localDateKey(dt);
}

export function fmtDateKey(dateKey: string): string {
  const today = localDateKey();
  if (dateKey === today) return "今天";
  if (dateKey === shiftDateKey(today, -1)) return "昨天";
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  const wk = "日一二三四五六"[dt.getDay()];
  return `${m}月${d}日 周${wk}`;
}

export function defaultMealTypeForHour(hour = new Date().getHours()): MealType {
  if (hour < 10) return "breakfast";
  if (hour < 14) return "lunch";
  if (hour < 17) return "snack";
  if (hour < 21) return "dinner";
  return "snack";
}

function activityMultiplier(daysStr: string): number {
  const days = Number(daysStr);
  if (!days || isNaN(days)) return 1.38;
  if (days <= 1) return 1.25;
  if (days === 2) return 1.32;
  if (days === 3) return 1.38;
  if (days === 4) return 1.45;
  return 1.55;
}

/**
 * Compute daily nutrition targets from the profile's weight (kg), height (cm),
 * gender, age, weekly training frequency, and fitness goal using Mifflin-St Jeor.
 */
export function computeNutritionTargets(profile: Profile): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  bmr: number;
  tdee: number;
  isCustom: boolean;
  missingBodyStats: boolean;
} {
  const rawWeight = Number(profile.weightKg);
  const rawHeight = Number(profile.heightCm);
  const rawAge = Number(profile.age);

  const missingBodyStats = !(rawWeight > 25 && rawHeight > 100);
  const weight = rawWeight > 25 ? rawWeight : 60;
  const height = rawHeight > 100 ? rawHeight : 165;
  const age = rawAge >= 12 && rawAge <= 95 ? rawAge : 28;
  const genderOffset =
    profile.gender === "male" ? 5 : profile.gender === "female" ? -161 : -78;

  const bmr = Math.round(10 * weight + 6.25 * height - 5 * age + genderOffset);
  const tdee = Math.round(bmr * activityMultiplier(profile.daysPerWeek));

  const goal = profile.goal || "";
  const isLose = goal.includes("减脂");
  const isGain = goal.includes("增肌") || goal.includes("翘臀");

  const autoCalories = isLose
    ? Math.max(1200, Math.round(tdee * 0.82))
    : isGain
      ? Math.round(tdee + 220)
      : tdee;
  const defaultProtein = Math.round(weight * (isGain ? 1.8 : isLose ? 1.7 : 1.4));
  const defaultFat = Math.max(35, Math.round((autoCalories * 0.25) / 9));
  const defaultCarbs = Math.max(
    60,
    Math.round((autoCalories - defaultProtein * 4 - defaultFat * 9) / 4),
  );

  const t = profile.nutritionTarget;
  const isCustom = !!(t?.calories || t?.protein || t?.carbs || t?.fat);
  return {
    calories: t?.calories && t.calories > 0 ? Math.round(t.calories) : autoCalories,
    protein: t?.protein && t.protein > 0 ? Math.round(t.protein) : defaultProtein,
    carbs: t?.carbs && t.carbs > 0 ? Math.round(t.carbs) : defaultCarbs,
    fat: t?.fat && t.fat > 0 ? Math.round(t.fat) : defaultFat,
    bmr,
    tdee,
    isCustom,
    missingBodyStats,
  };
}

export function mealsForDate(meals: MealLog[], dateKey: string): MealLog[] {
  return meals
    .filter((m) => localDateKey(m.loggedAt) === dateKey)
    .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
}

export function sumMealMacros(meals: MealLog[]) {
  return meals.reduce(
    (acc, m) => ({
      calories: Math.round(acc.calories + (m.calories || 0)),
      protein: Math.round((acc.protein + (m.protein || 0)) * 10) / 10,
      carbs: Math.round((acc.carbs + (m.carbs || 0)) * 10) / 10,
      fat: Math.round((acc.fat + (m.fat || 0)) * 10) / 10,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

/** Compact nutrition summary injected into AI coach & nutritionist context. */
export function nutritionContextForCoach(meals: MealLog[], profile: Profile): string {
  const today = localDateKey();
  const list = mealsForDate(meals, today);
  const targets = computeNutritionTargets(profile);
  const totals = sumMealMacros(list);
  const header = `每日参考目标(BMR约${targets.bmr}kcal/TDEE约${targets.tdee}kcal): ${targets.calories} kcal · 蛋白质 ${targets.protein}g · 碳水 ${targets.carbs}g · 脂肪 ${targets.fat}g`;
  const cur = `今日已摄入: ${totals.calories} kcal · 蛋白质 ${totals.protein}g · 碳水 ${totals.carbs}g · 脂肪 ${totals.fat}g (还差 ${Math.max(0, targets.calories - totals.calories)} kcal, 蛋白质 ${Math.max(0, Math.round(targets.protein - totals.protein))}g)`;
  if (!list.length) return `${header}\n${cur}\n(今天还没有记录饮食)`;
  const rows = list
    .map(
      (m) =>
        `- ${m.summary}: ${m.calories} kcal (蛋白 ${m.protein}g / 碳水 ${m.carbs}g / 脂肪 ${m.fat}g)`,
    )
    .join("\n");
  return `${header}\n${cur}\n今日餐食:\n${rows}`;
}
