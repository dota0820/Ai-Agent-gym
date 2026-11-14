"use client";
import { useRef, useState } from "react";
import { fileToJpegDataUrl } from "@/lib/actions";
import {
  ALL_EQUIPMENT_ITEMS,
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_PRESETS,
  formatEquipmentList,
  mergeEquipmentItems,
  parseEquipmentList,
  toggleEquipmentItem,
} from "@/lib/equipment";
import { getState } from "@/lib/store";
import { btnSoft, input } from "./ui";

export default function EquipmentSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [customNote, setCustomNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = parseEquipmentList(value);
  const selectedSet = new Set(selected);
  const knownSet = new Set(ALL_EQUIPMENT_ITEMS);
  const extras = selected.filter((x) => !knownSet.has(x));

  async function onScanPhoto(file: File) {
    setBusy(true);
    setMsg("");
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
        setMsg(j.error ?? "识别失败，可以手动点选或再拍一张。");
        return;
      }
      if (!j.is_gym_photo) {
        setMsg("照片里没太看清健身器械，可以靠近一点再拍一张。");
        return;
      }
      const found: string[] = [...(j.matched ?? []), ...(j.extra ?? [])];
      if (found.length > 0) {
        onChange(mergeEquipmentItems(value, found));
        setMsg(`✓ 已识别并勾选 ${found.length} 项：${found.join("、")}`);
      } else {
        setMsg(j.summary || "没认出具体器械名称，可以手动点选下面的按钮。");
      }
    } catch {
      setMsg("识别出错了，请再试一次。");
    } finally {
      setBusy(false);
    }
  }

  function addCustom() {
    const clean = customNote.trim();
    if (!clean) return;
    onChange(mergeEquipmentItems(value, parseEquipmentList(clean)));
    setCustomNote("");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-sub">
          健身房有什么器械（点选即可，已选 {selected.length} 项）
        </span>
        {selected.length > 0 && (
          <button
            type="button"
            className="text-xs text-sub underline"
            onClick={() => onChange("")}
          >
            清空
          </button>
        )}
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
        className={`${btnSoft} w-full`}
        disabled={busy}
        onClick={() => fileRef.current?.click()}
      >
        {busy ? "正在识别器械…" : "📷 拍健身房/器械照片，AI 自动勾选"}
      </button>

      {msg && (
        <p className="rounded-xl bg-mint-soft px-3 py-2 text-xs text-mint">{msg}</p>
      )}

      <div>
        <div className="mb-1.5 text-[11px] font-semibold text-sub">一键场景预设：</div>
        <div className="flex flex-wrap gap-1.5">
          {EQUIPMENT_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(formatEquipmentList(p.items))}
              className="rounded-full border border-line bg-bg px-3 py-1 text-xs font-semibold text-ink active:scale-95"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {selected.length > 0 && (
        <div className="rounded-xl bg-bg p-2.5 text-xs leading-relaxed text-ink/80">
          <span className="font-semibold text-sub">已选：</span>
          {selected.join("、")}
        </div>
      )}

      <div className="space-y-2.5">
        {(expanded ? EQUIPMENT_CATEGORIES : EQUIPMENT_CATEGORIES.slice(0, 3)).map((cat) => (
          <div key={cat.id}>
            <div className="mb-1.5 text-[11px] font-semibold text-sub">{cat.label}</div>
            <div className="flex flex-wrap gap-1.5">
              {cat.items.map((item) => {
                const on = selectedSet.has(item);
                return (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onChange(toggleEquipmentItem(value, item))}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      on
                        ? "bg-primary text-white"
                        : "border border-line bg-white text-ink/80"
                    }`}
                  >
                    {on ? "✓ " : ""}
                    {item}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {extras.length > 0 && (
          <div>
            <div className="mb-1.5 text-[11px] font-semibold text-sub">其他已添器械（点一下移除）</div>
            <div className="flex flex-wrap gap-1.5">
              {extras.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onChange(toggleEquipmentItem(value, item))}
                  className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white"
                >
                  ✓ {item} ✕
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          className="text-xs font-semibold text-primary underline underline-offset-2"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "收起部分分类 ↑" : `展开全部器械分类（还有下肢、有氧等 ${EQUIPMENT_CATEGORIES.length - 3} 类）↓`}
        </button>
      </div>

      <div className="flex gap-2 pt-1">
        <input
          className={input}
          placeholder="还有别的器械?输入后点添加"
          value={customNote}
          onChange={(e) => setCustomNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
        />
        <button
          type="button"
          className={btnSoft}
          disabled={!customNote.trim()}
          onClick={addCustom}
        >
          添加
        </button>
      </div>
    </div>
  );
}
