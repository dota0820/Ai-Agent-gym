import { z } from "zod";

const guideSchema = z.object({
  equipment: z.string(),
  setup: z.string().describe("器械怎么调、坐/站在哪里、手握哪里"),
  steps: z.array(z.string()).describe("一步一步的动作要领,含呼吸和速度"),
  common_mistakes: z.array(z.string()),
  feel: z.string().describe("应该哪里有感觉"),
});

const planSchema = z.object({
  title: z.string().describe("例如“背部训练 A”"),
  focus: z.string().describe("主要部位,例如“背”"),
  note: z.string().optional().describe("给用户的一句整体提醒"),
  exercises: z
    .array(
      z.object({
        exercise_id: z.string().describe("动作库 id,或 custom"),
        name: z.string().describe("中文名"),
        name_en: z.string().optional(),
        sets: z.number().int().min(1).max(8),
        reps: z.string().describe("例如 10-12,或 30秒"),
        rest_seconds: z.number().int().min(0).max(300),
        suggested_weight: z.string().optional().describe("例如 20 kg、每只 5 kg"),
        coach_note: z.string().optional().describe("这次最该注意的一个要点"),
        custom_instructions: guideSchema.optional(),
      }),
    )
    .min(1)
    .max(10),
});

const logSchema = z.object({
  title: z.string(),
  focus: z.string(),
  date: z.string().describe("YYYY-MM-DD"),
  notes: z.string().optional(),
  exercises: z
    .array(
      z.object({
        exercise_id: z.string().describe("动作库 id,或 custom"),
        name: z.string(),
        sets: z.array(
          z.object({
            weight_kg: z.number().nullable().describe("自重填 null"),
            reps: z.number().int(),
          }),
        ),
      }),
    )
    .min(1),
});

export interface CoachTool {
  name: string;
  description: string;
  schema: z.ZodType;
  /** Event streamed to the app when the coach calls the tool. */
  event: (input: unknown) => Record<string, unknown>;
  /** What the coach is told afterwards. */
  result: string;
}

/** Provider-neutral tool definitions shared by the Anthropic and OpenRouter paths. */
export const COACH_TOOLS: CoachTool[] = [
  {
    name: "save_workout_plan",
    description:
      "把一次训练计划保存到 App 的「今天」页面,用户可以直接点开始训练。安排好训练时调用;它会替换当前的计划。",
    schema: planSchema,
    event: (plan) => ({ type: "plan", plan }),
    result:
      "计划已保存,用户现在能在聊天里看到计划卡片,也能在「今天」页面点“开始训练”。",
  },
  {
    name: "log_workout",
    description:
      "把用户口述的、已经完成的训练记入训练记录。只记录用户明确说做过的内容。",
    schema: logSchema,
    event: (workout) => ({ type: "workout", workout }),
    result: "已记入训练记录。",
  },
  {
    name: "remember",
    description:
      "记住一条关于用户的长期信息(伤病、偏好、器械限制、目标等),以后每次对话都会看到。",
    schema: z.object({ note: z.string() }),
    event: (input) => ({ type: "memory", note: (input as { note: string }).note }),
    result: "已记住。",
  },
];

export const WatchSchema = z.object({
  is_workout_summary: z
    .boolean()
    .describe("图片是否是手表/运动健康 App 的一次运动记录"),
  duration_min: z.number().nullable().describe("运动时长,分钟"),
  calories: z.number().nullable().describe("消耗千卡(优先取运动/活动消耗)"),
  avg_hr: z.number().nullable().describe("平均心率 bpm"),
  max_hr: z.number().nullable().describe("最高心率 bpm"),
});

export const WATCH_PROMPT =
  "这是一张智能手表或运动健康 App(例如荣耀运动健康、华为运动健康、Apple 健身、Garmin)的运动记录截图。请读出其中的运动时长、消耗卡路里、平均心率和最高心率。截图里没有的数值填 null,不要猜。";
