/**
 * 网页版的数据副本同步。
 *
 * 桌面端在运行期直接读本地文件；网页端没有「本地文件」这个概念，
 * 所以需要一份随构建发布的副本。
 *
 * 输出是 JSON 而不是裸 YAML，因为除了 YAML 文本还要带一个
 * **「这是不是还没改过的模板」**的标记：首启创建出来的配置文件里是示例数字
 * （「自住房 ¥1,600,000」），长得和真数据一模一样。不标出来的话，
 * 用户会以为那就是自己的账。桌面端在 Rust 侧做同样的判断。
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

export const SOURCE = "config/assets.yaml";
export const EXAMPLE = "config/assets.example.yaml";
export const TARGET = "public/ledger.json";

/** @returns {boolean} 有没有同步成功（源文件不存在时返回 false） */
export function syncWebData() {
  if (!existsSync(SOURCE)) return false;

  const yaml = readFileSync(SOURCE, "utf8");
  const example = existsSync(EXAMPLE) ? readFileSync(EXAMPLE, "utf8") : null;

  mkdirSync("public", { recursive: true });
  writeFileSync(
    TARGET,
    JSON.stringify({
      yaml,
      isTemplate: example !== null && yaml.trim() === example.trim(),
    }),
  );

  return true;
}
