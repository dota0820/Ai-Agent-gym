"use client";
import Icon from "@/components/Icon";
import { SubPage } from "@/components/ui";
import { setTheme, THEMES, useTheme } from "@/lib/theme";

/** Every colour theme with its swatches, and a live preview of the current one. */
export default function ThemePage() {
  const theme = useTheme();
  const cur = THEMES.find((t) => t.id === theme) ?? THEMES[0];
  return (
    <SubPage title="外观与主题">
      {/* live preview */}
      <div className="relative overflow-hidden rounded-[28px] bg-forest p-5 text-white">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-primary">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            实时预览 · {cur.label}
          </span>
          <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-forest">
            使用中
          </span>
        </div>
        <div className="mt-4 rounded-2xl bg-white/[0.07] p-4">
          <div className="text-[12px] text-white/60">本周训练量</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="display-num text-[40px] leading-none text-primary">
              68%
            </span>
            <span className="text-[12px] text-white/70">达标</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[68%] rounded-full bg-primary" />
          </div>
          <div className="mt-4 flex h-11 items-center justify-center gap-1.5 rounded-full bg-primary text-[14px] font-bold text-forest">
            <Icon name="play" size={18} />
            开始训练
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between px-1 pt-2">
        <div>
          <h2 className="text-[20px] font-bold">{THEMES.length} 套主题配色</h2>
          <p className="mt-0.5 text-[12px] text-sub">
            点一下马上换，所有页面一起变
          </p>
        </div>
      </div>

      {THEMES.map((t) => {
        const on = t.id === theme;
        const swatches = [
          { c: t.primary, l: "主色" },
          { c: t.ink, l: "文字" },
          { c: t.bg, l: "背景" },
          { c: t.card, l: "卡片" },
        ];
        return (
          <div key={t.id} className="lift rounded-[28px] bg-card p-4">
            <div className="flex items-center gap-3">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                style={{ background: t.primary, color: t.ink }}
              >
                <Icon name="palette" size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[16px] font-bold">{t.label}</span>
                  {on && (
                    <span className="rounded-full bg-forest px-2 py-0.5 text-[10px] font-bold text-primary">
                      使用中
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-[12px] text-sub">{t.desc}</p>
              </div>
              {on && (
                <Icon
                  name="checkCircle"
                  size={24}
                  fill
                  className="text-forest"
                />
              )}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 rounded-2xl bg-bg p-3">
              {swatches.map((s) => (
                <div key={s.l} className="flex flex-col items-center gap-1.5">
                  <span
                    className="h-10 w-10 rounded-full border border-black/5 shadow-sm"
                    style={{ background: s.c }}
                  />
                  <span className="text-[10px] font-semibold uppercase text-sub">
                    {s.c.replace("#", "#")}
                  </span>
                  <span className="text-[10px] text-sub">{s.l}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-end">
              {on ? (
                <span className="rounded-full bg-forest px-4 py-2 text-[12px] font-bold text-primary">
                  当前应用
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className="rounded-full bg-bg px-4 py-2 text-[12px] font-bold text-forest"
                >
                  应用此主题
                </button>
              )}
            </div>
          </div>
        );
      })}
    </SubPage>
  );
}
