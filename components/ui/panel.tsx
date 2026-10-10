import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * 卡片表面。手写的，没有引 shadcn 的 `Card` —— 官方那套组件带 `"use client"`，
 * 用在这种纯静态卡片上会白白把整块推进客户端包。见 AGENTS.md「本仓库的坑」。
 */
export function Panel({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "panel relative overflow-hidden",
        // 顶部一道发丝高光，让平面卡片有一点厚度
        "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px",
        "before:bg-gradient-to-r before:from-transparent before:via-border-strong before:to-transparent",
        className,
      )}
      {...props}
    />
  );
}

export function PanelHeader({ className, ...props }: ComponentProps<"header">) {
  return <header className={cn("flex flex-col gap-1", className)} {...props} />;
}

export function PanelTitle({ className, ...props }: ComponentProps<"h2">) {
  return <h2 className={cn("text-sm font-semibold tracking-wide", className)} {...props} />;
}

export function PanelDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p className={cn("text-xs leading-relaxed text-faint-foreground", className)} {...props} />
  );
}
