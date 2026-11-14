"use client";
import type { ReactNode } from "react";
import { useHydrated } from "@/lib/store";

/** All screens read from localStorage, so render them only in the browser. */
export default function ClientOnly({ children }: { children: ReactNode }) {
  return useHydrated() ? children : null;
}
