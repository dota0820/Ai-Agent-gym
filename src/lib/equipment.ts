import type { GymEnvironment, Profile } from "./types";

export interface EquipmentCategory {
  id: string;
  label: string;
  question: string;
  items: string[];
}

export const EQUIPMENT_CATEGORIES: EquipmentCategory[] = [
  {
    id: "free",
    label: "自由重量与架子",
    question: "先看哑铃和架子区：下面这些有看到吗？（不确定的可以点下方拍照确认）",
    items: [
      "哑铃",
      "杠铃",
      "固定短杠/曲杆(EZ杆)",
      "壶铃",
      "可调卧推凳",
      "深蹲架",
      "史密斯机",
      "地雷管(T杠)",
    ],
  },
  {
    id: "cable",
    label: "绳索与拉背器械",
    question: "再看拉绳索和练背的区域：有哪几台？",
    items: [
      "龙门架/拉索",
      "高位下拉机",
      "坐姿划船机",
      "胸托划船机(悍马划船)",
      "辅助引体向上机",
      "双杠/悬垂举腿架",
    ],
  },
  {
    id: "upper",
    label: "上肢固定器械（胸/肩/手臂）",
    question: "坐着练胸、练肩、练手臂的固定机器有哪些？",
    items: [
      "坐姿推胸机",
      "上斜推胸机",
      "蝴蝶机(夹胸/后束)",
      "推肩机",
      "侧平举机(练肩飞鸟)",
      "二头弯举机",
      "三头下压机",
    ],
  },
  {
    id: "lower",
    label: "下肢与臀腿器械",
    question: "练臀部和大腿小腿的机器有哪些？",
    items: [
      "倒蹬机(腿举)",
      "腿屈伸机",
      "腿弯举机",
      "髋外展/内收机",
      "臀推机",
      "后踢臀机(蹬臀机)",
      "哈克深蹲机",
      "摆蹲机/V蹲机",
      "坐姿/站姿提踵机",
      "罗马椅",
    ],
  },
  {
    id: "cardio",
    label: "有氧器械",
    question: "有氧区有哪些机器？",
    items: ["跑步机", "椭圆机", "划船机", "动感单车", "楼梯机(爬楼机)"],
  },
  {
    id: "small",
    label: "核心与地面小工具",
    question: "垫子、弹力带和核心小工具有哪些？",
    items: ["瑜伽垫", "弹力带", "泡沫轴", "器械卷腹机", "有氧台阶/踏板", "健腹轮/瑞士球"],
  },
];

