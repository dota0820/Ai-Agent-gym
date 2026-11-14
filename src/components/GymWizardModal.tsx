"use client";
import { useRef, useState } from "react";
import { fileToJpegDataUrl } from "@/lib/actions";
import {
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_DETAIL_PROMPTS,
  EQUIPMENT_PRESETS,
  formatEquipmentList,
  mergeEquipmentItems,
  parseEquipmentList,
  toggleEquipmentItem,
} from "@/lib/equipment";
import { aiHeaders } from "@/lib/store";
import type { GymEnvironment } from "@/lib/types";
import { btnGhost, btnPrimary, btnSoft, input } from "./ui";

const STEPS = [
  { id: "scene", title: "基本" },
  { id: "free", title: "自由重量" },
  { id: "cable", title: "绳索与拉力" },
  { id: "upper", title: "上肢器械" },
  { id: "lower", title: "下肢与臀腿" },
  { id: "cardio", title: "有氧与小工具" },
  { id: "confirm", title: "确认" },
] as const;

function DumbbellRangeHelper({
  value,
  onSet,
}: {
  value: string;
  onSet: (formatted: string) => void;
}) {
  const rangeMatch = /(\d+(?:\.\d+)?)\s*[-–~到至]\s*(\d+(?:\.\d+)?)/.exec(value);
  const minMatch = /最轻\s*(\d+(?:\.\d+)?)/.exec(value);
  const maxMatch = /最重\s*(\d+(?:\.\d+)?)/.exec(value);
  const minW = rangeMatch ? rangeMatch[1] : minMatch ? minMatch[1] : "";
  const maxW = rangeMatch ? rangeMatch[2] : maxMatch ? maxMatch[1] : "";

  const applyRange = (nextMin: string, nextMax: string) => {
    const a = nextMin.trim();
    const b = nextMax.trim();
    if (a && b) onSet(`每只 ${a}–${b} kg`);
    else if (b) onSet(`每只最重 ${b} kg`);
    else if (a) onSet(`每只最轻 ${a} kg`);
    else onSet("");
  };

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="shrink-0 text-sub">精确范围：每只</span>
      <input
        className="w-16 rounded-lg border border-line bg-white px-2 py-1 text-center text-xs outline-none focus:border-primary"
        inputMode="decimal"
        placeholder="最轻"
        value={minW}
        onChange={(e) => applyRange(e.target.value, maxW)}
      />
      <span className="text-sub">~</span>
      <input
        className="w-16 rounded-lg border border-line bg-white px-2 py-1 text-center text-xs outline-none focus:border-primary"
        inputMode="decimal"
        placeholder="最重"
        value={maxW}
        onChange={(e) => applyRange(minW, e.target.value)}
      />
      <span className="text-sub">kg</span>
    </div>
  );
}

