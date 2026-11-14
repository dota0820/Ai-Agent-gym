import { z } from "zod";
import { ALL_EQUIPMENT_ITEMS } from "./equipment";

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

const chatMealSchema = z.object({
  meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  summary: z.string().describe("简洁的一餐名称"),
  calories: z.number().min(0).describe("估算总热量 kcal"),
  protein: z.number().min(0).describe("估算蛋白质克数 g"),
  carbs: z.number().min(0).describe("估算碳水克数 g"),
  fat: z.number().min(0).describe("估算脂肪克数 g"),
  advice: z.string().optional().describe("营养师简短点评"),
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
    name: "log_meal",
    description:
      "把用户口述或拍照询问的一餐食物热量与蛋白质/碳水/脂肪记入「饮食」记录。只在用户明确说了自己吃了什么并希望记录时调用。",
    schema: chatMealSchema,
    event: (meal) => ({ type: "meal", meal }),
    result: "已记入今日饮食记录。",
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

export const NutritionSchema = z.object({
  is_food: z.boolean().describe("输入或图片是否包含食物/饮品/饮食信息"),
  meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  summary: z.string().describe("简洁的一餐名称，例如：鸡胸肉糙米饭配西兰花"),
  items: z.array(
    z.object({
      name: z.string().describe("单品食物名称"),
      portion: z.string().describe("估算份量，例如 150g / 1碗 / 1杯"),
      calories: z.number().min(0),
      protein: z.number().min(0),
      carbs: z.number().min(0),
      fat: z.number().min(0),
    }),
  ),
  total: z.object({
    calories: z.number().min(0),
    protein: z.number().min(0),
    carbs: z.number().min(0),
    fat: z.number().min(0),
  }),
  advice: z.string().describe("1-2句贴合健身目标的实用营养建议，提醒为估算值"),
});

export const EquipmentScanSchema = z.object({
  is_gym_photo: z.boolean().describe("图片是否能看清健身房器械或健身器材"),
  matched_equipment: z
    .array(z.string())
    .describe(`从标准列表中匹配到的器械名称，必须严格从这些词里选: ${ALL_EQUIPMENT_ITEMS.join("、")}`),
  extra_equipment: z
    .array(z.string())
    .describe("标准列表以外、在照片中额外看到的器械中文名（没有就空数组）"),
  details: z
    .array(
      z.object({
        equipment: z.string().describe("对应的器械名，例如 哑铃 / 龙门架/拉索"),
        spec: z.string().describe("照片中看到的重量范围或规格特点，例如 每只 2–20 kg、配有V把"),
      }),
    )
    .describe("照片中明确可见的重量、规格或把手特点，看不清就返回空数组"),
  summary: z.string().describe("用一句话友好告诉用户你看到了哪些器械与重量规格"),
});

export const ImportedExerciseSchema = z.object({
  readable: z
    .boolean()
    .describe("是否能从链接内容、分享文本、用户说明或图片中明确判断出是什么健身动作"),
  reason_if_unreadable: z
    .string()
    .nullable()
    .describe("如果 readable 为 false，用通俗中文告诉用户缺什么信息、建议如何补充"),
  name: z.string().describe("动作中文名称，简洁直观"),
  nameEn: z.string().describe("英文名称，没有就留空字符串"),
  group: z.enum(["back", "chest", "legs", "glutes", "shoulders", "arms", "core", "cardio"]),
  sub: z.string().describe("该部位下的子分类 id，如 middle / upper / lower / rear / front / main / side / biceps / triceps / deep，有氧填空字符串"),
  primary: z.array(z.string()).describe("主要目标肌群 id，如 chest / upper-back / gluteal / quadriceps / hamstring / front-deltoids / back-deltoids / biceps / triceps / abs"),
  secondary: z.array(z.string()).describe("次要参与肌群 id"),
  startWeight: z.string().describe("新手建议起始重量，例如 10-15 kg 或 自重"),
  equipment: z.string().describe("需要的器械"),
  setup: z.string().describe("器械/身体准备姿势，用身体可触摸部位作参照"),
  cues: z.array(z.string()).describe("最核心的 3 个要点，每条不超过 16 个字"),
  steps: z.array(z.string()).describe("分步骤动作要领，含呼吸与节奏"),
  mistakes: z.array(z.string()).describe("新手最容易犯的 2-3 个错误"),
  feel: z.string().describe("应该哪里有酸胀感/发力感"),
});