/** Plain-language beginner-friendly visual hints for every equipment item. */
export const EQUIPMENT_HINTS: Record<string, string> = {
  哑铃: "一排成对的手持小铁坨",
  杠铃: "长铁杆 + 两边挂圆杠铃片",
  "固定短杠/曲杆(EZ杆)": "不用自己装片、写好重量的短直杆或波浪弯杆",
  壶铃: "像带提手的铁茶壶",
  可调卧推凳: "靠背能调平躺或斜靠的长凳",
  深蹲架: "两边有保护横梁、能把长杠铃架在上面的大铁架",
  史密斯机: "杠铃固定在两边滑轨上、只能上下滑的架子",
  "地雷管(T杠)": "杠铃一头插在地面底座里、拎另一头拉的装置",
  "龙门架/拉索": "两边或单柱有滑轮钢索、能换各种把手的拉力器",
  高位下拉机: "坐着把头顶上方的长横杆往下拉、膝盖有圆垫压住",
  坐姿划船机: "坐着踩踏板、把前面的把手往肚子方向拉",
  "胸托划船机(悍马划船)": "胸口靠在垫子上、双手把前面的握把往后拉",
  辅助引体向上机: "有一块可以跪上去托住你体重的引体向上机",
  "双杠/悬垂举腿架": "手肘撑在两边垫子上抬腿、也能撑双杠的立架",
  坐姿推胸机: "坐着把胸前两侧的把手往正前方推",
  上斜推胸机: "半躺着把把手往斜上方推（练上胸）",
  "蝴蝶机(夹胸/后束)": "坐着张开双臂往胸前中间合拢（反过来坐可练后肩）",
  推肩机: "坐着把耳朵两侧的把手往头顶上方推",
  "侧平举机(练肩飞鸟)": "手肘靠在两侧护垫上、往两边抬起手臂练肩膀",
  二头弯举机: "大臂垫在斜板上、握把手往上弯举练手臂前侧",
  三头下压机: "坐着把身体两侧或前方的把手往下压练手臂后侧",
  "倒蹬机(腿举)": "半躺着用双脚往前蹬一块大铁踏板",
  腿屈伸机: "坐着用脚背/脚踝把圆垫往上踢直（练大腿前侧）",
  腿弯举机: "坐着或趴着用脚后跟把圆垫往下/往屁股勾（练大腿后侧）",
  "髋外展/内收机": "坐着把双腿往两边推开，或往中间夹紧（练臀外侧/大腿内侧）",
  臀推机: "后背靠着垫子、腰间系带或顶着横杆用屁股往上顶",
  "后踢臀机(蹬臀机)": "扶着架子、单脚往后下方蹬踏板练翘臀",
  哈克深蹲机: "肩膀扛着两个厚垫子、后背贴着斜板上下蹲",
  "摆蹲机/V蹲机": "肩膀扛垫子、轨迹带弧度更容易蹲到底的深蹲机",
  "坐姿/站姿提踵机": "前脚掌踩在踏板上踮脚尖练小腿",
  罗马椅: "卡住脚踝、大腿靠在斜垫上俯身挺腰背的架子",
  跑步机: "原地走路或爬坡跑步的机器",
  椭圆机: "手拉扶手、双脚踩踏板画椭圆滑行的机器",
  划船机: "坐着像划赛艇一样拉把手的全身有氧机",
  动感单车: "原地骑行的健身自行车",
  "楼梯机(爬楼机)": "像自动扶梯一样不停往上爬台阶的机器",
  瑜伽垫: "铺在地上做拉伸和腹肌的软垫",
  弹力带: "长条橡胶带或套在腿上的弹力圈",
  泡沫轴: "圆柱形滚筒，用来滚大腿和后背放松肌肉",
  器械卷腹机: "坐着抓把手或靠垫子往前弯腰练腹肌的机器",
  "有氧台阶/踏板": "放在地上垫高脚掌或做台阶训练的矮塑料台",
  "健腹轮/瑞士球": "双手推的小滚轮，或大号充气瑜伽球",
};

/**
 * Photo of each piece of equipment in use (public-domain free-exercise-db).
 * Items without a good photo are left out and show text only.
 */
const EQUIPMENT_IMAGE_KEYS: Record<string, string> = {
  哑铃: "dumbbell",
  杠铃: "barbell",
  "固定短杠/曲杆(EZ杆)": "ez-bar",
  壶铃: "kettlebell",
  可调卧推凳: "bench",
  深蹲架: "squat-rack",
  史密斯机: "smith",
  "地雷管(T杠)": "landmine",
  "龙门架/拉索": "cable",
  高位下拉机: "lat-pulldown",
  坐姿划船机: "seated-row",
  "胸托划船机(悍马划船)": "chest-row",
  辅助引体向上机: "assisted-pullup",
  "双杠/悬垂举腿架": "dip-station",
  坐姿推胸机: "chest-press",
  上斜推胸机: "incline-press",
  "蝴蝶机(夹胸/后束)": "pec-deck",
  推肩机: "shoulder-press",
  "侧平举机(练肩飞鸟)": "lateral-machine",
  二头弯举机: "biceps-machine",
  三头下压机: "triceps-machine",
  "倒蹬机(腿举)": "leg-press",
  腿屈伸机: "leg-extension",
  腿弯举机: "leg-curl",
  "髋外展/内收机": "hip-abd",
  "后踢臀机(蹬臀机)": "glute-kick",
  哈克深蹲机: "hack-squat",
  "摆蹲机/V蹲机": "v-squat",
  "坐姿/站姿提踵机": "calf",
  罗马椅: "roman-chair",
  跑步机: "treadmill",
  椭圆机: "elliptical",
  划船机: "rower",
  动感单车: "bike",
  "楼梯机(爬楼机)": "stairs",
  瑜伽垫: "mat",
  弹力带: "band",
  泡沫轴: "foam-roller",
  器械卷腹机: "ab-machine",
  "有氧台阶/踏板": "step",
  "健腹轮/瑞士球": "ball",
};

