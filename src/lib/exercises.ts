import { CUES, EXERCISE_ATTACHMENT, SHAPE, SHAPE_GOALS } from "./exercise-extras";
import { EXERCISE_META } from "./exercise-meta";
import { SUBS, type Exercise, type Group } from "./types";

type Base = Omit<
  Exercise,
  "sub" | "alsoIn" | "primary" | "secondary" | "imageNote" | "cues" | "attachment" | "shape"
>;

const BASE: Base[] = [
  // ───────── 背 ─────────
  {
    id: "lat-pulldown",
    name: "高位下拉",
    nameEn: "Lat Pulldown",
    group: "back",
    equipment: "高位下拉机(上方有一根长横杆的器械)",
    startWeight: "15–25 kg",
    setup:
      "坐下后调整大腿上方的挡垫,让它刚好压住大腿、屁股抬不起来。站起来双手握住横杆,握距比肩膀宽一个手掌左右,掌心朝前,然后拉着杆坐回去。",
    steps: [
      "坐稳,胸口微微挺起,上半身稍微向后倾一点点(大约 10–15 度),眼睛看前上方。",
      "先把肩膀往下沉(想象把肩膀从耳朵旁边拉开),再开始弯手肘。",
      "手肘朝身体两侧、往下往后拉,把横杆拉到锁骨/上胸的位置,呼气。",
      "在最低点停 1 秒,感觉背部两侧夹紧。",
      "慢慢放回去(约 2–3 秒),手臂几乎伸直、背部被拉长,吸气。不要让配重片“砸”下去。",
    ],
    mistakes: [
      "身体大幅度往后躺、靠甩的力量把杆拉下来——重量太重了,减轻。",
      "把杆拉到脖子后面——对肩膀不友好,只拉到胸前。",
      "耸肩、只用手臂在拉——先沉肩再拉。",
    ],
    feel: "腋下后方到背部两侧(背阔肌)发酸发胀,而不是只有手臂酸。",
  },
  {
    id: "seated-row",
    name: "坐姿划船",
    nameEn: "Seated Cable Row",
    group: "back",
    equipment: "坐姿划船机 / 低位拉索 + V 形把手",
    startWeight: "15–25 kg",
    setup:
      "坐在垫子上,双脚踩住前方踏板,膝盖微弯不要锁死。身体前倾握住把手,然后坐直,手臂伸直时配重片应该已经离开一点点。",
    steps: [
      "上半身坐直,挺胸,腰背保持平直,肩膀放松下沉。",
      "手肘贴着身体两侧往后拉,把把手拉向肚脐上方的位置,呼气。",
      "拉到最后时把两边肩胛骨往中间夹(想象夹住一支笔),停 1 秒。",
      "慢慢把手臂送回去(2–3 秒),让肩胛骨自然向前打开,吸气。上半身不要跟着大幅度前后晃。",
    ],
    mistakes: [
      "上半身前后大幅度摇摆,用腰在拉。",
      "驼背、圆肩。",
      "手肘向外张得太开、耸肩。",
    ],
    feel: "背部中间、肩胛骨之间发酸发紧。",
  },
  {
    id: "assisted-pullup",
    name: "辅助引体向上",
    nameEn: "Assisted Pull-up",
    group: "back",
    equipment: "辅助引体向上机(有一块可以跪上去的垫板)",
    startWeight: "辅助重量选体重的 50–70%(数字越大越轻松)",
    setup:
      "先选好辅助重量——这台机器的重量是“帮你”的,选得越重越容易。踩上踏板,双手握住上方把手(比肩略宽、掌心朝前),再把膝盖一只一只跪到垫板上。",
    steps: [
      "手臂伸直悬挂,身体挺直,核心收紧,肩膀往下沉。",
      "手肘往下往后拉,把身体拉上去,直到下巴接近或超过把手,呼气。",
      "顶端停一下,然后慢慢下放(2–3 秒)到手臂接近伸直,吸气。",
      "做完后先一只脚踩回踏板,再下来——不要直接松开,垫板会弹上来。",
    ],
    mistakes: ["下放太快、全靠机器弹。", "耸肩、脖子前伸去“够”把手。", "只做半程。"],
    feel: "背部两侧和手臂内侧(二头肌)用力。",
  },
  {
    id: "db-row",
    name: "单臂哑铃划船",
    nameEn: "One-arm Dumbbell Row",
    group: "back",
    equipment: "一只哑铃 + 平凳",
    startWeight: "5–8 kg",
    setup:
      "左手和左膝撑在平凳上,右脚踩在地上稍微向外站稳。背部放平,像一张桌面,右手拿哑铃自然下垂。",
    steps: [
      "眼睛看凳子前方的地面,脖子和背成一条直线,核心收紧。",
      "手肘贴着身体往上往后拉,把哑铃拉向髋部(裤子口袋的位置),呼气。",
      "顶端停 1 秒,感觉背部收紧。",
      "慢慢放下直到手臂伸直、背被拉长,吸气。做完一边换另一边。",
    ],
    mistakes: ["拉的时候身体跟着扭转。", "把哑铃拉向胸口(变成练手臂)。", "弓背或塌腰。"],
    feel: "同侧背部(腋下后方)发力。",
  },
  {
    id: "face-pull",
    name: "面拉",
    nameEn: "Face Pull",
    group: "back",
    equipment: "龙门架拉索 + 绳索把手,滑轮调到和脸差不多高",
    startWeight: "5–10 kg",
    setup:
      "把滑轮高度调到眼睛到额头之间,装上绳索把手。双手握住绳子两端(大拇指朝向自己),后退两步让手臂伸直,双脚前后或平行站稳。",
    steps: [
      "站直,核心收紧,不要往后仰。",
      "手肘抬高向两侧打开,把绳子拉向脸(鼻子到额头的位置),同时两只手向两边分开,呼气。",
      "终点时手在耳朵两侧,像在做“展示肌肉”的姿势,停 1 秒。",
      "慢慢伸直手臂还原,吸气。",
    ],
    mistakes: ["重量太重导致身体后仰。", "手肘掉得比手低。"],
    feel: "肩膀后侧和上背发酸。对改善圆肩驼背很有帮助。",
  },
  {
    id: "back-extension",
    name: "山羊挺身",
    nameEn: "Back Extension",
    group: "back",
    equipment: "罗马椅(45 度背伸架)",
    startWeight: "自重",
    setup:
      "调整垫子高度,让垫子上沿在髋骨下方(这样才能自由弯腰)。脚后跟卡住后方挡板,双手交叉抱在胸前。",
    steps: [
      "身体从头到脚成一条直线,核心收紧。",
      "以髋部为轴慢慢往下弯,背保持平直,直到大腿后侧有拉伸感,吸气。",
      "用臀部和大腿后侧发力把身体带回直线位置,呼气。到直线就停,不要再往后仰。",
    ],
    mistakes: ["起身时过度后仰、折腰。", "弓着背下去。", "速度太快靠甩。"],
    feel: "下背、臀部和大腿后侧。",
  },

  // ───────── 胸 ─────────
  {
    id: "chest-press",
    name: "坐姿推胸",
    nameEn: "Machine Chest Press",
    group: "chest",
    equipment: "坐姿推胸机",
    startWeight: "10–20 kg",
    setup:
      "先调座椅高度:坐下后,把手要和你的乳头连线一样高(太高会练到肩膀,太低会压手腕)。背和后脑勺贴住靠垫,双脚踩实。握住把手时,手肘在把手的正后方,比肩膀低一个拳头。",
    steps: [
      "肩膀往后往下收(想象把两边肩胛骨塞进裤子后口袋),胸口挺起来顶向前方。整个过程肩膀都不要离开靠垫。",
      "手肘的位置:比肩膀低,大臂和身体的夹角约 45–60 度——从正上方看,手臂和身体像一个箭头 ↑,不是一个 T 字。",
      "向正前方推,手肘跟着把手走直线,直到手臂接近伸直但手肘不锁死,呼气。想着“用大臂内侧去夹胸”,而不是用手去推。",
      "慢慢收回(2–3 秒):手肘往后往下走,直到手回到乳头连线的两侧、胸有被拉开的感觉,吸气。配重片不要完全落下。",
    ],
    mistakes: [
      "耸肩——会变成脖子两侧的斜方肌在用力。推之前先把肩膀往下压。",
      "手肘抬到和肩膀一样高(变成 T 字)——练不到胸,还容易伤肩。",
      "推的时候肩膀往前顶、背离开靠垫——变成肩膀前侧在用力。",
      "手腕往后折——握把手时让手腕和小臂成一条直线。",
    ],
    feel: "两边胸部靠中间的位置(乳头内侧到胸骨之间)发胀;推到底时两边胸有往中间挤的感觉。",
  },
  {
    id: "db-bench",
    name: "哑铃卧推",
    nameEn: "Dumbbell Bench Press",
    group: "chest",
    equipment: "一对哑铃 + 平凳",
    startWeight: "每只 4–7 kg",
    setup:
      "坐在凳子一端,哑铃立在大腿上。躺下的同时用大腿把哑铃顺势送到胸部两侧。双脚踩实地面,肩胛骨往后往下夹紧贴在凳子上,胸口挺起。",
    steps: [
      "起始位置:哑铃在乳头连线的两侧(不是在肩膀或脖子旁边),小臂垂直于地面,手腕在手肘的正上方。",
      "手肘方向:手肘指向斜下方(朝脚的方向再往外一点),大臂和身体的夹角约 45–60 度——从正上方看像一个箭头 ↑,不是 T 字。",
      "向上推:哑铃走一条微微向内的弧线,最后停在乳头连线的正上方,两只哑铃靠近但不相碰,手臂接近伸直,呼气。",
      "慢慢下放(2–3 秒):手肘往下往外沉,直到大臂和凳面差不多平、哑铃回到乳头两侧,胸有被拉开的感觉,吸气。",
      "做完后把哑铃收回胸口,坐起来,不要直接往两边扔。",
    ],
    mistakes: [
      "手肘张成 T 字(和肩膀一样高)——肩膀前侧会很酸,还容易伤肩。",
      "哑铃放在肩膀或脖子旁边推——位置太高,变成练肩。往下移到乳头连线。",
      "耸肩——脖子两侧的斜方肌会代替胸发力。肩膀始终往下压。",
      "小臂往里倒或往外倒——小臂要一直垂直地面。",
      "屁股离开凳子。",
    ],
    feel: "整块胸部发胀,尤其是乳头周围和靠近胸骨的位置;手臂后侧(三头肌)会有一点辅助的酸。",
  },
  {
    id: "incline-db-press",
    name: "上斜哑铃卧推",
    nameEn: "Incline Dumbbell Press",
    group: "chest",
    equipment: "一对哑铃 + 可调凳(靠背调到 30–45 度)",
    startWeight: "每只 4–6 kg",
    setup:
      "把凳子靠背调到 30–45 度(大约第 2–3 格,比平躺高一点就够)。坐下,哑铃放大腿上,向后靠的同时把哑铃送到上胸两侧——在锁骨下方,比平板卧推的位置高一个手掌。",
    steps: [
      "肩胛骨往后往下夹紧贴住靠背,胸口挺起,双脚踩实。",
      "手肘位置:比肩膀低,指向斜下方,大臂和身体夹角约 45–60 度(像箭头 ↑,不是 T 字)。小臂垂直地面。",
      "垂直往天花板方向推(不是往头顶后方推),终点在锁骨的正上方,手臂接近伸直,呼气。",
      "慢慢下放到哑铃回到上胸两侧(锁骨下方),手肘略低于凳面,吸气。",
    ],
    mistakes: [
      "靠背调太陡(超过 45 度)——变成练肩膀。",
      "耸肩——脖子两侧的斜方肌会抢着发力。",
      "往头顶后方推——肩膀会很酸。要垂直往上。",
      "手肘张成 T 字。",
    ],
    feel: "胸部上半部分:锁骨下面两三指宽的那一片。",
  },
  {
    id: "pec-fly",
    name: "蝴蝶机夹胸",
    nameEn: "Pec Deck Fly",
    group: "chest",
    equipment: "蝴蝶机",
    startWeight: "10–15 kg",
    setup:
      "调座椅高度:坐下握住把手时,手和乳头连线一样高,手肘比肩膀略低。背贴靠垫坐稳。手肘微微弯曲(像抱着一个大球),手肘尖指向身后,不是朝下。",
    steps: [
      "肩膀往后往下收,胸口挺起,肩膀全程贴住靠垫。",
      "保持手肘微弯的角度不变,像抱一棵大树一样把双手往中间合拢,呼气。想着“用手肘内侧去靠拢”,而不是用手去拉。",
      "双手在两个乳头中间(胸骨)的正前方相碰,停 1 秒,把两边胸往中间挤。",
      "慢慢打开(2–3 秒),到手和肩膀在一条线上、胸有拉伸感就停,不要再往后,吸气。",
    ],
    mistakes: [
      "合拢时肩膀往前顶、离开靠垫——变成肩膀前侧在用力。",
      "耸肩——斜方肌会代替胸发力。",
      "手肘越弯越多——变成“推”,手臂会酸。",
      "打开时手超过肩膀后方太多——容易拉伤肩膀。",
    ],
    feel: "胸骨两侧、两个乳头之间(胸中缝)有明显的挤压感。",
  },
  {
    id: "knee-pushup",
    name: "跪姿俯卧撑",
    nameEn: "Knee Push-up",
    group: "chest",
    equipment: "瑜伽垫",
    startWeight: "自重",
    setup:
      "双膝跪在垫子上,双手撑地比肩略宽,手指朝前。手的前后位置:趴下去时,手掌刚好在乳头连线的两侧(不是在肩膀或脸的旁边)。从头到膝盖成一条直线,小腿可以交叉抬起。",
    steps: [
      "收紧肚子和臀部,不要塌腰;肩膀远离耳朵,不要耸肩。",
      "弯手肘让身体下降:手肘指向斜后方(朝脚的方向再往外一点),和身体夹角约 45 度——从上面看像箭头 ↑,不是 T 字。",
      "下降到胸口(乳头连线)落在两手之间、接近地面,吸气。",
      "手掌用力推地,把身体整个推起来,呼气。",
    ],
    mistakes: [
      "手撑得太靠前(在脸旁边)——肩膀会很酸。",
      "手肘向两边张成 T 字——伤肩,胸也没感觉。",
      "屁股翘起或塌腰。",
      "只下去一点点、头往前探。",
    ],
    feel: "胸部(乳头周围)、肩膀前侧和手臂后侧。",
  },

  // ───────── 腿 ─────────
  {
    id: "leg-press",
    name: "腿举",
    nameEn: "Leg Press",
    group: "legs",
    equipment: "腿举机(坐着用脚蹬踏板的器械)",
    startWeight: "20–40 kg",
    setup:
      "坐进去,背和屁股完全贴住靠垫。双脚踩在踏板中间,与肩同宽,脚尖稍微朝外。蹬起踏板后松开两侧的安全栓。",
    steps: [
      "双手握住座椅两侧把手。",
      "慢慢弯曲膝盖让踏板下降,膝盖朝脚尖方向,直到大小腿约成 90 度,吸气。",
      "脚跟发力把踏板蹬回去,呼气。腿伸到接近直就停,膝盖千万不要锁死。",
      "做完后先扣回安全栓再松腿。",
    ],
    mistakes: ["膝盖伸直锁死(危险)。", "膝盖往内扣。", "下降太深导致屁股和下背离开靠垫。"],
    feel: "大腿前侧和臀部。",
  },
  {
    id: "goblet-squat",
    name: "高脚杯深蹲",
    nameEn: "Goblet Squat",
    group: "legs",
    equipment: "一只哑铃或壶铃",
    startWeight: "5–10 kg",
    setup: "双手托住哑铃的一端,竖着抱在胸前,手肘朝下。双脚比肩略宽,脚尖朝外约 15–30 度。",
    steps: [
      "挺胸,收紧核心,眼睛平视。",
      "屁股往后往下坐,像要坐到一张矮凳上;膝盖顺着脚尖方向打开,吸气。",
      "蹲到大腿与地面平行(或你能保持背部挺直的最低位置)。",
      "脚掌整个踩实,用力蹬地站起来,呼气。",
    ],
    mistakes: ["膝盖内扣。", "脚跟离地。", "弯腰驼背、哑铃离开胸口。"],
    feel: "大腿前侧、臀部。",
  },
  {
    id: "leg-extension",
    name: "腿屈伸",
    nameEn: "Leg Extension",
    group: "legs",
    equipment: "腿屈伸机",
    startWeight: "10–20 kg",
    setup:
      "调整靠背,让膝盖窝贴住座椅边缘、膝盖正对机器的转轴。调整脚踝垫,让它压在脚踝上方(小腿最下面),不是脚背。",
    steps: [
      "握住两侧把手,背贴靠垫。",
      "伸直小腿把垫子抬起,直到腿几乎伸直,顶端收紧大腿 1 秒,呼气。",
      "慢慢放下(2–3 秒),吸气。",
    ],
    mistakes: ["用甩的。", "屁股离开座椅。"],
    feel: "大腿前侧(股四头肌)灼烧感。",
  },
  {
    id: "leg-curl",
    name: "坐姿腿弯举",
    nameEn: "Seated Leg Curl",
    group: "legs",
    equipment: "坐姿腿弯举机",
    startWeight: "10–20 kg",
    setup:
      "坐下,膝盖对准机器转轴。小腿放在下方滚垫上面(垫子在脚踝后侧上方),把大腿挡垫压下来卡住大腿。",
    steps: [
      "握住把手,背贴靠垫。",
      "小腿向下向后弯,把垫子勾向屁股方向,呼气。",
      "到底停 1 秒,慢慢放回(2–3 秒),吸气。",
    ],
    mistakes: ["回放太快。", "腰离开靠垫借力。"],
    feel: "大腿后侧(腘绳肌)。",
  },
  {
    id: "db-rdl",
    name: "哑铃罗马尼亚硬拉",
    nameEn: "Dumbbell Romanian Deadlift",
    group: "legs",
    equipment: "一对哑铃",
    startWeight: "每只 5–8 kg",
    setup: "双脚与髋同宽站立,双手各拿一只哑铃放在大腿前面,掌心朝向自己。膝盖微微弯曲并保持这个角度。",
    steps: [
      "挺胸,背部挺直,肩膀后收。",
      "屁股往后推(像用屁股去关身后的门),上半身随之前倾,哑铃贴着大腿往下滑,吸气。",
      "下放到小腿中间、大腿后侧有明显拉伸感就停;背必须一直是平的。",
      "臀部发力向前顶,站直,呼气。",
    ],
    mistakes: ["弓背(最重要的错误,一弓背就停)。", "变成深蹲——膝盖弯太多。", "哑铃离腿太远。"],
    feel: "大腿后侧拉伸、臀部发力。腰不应该酸痛。",
  },
  {
    id: "lunge",
    name: "哑铃箭步蹲",
    nameEn: "Dumbbell Lunge",
    group: "legs",
    equipment: "一对哑铃(新手可先徒手)",
    startWeight: "徒手 或 每只 3–5 kg",
    setup: "双手拿哑铃垂在身体两侧,站直。",
    steps: [
      "一只脚向后退一大步,脚尖着地。",
      "身体垂直向下蹲,直到前腿大腿与地面平行、后膝接近地面,吸气。",
      "前脚脚跟发力站起,后脚收回,呼气。换另一条腿。",
    ],
    mistakes: ["前膝往内扣。", "步子太小导致膝盖过度前冲。", "上身往前趴。"],
    feel: "前腿的大腿和臀部。",
  },
  {
    id: "calf-raise",
    name: "提踵",
    nameEn: "Calf Raise",
    group: "legs",
    equipment: "台阶 / 提踵机 / 手持哑铃",
    startWeight: "自重",
    setup: "前脚掌踩在台阶边缘,脚跟悬空,手扶墙或扶手保持平衡。",
    steps: [
      "脚跟慢慢下沉到小腿有拉伸感。",
      "踮起脚尖到最高,顶端停 1 秒,呼气。",
      "慢慢放下,吸气。",
    ],
    mistakes: ["幅度太小、弹震。"],
    feel: "小腿肚。",
  },

  // ───────── 臀 ─────────
  {
    id: "hip-thrust",
    name: "臀推",
    nameEn: "Hip Thrust",
    group: "glutes",
    equipment: "平凳 + 哑铃或杠铃(也有专门的臀推机)",
    startWeight: "自重 → 10–20 kg",
    setup:
      "坐在地上,上背(肩胛骨下沿)靠在平凳边缘。哑铃/杠铃横放在髋部(可垫一块垫子)。双脚与肩同宽踩地,脚跟的位置要让你顶起时小腿垂直于地面。",
    steps: [
      "下巴微收,眼睛看前方(不要仰头)。",
      "脚跟发力,把髋部向上顶,直到肩-髋-膝成一条直线,呼气。",
      "顶端用力夹紧屁股 1–2 秒,肋骨下压不要挺腰。",
      "慢慢放下到屁股接近地面,吸气。",
    ],
    mistakes: ["顶端过度挺腰(腰酸说明臀没发力)。", "脚离太远或太近。", "用脚尖发力。"],
    feel: "臀部强烈收紧。腰不应该酸。",
  },
  {
    id: "glute-bridge",
    name: "臀桥",
    nameEn: "Glute Bridge",
    group: "glutes",
    equipment: "瑜伽垫",
    startWeight: "自重",
    setup: "仰卧,膝盖弯曲,双脚与髋同宽踩地,脚跟离屁股一个手掌的距离。手臂放在身体两侧。",
    steps: [
      "收紧肚子,把下背轻轻贴向地面。",
      "脚跟发力把屁股抬起,直到肩-髋-膝成一条直线,呼气。",
      "顶端夹紧臀部 2 秒,慢慢放下,吸气。",
    ],
    mistakes: ["抬太高变成挺腰。", "膝盖往内倒。"],
    feel: "臀部。很适合作为练腿练臀前的热身激活。",
  },
  {
    id: "hip-abduction",
    name: "坐姿髋外展",
    nameEn: "Hip Abduction Machine",
    group: "glutes",
    equipment: "髋外展机(坐着把腿向外打开的器械)",
    startWeight: "15–25 kg",
    setup: "坐下,背贴靠垫,膝盖外侧抵住两边的挡垫。用旁边的拨杆把起始位置调到双腿并拢。",
    steps: [
      "握住把手,上身坐直(稍微前倾可以更多刺激臀部)。",
      "双腿用力向外打开到最大,停 1 秒,呼气。",
      "慢慢合回(2–3 秒),配重片不要完全落下,吸气。",
    ],
    mistakes: ["靠弹力快速开合。"],
    feel: "屁股外侧上方(臀中肌)。",
  },
  {
    id: "cable-kickback",
    name: "拉索后踢腿",
    nameEn: "Cable Kickback",
    group: "glutes",
    equipment: "龙门架拉索(滑轮调到最低)+ 脚踝绑带",
    startWeight: "2.5–5 kg",
    setup: "把绑带扣在一只脚踝上并连接到最低位滑轮。面向器械站立,双手扶住架子,身体稍微前倾,支撑腿微弯。",
    steps: [
      "收紧核心,腰保持不动。",
      "绑着绑带的腿伸直向后上方踢,直到臀部收紧,呼气。",
      "顶端停 1 秒,慢慢收回,吸气。做完一边换另一边。",
    ],
    mistakes: ["踢太高导致腰跟着弯。", "身体左右晃。"],
    feel: "踢出那条腿的臀部。",
  },

  // ───────── 肩 ─────────
  {
    id: "db-shoulder-press",
    name: "坐姿哑铃推肩",
    nameEn: "Seated Dumbbell Shoulder Press",
    group: "shoulders",
    equipment: "一对哑铃 + 有靠背的凳子(靠背调到接近垂直)",
    startWeight: "每只 3–5 kg",
    setup: "背贴靠背坐稳,双脚踩实。把哑铃举到肩膀两侧,掌心朝前,小臂垂直于地面,手肘略微在身体前方。",
    steps: [
      "收紧核心,下背不要过度拱起。",
      "垂直向上推,直到手臂接近伸直,哑铃在头顶略微靠近,呼气。",
      "慢慢下放到哑铃与耳朵同高,吸气。",
    ],
    mistakes: ["腰拱得很厉害。", "耸肩。", "下放太浅。"],
    feel: "肩膀前侧和中间。",
  },
  {
    id: "machine-shoulder-press",
    name: "器械推肩",
    nameEn: "Machine Shoulder Press",
    group: "shoulders",
    equipment: "坐姿推肩机",
    startWeight: "5–15 kg",
    setup: "调整座椅,让把手在肩膀高度或略高。背贴靠垫,双脚踩实。",
    steps: [
      "握住把手,手腕直立。",
      "向上推到手臂接近伸直(不锁死),呼气。",
      "慢慢放回到起始位置,配重片不要落下,吸气。",
    ],
    mistakes: ["背离开靠垫。", "耸肩。"],
    feel: "肩膀。",
  },
  {
    id: "lateral-raise",
    name: "哑铃侧平举",
    nameEn: "Dumbbell Lateral Raise",
    group: "shoulders",
    equipment: "一对轻哑铃",
    startWeight: "每只 2–3 kg",
    setup: "站直,双手各拿一只哑铃垂在身体两侧,手肘微弯,身体稍微前倾一点点。",
    steps: [
      "肩膀下沉,不要耸肩。",
      "手臂向身体两侧抬起(想象手肘带着手往外画弧),抬到与肩同高即可,呼气。",
      "顶端小拇指略高于大拇指(像倒水),停一下。",
      "慢慢放下(2–3 秒),吸气。",
    ],
    mistakes: ["重量太重→耸肩、甩身体。这个动作轻重量就很有效。", "抬过肩膀太高。"],
    feel: "肩膀外侧(三角肌中束)灼烧感。",
  },
  {
    id: "rear-delt-fly",
    name: "反向蝴蝶机飞鸟",
    nameEn: "Reverse Pec Deck",
    group: "shoulders",
    equipment: "蝴蝶机(把手调到最靠后的位置,面向靠垫坐)",
    startWeight: "5–10 kg",
    setup: "面对靠垫坐下,胸口贴住垫子。把手调到最里面,双手握住把手,与肩同高,手肘微弯。",
    steps: [
      "肩膀下沉。",
      "双臂向两侧向后打开,直到手臂和身体成一条直线,呼气。",
      "停 1 秒,慢慢合回,吸气。",
    ],
    mistakes: ["耸肩。", "用身体后仰借力。"],
    feel: "肩膀后侧。",
  },

  // ───────── 手臂 ─────────
  {
    id: "db-curl",
    name: "哑铃弯举",
    nameEn: "Dumbbell Biceps Curl",
    group: "arms",
    equipment: "一对哑铃",
    startWeight: "每只 3–5 kg",
    setup: "站直,双手各拿一只哑铃垂在身体两侧,掌心朝前,手肘贴着身体。",
    steps: [
      "大臂固定不动,只弯手肘,把哑铃举向肩膀,呼气。",
      "顶端收紧 1 秒。",
      "慢慢放下到手臂伸直(2–3 秒),吸气。",
    ],
    mistakes: ["身体前后晃、甩上去。", "手肘往前跑。"],
    feel: "大臂前侧(二头肌)。",
  },
  {
    id: "triceps-pushdown",
    name: "绳索下压",
    nameEn: "Triceps Rope Pushdown",
    group: "arms",
    equipment: "龙门架拉索(滑轮调到最高)+ 绳索把手",
    startWeight: "5–10 kg",
    setup: "滑轮调到最高位,装上绳索。面向器械站立,双手握住绳子,身体稍微前倾,手肘夹在身体两侧。",
    steps: [
      "大臂固定不动,手肘始终贴着身体。",
      "向下压到手臂伸直,最后把绳子向两边分开,呼气。",
      "停 1 秒,慢慢回到小臂略高于水平的位置,吸气。",
    ],
    mistakes: ["手肘跟着前后移动。", "用身体往下压。"],
    feel: "大臂后侧(三头肌,也就是“拜拜肉”的位置)。",
  },
  {
    id: "overhead-triceps",
    name: "哑铃颈后臂屈伸",
    nameEn: "Overhead Triceps Extension",
    group: "arms",
    equipment: "一只哑铃",
    startWeight: "4–6 kg",
    setup: "坐在有靠背的凳子上,双手托住一只哑铃的一端举过头顶,手臂伸直。",
    steps: [
      "大臂贴近耳朵、保持不动。",
      "弯手肘让哑铃慢慢下降到头后方,吸气。",
      "伸直手臂把哑铃举回头顶,呼气。",
    ],
    mistakes: ["手肘向两边张开。", "腰过度拱起。"],
    feel: "大臂后侧。",
  },

  // ───────── 核心 ─────────
  {
    id: "plank",
    name: "平板支撑",
    nameEn: "Plank",
    group: "core",
    equipment: "瑜伽垫",
    startWeight: "20–40 秒",
    setup: "小臂撑地,手肘在肩膀正下方。双脚向后伸直,脚尖着地。",
    steps: [
      "从头到脚跟成一条直线。",
      "收紧肚子(像有人要打你肚子)、夹紧屁股。",
      "保持正常呼吸,不要憋气,坚持到规定时间。记录时“次数”填秒数。",
    ],
    mistakes: ["塌腰。", "屁股翘太高。", "憋气。"],
    feel: "整个腹部发紧。腰酸说明塌腰了,立刻停下休息。",
  },
  {
    id: "dead-bug",
    name: "死虫式",
    nameEn: "Dead Bug",
    group: "core",
    equipment: "瑜伽垫",
    startWeight: "自重",
    setup: "仰卧,双手伸直指向天花板,双腿抬起,髋和膝都弯成 90 度。下背贴住地面。",
    steps: [
      "收紧肚子,下背始终压住垫子。",
      "右手向头顶方向、左腿向前同时慢慢伸直放低(不碰地),呼气。",
      "收回,换另一侧(左手 + 右腿)。左右各一次算 1 次。",
    ],
    mistakes: ["下背拱起离开地面——幅度做小一点。"],
    feel: "腹部深层。对新手非常安全。",
  },
  {
    id: "crunch",
    name: "卷腹",
    nameEn: "Crunch",
    group: "core",
    equipment: "瑜伽垫",
    startWeight: "自重",
    setup: "仰卧,膝盖弯曲,双脚踩地。双手轻轻放在耳朵旁边或交叉放胸前。",
    steps: [
      "下巴和胸口之间留一个拳头的距离。",
      "用肚子的力量把肩胛骨卷离地面(下背不离地),呼气。",
      "顶端停 1 秒,慢慢放下,吸气。",
    ],
    mistakes: ["用手拉脖子。", "整个上身坐起来(变成仰卧起坐)。"],
    feel: "上腹部。",
  },
  {
    id: "leg-raise",
    name: "仰卧抬腿",
    nameEn: "Lying Leg Raise",
    group: "core",
    equipment: "瑜伽垫",
    startWeight: "自重",
    setup: "仰卧,双腿伸直并拢,双手放在身体两侧或垫在屁股下面。",
    steps: [
      "下背贴紧地面。",
      "双腿伸直(可微弯)慢慢抬起到垂直地面,呼气。",
      "慢慢放下到快碰地但不碰地,吸气。",
    ],
    mistakes: ["下放时腰拱起——腿不用放那么低,或者弯膝做。"],
    feel: "下腹部。",
  },

  // ───────── 有氧 ─────────
  {
    id: "treadmill-walk",
    name: "跑步机坡度走",
    nameEn: "Incline Treadmill Walk",
    group: "cardio",
    equipment: "跑步机",
    startWeight: "坡度 5–8,速度 4.5–5.5 km/h,15–20 分钟",
    setup: "站上跑步机,夹好安全夹。先用速度 3–4 走 2 分钟热身,再把坡度和速度调上去。",
    steps: [
      "身体挺直,手自然摆动,尽量不要一直抓扶手。",
      "保持能说话但有点喘的强度(手表心率大约在最大心率的 60–70%)。",
      "结束前把坡度降到 0、速度降到 3,慢走 2 分钟放松。记录时“次数”填分钟数。",
    ],
    mistakes: ["抓着扶手身体往后仰。"],
    feel: "微微出汗、心率上升,臀腿有感觉。",
  },
  {
    id: "elliptical",
    name: "椭圆机",
    nameEn: "Elliptical",
    group: "cardio",
    equipment: "椭圆机",
    startWeight: "阻力 4–6,10–20 分钟",
    setup: "扶住固定把手踩上踏板,开始蹬就会启动。",
    steps: [
      "身体站直,核心收紧,脚掌整个踩在踏板上。",
      "手握活动把手,手脚配合推拉。",
      "保持均匀节奏。记录时“次数”填分钟数。",
    ],
    mistakes: ["驼背趴在扶手上。", "脚尖踮着踩。"],
    feel: "全身微微发热,对膝盖比跑步友好。",
  },
  // ───────── 补充动作 ─────────
  {
    id: "db-shrug",
    name: "哑铃耸肩",
    nameEn: "Dumbbell Shrug",
    group: "back",
    equipment: "一对哑铃",
    startWeight: "每只 6–10 kg",
    setup: "站直,双脚与髋同宽,双手各拿一只哑铃垂在身体两侧,掌心朝向大腿。手臂全程伸直放松。",
    steps: [
      "挺胸,眼睛平视,手臂像两根绳子一样挂着哑铃。",
      "把肩膀笔直地往耳朵方向耸起,耸到最高,呼气。手肘不要弯。",
      "顶端停 1–2 秒,感觉脖子两侧到上背收紧。",
      "慢慢放下到肩膀完全下沉,吸气。",
    ],
    mistakes: ["肩膀转圈(没有用,还磨肩)。", "弯手肘用手臂提。", "头往前伸。"],
    feel: "脖子后方到上背(斜方肌上部)。",
  },
  {
    id: "straight-arm-pulldown",
    name: "直臂下压",
    nameEn: "Straight-arm Pulldown",
    group: "back",
    equipment: "龙门架拉索(滑轮调到最高)+ 直杆或绳索",
    startWeight: "7.5–12.5 kg",
    setup: "滑轮调到最高,面向器械站立,后退一步。双手与肩同宽握住直杆,手臂伸直(手肘微弯并锁住这个角度),身体稍微前倾,屁股往后坐一点。",
    steps: [
      "挺胸,肩膀下沉,核心收紧。",
      "手臂保持伸直,像画一个大弧线一样把杆从头前上方压到大腿前面,呼气。",
      "到大腿时停 1 秒,用力夹紧腋下。",
      "慢慢让杆回到额头高度,感觉背部两侧被拉长,吸气。",
    ],
    mistakes: ["弯手肘(变成练三头)。", "用身体上下起伏去压。", "耸肩。"],
    feel: "腋下后方的背阔肌。很适合找不到“背发力感觉”的新手。",
  },
  {
    id: "superman",
    name: "超人式",
    nameEn: "Superman",
    group: "back",
    equipment: "瑜伽垫",
    startWeight: "自重",
    setup: "趴在垫子上,双臂向前伸直,双腿伸直并拢,额头轻轻贴近地面,眼睛看地板。",
    steps: [
      "收紧臀部和下背。",
      "同时把双臂、胸口和双腿抬离地面几厘米,像超人飞行,呼气。",
      "顶端停 2 秒,不用抬很高。",
      "慢慢放回地面,吸气。",
    ],
    mistakes: ["抬头看前方(压迫脖子)。", "用甩的、抬得过高折腰。"],
    feel: "下背和臀部收紧。",
  },
  {
    id: "decline-db-press",
    name: "下斜哑铃卧推",
    nameEn: "Decline Dumbbell Bench Press",
    group: "chest",
    equipment: "一对哑铃 + 下斜凳(头低脚高,约 15–30 度)",
    startWeight: "每只 4–7 kg",
    setup:
      "先把脚勾在下斜凳的挡垫里固定好,哑铃放在大腿上,再慢慢躺下,把哑铃带到胸部下沿的两侧(乳头下方一点)。第一次做建议请人帮忙递哑铃。",
    steps: [
      "肩胛骨夹紧贴住凳面。手肘指向斜下方,大臂和身体夹角约 45–60 度(像箭头 ↑,不是 T 字),小臂垂直地面。",
      "垂直向上推(对着天花板,不是对着脸),终点在胸部下沿的正上方,手臂接近伸直,呼气。",
      "慢慢下放到哑铃回到乳头下方的两侧,吸气。",
      "做完后把哑铃收到胸口,用腹部力量坐起来,或请人接走哑铃。",
    ],
    mistakes: [
      "脚没勾稳就开始做。",
      "下放位置太靠近脖子——要落在乳头下方。",
      "手肘张成 T 字、耸肩。",
      "头低的时间太长会头晕——组间坐起来休息。",
    ],
    feel: "胸部下半部分:乳头以下、胸部下沿那条弧线。",
  },
  {
    id: "cable-fly-high",
    name: "高位拉索夹胸",
    nameEn: "High-to-low Cable Fly",
    group: "chest",
    equipment: "龙门架两侧拉索(滑轮调到高于肩膀)+ 单手把手",
    startWeight: "每边 5–7.5 kg",
    setup:
      "两边滑轮调到最高。先握住一边把手,再去握另一边,走到正中间向前跨一步,双脚前后站稳,身体稍微前倾。起始时双手在肩膀两侧略高的位置,掌心朝前朝下,手肘微弯、手肘尖指向后上方。",
    steps: [
      "肩膀往下压、往后收,胸口挺起。",
      "保持手肘微弯的角度不变,双手沿一条向下向中间的弧线合拢,呼气。想着“用大臂去夹胸”。",
      "双手在肚脐正前方相碰(手比手肘低),停 1 秒,夹紧胸部下沿。",
      "慢慢打开回到肩膀两侧,到胸有拉伸感、手和肩膀在一条线上就停,吸气。",
    ],
    mistakes: [
      "手肘越弯越多——变成“推”,手臂会酸。",
      "肩膀往前顶、耸肩——肩膀前侧或斜方肌会代替胸发力。",
      "打开时手超过肩膀后方太多。",
    ],
    feel: "胸部下半部分:乳头以下,以及两胸中间靠下的位置。",
  },
  {
    id: "cable-fly-low",
    name: "低位拉索夹胸",
    nameEn: "Low-to-high Cable Fly",
    group: "chest",
    equipment: "龙门架两侧拉索(滑轮调到最低)+ 单手把手",
    startWeight: "每边 2.5–5 kg",
    setup:
      "两边滑轮调到最低。握住两边把手站到中间,向前跨一步站稳。起始时双手在大腿两侧稍微靠后,掌心朝前,手肘微弯。",
    steps: [
      "挺胸,肩膀往下压,不要耸起来。",
      "双手沿一条向上向中间的弧线“捧”起来,像用双手捧水,手肘保持微弯,呼气。",
      "双手在锁骨正前方(胸口到下巴之间的高度)相碰,手肘略低于手,停 1 秒,感觉上胸收紧。",
      "慢慢放回大腿两侧,吸气。",
    ],
    mistakes: [
      "耸肩——斜方肌和肩膀前侧会代替胸发力。这是这个动作最常见的错误。",
      "手抬得比下巴还高——变成练肩。",
      "重量太重导致身体后仰。",
    ],
    feel: "胸部上半部分:锁骨下面两三指宽的那一片。",
  },
  {
    id: "front-raise",
    name: "哑铃前平举",
    nameEn: "Front Dumbbell Raise",
    group: "shoulders",
    equipment: "一对轻哑铃",
    startWeight: "每只 2–3 kg",
    setup: "站直,双手各拿一只哑铃放在大腿前面,掌心朝向大腿。",
    steps: [
      "核心收紧,身体不要晃。",
      "手臂伸直(手肘微弯),把哑铃向正前方抬到与肩同高,呼气。可以两手一起,也可以左右交替。",
      "顶端停一下,慢慢放下(2–3 秒),吸气。",
    ],
    mistakes: ["身体后仰甩上去。", "抬得比肩膀高很多。", "耸肩。"],
    feel: "肩膀前侧。",
  },
  {
    id: "hammer-curl",
    name: "锤式弯举",
    nameEn: "Hammer Curl",
    group: "arms",
    equipment: "一对哑铃",
    startWeight: "每只 3–5 kg",
    setup: "站直,双手各拿一只哑铃垂在身体两侧,掌心相对(像握锤子),手肘贴着身体。",
    steps: [
      "大臂固定不动,保持掌心相对。",
      "弯手肘把哑铃举向肩膀,呼气。",
      "顶端收紧 1 秒,慢慢放下到手臂伸直,吸气。",
    ],
    mistakes: ["身体前后晃。", "手肘往前跑。", "举的时候手腕转动。"],
    feel: "大臂前外侧和小臂。",
  },
  {
    id: "russian-twist",
    name: "俄罗斯转体",
    nameEn: "Russian Twist",
    group: "core",
    equipment: "瑜伽垫(可加一只轻哑铃或药球)",
    startWeight: "自重 → 2–4 kg",
    setup: "坐在垫子上,膝盖弯曲,脚跟着地(进阶可抬脚)。上半身向后倾约 45 度,背挺直,双手在胸前合拢。",
    steps: [
      "收紧肚子,背不要驼。",
      "上半身带着双手一起转向右边,手碰一下身体右侧的地面,呼气。",
      "回到中间,再转向左边。左右各一次算 1 次。",
    ],
    mistakes: ["只动手臂、身体没转。", "驼背。", "速度太快。"],
    feel: "腰两侧(腹斜肌)。",
  },
  {
    id: "hip-adduction",
    name: "坐姿髋内收",
    nameEn: "Hip Adduction Machine",
    group: "legs",
    equipment: "髋内收机(坐着把腿向内夹的器械)",
    startWeight: "15–25 kg",
    setup: "坐下,背贴靠垫,膝盖内侧抵住两边的挡垫。用拨杆把起始位置调到双腿打开、大腿内侧有轻微拉伸感的宽度。",
    steps: [
      "握住把手,上身坐直。",
      "双腿用力向中间夹拢,直到两边垫子相碰,停 1 秒,呼气。",
      "慢慢打开回到起始位置(2–3 秒),吸气。",
    ],
    mistakes: ["起始位置调得太开拉伤内侧。", "靠弹力快速开合。"],
    feel: "大腿内侧。",
  },
];

