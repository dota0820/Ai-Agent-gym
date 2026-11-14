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
    question: "这家场地有哑铃、杠铃或深蹲架吗？勾选后会追问具体重量",
    items: ["哑铃", "杠铃", "壶铃", "可调卧推凳", "深蹲架", "史密斯机"],
  },
  {
    id: "cable",
    label: "绳索与拉力",
    question: "拉索和拉力练背区有哪些器械？",
    items: ["龙门架/拉索", "高位下拉机", "坐姿划船机", "辅助引体向上机"],
  },
  {
    id: "upper",
    label: "上肢固定器械",
    question: "练胸、肩、手臂的固定器械有哪些？",
    items: ["坐姿推胸机", "蝴蝶机(夹胸/后束)", "推肩机", "二头弯举机", "三头下压机"],
  },
  {
    id: "lower",
    label: "下肢与臀腿器械",
    question: "练臀腿的固定器械有哪些？",
    items: [
      "倒蹬机(腿举)",
      "腿屈伸机",
      "腿弯举机",
      "髋外展/内收机",
      "臀推机",
      "哈克深蹲机",
      "罗马椅",
    ],
  },
  {
    id: "cardio",
    label: "有氧区",
    question: "有氧区通常用得到哪些机器？",
    items: ["跑步机", "椭圆机", "划船机", "动感单车", "楼梯机"],
  },
  {
    id: "small",
    label: "小工具",
    question: "垫子和弹力带等小工具呢？",
    items: ["瑜伽垫", "弹力带", "泡沫轴"],
  },
];

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
      "壶铃",
      "可调卧推凳",
      "深蹲架",
      "龙门架/拉索",
      "辅助引体向上机",
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
    items: ["哑铃", "可调卧推凳", "龙门架/拉索", "高位下拉机", "跑步机", "椭圆机", "瑜伽垫"],
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