export function equipmentImage(item: string): string | undefined {
  const key = EQUIPMENT_IMAGE_KEYS[item];
  return key ? `/equipment/${key}.jpg` : undefined;
}

export const ALL_EQUIPMENT_ITEMS = EQUIPMENT_CATEGORIES.flatMap((c) => c.items);

export const EQUIPMENT_PRESETS: {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  items: string[];
}[] = [
  {
    id: "commercial",
    emoji: "🏢",
    label: "商业健身房(全套)",
    desc: "器械齐全、大重量哑铃与固定器械都有",
    items: ALL_EQUIPMENT_ITEMS,
  },
  {
    id: "studio",
    emoji: "🏋️",
    label: "工作室 / 铁馆",
    desc: "深蹲架、杠铃、哑铃、拉索核心器械为主",
    items: [
      "哑铃",
      "杠铃",
      "固定短杠/曲杆(EZ杆)",
      "壶铃",
      "可调卧推凳",
      "深蹲架",
      "龙门架/拉索",
      "高位下拉机",
      "坐姿划船机",
      "臀推机",
      "罗马椅",
      "瑜伽垫",
      "弹力带",
      "泡沫轴",
    ],
  },
  {
    id: "apartment",
    emoji: "🏨",
    label: "公寓/酒店小健身房",
    desc: "通常只有哑铃、卧推凳、简单拉索和有氧",
    items: ["哑铃", "可调卧推凳", "龙门架/拉索", "高位下拉机", "跑步机", "椭圆机", "动感单车", "瑜伽垫"],
  },
  {
    id: "home",
    emoji: "🏠",
    label: "居家轻器械",
    desc: "在家训练：哑铃、垫子、弹力带等",
    items: ["哑铃", "可调卧推凳", "瑜伽垫", "弹力带", "泡沫轴"],
  },
];

export interface EquipmentDetailPrompt {
  question: string;
  placeholder: string;
  options: string[];
}

export const EQUIPMENT_DETAIL_PROMPTS: Record<string, EquipmentDetailPrompt> = {
  哑铃: {
    question: "这些哑铃大概多重？（每只）",
    placeholder: "例如: 每只 1–20 kg，或只有 2/5/8/10kg",
    options: [
      "每只 1–10 kg",
      "每只 1–20 kg",
      "每只 2.5–30 kg",
      "每只 2.5–50+ kg",
      "可调节哑铃(2–24kg)",
      "固定几对轻哑铃",
    ],
  },
  杠铃: {
    question: "杠铃是什么杆、杠片够重吗？",
    placeholder: "例如: 20kg标准杆 + 杠片到100kg",
    options: ["20kg 标准奥杆+杠片齐全", "15kg 女士杆", "只有固定重量短杠/曲杆", "杠片较少(<60kg)"],
  },
  壶铃: {
    question: "壶铃有哪些重量？",
    placeholder: "例如: 4 / 8 / 12 / 16 kg",
    options: ["轻重量 4–12 kg", "中等 8–20 kg", "规格齐全 4–32 kg"],
  },
  "龙门架/拉索": {
    question: "拉索把手齐吗？配重每格多少？",
    placeholder: "例如: 长杆/V把/绳索/单手/脚踝扣都有，每格5kg",
    options: ["常用把手齐全", "只有长杆/单手少部分把手", "每格跳档 5 kg", "有 2.5kg 小配重"],
  },
};

