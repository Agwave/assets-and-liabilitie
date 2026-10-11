/**
 * 桌面机构建：先做网页构建，再把网页版的数据副本从产物里删掉。
 *
 * 为什么必须删：网页版要在运行期 `fetch('/ledger.json')`，所以构建时会把
 * `config/assets.yaml` 同步进 `public/`，最终落在 `out/ledger.json`。
 * 而桌面应用的数据来自**用户机器上的配置文件**，产物里不该有任何数据副本 ——
 * 留着的话，本地构建一次，你的真实资产就被打进安装包了。
 *
 * CI 构建本来就没有这个文件（`config/assets.yaml` 被 gitignore，构建机拿不到），
 * 所以这一步主要是给**本地构建**兜底。两处都干净才算数。
 *
 * 文件名从 `public/ledger.*` 同步过来，改那边记得改这里。
 */

import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";

import { TARGET } from "./web-data.mjs";

/** web-data.mjs 写的是 public/ledger.json，构建后落在 out/ 下的同名文件 */
const LEAK = TARGET.replace(/^public\//, "out/");

const build = spawnSync("pnpm run build", { stdio: "inherit", shell: true });
if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

if (existsSync(LEAK)) {
  rmSync(LEAK);
  console.log(`[build-desktop] 已删除 ${LEAK} —— 桌面产物不含任何数据副本`);
} else {
  console.log(`[build-desktop] 产物里本来就没有 ${LEAK}`);
}
