/**
 * Beginner "why doesn't it work / is this normal" knowledge base.
 * Each card: a one-line truth (shown collapsed), common causes, fixes to try at
 * the very next session, related library exercises, and a question for the coach.
 */

export type KnowledgeCategory = "feel" | "safety" | "basics" | "recovery";

export const KNOWLEDGE_CATEGORIES: { id: KnowledgeCategory; label: string; emoji: string }[] = [
  { id: "feel", label: "为什么练不到", emoji: "🎯" },
  { id: "safety", label: "不对称与安全", emoji: "⚖️" },
  { id: "basics", label: "训练底层逻辑", emoji: "🏋️" },
  { id: "recovery", label: "恢复与饮食", emoji: "🛌" },
];

export interface KnowledgeArticle {
  id: string;
  category: KnowledgeCategory;
  title: string;
  /** 一句话真相 — visible without expanding. */
  truth: string;
  causes: string[];
  /** Things to try at the very next gym session. */
  fixes: string[];
  /** Library exercise ids to jump to. */
  exercises: string[];
  /** Body part for the force detective, when the card is about feeling a muscle. */
  detective?: string;
  /** Sent to the coach by the "ask the coach" button. */
  ask: string;
}

export const KNOWLEDGE: KnowledgeArticle[] = [
  // ───────── 🎯 为什么练不到 ─────────
  {
    id: "feel-back",
    category: "feel",
    title: "练背只有手臂酸,背没感觉",
    truth: "背是“用手肘拉”,不是“用手拉”;先沉肩,再把手肘往后往下带。",
    causes: [
      "一开始就弯手臂去拉,二头肌抢着发力。",
      "肩膀耸起来,变成脖子两侧的斜方肌在用力。",
      "重量太重,只能靠甩身体和手臂硬拉。",
      "手握得太死,前臂先累。",
    ],
    fixes: [
      "每一次拉之前,先把肩膀往下沉(像把肩胛骨塞进裤子后口袋),再开始弯手肘。",
      "想象手只是挂钩,用手肘去“砸”向身体两侧的后口袋。",
      "重量减到能停 1 秒、慢慢放回 3 秒的程度。",
      "握把时大拇指和四指放在同一边(不包住),手只负责勾住。",
      "先做 2 组直臂下压找背的感觉,再做高位下拉或划船。",
    ],
    exercises: ["straight-arm-pulldown", "lat-pulldown", "seated-row", "chest-supported-row"],
    detective: "背",
    ask: "我练背的时候总是手臂酸、背没感觉,该怎么改?",
  },
  {
    id: "feel-chest",
    category: "feel",
    title: "练胸只有肩膀前侧和手臂酸",
    truth: "肩胛骨先往后往下收、胸口挺起来,手肘比肩膀低,胸才会接手发力。",
    causes: [
      "推的时候肩膀往前顶,变成肩膀前侧在推。",
      "手肘向两边张成 T 字(和肩膀一样高),肩膀压力大、胸反而没感觉。",
      "座椅或把手太高,推的位置在锁骨以上。",
      "只推到一半,胸没有被拉开。",
    ],
    fixes: [
      "坐好后先把两边肩胛骨往中间、往下夹,整组都不要松开。",
      "手肘比肩膀低一个拳头,从上面看手臂和身体像箭头 ↑,不像 T 字。",
      "器械把手对准乳头连线的高度;哑铃落在乳头两侧。",
      "下放时慢 3 秒,让胸有被拉开的感觉再推起。",
      "想着“用大臂内侧去夹胸”,而不是用手往前推。",
    ],
    exercises: ["chest-press", "db-bench", "pec-fly", "incline-db-press"],
    detective: "胸",
    ask: "我练胸的时候总是肩膀前侧和手臂酸,胸没感觉,怎么办?",
  },
  {
    id: "feel-glutes",
    category: "feel",
    title: "练臀只有大腿前侧酸、或者腰酸",
    truth: "臀要“往后坐、往前顶”;腰酸说明在挺腰,大腿前侧酸说明膝盖往前跑了。",
    causes: [
      "臀推顶到最高时腰往上拱,用腰代替了屁股。",
      "脚放得离屁股太近,变成大腿前侧发力。",
      "深蹲、箭步蹲时膝盖往前冲,重心在脚尖。",
      "动作太快,臀还没收紧就放下了。",
    ],
    fixes: [
      "臀推顶到最高时,下巴微收、肋骨往下压,停 2 秒用力夹屁股。",
      "调整脚的位置:顶起来时小腿要垂直地面。",
      "深蹲先想“屁股往后坐”,重心放在脚后跟和脚掌中间。",
      "练臀前先做 2 组臀桥或弹力带侧走,把臀“叫醒”。",
      "每组最后几下用手摸一下屁股,确认它是硬的。",
    ],
    exercises: ["glute-bridge", "hip-thrust", "band-monster-walk", "cable-kickback", "db-rdl"],
    detective: "臀",
    ask: "我练臀的时候大腿前侧和腰比较酸,屁股没什么感觉,怎么改?",
  },
  {
    id: "feel-shoulders",
    category: "feel",
    title: "练肩只有脖子两侧(斜方肌)酸",
    truth: "肩膀要“远离耳朵”;重量轻一点、手肘带着手走,斜方肌就不会抢。",
    causes: [
      "侧平举重量太重,只能耸肩把哑铃甩起来。",
      "抬得比肩膀高很多,斜方肌接手。",
      "推肩时腰拱起、头往前伸。",
      "用手腕带动,而不是手肘。",
    ],
    fixes: [
      "侧平举换成很轻的哑铃(2–3 kg 也很正常),感觉对了再加。",
      "想象有人在往下按你的肩膀,整组都保持肩膀下沉。",
      "抬到手臂和肩膀一样高就停,不要再往上。",
      "用手肘带着手往两侧画弧,小拇指略高于大拇指。",
      "推肩时背贴紧靠背,下巴微收。",
    ],
    exercises: ["lateral-raise", "db-shoulder-press", "machine-shoulder-press", "face-pull"],
    detective: "肩",
    ask: "我练肩的时候脖子两边很酸,肩膀没感觉,怎么办?",
  },
  {
    id: "feel-core",
    category: "feel",
    title: "练腹只有脖子酸、或者腰酸",
    truth: "腹肌是“卷”和“稳”,不是“拉脖子”和“抬腿”;下背一离地就该做小一点。",
    causes: [
      "卷腹时用手拉脖子,把头往前拽。",
      "抬腿时下背离开地面,腰在代偿。",
      "平板支撑塌腰,压力全在腰上。",
      "憋气,身体越做越僵。",
    ],
    fixes: [
      "卷腹时手轻轻放耳边,下巴和胸口之间留一个拳头,只把肩胛骨卷离地面。",
      "所有躺着的腹部动作,下背都要贴住地面;贴不住就弯膝、幅度做小。",
      "平板支撑收紧肚子、夹紧屁股,腰一酸就停。",
      "用力时呼气,把肚子往里收。",
      "新手先从死虫式、鸟狗式开始,最不会伤腰。",
    ],
    exercises: ["dead-bug", "crunch", "plank", "bird-dog", "leg-raise"],
    detective: "腹部",
    ask: "我练腹肌的时候脖子和腰比较酸,肚子没感觉,怎么改?",
  },
  {
    id: "feel-arms",
    category: "feel",
    title: "练手臂只有前臂和手腕酸",
    truth: "大臂固定不动、只弯手肘,手腕保持直,累的才会是大臂。",
    causes: [
      "身体前后晃,用惯性把重量甩上去。",
      "手肘往前跑,肩膀在帮忙。",
      "手腕往里弯或往后折,前臂一直在出力。",
      "握得太紧。",
    ],
    fixes: [
      "背靠墙站着做弯举,身体就晃不起来。",
      "手肘贴着身体两侧,像钉在那里一样。",
      "手腕和小臂保持一条直线。",
      "放下时慢 3 秒,到底手臂伸直。",
      "三头下压时手肘夹紧身体,只动小臂。",
    ],
    exercises: ["db-curl", "hammer-curl", "preacher-curl", "triceps-pushdown", "overhead-triceps"],
    detective: "手臂",
    ask: "我练手臂的时候前臂和手腕比较酸,大臂没感觉,怎么办?",
  },

  // ───────── ⚖️ 不对称与安全 ─────────
  {
    id: "asymmetry",
    category: "safety",
    title: "左右力量或感觉不一样",
    truth: "大部分人都有一边强一边弱,这很正常;让弱的那边带节奏,强的那边别多做。",
    causes: [
      "惯用手、惯用脚平时用得多。",
      "双手同时做时,强的一边偷偷帮忙。",
      "姿势歪,一边压力比另一边大。",
    ],
    fixes: [
      "多用单边动作(单臂划船、分腿蹲、单腿臀桥),每边分开做。",
      "先做弱的一边,强的一边做和它一样的次数,不要多做。",
      "对着镜子看:肩膀、髋部是否一样高。",
      "差距很大、或者一边会痛时,问一下物理治疗师。",
    ],
    exercises: ["db-row", "bulgarian-split-squat", "single-leg-glute-bridge"],
    ask: "我发现左右两边力量和感觉不一样,应该怎么练?",
  },
  {
    id: "pain-vs-soreness",
    category: "safety",
    title: "肌肉酸胀 vs 关节刺痛",
    truth: "肌肉酸、胀、热是正常的;关节尖锐的刺痛、麻、肿,就马上停。",
    causes: [
      "酸胀:肌肉在工作或第二天的延迟性酸痛,正常。",
      "刺痛:动作角度不对、重量太重,或者原本就有旧伤。",
      "麻或放射痛:可能压到神经,要重视。",
    ],
    fixes: [
      "练的时候出现关节刺痛:立刻停这个动作,不要“忍一下”。",
      "换一个更轻的重量、更小的幅度试一次;还痛就换别的动作。",
      "记下是哪个动作、哪个角度痛,告诉 AI 教练。",
      "痛超过几天、越来越痛、或者肿和麻,去看医生或物理治疗师。",
    ],
    exercises: [],
    ask: "我做某个动作的时候关节有点痛,怎么判断是正常酸还是受伤?",
  },
  {
    id: "squat-depth",
    category: "safety",
    title: "深蹲蹲不下去 / 膝盖往内扣",
    truth: "多半是脚踝和髋太紧、或者臀没出力;先把动作做对,再加重量。",
    causes: [
      "脚踝太紧,脚跟一蹲就离地。",
      "髋部太紧,屁股坐不下去。",
      "臀中肌(屁股外侧)没力,膝盖往内倒。",
      "站距太窄、脚尖朝正前方。",
    ],
    fixes: [
      "站得比肩略宽,脚尖朝外 15–30 度,膝盖朝脚尖方向打开。",
      "抱着一个哑铃做高脚杯深蹲,比空手更容易坐下去。",
      "蹲之前先做撬髋深蹲和弹力带侧走,各 1–2 组。",
      "脚跟下面垫一块薄杠铃片,蹲得更深也更稳(临时办法)。",
      "只蹲到背能保持挺直的深度,不用勉强。",
    ],
    exercises: ["goblet-squat", "ankle-pry-squat", "band-monster-walk", "hip-90-90"],
    ask: "我深蹲蹲不下去,膝盖会往里扣,怎么改善?",
  },

  // ───────── 🏋️ 训练底层逻辑 ─────────
  {
    id: "choose-weight",
    category: "basics",
    title: "选多重才对?",
    truth: "最后 2 下有点吃力、但动作不变形,就是对的重量(大约还能再做 2 次)。",
    causes: [
      "选太轻:做完一点感觉都没有,效果很小。",
      "选太重:动作变形、借力,容易受伤,练到的也不是目标肌肉。",
    ],
    fixes: [
      "从 App 动作库里的“新手起始重量”开始。",
      "做完一组后在 App 里点 RIR(还能再做几次):4 以上就加一级,0 且次数不够就减一级。",
      "器械一级约 2.5–5 kg,哑铃一级约每只 1–2 kg。",
      "宁可轻一点把动作做对,也不要重一点乱做。",
    ],
    exercises: [],
    ask: "我不知道每个动作该选多重,能教我怎么判断吗?",
  },
  {
    id: "rest-time",
    category: "basics",
    title: "组间要休息多久?",
    truth: "大动作休息 1.5–2 分钟,小动作 45–60 秒;能把下一组做好最重要。",
    causes: [
      "休息太短:下一组次数掉很多,练不到目标。",
      "休息太长:整次训练拖很久,也容易冷下来。",
    ],
    fixes: [
      "深蹲、腿举、划船、卧推等大动作:休息 90–120 秒。",
      "弯举、侧平举、腹部等小动作:休息 45–60 秒。",
      "用 App 打勾后自动开始的休息倒计时。",
      "休息时喝口水、看一下下一组的要点,不要滑手机滑太久。",
    ],
    exercises: [],
    ask: "我组间应该休息多久?不同动作有差别吗?",
  },
  {
    id: "progressive-overload",
    category: "basics",
    title: "渐进超负荷:怎么一次比一次进步",
    truth: "每次比上次多一点点就好:先加次数,次数做满了再加重量。",
    causes: [
      "每次都用一样的重量和次数,身体没有新的刺激。",
      "一下子加太多,动作变形、反而退步。",
    ],
    fixes: [
      "看 App 里“上次做了多少”,这次的目标是多做 1–2 次。",
      "例如目标 10–12 次:这周 10 次,下周 11 次,做到 12 次就加一级重量,次数回到 10。",
      "进步不只是重量:动作更标准、下放更慢、休息更短也算。",
      "累或睡不好的那天保持上次的重量就好,不用硬加。",
    ],
    exercises: [],
    ask: "我怎么知道下次该加重量还是加次数?",
  },
  {
    id: "breathing",
    category: "basics",
    title: "呼吸节奏:什么时候吸气呼气",
    truth: "用力时呼气,放回时吸气;不要整组憋着气。",
    causes: [
      "憋气:血压升高,容易头晕。",
      "呼吸乱了:动作节奏也会乱,核心不稳。",
    ],
    fixes: [
      "推、拉、站起来(用力的那一下)时呼气。",
      "慢慢放回、蹲下去的时候吸气。",
      "做大重量前先吸一口气、收紧肚子,站起来后再呼出。",
      "平板支撑这类静止动作:正常慢慢呼吸,不要憋。",
    ],
    exercises: ["plank", "dead-bug"],
    ask: "我做动作的时候不知道怎么呼吸,能教我吗?",
  },
  {
    id: "women-bulky",
    category: "basics",
    title: "女生练力量会不会变壮?",
    truth: "不会一下子变大块头;正常练和吃,会变紧实、线条更好看。",
    causes: [
      "女生天生睾酮很低,肌肉长得比男生慢很多。",
      "看起来“变壮”多半是脂肪还在、肌肉在下面,或者暂时的充血水肿。",
    ],
    fixes: [
      "按计划练力量 + 吃够蛋白质,同时控制总热量,身形会越来越紧。",
      "想要线条:臀腿、背、肩是重点,让腰看起来更细。",
      "不用怕重量;对的重量是“最后 2 下有点吃力”。",
      "用照片和腰围、臀围记录变化,比只看体重准。",
    ],
    exercises: ["hip-thrust", "lat-pulldown", "lateral-raise"],
    ask: "我是女生,担心练力量会变壮,应该怎么练才能变紧实好看?",
  },

  // ───────── 🛌 恢复与饮食 ─────────
  {
    id: "no-soreness",
    category: "recovery",
    title: "第二天不酸,是不是白练了?",
    truth: "酸不酸不代表练得好不好;重量和次数在慢慢进步,才是真的有效。",
    causes: [
      "身体适应了这个动作,酸痛会越来越少,这是好事。",
      "第一次做新动作最酸,之后就不太酸了。",
    ],
    fixes: [
      "看 App 记录:重量、次数有没有比上次多一点。",
      "练的时候目标肌肉有发力感、最后几下有点吃力,就是有效的。",
      "不需要每次都练到酸痛,反而影响下一次训练。",
      "很酸的时候做点轻松的有氧、拉伸,睡够,比硬练好。",
    ],
    exercises: ["foam-roll-back", "worlds-greatest-stretch"],
    ask: "我练完第二天不太酸,是不是练得不够?",
  },
  {
    id: "fat-loss-protein",
    category: "recovery",
    title: "减脂与蛋白质的常见误区",
    truth: "减脂靠总热量,不是少吃一餐;蛋白质要吃够,才能保住肌肉、不容易饿。",
    causes: [
      "只吃很少、不吃主食,很快就撑不住、还掉肌肉。",
      "以为练完不吃会瘦更快。",
      "蛋白质吃太少,练了也没线条。",
    ],
    fixes: [
      "每天蛋白质大约每公斤体重 1.2–1.6 克,分到三餐里(每餐一个手掌大小的肉、蛋、豆腐或鱼)。",
      "主食不用完全不吃,一餐一个拳头大小就好。",
      "练完 1–2 小时内正常吃一餐,有蛋白质加一些碳水。",
      "用 App 的“饮食”拍照记录,看看自己蛋白质是否达标。",
    ],
    exercises: [],
    ask: "我想减脂,饮食上有哪些常见误区?蛋白质要吃多少?",
  },
];

export const KNOWLEDGE_BY_ID: Record<string, KnowledgeArticle> = Object.fromEntries(
  KNOWLEDGE.map((a) => [a.id, a]),
);

/** Cards that link to a given library exercise. */
export const articlesForExercise = (exerciseId: string) =>
  KNOWLEDGE.filter((a) => a.exercises.includes(exerciseId));

/** Opening message for the force detective: the coach diagnoses with tap questions. */
export const detectivePrompt = (part: string) =>
  `开始“发力侦探”:我练${part}的时候总是练不到目标肌肉。请一次只问我一个选择题(做的是哪个动作、哪里在酸、器械怎么调、重量多重等),一步一步帮我找出最可能的原因,最后给我下次马上能试的 2–3 个改法。`;