export default function GymWizardModal({
  initialGym,
  canDelete = false,
  onDelete,
  onClose,
  onSave,
}: {
  initialGym: GymEnvironment;
  canDelete?: boolean;
  onDelete?: () => void;
  onClose: () => void;
  onSave: (nextGym: GymEnvironment) => void;
}) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<GymEnvironment>({
    ...initialGym,
    details: initialGym.details ? { ...initialGym.details } : {},
  });
  const [customItem, setCustomItem] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanMsg, setScanMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = parseEquipmentList(draft.equipment);
  const selectedSet = new Set(selected);
  const details = draft.details ?? {};

  const setDetail = (item: string, spec: string) => {
    setDraft((prev) => {
      const nextDetails = { ...(prev.details ?? {}) };
      if (spec.trim()) nextDetails[item] = spec;
      else delete nextDetails[item];
      return { ...prev, details: nextDetails };
    });
  };

  const toggleItem = (item: string) => {
    setDraft((prev) => ({ ...prev, equipment: toggleEquipmentItem(prev.equipment, item) }));
  };

  const selectAllInItems = (items: string[]) => {
    setDraft((prev) => ({ ...prev, equipment: mergeEquipmentItems(prev.equipment, items) }));
  };

  const addCustomItems = () => {
    const clean = customItem.trim();
    if (!clean) return;
    setDraft((prev) => ({
      ...prev,
      equipment: mergeEquipmentItems(prev.equipment, parseEquipmentList(clean)),
    }));
    setCustomItem("");
  };

  async function onScanPhoto(file: File) {
    setBusy(true);
    setScanMsg("");
    try {
      const image = await fileToJpegDataUrl(file);
      const res = await fetch("/api/equipment", {
        method: "POST",
        headers: aiHeaders(),
        body: JSON.stringify({ image }),
      });
      const j = await res.json();
      if (!res.ok) {
        setScanMsg(j.error ?? "识别失败，可以换个角度拍或手动点选。");
        return;
      }
      if (!j.is_gym_photo) {
        setScanMsg("照片里没太看清健身器械，可以靠近一点再拍一张。");
        return;
      }
      const found: string[] = [...(j.matched ?? []), ...(j.extra ?? [])];
      const detectedDetails: { equipment: string; spec: string }[] = Array.isArray(j.details)
        ? j.details
        : [];
      setDraft((prev) => {
        const nextDetails = { ...(prev.details ?? {}) };
        for (const d of detectedDetails) {
          if (d.equipment && d.spec) nextDetails[d.equipment] = d.spec;
        }
        return {
          ...prev,
          equipment: found.length ? mergeEquipmentItems(prev.equipment, found) : prev.equipment,
          details: nextDetails,
        };
      });
      setScanMsg(
        found.length > 0
          ? `✓ 已识别并加入 ${found.length} 项：${found.join("、")}`
          : j.summary || "没认出具体器械名称，可以在下一步手动点选。",
      );
    } catch {
      setScanMsg("识别出错了，请再试一次。");
    } finally {
      setBusy(false);
    }
  }

  const currentStep = STEPS[step];
  const activeCategories =
    currentStep.id === "free"
      ? EQUIPMENT_CATEGORIES.filter((c) => c.id === "free")
      : currentStep.id === "cable"
        ? EQUIPMENT_CATEGORIES.filter((c) => c.id === "cable")
        : currentStep.id === "upper"
          ? EQUIPMENT_CATEGORIES.filter((c) => c.id === "upper")
          : currentStep.id === "lower"
            ? EQUIPMENT_CATEGORIES.filter((c) => c.id === "lower")
            : currentStep.id === "cardio"
              ? EQUIPMENT_CATEGORIES.filter((c) => c.id === "cardio" || c.id === "small")
              : [];

  const categoryItemsOnScreen = activeCategories.flatMap((c) => c.items);
  const selectedWithPrompt = categoryItemsOnScreen.filter(
    (item) => selectedSet.has(item) && EQUIPMENT_DETAIL_PROMPTS[item],
  );

  function saveAndClose() {
    onSave({
      ...draft,
      name: draft.name.trim() || initialGym.name || "Gym 1",
      notes: draft.notes?.trim() || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/45" onClick={onClose}>
      <div
        className="safe-b mx-auto flex max-h-[90dvh] w-full max-w-md flex-col rounded-t-3xl bg-bg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Gym 环境配置"
      >
        <div className="shrink-0 rounded-t-3xl border-b border-line bg-white px-5 pt-4 pb-3">
          <div className="flex items-center justify-between gap-2">
            <button type="button" className="text-xs font-semibold text-sub" onClick={onClose}>
              取消
            </button>
            <div className="text-center">
              <div className="text-sm font-bold">{draft.name.trim() || "健身房"}</div>
              <div className="text-[11px] text-sub">
                第 {step + 1} / {STEPS.length} 步 · {currentStep.title} · 已选 {selected.length} 项
              </div>
            </div>
            <button
              type="button"
              className="rounded-xl bg-primary px-3 py-1 text-xs font-bold text-white"
              onClick={saveAndClose}
            >
              保存 ✓
            </button>
          </div>

          <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-bg">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.round(((step + 1) / STEPS.length) * 100)}%` }}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {currentStep.id === "scene" && (
            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-semibold text-sub">场地名称</span>
                <input
                  className={`${input} mt-1 bg-white`}
                  placeholder="例如：Gym 1 · 公司旁边健身房"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </label>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-sub">选择场景（可选预设）</div>
                {EQUIPMENT_PRESETS.map((p) => {
                  const activeScene = draft.scene === p.label;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        if (selected.length === 0 || confirm(`用「${p.label}」预设覆盖现有器械？`)) {
                          setDraft((prev) => ({
                            ...prev,
                            scene: p.label,
                            equipment: formatEquipmentList(p.items),
                          }));
                        } else {
                          setDraft((prev) => ({ ...prev, scene: p.label }));
                        }
                      }}
                      className={`flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition ${
                        activeScene
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-line bg-white active:bg-bg"
                      }`}
                    >
                      <span className="text-2xl leading-none">{p.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold">{p.label}</div>
                        <div className="mt-0.5 text-xs text-sub">{p.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onScanPhoto(f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                className={`${btnSoft} w-full text-xs`}
              >
                {busy ? "AI 正在识别器械…" : "📷 拍照自动识别器械"}
              </button>
              {scanMsg && (
                <p className="rounded-xl bg-mint-soft px-3 py-2 text-xs text-mint">{scanMsg}</p>
              )}
            </div>
          )}

          {activeCategories.length > 0 && (
            <div className="space-y-4">
              {activeCategories.map((cat) => (
                <div key={cat.id} className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">{cat.label}</span>
                    <button
                      type="button"
                      className="text-xs font-semibold text-primary underline"
                      onClick={() => selectAllInItems(cat.items)}
                    >
                      全选
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {cat.items.map((item) => {
                      const on = selectedSet.has(item);
                      const spec = details[item];
                      return (
                        <button
                          key={item}
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggleItem(item)}
                          className={`flex flex-col items-start rounded-2xl border p-3 text-left transition ${
                            on
                              ? "border-primary bg-primary text-white shadow-sm"
                              : "border-line bg-white text-ink active:bg-bg"
                          }`}
                        >
                          <span className="text-sm font-bold leading-snug">
                            {on ? "✓ " : ""}
                            {item}
                          </span>
                          {on && spec && (
                            <span className="mt-1 text-[11px] opacity-90">{spec}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {selectedWithPrompt.length > 0 && (
                <div className="space-y-3 border-t border-line pt-3">
                  {selectedWithPrompt.map((item) => {
                    const p = EQUIPMENT_DETAIL_PROMPTS[item];
                    const cur = details[item] ?? "";
                    return (
                      <div
                        key={item}
                        className="space-y-2 rounded-2xl border border-line bg-white p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold">
                            {item} · {p.question}
                          </span>
                          {cur && (
                            <button
                              type="button"
                              className="shrink-0 text-[11px] text-sub underline"
                              onClick={() => setDetail(item, "")}
                            >
                              清除
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {p.options.map((opt) => {
                            const active = cur === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setDetail(item, active ? "" : opt)}
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  active
                                    ? "bg-primary text-white"
                                    : "border border-line bg-bg text-ink/80"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>

                        {item === "哑铃" && (
                          <DumbbellRangeHelper
                            value={cur}
                            onSet={(formatted) => setDetail("哑铃", formatted)}
                          />
                        )}

                        <input
                          className={`${input} bg-bg text-xs`}
                          placeholder={p.placeholder}
                          value={cur}
                          onChange={(e) => setDetail(item, e.target.value)}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {currentStep.id === "confirm" && (
            <div className="space-y-4">
              <div className="space-y-2 rounded-2xl border border-line bg-white p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sub">
                    已选器械（{selected.length} 项，点一下移除）
                  </span>
                  {selected.length > 0 && (
                    <button
                      type="button"
                      className="text-xs text-sub underline"
                      onClick={() => setDraft((prev) => ({ ...prev, equipment: "", details: {} }))}
                    >
                      清空
                    </button>
                  )}
                </div>
                {selected.length === 0 ? (
                  <p className="text-xs text-sub">暂未勾选器械。</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleItem(item)}
                        className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
                      >
                        {item}
                        {details[item] ? ` (${details[item]})` : ""} ✕
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <input
                    className={`${input} text-xs`}
                    placeholder="其他器械（如：战绳、雪橇车）"
                    value={customItem}
                    onChange={(e) => setCustomItem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomItems();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className={`${btnSoft} shrink-0`}
                    disabled={!customItem.trim()}
                    onClick={addCustomItems}
                  >
                    添加
                  </button>
                </div>
              </div>

              <label className="block rounded-2xl border border-line bg-white p-3.5">
                <span className="text-xs font-bold text-sub">补充说明（可选）</span>
                <textarea
                  className={`${input} mt-1.5 text-xs`}
                  rows={3}
                  placeholder="例如：没有重于 20kg 的哑铃、高峰期深蹲架常排队…"
                  value={draft.notes ?? ""}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                />
              </label>

              {canDelete && onDelete && (
                <div className="text-center">
                  <button
                    type="button"
                    className="text-xs font-semibold text-sub underline"
                    onClick={() => {
                      if (confirm(`确定删除「${draft.name || "这个健身房"}」吗？`)) {
                        onDelete();
                      }
                    }}
                  >
                    删除这个健身房
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 border-t border-line bg-white px-5 py-3">
          {step > 0 ? (
            <button
              type="button"
              className={`${btnGhost} shrink-0 px-4`}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              ← 上一步
            </button>
          ) : (
            <button type="button" className={`${btnGhost} shrink-0 px-4`} onClick={onClose}>
              关闭
            </button>
          )}

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              className={`${btnPrimary} flex-1`}
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            >
              下一步（{STEPS[step + 1].title}） →
            </button>
          ) : (
            <button type="button" className={`${btnPrimary} flex-1`} onClick={saveAndClose}>
              ✓ 完成保存
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
