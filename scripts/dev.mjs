/**
 * 开发服务器：同步数据 + 监听变化 + 启动 next dev。
 *
 * 为什么需要这个脚本：网页版的数据是 `fetch('/ledger.json')`，而那个文件是
 * 构建期从 `config/assets.yaml` 同步过去的。dev 下如果不重新同步，
 * **改完 YAML 刷新页面看到的还是旧数字** —— 这种「改了没反应」最容易被
 * 误判成代码有 bug。（桌面端不受影响，它是运行期直接读原文件。）
 *
 * 所以这里盯着源文件，一改就重新同步。`next dev` 本来就会热更新页面，
 * 于是「改 YAML → 刷新 → 看到新数字」这条链就接上了。
 */

import { spawn } from "node:child_process";
import { existsSync, watch } from "node:fs";

import { EXAMPLE, SOURCE, syncWebData } from "./web-data.mjs";

if (!syncWebData()) {
  console.warn(
    `[dev] 没有 ${SOURCE}，网页版将读不到数据（会显示「没有打包数据文件」）。\n` +
      `      桌面端不受影响。要的话：cp ${EXAMPLE} ${SOURCE}`,
  );
}

// fs.watch 对单文件够用；偶尔会重复触发，但同步是幂等的，多跑几次无害
if (existsSync(SOURCE)) {
  watch(SOURCE, { persistent: true }, () => {
    if (syncWebData()) console.log(`[dev] ${SOURCE} 变了，已同步`);
  });
}

// 命令拼成一个字符串再交给 shell：分开传 args 配 shell:true 会触发 DEP0190
// （Node 警告参数不会被转义），拼起来就没这个警告，Windows 上也能跑（pnpm 是 .cmd）
const forwarded = process.argv.slice(2).join(" ");
const child = spawn(`pnpm exec next dev ${forwarded}`.trim(), {
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => process.exit(code ?? 0));
