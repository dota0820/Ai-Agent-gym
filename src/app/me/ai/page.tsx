"use client";
import { useEffect, useState } from "react";
import { Card, SubPage } from "@/components/ui";
import { AI_MODELS } from "@/lib/models";
import { setAiModel, useApp, useHydrated } from "@/lib/store";

interface ServerConfig {
  provider: "openrouter" | "anthropic" | "none";
  defaultModel: string | null;
}

export default function MeAiPage() {
  const { aiModel } = useApp();
  const ready = useHydrated();
  const [cfg, setCfg] = useState<ServerConfig | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j) setCfg(j);
      })
      .catch(() => {});
  }, []);

  if (!ready) return null;

  const disabled = cfg?.provider === "anthropic";

  return (
    <SubPage title="AI 模型">
      {cfg?.provider === "none" && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          服务器还没配置 API Key（OPENROUTER_API_KEY 或 ANTHROPIC_API_KEY），AI 功能暂不可用。
        </div>
      )}

      {disabled && (
        <div className="rounded-2xl border border-line bg-bg px-4 py-3 text-sm text-sub">
          当前直连 Claude，需在 Vercel 配置 OPENROUTER_API_KEY 才能切换模型。
        </div>
      )}

      <Card className={`divide-y divide-line overflow-hidden p-0 ${disabled ? "opacity-50" : ""}`}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setAiModel("")}
          className="flex w-full items-start gap-3 px-4 py-3.5 text-left active:bg-bg disabled:cursor-not-allowed"
        >
          <span className="mt-0.5 text-base">{aiModel === "" ? "◉" : "○"}</span>
          <div className="min-w-0 flex-1">
            <div className="font-semibold">
              服务器默认
              {cfg?.defaultModel ? ` (${cfg.defaultModel})` : ""}
            </div>
            <div className="text-xs text-sub">跟随 Vercel 环境变量 OPENROUTER_MODEL</div>
          </div>
        </button>

        {AI_MODELS.map((m) => {
          const active = aiModel === m.id;
          return (
            <button
              key={m.id}
              type="button"
              disabled={disabled}
              onClick={() => setAiModel(m.id)}
              className="flex w-full items-start gap-3 px-4 py-3.5 text-left active:bg-bg disabled:cursor-not-allowed"
            >
              <span className={`mt-0.5 text-base ${active ? "text-primary" : "text-sub"}`}>
                {active ? "◉" : "○"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{m.label}</div>
                <div className="text-xs text-sub">{m.note}</div>
              </div>
            </button>
          );
        })}
      </Card>

      <p className="px-1 text-xs leading-relaxed text-sub">
        所有 AI 功能（教练、饮食分析、器械识别、导入动作）都会使用这个模型。API Key 在 Vercel 环境变量里设置，App 不会保存。
      </p>
    </SubPage>
  );
}
