/** The three things to remember for each exercise — shown large, before any long text. */
export const CUES: Record<string, [string, string, string]> = {
  "lat-pulldown": ["先沉肩,再弯手肘", "拉到锁骨,不拉到脖子后面", "慢慢放回,不要让它砸下去"],
  "seated-row": ["坐直挺胸,身体不前后晃", "手肘贴着身体,拉到肚脐", "最后把肩胛骨往中间夹一下"],
  "assisted-pullup": ["辅助重量选得越大越轻松", "先沉肩再拉,下巴过把手", "慢慢下放,先踩踏板再下来"],
  "db-row": ["背放平,像一张桌面", "哑铃拉向裤子口袋", "身体不要跟着扭"],
  "face-pull": ["滑轮调到和脸一样高", "拉向额头,双手向两边分开", "手肘始终比手高"],
  "back-extension": ["垫子卡在髋骨下方", "背挺直往下弯", "起来到一条直线就停"],
  "chest-press": ["把手和乳头连线一样高", "手肘比肩膀低:像箭头 ↑,不像 T 字", "肩膀后收贴靠垫,不要耸肩"],
  "db-bench": ["哑铃放在乳头连线的两侧", "手肘指向斜下方:像箭头 ↑,不像 T 字", "小臂垂直地面,推到乳头正上方"],
  "incline-db-press": ["靠背 30–45 度,别调太陡", "哑铃在锁骨下方的两侧", "垂直往天花板推,不要耸肩"],
  "pec-fly": ["把手和乳头连线一样高", "手肘微弯,角度锁住不变", "在两个乳头中间的正前方合拢"],
  "knee-pushup": ["手掌撑在乳头连线的两侧", "手肘指向斜后方:像箭头 ↑,不像 T 字", "胸口落到两手之间再推起"],
  "leg-press": ["背和屁股贴紧靠垫", "膝盖对着脚尖方向", "蹬起时膝盖绝不锁死"],
  "goblet-squat": ["哑铃贴在胸口", "屁股往后往下坐", "膝盖朝脚尖打开,脚跟不离地"],
  "leg-extension": ["膝盖对准机器转轴", "伸直后停 1 秒", "慢慢放下,不要甩"],
  "leg-curl": ["压紧大腿上的挡垫", "小腿往屁股方向勾", "慢慢放回"],
  "db-rdl": ["屁股往后推,像用屁股关门", "背一直是平的", "哑铃贴着腿滑下去"],
  lunge: ["向后退一大步", "身体垂直往下蹲", "前脚脚跟发力站起"],
  "calf-raise": ["脚跟先下沉拉伸", "踮到最高停 1 秒", "慢慢放下"],
  "hip-thrust": ["上背靠凳,下巴微收", "脚跟发力把髋顶起", "顶端夹紧屁股,不要挺腰"],
  "glute-bridge": ["脚跟离屁股一个手掌", "抬到肩、髋、膝一条线", "顶端夹紧 2 秒"],
  "hip-abduction": ["背贴靠垫坐稳", "用力向外打开,停 1 秒", "慢慢合回"],
  "cable-kickback": ["绑带扣在脚踝上", "腰不动,腿向后上方踢", "臀部夹紧,再慢慢收回"],
  "db-shoulder-press": ["背贴靠背,腰不要拱", "从耳朵旁往正上方推", "放回到耳朵高度"],
  "machine-shoulder-press": ["把手调到肩膀高度", "推到手臂快伸直", "不要耸肩"],
  "lateral-raise": ["用轻的重量", "手肘带着手往两侧抬", "抬到肩膀高度就停"],
  "rear-delt-fly": ["胸口贴住垫子", "双臂向后打开成一条线", "不要耸肩"],
  "db-curl": ["手肘贴着身体不动", "只弯手肘把哑铃举起", "慢慢放下到手臂伸直"],
  "triceps-pushdown": ["手肘夹在身体两侧不动", "压到手臂伸直,绳子分开", "慢慢回到胸口高度"],
  "overhead-triceps": ["大臂贴近耳朵不动", "哑铃慢慢降到头后面", "伸直手臂举回头顶"],
  plank: ["手肘在肩膀正下方", "头到脚成一条直线", "收紧肚子,不要憋气"],
  "dead-bug": ["下背始终贴着地面", "对侧的手和脚慢慢伸直", "腰一拱起就把幅度做小"],
  crunch: ["手不要拉脖子", "只把肩胛骨卷离地面", "慢慢放下"],
  "leg-raise": ["下背贴紧地面", "腿慢慢抬到垂直", "放下时不碰地"],
  "treadmill-walk": ["先慢走 2 分钟热身", "坡度 5–8,速度 4.5–5.5", "尽量不抓扶手"],
  elliptical: ["身体站直", "脚掌整个踩实", "保持均匀的节奏"],
  "db-shrug": ["手臂伸直不弯", "肩膀直上直下地耸", "顶端停 1–2 秒"],
  "straight-arm-pulldown": ["手臂全程伸直", "把杆画弧线压到大腿", "夹紧腋下"],
  superman: ["眼睛看地板", "手脚同时抬离地面几厘米", "停 2 秒再放下"],
  "decline-db-press": ["先把脚勾稳", "哑铃在乳头下方的两侧", "垂直往上推,手肘不张成 T 字"],
  "cable-fly-high": ["滑轮调到最高,肩膀往下压", "手肘微弯,向下向中间画弧线", "在肚脐正前方相碰"],
  "cable-fly-low": ["滑轮调到最低,不要耸肩", "双手向上向中间捧起来", "在锁骨正前方相碰,不高过下巴"],
  "front-raise": ["用轻的重量", "向正前方抬到肩膀高", "身体不要后仰"],
  "hammer-curl": ["掌心相对,像握锤子", "手肘贴身不动", "慢慢放下"],
  "russian-twist": ["上身后倾 45 度,背挺直", "身体带着手一起转", "慢一点"],
  "hip-adduction": ["起始宽度不要调太开", "用力向中间夹,停 1 秒", "慢慢打开"],
  "worlds-greatest-stretch": ["后腿蹬直,手肘往脚踝内侧沉", "同侧手臂向天花板旋转打开", "眼睛跟着手指看"],
  "cat-cow": ["呼气拱背低头,像炸毛的猫", "吸气沉腰推胸,肩远离耳朵", "一节一节缓慢活动脊柱"],
  "thoracic-open-book": ["双膝屈 90 度贴紧地面不动", "上方手臂像翻书向对侧打开", "呼气让远端肩膀慢慢落向地面"],
  "hip-90-90": ["前后腿膝盖各弯成 90 度", "挺直上身,不要弯腰驼背", "以脚跟为轴平稳翻转双膝"],
  "wall-slide": ["臀、上背、后脑勺贴紧墙面", "手肘和手背尽量全程贴墙", "腰不要拱起离开墙面"],
  "ankle-pry-squat": ["蹲到底,用手肘把膝盖往外顶", "脚跟踩死地面绝不抬起", "重心左右平移把膝盖压过脚尖"],
  "band-monster-walk": ["弹力带套在膝盖上方或脚踝", "微屈髋膝半蹲,脚尖始终朝前", "迈小步始终绷紧弹力带"],
  "foam-roll-back": ["泡沫轴只滚上背,不滚下腰", "双手托头保护脖子,先抬起屁股", "遇到酸痛点停住深呼吸 3 次"],
  "bulgarian-split-squat": ["后脚脚背轻搭凳面,不靠后腿蹬", "上身微前倾,重心全在前脚脚跟", "前膝朝脚尖方向稳定下蹲"],
  "sumo-squat": ["双脚约 1.5 倍肩宽,脚尖外展 45°", "膝盖严格顺着脚尖方向打开", "脚跟与大腿内侧发力蹲起"],
  "cable-pull-through": ["背对低滑轮,双脚跨过绳索站立", "屁股像关门一样往后推,背挺平", "髋部往前顶并夹紧屁股站直"],
  "single-leg-glute-bridge": ["单脚脚跟踩实,另一腿抬空固定", "用支撑脚脚跟把髋顶成一条直线", "骨盆保持水平,不要一边高一边低"],
  "chest-supported-row": ["胸口贴紧 30–45° 上斜凳不借力", "先沉肩,手肘往后拉向裤子口袋", "顶端把肩胛骨用力夹紧 1 秒"],
  "prone-ytw": ["大拇指朝天花板,不拿重物或极轻", "全程沉肩,不要耸脖子", "Y、T、W 每个字母在顶端停 2 秒"],
  "band-external-rotation": ["手肘弯 90 度,紧紧夹在肋骨旁", "可在腋下夹毛巾防手肘离开", "小臂像开门一样缓慢向外转"],
  "preacher-curl": ["大臂后侧完全贴紧斜托垫不动", "下放到底前留一点微弯不锁死", "只靠二头收缩把重量弯举上来"],
  "bird-dog": ["四足跪姿,腰背平得像放了杯水", "对侧手往前伸、脚往后蹬到水平", "骨盆不翻转、腰部绝不塌陷"],
  "pallof-press": ["侧对龙门架,滑轮调到胸口高度", "双手把把手从胸前垂直往前推直", "核心收紧对抗拉索,身体绝不扭转"],
  "farmers-walk": ["双手提重铃,肩膀后收下沉不耸肩", "收紧肚子和屁股,身体不左右摇晃", "目视前方,迈小步平稳往前走"],
};

