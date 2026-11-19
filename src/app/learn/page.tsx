"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import KnowledgeView from "@/components/KnowledgeView";
import RecordSwitch from "@/components/RecordSwitch";
import { H1 } from "@/components/ui";

function Learn() {
  const params = useSearchParams();
  return (
    <div className="space-y-3">
      <RecordSwitch on="learn" />
      <H1 sub="练不到、会不会受伤、选多重……新手最常遇到的 16 个问题,每个都有下次马上能试的改法">
        新手避坑指南
      </H1>
      <KnowledgeView initialOpen={params.get("k") ?? undefined} />
    </div>
  );
}

export default function LearnPage() {
  return (
    <Suspense>
      <Learn />
    </Suspense>
  );
}
