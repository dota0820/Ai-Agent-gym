# 练练 · AI 健身教练

给健身新手的手机网页 App(PWA):AI 教练安排每次训练、把动作教到能照着做、记录每一次并和上次对比。

## 功能

- **今天** — 点一个部位(背/胸/腿/臀…),教练根据你的资料和历史记录排好动作、组数、重量。
- **AI 教练** — 随时聊天:问动作、聊下次练什么、口述训练让它帮你记录;它会记住伤病和偏好。
- **训练中** — 每个动作显示「上次做了多少」、详细做法(器械怎么调、坐哪里、拉到哪里、哪里该酸)、组间休息倒计时。
- **记录** — 每次训练的明细,每个动作和上一次的对比;一键让教练点评。
- **手表数据** — 上传荣耀/华为运动健康、Apple Watch 等的运动截图,AI 自动读出时长、卡路里、心率;也可手填。
- **动作库** — 35 个新手常用动作的详细图文步骤。

数据保存在手机浏览器本地(「我的」页可导出/导入备份)。

## 本地运行

```bash
cp .env.example .env.local   # 填入 OPENROUTER_API_KEY 或 ANTHROPIC_API_KEY
npm install
npm run dev                  # http://localhost:3000
```

## 部署(Vercel)

1. 在 vercel.com 导入这个 GitHub 仓库。
2. 在 Environment Variables 里添加 `OPENROUTER_API_KEY`(或 `ANTHROPIC_API_KEY`),建议同时设置 `APP_PASSCODE`。用 OpenRouter 时可用 `OPENROUTER_MODEL` 换模型,默认 `anthropic/claude-sonnet-5.5`。
3. 部署后用手机打开网址 →「添加到主屏幕」,在「我的」页填入口令。

## 代码结构

- `src/lib/exercises.ts` — 动作库内容
- `src/lib/coach-prompt.ts` — 教练的系统提示词
- `src/app/api/chat/route.ts` — AI 教练(工具:保存计划 / 记录训练 / 记住信息)
- `src/lib/openrouter.ts` — OpenRouter 接入;`src/lib/coach-tools.ts` — 两种接入共用的工具定义
- `src/app/api/watch/route.ts` — 手表截图识别
- `src/lib/store.ts`, `src/lib/actions.ts` — 本地数据与聊天逻辑
