/**
 * 构建前：把 config/assets.yaml 同步成 public/ledger.json，供网页版运行期读取。
 *
 * **文件不存在就跳过，不算错误。** CI 构建桌面安装包时根本拿不到
 * config/assets.yaml（它被 gitignore 了），而这个构建也确实不需要它 ——
 * 桌面应用的数据来自用户机器上的配置文件。这正是「CI 接触不到你的数据」的原因。
 */

import { EXAMPLE, SOURCE, TARGET, syncWebData } from "./web-data.mjs";

if (syncWebData()) {
  console.log(`[prepare-web-data] ${SOURCE} → ${TARGET}`);
} else {
  console.log(
    `[prepare-web-data] 没有 ${SOURCE}，跳过。\n` +
      `  网页版产物将不含数据文件（要的话先 cp ${EXAMPLE} ${SOURCE}）；\n` +
      `  桌面版不受影响 —— 它运行期从本地读。`,
  );
}
