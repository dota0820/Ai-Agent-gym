"use client";
import { useRef, useState } from "react";
import { fileToJpegDataUrl } from "@/lib/actions";
import {
  ALL_EQUIPMENT_ITEMS,
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_DETAIL_PROMPTS,
  EQUIPMENT_PRESETS,
  formatEquipmentList,
  formatGymForCoach,
  mergeEquipmentItems,
  parseEquipmentList,
  toggleEquipmentItem,
} from "@/lib/equipment";
import { getState } from "@/lib/store";
import type { GymEnvironment } from "@/lib/types";
import { btnGhost, btnPrimary, btnSoft, input } from "./ui";

const STEPS = [
  { id: "scene", short: "1.场景" },
  { id: "photo", short: "2.拍照" },
  { id: "free", short: "3.自由重量" },
  { id: "cable", short: "4.拉索" },
  { id: "upper", short: "5.上肢" },
  { id: "lower", short: "6.下肢" },
  { id: "cardio", short: "7.有氧工具" },
  { id: "notes", short: "8.补充确认" },
] as const;

const NOTE_CHIPS = [
  "没有重于 20kg 的哑铃",
  "高峰期深蹲架常排队",
  "偏好固定器械为主",
  "部分机器在维修中",
];

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
  initialStep = 0,
  onClose,
  onSave,
}: {
  initialGym: GymEnvironment;
  initialStep?: number;
  onClose: () => void;
  onSave: (nextGym: GymEnvironment) => void;
}) {
  const [step, setStep] = useState(Math.max(0, Math.min(STEPS.length - 1, initialStep)));
  const [draft, setDraft] = useState<GymEnvironment>({
    ...initialGym,
    details: initialGym.details ? { ...initialGym.details } : {},
  });
  const [customItem, setCustomItem] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanMsg, setScanMsg] = useState("");
  const [presetHint, setPresetHint] = useState<{ label: string; items: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = parseEquipmentList(draft.equipment);
  const selectedSet = new Set(selected);
  const knownSet = new Set(ALL_EQUIPMENT_ITEMS);
  const extras = selected.filter((x) => !knownSet.has(x));
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

  const clearItems = (items: string[]) => {
    const drop = new Set(items);
    const next = parseEquipmentList(draft.equipment).filter((x) => !drop.has(x));
    setDraft((prev) => ({ ...prev, equipment: formatEquipmentList(next) }));
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
        headers: {
          "Content-Type": "application/json",
          "x-app-passcode": getState().profile.passcode,
        },
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
      if (found.length > 0) {
        const detailText = detectedDetails.length
          ? `（已记下规格：${detectedDetails.map((d) => `${d.equipment} ${d.spec}`).join("、")}）`
          : "";
        setScanMsg(`✓ 已识别并加入 ${found.length} 项：${found.join("、")}${detailText}`);
      } else {
        setScanMsg(j.summary || "没认出具体器械名称，可以在后面几步直接点选。");
      }
    } catch {
      setScanMsg("识别出错了，请再试一次。");
    } finally {
      setBusy(false);
    }
  }

  const currentStepId = STEPS[step].id;
  const activeCategories =
    currentStepId === "free"
      ? EQUIPMENT_CATEGORIES.filter((c) => c.id === "free")
      : currentStepId === "cable"
        ? EQUIPMENT_CATEGORIES.filter((c) => c.id === "cable")
        : currentStepId === "upper"
          ? EQUIPMENT_CATEGORIES.filter((c) => c.id === "upper")
          : currentStepId === "lower"
            ? EQUIPMENT_CATEGORIES.filter((c) => c.id === "lower")
            : currentStepId === "cardio"
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
        className="safe-b mx-auto flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-3xl bg-bg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Gym 环境配置向导"
      >
        {/* Top bar */}
        <div className="shrink-0 border-b border-line bg-white px-5 pt-4 pb-3 rounded-t-3xl">
          <div className="flex items-center justify-between gap-2">
            <button type="button" className="text-xs font-semibold text-sub" onClick={onClose}>
              取消
            </button>
            <div className="text-center">
              <div className="text-sm font-bold">
                🏋️ 配置「{draft.name.trim() || "Gym"}」环境
              </div>
              <div className="text-[11px] text-sub">
                第 {step + 1} / {STEPS.length} 步 · 已选 {selected.length} 项器械
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

          {/* Progress bar & jumpable step pills */}
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-bg">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.round(((step + 1) / STEPS.length) * 100)}%` }}
            />
          </div>
          <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5">
            {STEPS.map((st, idx) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStep(idx)}
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                  idx === step
                    ? "bg-primary text-white"
                    : "border border-line bg-bg text-sub hover:text-ink"
                }`}
              >
                {st.short}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable question body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {currentStepId === "scene" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold">这家场地叫什么？平时是哪种 Gym？</h2>
                <p className="mt-1 text-xs text-sub">
                  第 1 步先定下大环境（可以添加多个 Gym，比如 Gym 1 公司馆、Gym 2 家里）。
                </p>
              </div>

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
                <div className="text-xs font-semibold text-sub">选择最接近的健身房类型：</div>
                {EQUIPMENT_PRESETS.map((p) => {
                  const activeScene = draft.scene === p.label;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setDraft((prev) => ({
                          ...prev,
                          scene: p.label,
                          equipment:
                            parseEquipmentList(prev.equipment).length === 0
                              ? formatEquipmentList(p.items)
                              : prev.equipment,
                        }));
                        if (selected.length > 0) {
                          setPresetHint({ label: p.label, items: p.items });
                        }
                      }}
                      className={`flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition ${
                        activeScene
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-line bg-white active:bg-soft"
                      }`}
                    >
                      <span className="text-2xl leading-none">{p.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold">{p.label}</span>
                          {activeScene && (
                            <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                              已选
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-xs text-sub">{p.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {presetHint && (
                <div className="rounded-2xl border border-primary/30 bg-primary-soft p-3 text-xs space-y-2">
                  <div className="font-semibold text-ink">
                    你已经勾选了 {selected.length} 项器械，要把「{presetHint.label}」的常用器械也应用上吗？
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-xl bg-primary px-3 py-1.5 font-semibold text-white"
                      onClick={() => {
                        setDraft((prev) => ({
                          ...prev,
                          equipment: formatEquipmentList(presetHint.items),
                        }));
                        setPresetHint(null);
                      }}
                    >
                      套用该场景器械 ({presetHint.items.length}项)
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-line bg-white px-3 py-1.5 font-semibold text-sub"
                      onClick={() => setPresetHint(null)}
                    >
                      保留我现有的
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStepId === "photo" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold">要拍照让 AI 帮你认器械吗？（可跳过）</h2>
                <p className="mt-1 text-xs text-sub">
                  可以连续拍几张：哑铃架（能读出上面标注的公斤数）、拉索区、或你常练的机器，识别结果会累加勾选。
                </p>
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
                className="flex w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-primary/40 bg-white px-4 py-7 text-center active:bg-soft disabled:opacity-50"
              >
                <span className="text-3xl">{busy ? "⏳" : "📷"}</span>
                <span className="text-sm font-bold text-primary">
                  {busy ? "AI 正在看照片里的器械与重量…" : "拍照或从相册上传健身房照片"}
                </span>
                <span className="text-xs text-sub">
                  可拍哑铃架重量牌、固定器械、龙门架或整个环境
                </span>
              </button>

              {scanMsg && (
                <div className="rounded-2xl bg-mint-soft px-3.5 py-2.5 text-xs leading-relaxed text-mint">
                  {scanMsg}
                </div>
              )}

              {selected.length > 0 && (
                <div className="rounded-2xl border border-line bg-white p-3 text-xs space-y-1.5">
                  <div className="font-semibold text-sub">目前已勾选 ({selected.length} 项)：</div>
                  <div className="leading-relaxed text-ink">
                    {selected
                      .map((item) => (details[item] ? `${item}(${details[item]})` : item))
                      .join("、")}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-line bg-white p-3 space-y-2">
                <div className="text-xs font-semibold text-sub">
                  或者自己手动输入器械名称（用顿号或逗号隔开）：
                </div>
                <div className="flex gap-2">
                  <input
                    className={input}
                    placeholder="例如：六角杠铃、雪橇车、战绳"
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
            </div>
          )}

          {activeCategories.length > 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold">
                  {activeCategories.map((c) => c.label).join(" & ")}
                </h2>
                <p className="mt-1 text-xs text-sub">{activeCategories[0].question}</p>
              </div>

              {activeCategories.map((cat) => {
                const catCount = cat.items.filter((x) => selectedSet.has(x)).length;
                return (
                  <div key={cat.id} className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sub">
                        {cat.label}（已选 {catCount}/{cat.items.length}）
                      </span>
                      <div className="flex gap-3 text-xs font-semibold">
                        <button
                          type="button"
                          className="text-primary underline"
                          onClick={() => selectAllInItems(cat.items)}
                        >
                          全选这类
                        </button>
                        {catCount > 0 && (
                          <button
                            type="button"
                            className="text-sub underline"
                            onClick={() => clearItems(cat.items)}
                          >
                            清空这类
                          </button>
                        )}
                      </div>
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
                                : "border-line bg-white text-ink active:bg-soft"
                            }`}
                          >
                            <span className="text-sm font-bold leading-snug">
                              {on ? "✓ " : ""}
                              {item}
                            </span>
                            {on && EQUIPMENT_DETAIL_PROMPTS[item] && (
                              <span className="mt-1 text-[11px] opacity-90">
                                {spec ? `📌 ${spec}` : "可在下方补充重量/规格 ↓"}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Follow-up detail questions for checked items on this step */}
              {selectedWithPrompt.length > 0 && (
                <div className="space-y-3 border-t border-line pt-3">
                  <div className="text-xs font-bold text-primary">
                    🧐 再追问一个小细节（帮 AI 推荐更准的重量与动作）：
                  </div>
                  {selectedWithPrompt.map((item) => {
                    const p = EQUIPMENT_DETAIL_PROMPTS[item];
                    const cur = details[item] ?? "";
                    return (
                      <div
                        key={item}
                        className="space-y-2 rounded-2xl border border-primary/25 bg-white p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold">
                            「{item}」· {p.question}
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

              {/* Quick custom machine adder on any category page */}
              <div className="rounded-2xl border border-line bg-white p-3 space-y-2">
                <div className="text-xs font-semibold text-sub">
                  这页没列到你健身房的机器？直接补上：
                </div>
                <div className="flex gap-2">
                  <input
                    className={`${input} text-xs`}
                    placeholder="例如：悍马推胸、站姿提踵机、爬楼机"
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
            </div>
          )}

          {currentStepId === "notes" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold">最后确认 · 还有要补充给 AI 的吗？</h2>
                <p className="mt-1 text-xs text-sub">
                  比如某些器械太少、高峰期不想等、或特殊重量限制，AI 排计划时会严格绕开。
                </p>
              </div>

              <div className="rounded-2xl border border-line bg-white p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sub">
                    已选器械（{selected.length} 项，点一下可移除）
                  </span>
                  {selected.length > 0 && (
                    <button
                      type="button"
                      className="text-xs text-sub underline"
                      onClick={() => setDraft((prev) => ({ ...prev, equipment: "", details: {} }))}
                    >
                      全部清空
                    </button>
                  )}
                </div>
                {selected.length === 0 ? (
                  <p className="text-xs text-sub">还没有勾选任何器械（可以回去点选或保留空白）。</p>
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

                {extras.length > 0 && (
                  <div className="text-[11px] text-sub">包含自定义添加：{extras.join("、")}</div>
                )}

                <div className="flex gap-2 pt-1">
                  <input
                    className={`${input} text-xs`}
                    placeholder="手动加一台其它器械…"
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

              <div className="rounded-2xl border border-line bg-white p-3 space-y-2">
                <div className="text-xs font-bold text-sub">补充限制或偏好说明（可选）：</div>
                <div className="flex flex-wrap gap-1.5">
                  {NOTE_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        const cur = draft.notes?.trim() || "";
                        const next = cur ? `${cur}；${chip}` : chip;
                        setDraft({ ...draft, notes: next });
                      }}
                      className="rounded-full border border-line bg-bg px-2.5 py-1 text-[11px] font-semibold text-sub"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
                <textarea
                  className={`${input} text-xs`}
                  rows={3}
                  placeholder="例如：只有周一三五晚上去，人多时优先用固定器械或哑铃，不要安排需要两个龙门架同时拉的动作。"
                  value={draft.notes ?? ""}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                />
              </div>

              <div className="rounded-2xl border border-primary/25 bg-primary-soft p-3 text-xs leading-relaxed text-ink">
                <div className="font-bold text-primary">🤖 AI 教练将看到的场地情报：</div>
                <div className="mt-1">{formatGymForCoach(draft)}</div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky bottom navigation */}
        <div className="shrink-0 border-t border-line bg-white px-5 py-3 flex items-center gap-2">
          {step > 0 ? (
            <button
              type="button"
              className={`${btnGhost} shrink-0 px-4`}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              ← 上一题
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
              下一题（{STEPS[step + 1].short}） →
            </button>
          ) : (
            <button type="button" className={`${btnPrimary} flex-1`} onClick={saveAndClose}>
              ✓ 完成并保存「{draft.name.trim() || "Gym"}」
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