export type AttachmentType =
  | "lat-bar"
  | "v-bar"
  | "rope"
  | "straight-bar"
  | "d-handle"
  | "ankle-strap";

/** Cable attachments ("手握"): what they are called and how to recognise them. */
export const ATTACHMENTS: Record<AttachmentType, { name: string; nameEn: string; looks: string }> = {
  "lat-bar": {
    name: "长横杆",
    nameEn: "Lat Bar",
    looks: "一根很长的金属杆,两端微微向下弯",
  },
  "v-bar": {
    name: "V 形把手",
    nameEn: "V-Bar / Double-D Handle",
    looks: "两个并排的小把手连在一起,握上去掌心相对",
  },
  rope: {
    name: "绳索把手",
    nameEn: "Rope",
    looks: "一条粗绳子,两端各有一个橡胶球",
  },
  "straight-bar": {
    name: "短直杆",
    nameEn: "Straight Bar",
    looks: "一根和肩膀差不多宽的短直杆",
  },
  "d-handle": {
    name: "单手把手",
    nameEn: "D-Handle",
    looks: "一个像马镫的 D 形单手拉环",
  },
  "ankle-strap": {
    name: "脚踝绑带",
    nameEn: "Ankle Strap",
    looks: "一条带魔术贴和金属环的宽带子",
  },
};

