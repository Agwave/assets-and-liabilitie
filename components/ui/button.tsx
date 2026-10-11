import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * 手写的按钮。没有引 shadcn 的那套 —— 和 `panel.tsx` 一样，
 * 官方组件带 `"use client"`，用在这种地方会白白把东西推进客户端包。
 *
 * 这个组件自身不需要 `"use client"`：它不用 hook，只是把 props 摊到 `<button>` 上，
 * 由调用它的客户端组件决定自己在哪个包里。
 */

type Variant = "primary" | "secondary" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-foreground hover:opacity-90 border border-transparent",
  secondary: "bg-card-raised text-foreground border border-border hover:border-border-strong",
  ghost: "text-muted-foreground hover:text-foreground border border-transparent",
};

type ButtonProps = ComponentProps<"button"> & {
  readonly variant?: Variant;
};

export function Button({ className, variant = "secondary", ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium",
        "transition-colors duration-150",
        "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
