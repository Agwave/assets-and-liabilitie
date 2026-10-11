/**
 * 让 git 用仓库里的 `.githooks/` 目录。
 *
 * git 默认只读 `.git/hooks/`，而那个目录**不进版本控制** —— 也就是说新克隆的人
 * 拿不到钩子，保护形同虚设。`core.hooksPath` 把查找位置挪到仓库内的
 * `.githooks/`，钩子就能跟着代码一起版本化。
 *
 * 这个配置是**每个克隆各设一次**的（存在 `.git/config`，不跟着仓库走），
 * 所以挂在 package.json 的 `prepare` 上 —— `pnpm install` 之后自动跑。
 *
 * 没设上也不会怎样：钩子只是「防手滑」，真正的兜底是 CI 里那道检查
 * （见 .github/workflows/guard.yml）。
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

// 不在 git 仓库里（比如从 tarball 装的）就安静跳过
const insideRepo = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], {
  stdio: "ignore",
});
if (insideRepo.status !== 0) process.exit(0);

if (!existsSync(".githooks")) process.exit(0);

const result = spawnSync("git", ["config", "core.hooksPath", ".githooks"], {
  stdio: "inherit",
});

if (result.status === 0) {
  console.log("[setup-hooks] git 钩子已启用（core.hooksPath = .githooks）");
}