/** Which attachment each cable exercise uses, and how to hold it. */
export const EXERCISE_ATTACHMENT: Record<string, { type: AttachmentType; grip: string }> = {
  "lat-pulldown": { type: "lat-bar", grip: "掌心朝前握,比肩膀宽一个手掌" },
  "seated-row": { type: "v-bar", grip: "双手各握一个小把手,掌心相对" },
  "face-pull": { type: "rope", grip: "双手各握一端,大拇指朝向自己" },
  "straight-arm-pulldown": { type: "straight-bar", grip: "掌心朝下,与肩同宽(没有直杆可以用绳索)" },
  "triceps-pushdown": { type: "rope", grip: "双手各握一端,掌心相对,抓在橡胶球上方" },
  "cable-kickback": { type: "ankle-strap", grip: "绑在脚踝上扣紧,金属环朝后" },
  "cable-fly-high": { type: "d-handle", grip: "两边滑轮各挂一个,一手握一个" },
  "cable-fly-low": { type: "d-handle", grip: "两边滑轮各挂一个,一手握一个" },
  "cable-pull-through": { type: "rope", grip: "背对滑轮从胯下穿过绳索,双手各握一端橡胶球上方" },
  "pallof-press": { type: "d-handle", grip: "侧对滑轮,双手十指交扣共同握住一个单手把手" },
};

