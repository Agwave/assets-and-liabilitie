"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * 主题开关的唯一客户端依赖。
 * `attribute="class"` 会把 `light` / `dark` 写到 <html> 上，
 * 对应 `app/globals.css` 里 `.dark` 那一组 token。
 */
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
