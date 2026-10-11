import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
    静态导出。产物是 `out/` 里一堆纯 HTML/CSS/JS，**桌面端和网页端用的是同一份** ——
    区别只在于谁加载它：Tauri 从本地加载，网页由静态托管提供。

    统一成导出而不是给两个目标各配一套，是为了少一条分叉：两种构建产出一致，
    就不会出现「网页上好好的，打包成应用就坏」这种只在一边复现的问题。
    代价是没有服务端能力（本项目本来也不用），以及 `next start` 不再适用 ——
    本地预览生产产物用 `pnpm serve`。
  */
  output: "export",
};

export default nextConfig;