/** Goals in the "shaping" starter collection. */
export const SHAPE_GOALS = [
  { id: "glutes", label: "翘臀" },
  { id: "legs", label: "腿部线条" },
  { id: "posture", label: "挺拔体态" },
  { id: "arms", label: "肩臂线条" },
  { id: "waist", label: "腰腹" },
  { id: "burn", label: "燃脂" },
];

/** Beginner-friendly picks for body shaping, by goal. */
export const SHAPE: Record<string, string> = {
  "hip-thrust": "glutes",
  "bulgarian-split-squat": "glutes",
  "cable-pull-through": "glutes",
  "glute-bridge": "glutes",
  "single-leg-glute-bridge": "glutes",
  "hip-abduction": "glutes",
  "band-monster-walk": "glutes",
  "cable-kickback": "glutes",
  "db-rdl": "glutes",
  "goblet-squat": "legs",
  "sumo-squat": "legs",
  "leg-press": "legs",
  lunge: "legs",
  "leg-curl": "legs",
  "hip-adduction": "legs",
  "lat-pulldown": "posture",
  "seated-row": "posture",
  "chest-supported-row": "posture",
  "face-pull": "posture",
  "prone-ytw": "posture",
  "wall-slide": "posture",
  "band-external-rotation": "posture",
  "back-extension": "posture",
  "rear-delt-fly": "posture",
  "lateral-raise": "arms",
  "db-shoulder-press": "arms",
  "triceps-pushdown": "arms",
  "db-curl": "arms",
  "preacher-curl": "arms",
  plank: "waist",
  "dead-bug": "waist",
  "bird-dog": "waist",
  "pallof-press": "waist",
  "leg-raise": "waist",
  "russian-twist": "waist",
  "treadmill-walk": "burn",
  elliptical: "burn",
  "farmers-walk": "burn",
};

/** "It doesn't feel right" shortcuts: common places the effort goes instead. */
const WRONG_FEEL: Record<string, string[]> = {
  chest: ["感觉是斜方肌(脖子两侧)在用力", "肩膀前侧很酸,胸没感觉", "只有手臂酸,胸没感觉"],
  "back/middle": ["只有手臂酸,背没感觉", "斜方肌(脖子两侧)很紧", "腰在酸"],
  "back/upper": ["脖子很紧、不舒服", "只有小臂和手在酸"],
  "back/lower": ["腰是刺痛,不是酸胀", "屁股和大腿后侧没感觉"],
  "back/rear": ["斜方肌(脖子两侧)在用力", "后肩没感觉,手臂酸"],
  shoulders: ["斜方肌(脖子两侧)很酸", "肩膀关节卡卡的或疼", "肩膀没感觉,手臂酸"],
  glutes: ["屁股没感觉,大腿前侧酸", "腰在酸", "大腿后侧抽筋"],
  "legs/front": ["膝盖不舒服", "腰在酸", "屁股没感觉"],
  "legs/back": ["腰在酸,大腿后侧没感觉", "小腿或大腿后侧抽筋"],
  "legs/inner": ["大腿内侧拉得疼", "胯(髋关节)不舒服"],
  "legs/calves": ["脚底或脚踝不舒服", "小腿没感觉"],
  "arms/biceps": ["小臂和手腕酸,二头没感觉", "肩膀在用力"],
  "arms/triceps": ["手肘不舒服", "肩膀在用力,手臂后侧没感觉"],
  core: ["脖子酸", "腰在酸", "大腿根(髋)酸,肚子没感觉"],
  mobility: ["关节深处有挤压或刺痛感", "憋气导致全身僵硬", "腰部代偿酸痛"],
  cardio: ["膝盖不舒服", "喘得说不出话"],
};

export function wrongFeel(e: { group: string; sub: string }): string[] {
  return WRONG_FEEL[`${e.group}/${e.sub}`] ?? WRONG_FEEL[e.group] ?? [];
}
