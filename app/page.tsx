import { LedgerApp } from "@/components/ledger-app";
import { siteProfile } from "@/config/site";

/**
 * 页面外壳。
 *
 * **这里不读数据。** 数据由 `LedgerApp` 在浏览器里取（桌面端读本地文件，
 * 网页端 fetch），所以构建产物里不含任何一个金额 —— 这一点对桌面端是必须的
 * （否则改一次数据就要重新打包一次应用），顺带也让 CI 构建时接触不到你的数据。
 *
 * 代价是失去了「禁用 JS 也能看」，见 AGENTS.md。
 */
export default function Page() {
  return <LedgerApp profile={siteProfile} />;
}
