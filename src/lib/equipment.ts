export interface EquipmentCategory {
  id: string;
  label: string;
  items: string[];
}

export const EQUIPMENT_CATEGORIES: EquipmentCategory[] = [
  {
    id: "free",
    label: "自由重量与架子",
    items: ["哑铃", "杠铃", "壶铃", "可调卧推凳", "深蹲架", "史密斯机"],
  },
  {
    id: "cable",
    label: "绳索与拉力",
    items: ["龙门架/拉索", "高位下拉机", "坐姿划船机", "辅助引体向上机"],
  },
  {
    id: "upper",
    label: "上肢固定器械",
    items: ["坐姿推胸机", "蝴蝶机(夹胸/后束)", "推肩机", "二头弯举机", "三头下压机"],
  },
  {
    id: "lower",
    label: "下肢与臀腿器械",
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
    items: ["跑步机", "椭圆机", "划船机", "动感单车", "楼梯机"],
  },
  {
    id: "small",
    label: "小工具",
    items: ["瑜伽垫", "弹力带", "泡沫轴"],
  },
];

export const ALL_EQUIPMENT_ITEMS = EQUIPMENT_CATEGORIES.flatMap((c) => c.items);

export const EQUIPMENT_PRESETS: { id: string; label: string; items: string[] }[] = [
  {
    id: "commercial",
    label: "商业健身房(全套)",
    items: ALL_EQUIPMENT_ITEMS,
  },
  {
    id: "apartment",
    label: "公寓/酒店小健身房",
    items: ["哑铃", "可调卧推凳", "龙门架/拉索", "高位下拉机", "跑步机", "椭圆机", "瑜伽垫"],
  },
  {
    id: "home",
    label: "居家轻器械",
    items: ["哑铃", "可调卧推凳", "瑜伽垫", "弹力带", "泡沫轴"],
  },
];

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