export const EXERCISES: Exercise[] = BASE.map((e) => ({
  ...e,
  ...EXERCISE_META[e.id],
  cues: CUES[e.id] ?? [],
  attachment: EXERCISE_ATTACHMENT[e.id],
  shape: SHAPE[e.id],
}));

/** A body part, or the curated "shaping" collection. */
export type LibGroup = Group | "shape";

export function subsFor(g: LibGroup): { id: string; label: string }[] {
  return g === "shape" ? SHAPE_GOALS : SUBS[g];
}

/** Exercises in a group (and optional sub-category), including cross-listed ones. */
export function listExercises(g: LibGroup, sub = ""): Exercise[] {
  if (g === "shape") {
    // SHAPE is written goal by goal, most important exercise first
    const order = Object.keys(SHAPE);
    return EXERCISES.filter((e) => e.shape && (!sub || e.shape === sub)).sort(
      (a, b) => order.indexOf(a.id) - order.indexOf(b.id),
    );
  }
  return EXERCISES.filter((e) =>
    sub
      ? (e.group === g && e.sub === sub) || e.alsoIn.includes(`${g}/${sub}`)
      : e.group === g || e.alsoIn.some((t) => t.startsWith(`${g}/`)),
  );
}

/** Label of the sub-category an exercise is listed under within `g`. */
export function subLabel(e: Exercise, g: LibGroup): string | undefined {
  const id =
    g === "shape"
      ? e.shape
      : e.group === g
        ? e.sub
        : e.alsoIn.find((t) => t.startsWith(`${g}/`))?.split("/")[1];
  return subsFor(g).find((x) => x.id === id)?.label;
}


export const EX_BY_ID: Record<string, Exercise> = Object.fromEntries(
  EXERCISES.map((e) => [e.id, e]),
);

export function videoUrl(name: string, nameEn?: string) {
  const q = `${nameEn ?? name} proper form tutorial`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}

/** The two demo photos (start / end position) for an exercise. */
export function exerciseImages(id: string): [string, string] {
  return [`/exercises/${id}-0.jpg`, `/exercises/${id}-1.jpg`];
}
