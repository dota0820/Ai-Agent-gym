"use client";
import StartFlow from "@/components/StartFlow";
import { useApp, useHydrated } from "@/lib/store";

/** Home: a dashboard-style overview (see StartFlow). */
export default function Home() {
  const { profile } = useApp();
  const ready = useHydrated();
  if (!ready) return null;
  return <StartFlow name={profile.name} />;
}
