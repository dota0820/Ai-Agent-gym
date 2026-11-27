"use client";
import Icon from "./Icon";
import { useRef, useState } from "react";
import { fileToJpegDataUrl } from "@/lib/actions";
import {
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_DETAIL_PROMPTS,
  EQUIPMENT_HINTS,
  equipmentImage,
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
  { id: "scene", title: "基本场景" },
  { id: "photo", title: "拍照确认" },
  { id: "free", title: "自由重量" },
  { id: "cable", title: "拉索与背" },
  { id: "upper", title: "上肢器械" },
  { id: "lower", title: "下肢臀腿" },
  { id: "cardio", title: "有氧与小工具" },
  { id: "confirm", title: "最终确认" },
] as const;

interface PendingScanResult {
  summary: string;
  candidates: string[];
  checked: Record<string, boolean>;
  details: Record<string, string>;
}

function DumbbellRangeHelper({
  value,
  onSet,
}: {
  value: string;
  onSet: (formatted: string) => void;
}) {
  const parseRange = (v: string) => {
    const rangeMatch = /(\d+(?:\.\d+)?)\s*[-–~到至]\s*(\d+(?:\.\d+)?)/.exec(v);
    const minMatch = /最轻\s*(\d+(?:\.\d+)?)/.exec(v);
    const maxMatch = /最重\s*(\d+(?:\.\d+)?)/.exec(v);
    return {
      min: rangeMatch ? rangeMatch[1] : minMatch ? minMatch[1] : "",
      max: rangeMatch ? rangeMatch[2] : maxMatch ? maxMatch[1] : "",
    };
  };

  const initial = parseRange(value);
  const [minText, setMinText] = useState(initial.min);
  const [maxText, setMaxText] = useState(initial.max);

  const emit = (nextMin: string, nextMax: string) => {
    const a = nextMin.trim().replace(/\.$/, "");
    const b = nextMax.trim().replace(/\.$/, "");
    if (a && b) onSet(`每只 ${a}–${b} kg`);
    else if (b) onSet(`每只最重 ${b} kg`);
    else if (a) onSet(`每只最轻 ${a} kg`);
    else onSet("");
  };

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="shrink-0 text-sub">精确范围：每只</span>
      <input
        className="w-16 rounded-lg border border-line bg-surface px-2 py-1 text-center text-[15px] outline-none focus:border-primary"
        inputMode="decimal"
        placeholder="最轻"
        value={minText}
        onChange={(e) => {
          const v = e.target.value.replace(/[^\d.]/g, "");
          if (!/^\d*\.?\d*$/.test(v)) return;
          setMinText(v);
          emit(v, maxText);
        }}
      />
      <span className="text-sub">~</span>
      <input
        className="w-16 rounded-lg border border-line bg-surface px-2 py-1 text-center text-[15px] outline-none focus:border-primary"
        inputMode="decimal"
        placeholder="最重"
        value={maxText}
        onChange={(e) => {
          const v = e.target.value.replace(/[^\d.]/g, "");
          if (!/^\d*\.?\d*$/.test(v)) return;
          setMaxText(v);
          emit(minText, v);
        }}
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
  const [scanError, setScanError] = useState("");
  const [scanNotice, setScanNotice] = useState("");
  const [pendingScan, setPendingScan] = useState<PendingScanResult | null>(
    null,
  );
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
    setDraft((prev) => ({
      ...prev,
      equipment: toggleEquipmentItem(prev.equipment, item),
    }));
  };

  const selectAllInItems = (items: string[]) => {
    setDraft((prev) => ({
      ...prev,
      equipment: mergeEquipmentItems(prev.equipment, items),
    }));
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
    setScanError("");
    setScanNotice("");
    setPendingScan(null);
    try {
      const image = await fileToJpegDataUrl(file);
      const res = await fetch("/api/equipment", {
        method: "POST",
        headers: aiHeaders(),
        body: JSON.stringify({ image }),
      });
      const j = await res.json();
      if (!res.ok) {
        setScanError(j.error ?? "识别失败，可以换个角度拍或手动点选。");
        return;
      }
      if (!j.is_gym_photo) {
        setScanError("照片里没太看清健身器械，可以走近一点再拍一张。");
        return;
      }
      const candidates = Array.from(
        new Set<string>(
          [...(j.matched ?? []), ...(j.extra ?? [])].filter(Boolean),
        ),
      );
      const detectedMap: Record<string, string> = {};
      if (Array.isArray(j.details)) {
        for (const d of j.details) {
          if (d?.equipment && d?.spec) detectedMap[d.equipment] = d.spec;
        }
      }
      if (candidates.length === 0) {
        setScanError(
          j.summary ||
            "没认出具体器械名称，请换个角度再拍一张，或在下一步手动勾选。",
        );
        return;
      }
      const checked: Record<string, boolean> = {};
      for (const c of candidates) checked[c] = true;
      setPendingScan({
        summary: j.summary || `AI 在照片里认出了 ${candidates.length} 项器械`,
        candidates,
        checked,
        details: detectedMap,
      });
    } catch {
      setScanError("识别出错了，请再试一次。");
    } finally {
      setBusy(false);
    }
  }

  function confirmPendingScan() {
    if (!pendingScan) return;
    const chosen = pendingScan.candidates.filter((c) => pendingScan.checked[c]);
    setDraft((prev) => {
      const nextDetails = { ...(prev.details ?? {}) };
      for (const item of chosen) {
        if (pendingScan.details[item])
          nextDetails[item] = pendingScan.details[item];
      }
      return {
        ...prev,
        equipment: chosen.length
          ? mergeEquipmentItems(prev.equipment, chosen)
          : prev.equipment,
        details: nextDetails,
      };
    });
    setScanNotice(
      chosen.length > 0
        ? `✓ 已确认并加入 ${chosen.length} 项：${chosen.join("、")}（可继续拍下一张，或点下一步）`
        : "已取消本次识别结果。",
    );
    setPendingScan(null);
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
              ? EQUIPMENT_CATEGORIES.filter(
                  (c) => c.id === "cardio" || c.id === "small",
                )
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

  function tryClose() {
    const dirty =
      draft.name !== initialGym.name ||
      draft.equipment !== initialGym.equipment ||
      (draft.notes ?? "") !== (initialGym.notes ?? "");
    if (dirty && !window.confirm("还有未保存的健身房配置，确定放弃吗？")) return;
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/45 backdrop-blur-[1px]"
      onClick={tryClose}
    >
      <div
        className="safe-b rise-in mx-auto flex max-h-[90dvh] w-full max-w-md flex-col rounded-t-3xl bg-bg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Gym 环境配置"
      >
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

        <div className="shrink-0 rounded-t-3xl border-b border-line bg-surface px-4 pt-2.5 pb-3">
          <div className="flex justify-center pb-2">
            <span className="h-1 w-10 rounded-full bg-line" aria-hidden />
          </div>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="min-h-10 rounded-xl px-2.5 text-sm font-semibold text-sub active:bg-bg"
              onClick={tryClose}
            >
              取消
            </button>
            <div className="text-center">
              <div className="text-sm font-bold">
                {draft.name.trim() || "健身房"}
              </div>
              <div className="text-xs text-sub">
                第 {step + 1} / {STEPS.length} 步 · {currentStep.title} · 已选{" "}
                {selected.length} 项
              </div>
            </div>
            <button
              type="button"
              className="min-h-10 rounded-xl bg-primary px-3.5 text-xs font-bold text-white"
              onClick={saveAndClose}
            >
              保存 ✓
            </button>
          </div>

          <div className="no-scrollbar mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5">
            {STEPS.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(idx)}
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                  idx === step
                    ? "bg-primary text-white"
                    : "bg-bg text-sub active:bg-primary-soft active:text-deep"
                }`}
              >
                {idx + 1}. {s.title}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {currentStep.id === "scene" && (
            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-semibold text-sub">场地名称</span>
                <input
                  className={`${input} mt-1 bg-surface`}
                  placeholder="例如：Gym 1 · 公司旁边健身房"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </label>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-sub">
                  选择场景（可选预设）
                </div>
                {EQUIPMENT_PRESETS.map((p) => {
                  const activeScene = draft.scene === p.label;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        if (
                          selected.length === 0 ||
                          confirm(`用「${p.label}」预设覆盖现有器械？`)
                        ) {
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
                          : "border-line bg-surface active:bg-bg"
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
            </div>
          )}

          {currentStep.id === "photo" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold">
                  不确定器械叫什么？拍照让 AI 帮你确认
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-sub">
                  对着不认识的机器或健身房角落拍一张照，AI
                  会认出名字和用途，列出来让你打勾确认后再加入。都认识的话可以直接点「下一步」。
                </p>
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/40 bg-surface px-4 py-6 text-center active:bg-bg disabled:opacity-50"
              >
                <span className="text-deep">
                  <Icon name={busy ? "timer" : "camera"} size={28} />
                </span>
                <span className="text-sm font-bold text-deep">
                  {busy
                    ? "AI 正在识别照片里的器械…"
                    : "拍照 / 从相册选图让 AI 识别"}
                </span>
                <span className="text-xs text-sub">
                  识别后会先给你看清单，你点确认才会加入
                </span>
              </button>

              {scanError && (
                <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
                  {scanError}
                </div>
              )}

              {scanNotice && (
                <div className="rounded-xl bg-mint-soft px-3 py-2 text-xs text-mint">
                  {scanNotice}
                </div>
              )}

              {pendingScan && (
                <div className="space-y-3 rounded-2xl border-2 border-primary bg-surface p-3.5">
                  <div className="text-xs font-bold text-deep">
                    AI 认出了以下器械，请确认哪些要加入：
                  </div>
                  <p className="text-xs text-sub">{pendingScan.summary}</p>
                  <div className="space-y-1.5">
                    {pendingScan.candidates.map((item) => {
                      const on = !!pendingScan.checked[item];
                      const hint = EQUIPMENT_HINTS[item];
                      const spec = pendingScan.details[item];
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() =>
                            setPendingScan((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    checked: { ...prev.checked, [item]: !on },
                                  }
                                : null,
                            )
                          }
                          className={`flex w-full items-start gap-2.5 rounded-xl border p-2.5 text-left text-xs ${
                            on
                              ? "border-primary bg-primary/5"
                              : "border-line bg-bg opacity-60"
                          }`}
                        >
                          <span className="mt-0.5 text-sm font-bold text-deep">
                            {on ? "☑" : "☐"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-ink">
                              {item}
                              {spec ? ` (${spec})` : ""}
                            </div>
                            {hint && (
                              <div className="mt-0.5 text-xs text-sub">
                                {hint}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={`${btnGhost} flex-1 py-2 text-xs`}
                      onClick={() => setPendingScan(null)}
                    >
                      重拍 / 取消
                    </button>
                    <button
                      type="button"
                      className={`${btnPrimary} flex-1 py-2 text-xs`}
                      onClick={confirmPendingScan}
                    >
                      ✓ 确认加入 (
                      {
                        pendingScan.candidates.filter(
                          (c) => pendingScan.checked[c],
                        ).length
                      }{" "}
                      项)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeCategories.length > 0 && (
            <div className="space-y-4">
              {activeCategories.map((cat) => (
                <div key={cat.id} className="space-y-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold">{cat.label}</div>
                      <div className="mt-0.5 text-xs text-sub">
                        {cat.question}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 text-xs font-semibold text-deep underline"
                      onClick={() => selectAllInItems(cat.items)}
                    >
                      全选
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {cat.items.map((item) => {
                      const on = selectedSet.has(item);
                      const spec = details[item];
                      const hint = EQUIPMENT_HINTS[item];
                      const img = equipmentImage(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggleItem(item)}
                          className={`flex flex-col items-start overflow-hidden rounded-2xl border text-left transition ${
                            on
                              ? "border-primary bg-primary text-white shadow-sm"
                              : "border-line bg-surface text-ink active:bg-bg"
                          }`}
                        >
                          {img && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={img}
                              alt={`${item}的样子`}
                              loading="lazy"
                              className="aspect-[3/2] w-full bg-[#141418] object-cover"
                            />
                          )}
                          <span className="flex flex-col items-start p-3">
                            <span className="text-sm font-bold leading-snug">
                              {on ? "✓ " : ""}
                              {item}
                            </span>
                            {hint && (
                              <span
                                className={`mt-1 text-xs leading-snug ${
                                  on ? "text-white/85" : "text-sub"
                                }`}
                              >
                                {hint}
                              </span>
                            )}
                            {on && spec && (
                              <span className="mt-1 rounded bg-white/20 px-1.5 py-0.5 text-xs font-semibold">
                                {spec}
                              </span>
                            )}
                          </span>
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
                        className="space-y-2 rounded-2xl border border-line bg-surface p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold">
                            {item} · {p.question}
                          </span>
                          {cur && (
                            <button
                              type="button"
                              className="shrink-0 text-xs text-sub underline"
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
                                onClick={() =>
                                  setDetail(item, active ? "" : opt)
                                }
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

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full rounded-xl border border-dashed border-line bg-surface py-2.5 text-center text-xs font-semibold text-deep active:bg-bg"
              >
                不确定眼前这台机器叫什么？点这里拍照让 AI 帮你认
              </button>
            </div>
          )}

          {currentStep.id === "confirm" && (
            <div className="space-y-4">
              <div className="space-y-2 rounded-2xl border border-line bg-surface p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sub">
                    已选器械（{selected.length} 项，点一下移除）
                  </span>
                  {selected.length > 0 && (
                    <button
                      type="button"
                      className="text-xs text-sub underline"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          equipment: "",
                          details: {},
                        }))
                      }
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
                        className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-deep"
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

              <label className="block rounded-2xl border border-line bg-surface p-3.5">
                <span className="text-xs font-bold text-sub">
                  补充说明（可选）
                </span>
                <textarea
                  className={`${input} mt-1.5 text-xs`}
                  rows={3}
                  placeholder="例如：没有重于 20kg 的哑铃、高峰期深蹲架常排队…"
                  value={draft.notes ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, notes: e.target.value })
                  }
                />
              </label>

              {canDelete && onDelete && (
                <div className="text-center">
                  <button
                    type="button"
                    className="text-xs font-semibold text-sub underline"
                    onClick={() => {
                      if (
                        confirm(`确定删除「${draft.name || "这个健身房"}」吗？`)
                      ) {
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

        <div className="flex shrink-0 items-center gap-2 border-t border-line bg-surface px-5 py-3">
          {step > 0 ? (
            <button
              type="button"
              className={`${btnGhost} shrink-0 px-4`}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              ← 上一步
            </button>
          ) : (
            <button
              type="button"
              className={`${btnGhost} shrink-0 px-4`}
              onClick={onClose}
            >
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
            <button
              type="button"
              className={`${btnPrimary} flex-1`}
              onClick={saveAndClose}
            >
              ✓ 完成保存
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
