import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/components/theme-provider";
import { getLedgerConfig } from "@/lib/config";

import "./globals.css";

export const metadata: Metadata = {
  title: getLedgerConfig().profile.name,
  description: getLedgerConfig().profile.subtitle,
  // 个人财务页面不该被搜索引擎收录，也不该在社交平台展开成卡片
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // 明暗两种配色各自给浏览器 UI 一个颜色，手机端地址栏不会突兀地跳色
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6f9" },
    { media: "(prefers-color-scheme: dark)", color: "#080b12" },
  ],
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-dvh">
        {/*
          ThemeProvider 是客户端组件，但 children 是服务端组件 ——
          它们以 props 形式穿过客户端边界，不会被拉进客户端包。
        */}
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
