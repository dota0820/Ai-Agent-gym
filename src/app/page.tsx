"use client";
import Link from "next/link";
import ProfileChip from "@/components/ProfileChip";
import StartFlow from "@/components/StartFlow";
import { Card } from "@/components/ui";
import { useApp, useHydrated } from "@/lib/store";

/** Home is deliberately bare: greeting + the 3D body to start a session. */
export default function Home() {
  const { profile, active } = useApp();
  const ready = useHydrated();
  if (!ready) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <ProfileChip />
        {active && (
          <Link
            href="/workout"
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-mint-soft px-3 py-1.5 text-xs font-semibold text-mint"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-mint" />
            训练进行中 · 继续 ›
          </Link>
        )}
      </div>

      <StartFlow name={profile.name} />

      {!profile.goal && (
        <Link href="/me" className="block">
          <Card className="border-primary/30 bg-primary-soft">
            <div className="font-semibold text-primary">先让教练认识你 →</div>
            <p className="mt-1 text-sm text-ink/70">
              花 1 分钟填一下目标和健身房器械,教练的安排会更适合你。
            </p>
          </Card>
        </Link>
      )}
    </div>
  );
}
