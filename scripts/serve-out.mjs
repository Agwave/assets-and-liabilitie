/**
 * 预览 `out/` 里的静态产物。
 *
 * 为什么需要它：Next 的静态导出产物**不能直接双击 `file://` 打开** ——
 * 资源引用是绝对路径（`/_next/...`），file 协议下会被解析到磁盘根目录。
 * 而 `next start` 只认服务端构建，导出产物它起不来。所以留一个最小的静态服务器。
 *
 * 用法：pnpm build && pnpm serve
 */

import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";

const ROOT = path.resolve("out");
const PORT = Number(process.env.PORT ?? 3000);

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".yaml": "text/yaml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

if (!existsSync(ROOT)) {
  console.error(`找不到 ${ROOT}。先跑 pnpm build。`);
  process.exit(1);
}

createServer((request, response) => {
  const urlPath = decodeURIComponent((request.url ?? "/").split("?")[0]);
  let filePath = path.join(ROOT, urlPath);

  // 防目录穿越：解析后的路径必须还在 out/ 里面
  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
    response.writeHead(403);
    response.end("403");
    return;
  }

  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  if (!existsSync(filePath)) {
    // 导出产物没有 fallback 路由，404 就是 404
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("404");
    return;
  }

  response.writeHead(200, {
    "content-type": CONTENT_TYPES[path.extname(filePath)] ?? "application/octet-stream",
    // 本地预览，不要缓存，免得改了看不出来
    "cache-control": "no-store",
  });
  createReadStream(filePath).pipe(response);
}).listen(PORT, () => {
  console.log(`静态预览：http://localhost:${PORT}`);
});