/** Parse saved profile equipment string into deduplicated items. */
export function parseEquipmentList(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[、,，\n;；]+/)) {
    const clean = part.trim();
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
  }
  return out;
}

export function formatEquipmentList(items: string[]): string {
  return items.join("、");
}

export function toggleEquipmentItem(raw: string, item: string): string {
  const list = parseEquipmentList(raw);
  const exists = list.includes(item);
  const next = exists ? list.filter((x) => x !== item) : [...list, item];
  return formatEquipmentList(next);
}

export function mergeEquipmentItems(raw: string, incoming: string[]): string {
  const list = parseEquipmentList(raw);
  const seen = new Set(list);
  for (const item of incoming) {
    const clean = item.trim();
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      list.push(clean);
    }
  }
  return formatEquipmentList(list);
}

/** Normalize a profile's gym array, migrating legacy single `equipment` field cleanly. */
export function getProfileGyms(profile: Pick<Profile, "equipment" | "gyms" | "activeGymId">): {
  gyms: GymEnvironment[];
  activeGym: GymEnvironment;
} {
  const list = Array.isArray(profile.gyms) && profile.gyms.length > 0
    ? profile.gyms.map((g, i) => ({
        id: g.id || `gym-${i + 1}`,
        name: g.name?.trim() || `Gym ${i + 1}`,
        scene: g.scene || "",
        equipment: typeof g.equipment === "string" ? g.equipment : "",
        details: g.details && typeof g.details === "object" ? g.details : undefined,
        notes: typeof g.notes === "string" ? g.notes : undefined,
      }))
    : [
        {
          id: "gym-1",
          name: "Gym 1",
          scene: "",
          equipment: profile.equipment || "",
        },
      ];
  const activeGym = list.find((g) => g.id === profile.activeGymId) ?? list[0];
  return { gyms: list, activeGym };
}

/** Compact single-gym summary showing item specs (e.g., 哑铃[每只 1–20 kg]). */
export function formatGymForCoach(gym: GymEnvironment): string {
  const items = parseEquipmentList(gym.equipment);
  const detailMap = gym.details ?? {};
  if (!items.length && !gym.notes?.trim() && !gym.scene?.trim()) {
    return `${gym.name}: (暂未配置具体器械，默认按常规商业健身房参考)`;
  }
  const annotated = items.map((item) => {
    const spec = detailMap[item]?.trim();
    return spec ? `${item}(${spec})` : item;
  });
  const parts = [`当前场地「${gym.name}」${gym.scene ? `[${gym.scene}]` : ""}`];
  if (annotated.length > 0) parts.push(`可用器械与规格: ${annotated.join("、")}`);
  else parts.push("可用器械: (未勾选)");
  if (gym.notes?.trim()) parts.push(`场地补充限制: ${gym.notes.trim()}`);
  return parts.join(" | ");
}

/** Full gym context injected into the AI coach prompt. */
export function formatGymsContext(
  profile: Pick<Profile, "equipment" | "gyms" | "activeGymId">,
): string {
  const { gyms, activeGym } = getProfileGyms(profile);
  const lines = [formatGymForCoach(activeGym)];
  if (gyms.length > 1) {
    const others = gyms
      .filter((g) => g.id !== activeGym.id)
      .map((g) => `${g.name}(${parseEquipmentList(g.equipment).length}项)`)
      .join("、");
    lines.push(`该人物名下还有其他场地: ${others}（除非用户说今天换场地，否则严格只用「${activeGym.name}」的器械与重量排计划）`);
  }
  return lines.join("\n");
}
