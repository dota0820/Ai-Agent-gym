"use client";
import Avatar from "./Avatar";
import { useState } from "react";
import { getProfileGyms } from "@/lib/equipment";
import { useApp, useHydrated } from "@/lib/store";
import ProfileSheet from "./ProfileSheet";

export default function ProfileChip() {
  const { profile } = useApp();
  const ready = useHydrated();
  const [open, setOpen] = useState(false);

  if (!ready) return null;

  const { activeGym } = getProfileGyms(profile);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-ink active:bg-bg"
      >
        <Avatar name={profile.name} size={20} />
        <span className="truncate">{profile.name || "默认人物"}</span>
        <span className="text-sub">·</span>
        <span className="truncate text-sub">{activeGym.name}</span>
        <span className="text-sub">▾</span>
      </button>

      {open && <ProfileSheet onClose={() => setOpen(false)} />}
    </>
  );
}
