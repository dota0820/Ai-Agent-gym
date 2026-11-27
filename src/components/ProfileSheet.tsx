"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getProfileGyms, parseEquipmentList } from "@/lib/equipment";
import { createProfile, switchProfile, switchProfileGym, useApp } from "@/lib/store";
import Icon from "./Icon";
import { btnPrimary, btnSoft, input } from "./ui";

const AVATARS = ["🙂", "👩", "👨", "💪", "🏃‍♀️", "🏋️"];

export default function ProfileSheet({ onClose }: { onClose: () => void }) {
  const { profile, profiles, activeProfileId } = useApp();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [avatar, setAvatar] = useState("🙂");
  const [name, setName] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const { gyms, activeGym } = getProfileGyms(profile);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createProfile(
      {
        name: name.trim() || `人物 ${profiles.length + 1}`,
        avatar,
      },
      true,
    );
    onClose();
    router.push("/me/profile");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/45 backdrop-blur-[1px]" onClick={onClose}>
      <div
        className="safe-b rise-in mx-auto max-h-[85dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl bg-bg px-5 pb-5 pt-2.5 space-y-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="切换人物与场地"
      >
        <div className="flex justify-center pb-0.5">
          <span className="h-1 w-10 rounded-full bg-line" aria-hidden />
        </div>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">切换人物档案</h2>
          <button
            type="button"
            aria-label="关闭"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-sub active:bg-line/50"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="space-y-1.5">
          {profiles.map((ws) => {
            const p = ws.profile;
            const current = p.id === activeProfileId;
            const meta = [
              p.heightCm ? `${p.heightCm}cm` : "",
              p.weightKg ? `${p.weightKg}kg` : "",
              p.goal || "",
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  switchProfile(p.id);
                  onClose();
                }}
                className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                  current
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-line bg-surface active:bg-bg"
                }`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg text-xl">
                  {p.avatar || "🙂"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="truncate">{p.name || "默认人物"}</span>
                    {current && (
                      <span className="rounded bg-primary px-1.5 py-0.5 text-xs font-semibold text-white">
                        当前
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-sub">
                    {meta || "点「身体与目标」完善资料"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {gyms.length > 1 && (
          <div className="border-t border-line pt-3">
            <div className="mb-2 text-xs font-semibold text-sub">当前所在健身房</div>
            <div className="flex flex-wrap gap-1.5">
              {gyms.map((g) => {
                const isActive = g.id === activeGym.id;
                const count = parseEquipmentList(g.equipment).length;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      switchProfileGym(g.id);
                      onClose();
                    }}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
                      isActive ? "bg-primary text-white" : "border border-line bg-surface text-ink"
                    }`}
                  >
                    {g.name}
                    {count > 0 ? ` (${count}项)` : ""}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {creating ? (
          <form
            onSubmit={handleCreate}
            className="space-y-3 rounded-2xl border border-line bg-surface p-3.5"
          >
            <div className="flex flex-wrap gap-1.5">
              {AVATARS.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => setAvatar(av)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-lg ${
                    avatar === av ? "bg-primary/15 ring-2 ring-primary" : "border border-line bg-bg"
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
            <input
              className={input}
              placeholder="怎么称呼？（如：小美 / 老公）"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <button type="button" className={`${btnSoft} flex-1`} onClick={() => setCreating(false)}>
                取消
              </button>
              <button type="submit" className={`${btnPrimary} flex-1`}>
                创建并填资料
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className={`${btnSoft} w-full`} onClick={() => setCreating(true)}>
            + 新建人物
          </button>
        )}
      </div>
    </div>
  );
}
