"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { useIsHydrated } from "@/hooks/use-is-hydrated";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "浅色", Icon: Sun },
  { value: "dark", label: "深色", Icon: Moon },
  { value: "system", label: "跟随系统", Icon: Monitor },
] as const;

/**
 * 三态主题切换。
 *
 * 挂载前渲染的是「没有任何按钮处于选中态」的空壳：`useTheme()` 在服务端拿不到
 * 真实主题，直接读它会渲染出和服务端不一致的 class，触发 hydration 警告。
 * 空壳的尺寸和真身一致，所以不会引起布局跳动。
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const hydrated = useIsHydrated();

  return (
    <div
      role="radiogroup"
      aria-label="配色主题"
      className="inline-flex items-center gap-0.5 rounded-full border border-border bg-muted/50 p-0.5"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = hydrated && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              "rounded-full p-1.5 transition-colors duration-150",
              "focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-faint-foreground hover:text-foreground",
            )}
          >
            <Icon aria-hidden="true" className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}
