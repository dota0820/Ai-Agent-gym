"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Icon from "@/components/Icon";
import ImportExerciseModal from "@/components/ImportExerciseModal";
import RecordSwitch from "@/components/RecordSwitch";
import { btnSoft, H1, input } from "@/components/ui";
import {
  allExercises,
  anySubLabel,
  exerciseThumbnail,
  isCustomExercise,
  listAllExercises,
  type ExtendedLibGroup,
} from "@/lib/exercise-lookup";
import { subsFor } from "@/lib/exercises";
import { useApp } from "@/lib/store";
import { GROUPS, MUSCLE_LABEL } from "@/lib/types";

const TABS: { id: ExtendedLibGroup; label: string }[] = [
  { id: "custom", label: "我的导入" },
  { id: "shape", label: "女生塑形" },
  ...GROUPS,
];

function Library() {
  const params = useSearchParams();
  const router = useRouter();
  const { customExercises } = useApp();
  const [showImport, setShowImport] = useState(false);
  const [query, setQuery] = useState("");

  const g: ExtendedLibGroup = TABS.find((x) => x.id === params.get("g"))?.id ?? "back";
  const subs = g === "custom" ? [] : subsFor(g);
  const sub = subs.find((x) => x.id === params.get("s"))?.id ?? "";
  const go = (ng: ExtendedLibGroup, ns = "") =>
    router.replace(`/library?g=${ng}${ns ? `&s=${ns}` : ""}`, { scroll: false });

  const trimmedQuery = query.trim().toLowerCase();
  const list = trimmedQuery
    ? allExercises(customExercises).filter(
        (e) =>
          e.name.toLowerCase().includes(trimmedQuery) ||
          e.nameEn.toLowerCase().includes(trimmedQuery) ||
          e.equipment.toLowerCase().includes(trimmedQuery),
      )
    : listAllExercises(g, sub, customExercises);

  return (
    <div>
      <div className="mb-4">
        <RecordSwitch on="library" />
      </div>
      <H1 sub="点开动作看动图示范、练到哪块肌肉；也可贴小红书/FB/YouTube 链接导入">动作库</H1>

      <div className="relative mb-3">
        <input
          className={`${input} pr-10`}
          placeholder="搜索动作名称、英文或器械…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            type="button"
            aria-label="清除搜索"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-sub"
          >
            <Icon name="x" size={16} />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowImport(true)}
        className={`${btnSoft} mb-3 w-full border border-primary/25`}
      >
        <Icon name="link" size={18} className="mr-1.5" />
        从小红书 / FB / YouTube 链接导入新动作
      </button>

      {!trimmedQuery && (
        <>
          <div className="no-scrollbar -mx-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-1">
            {TABS.map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => go(x.id)}
                aria-pressed={g === x.id}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ${
                  g === x.id ? "border-2 border-primary bg-primary-soft text-deep" : "border border-line bg-card"
                }`}
              >
                {x.label}
                {x.id === "custom" && customExercises.length > 0 ? `(${customExercises.length})` : ""}
              </button>
            ))}
          </div>

          {subs.length > 0 && (
            <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
              {[{ id: "", label: "全部" }, ...subs].map((x) => (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => go(g, x.id)}
                  aria-pressed={sub === x.id}
                  className={`shrink-0 rounded-full px-3 py-1 text-[13px] font-semibold ${
                    sub === x.id ? "bg-ink text-white" : "bg-primary-soft text-deep"
                  }`}
                >
                  {x.label}
                </button>
              ))}
            </div>
          )}

          {g === "shape" && (
            <p className="mb-3 rounded-2xl bg-card p-3 text-sm leading-relaxed text-sub">
              给想塑造身形的新手挑的入门动作：重点练臀腿、把背和肩练挺、收紧腰腹。重量从轻的开始，不会练成“大块头”。
            </p>
          )}
        </>
      )}

      {trimmedQuery && list.length === 0 && (
        <div className="rounded-2xl border border-line bg-card p-5 text-center">
          <p className="text-sm font-semibold">没找到「{query.trim()}」</p>
          <p className="mt-1 text-xs text-sub">可以换个关键词，或点上方按钮从视频链接导入。</p>
        </div>
      )}

      {!trimmedQuery && g === "custom" && list.length === 0 && (
        <div className="rounded-2xl border border-line bg-card p-5 text-center">
          <div className="flex justify-center text-deep">
            <Icon name="video" size={28} />
          </div>
          <p className="mt-2 text-sm font-semibold">还没有导入过外部视频动作</p>
          <p className="mt-1 text-xs leading-relaxed text-sub">
            在小红书、Facebook 或 YouTube 看到喜欢的练臀/练背教学，点上方按钮把链接或分享文案贴进来，AI 会自动帮你整理成标准动作卡。
          </p>
        </div>
      )}

      <ul className="space-y-2">
        {list.map((e) => {
          const thumb = exerciseThumbnail(e);
          const sLabel = anySubLabel(e, g);
          const custom = isCustomExercise(e);
          const primaryLabel = e.primary[0] ? MUSCLE_LABEL[e.primary[0]]?.split("(")[0] : undefined;
          return (
            <li key={e.id}>
              <Link
                href={`/library/${e.id}`}
                className="flex items-center gap-3 rounded-2xl border border-line bg-card p-2 pr-3 active:scale-[0.99]"
              >
                {thumb ? (
                  <img
                    src={thumb}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-[68px] w-[102px] shrink-0 rounded-xl bg-bg object-cover"
                  />
                ) : (
                  <div className="flex h-[68px] w-[102px] shrink-0 items-center justify-center rounded-xl bg-primary-soft text-deep">
                    <Icon name="video" size={26} />
                  </div>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{e.name}</span>
                  <span className="block truncate text-xs text-sub">
                    {e.nameEn || e.equipment}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {custom && (
                      <span className="rounded-full bg-mint-soft px-2 py-0.5 text-[11px] font-semibold text-mint">
                        {e.sourcePlatform || "自定义"}
                      </span>
                    )}
                    {sLabel && (
                      <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-deep">
                        {sLabel}
                      </span>
                    )}
                    {primaryLabel && (
                      <span className="rounded-full bg-bg px-2 py-0.5 text-[11px] text-sub">
                        {primaryLabel}
                      </span>
                    )}
                  </span>
                </span>
                <Icon name="chevronRight" size={16} className="shrink-0 text-sub" />
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-center text-[11px] text-sub">
        内置示范照片来自公共领域的 free-exercise-db 开源动作库 · 3D 人体模型:BodyParts3D © DBCLS(CC BY-SA 2.1 JP)
      </p>

      {showImport && (
        <ImportExerciseModal
          onClose={() => setShowImport(false)}
          onSaved={(ex) => {
            setShowImport(false);
            router.push(`/library/${ex.id}`);
          }}
        />
      )}
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense>
      <Library />
    </Suspense>
  );
}
