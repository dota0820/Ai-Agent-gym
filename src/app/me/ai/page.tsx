"use client";
import { useEffect, useState } from "react";
import { Card, input, SubPage } from "@/components/ui";
import {
  AI_MODELS,
  fetchLiveModels,
  fmtPrice,
  MODEL_GROUPS,
  type LiveModel,
} from "@/lib/models";
import { setAiModel, setOpenRouterKey, useApp, useHydrated } from "@/lib/store";

interface ServerConfig {
  provider: "openrouter" | "anthropic" | "none";
  defaultModel: string | null;
}

export default function MeAiPage() {
  const { aiModel, openRouterKey, profile } = useApp();
  const ready = useHydrated();
  const [cfg, setCfg] = useState<ServerConfig | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [live, setLive] = useState<LiveModel[] | null>(null);
  const [liveState, setLiveState] = useState<"idle" | "loading" | "error">("idle");
  const [query, setQuery] = useState("");

  async function loadLive() {
    setLiveState("loading");
    try {
      setLive(await fetchLiveModels());
      setLiveState("idle");
    } catch {
      setLiveState("error");
    }
  }

  useEffect(() => {
    fetch("/api/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j) setCfg(j);
      })
      .catch(() => {});
  }, []);

  if (!ready) return null;

  const passLooksLikeKey = profile.passcode.trim().startsWith("sk-or-");
  const effectiveLocalKey = openRouterKey.trim() || (passLooksLikeKey ? profile.passcode.trim() : "");
  const hasAnyKey = cfg?.provider === "openrouter" || cfg?.provider === "anthropic" || !!effectiveLocalKey;
  const disabled = cfg?.provider === "anthropic" && !effectiveLocalKey;

  return (
    <SubPage title="AI 模型与 Key">
      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-bold">🔑 OpenRouter API Key</div>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              hasAnyKey ? "bg-mint-soft text-mint" : "bg-red-50 text-red-600"
            }`}
          >
            {cfg?.provider === "openrouter"
              ? "✓ 服务器已配置"
              : effectiveLocalKey
                ? "✓ 本机已填写"
                : "未配置"}
          </span>
        </div>

        <p className="text-xs leading-relaxed text-sub">
          {cfg?.provider === "openrouter"
            ? "服务器已配置 OPENROUTER_API_KEY，可直接使用；也可在下方填入你自己的 Key 覆盖。"
            : "把你的 OpenRouter Key（sk-or-v1-...）粘贴在下方即可立即使用，仅保存在这台手机浏览器里。（如果在 Vercel 后台填了环境变量，需在 Vercel 点 Redeploy 才会生效）"}
        </p>

        <div className="flex gap-2">
          <input
            className={`${input} flex-1 font-mono text-xs`}
            type={showKey ? "text" : "password"}
            placeholder="sk-or-v1-..."
            value={effectiveLocalKey}
            onChange={(e) => setOpenRouterKey(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="shrink-0 rounded-xl border border-line bg-surface px-3 text-xs font-semibold text-sub"
          >
            {showKey ? "隐藏" : "显示"}
          </button>
        </div>
      </Card>

      {disabled && (
        <div className="rounded-2xl border border-line bg-bg px-4 py-3 text-sm text-sub">
          当前直连 Claude，填写上方 OpenRouter Key 或在 Vercel 配置 OPENROUTER_API_KEY 后即可切换模型。
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
              默认推荐
              {cfg?.defaultModel ? ` (${cfg.defaultModel})` : " (google/gemini-2.5-flash)"}
            </div>
            <div className="text-xs text-sub">跟随默认配置</div>
          </div>
        </button>

      </Card>

      {aiModel && !AI_MODELS.some((m) => m.id === aiModel) && (
        <div className="rounded-2xl border border-primary/40 bg-primary-soft px-4 py-3 text-sm">
          <div className="font-semibold text-primary">◉ 正在使用</div>
          <div className="break-all font-mono text-xs">{aiModel}</div>
        </div>
      )}

      {MODEL_GROUPS.map((g) => {
        const models = AI_MODELS.filter((m) => m.group === g.id);
        return (
          <section key={g.id} className={disabled ? "opacity-50" : ""}>
            <h2 className="mb-1.5 px-1 text-sm font-bold">
              {g.label}
              {g.hint && <span className="ml-2 text-xs font-normal text-sub">{g.hint}</span>}
            </h2>
            <Card className="divide-y divide-line overflow-hidden p-0">
              {models.map((m) => {
                const active = aiModel === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={disabled}
                    aria-pressed={active}
                    onClick={() => setAiModel(m.id)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left active:bg-bg disabled:cursor-not-allowed"
                  >
                    <span className={`mt-0.5 text-base ${active ? "text-primary" : "text-sub"}`}>
                      {active ? "◉" : "○"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{m.label}</div>
                      <div className="text-xs text-sub">{m.note}</div>
                    </div>
                    <span className="shrink-0 pt-0.5 text-right text-[11px] tabular-nums text-sub">
                      {fmtPrice(m.price)}
                    </span>
                  </button>
                );
              })}
            </Card>
          </section>
        );
      })}

      <section className={disabled ? "opacity-50" : ""}>
        <h2 className="mb-1.5 px-1 text-sm font-bold">
          全部模型
          <span className="ml-2 text-xs font-normal text-sub">OpenRouter 上所有能当教练的模型</span>
        </h2>
        <Card className="space-y-3">
          {!live && (
            <>
              <p className="text-xs leading-relaxed text-sub">
                从 OpenRouter 读取最新的完整列表(只显示既能看照片、又能帮你存计划的模型)。
              </p>
              <button
                type="button"
                disabled={disabled || liveState === "loading"}
                onClick={loadLive}
                className="w-full rounded-xl bg-primary-soft px-4 py-3 text-[15px] font-semibold text-primary disabled:opacity-50"
              >
                {liveState === "loading" ? "正在读取…" : "显示全部模型"}
              </button>
              {liveState === "error" && (
                <p className="text-xs text-red-600">读取失败,请检查网络后再点一次。</p>
              )}
            </>
          )}
          {live && (
            <>
              <input
                className={input}
                placeholder={`在 ${live.length} 个模型里搜索,例如 gemini、claude、qwen`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="搜索模型"
              />
              <ul className="max-h-[420px] divide-y divide-line overflow-y-auto rounded-xl border border-line">
                {live
                  .filter((m) =>
                    `${m.id} ${m.name}`.toLowerCase().includes(query.trim().toLowerCase()),
                  )
                  .map((m) => {
                    const active = aiModel === m.id;
                    return (
                      <li key={m.id}>
                        <button
                          type="button"
                          disabled={disabled}
                          aria-pressed={active}
                          onClick={() => setAiModel(m.id)}
                          className={`flex w-full items-start gap-2 px-3 py-2.5 text-left ${
                            active ? "bg-primary-soft" : "active:bg-bg"
                          }`}
                        >
                          <span className={`text-sm ${active ? "text-primary" : "text-sub"}`}>
                            {active ? "◉" : "○"}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold">{m.name}</span>
                            <span className="block break-all font-mono text-[11px] text-sub">
                              {m.id}
                            </span>
                          </span>
                          <span className="shrink-0 text-[11px] tabular-nums text-sub">
                            {fmtPrice(m.price)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </>
          )}
        </Card>
      </section>

      <p className="px-1 text-xs leading-relaxed text-sub">
        所有 AI 功能（教练、饮食分析、器械识别、导入动作）都会使用这里选中的模型。价格是每百万 token 的美元价(输入 / 输出),以 OpenRouter 网站为准。
      </p>
    </SubPage>
  );
}
