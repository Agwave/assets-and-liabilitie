import type { MetadataRoute } from "next";

/**
 * 个人财务页面不该被收录。
 *
 * 这里和 `app/layout.tsx` 里的 `<meta name="robots">` 是**两道不同的闸**：
 * robots.txt 拦的是「别来抓」，meta 标签拦的是「抓到了也别收录」。
 * 只上 robots.txt 有个众所周知的坑 —— 爬虫看不到 robots.txt 时（比如被别处
 * 引成了深链）照样会索引；只上 meta 标签则挡不住主动爬取。
 * 内容私密时两道都上，成本只有这几行。
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
