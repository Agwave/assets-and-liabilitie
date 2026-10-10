import { assertLedgerIsSound, type AssetCategory, type LiabilityCategory } from "@/lib/ledger";

/**
 * ════════════════════════════════════════════════════════════════════
 *  全站唯一的资产 / 负债数据源。
 *  现在看到的所有数字都是占位示例 —— 换成你自己的即可。
 *  页面没有任何编辑入口，改数据就是改这个文件，然后重新构建。
 * ════════════════════════════════════════════════════════════════════
 *
 * 写数据时只有三条规矩：
 *   1. 金额一律写**正数**，单位是元。房贷写 `980000`，不要写 `-980000` ——
 *      正负由它放在 `assetCategories` 还是 `liabilityCategories` 决定。
 *   2. 金额可以写小数（`6800.5`），页面会原样展示，不做四舍五入。
 *   3. 资产分类最多 5 个（配色槽位只有 5 个验证过的颜色）。想加第 6 类，
 *      要么合并两类，要么走 `other`。
 *
 * 改完记得把 `config/profile.ts` 里的 `asOf` 一起更新。
 */

/** 资产分类。`colorSlot` 决定环形图配色，必须各不不同且落在 0..4。 */
export const assetCategories = [
  {
    id: "cash",
    colorSlot: 0,
    name: "现金及存款",
    description: "随时能取出来的钱",
    items: [
      { name: "招商银行 · 活期", amount: 85_000 },
      { name: "货币基金", amount: 120_000, note: "T+1 赎回到账" },
      { name: "三年期定期存款", amount: 200_000, note: "2027-03 到期" },
    ],
  },
  {
    id: "investment",
    colorSlot: 1,
    name: "投资持仓",
    description: "有市场波动、不保证本金的仓位",
    items: [
      { name: "沪深 300 指数基金", amount: 180_000 },
      { name: "标普 500 QDII", amount: 95_000, note: "含汇率波动" },
      { name: "债券基金", amount: 60_000 },
    ],
  },
  {
    id: "property",
    colorSlot: 2,
    name: "固定资产",
    description: "房产与车辆，按最近一次估值计入",
    items: [
      { name: "自住房", amount: 1_600_000, note: "按 2026-08 同小区成交价估值" },
      { name: "家用车", amount: 120_000, note: "按二手车平台残值" },
    ],
  },
  {
    id: "receivable",
    colorSlot: 3,
    name: "应收款",
    description: "钱在外面，但目前确实是我的",
    items: [
      { name: "借出款", amount: 30_000, note: "无息，约定年内归还" },
      { name: "租房押金", amount: 8_000 },
      { name: "待报销", amount: 3_500 },
    ],
  },
  {
    id: "other",
    colorSlot: 4,
    name: "其他资产",
    description: "不容易归到上面几类的东西",
    items: [
      { name: "住房公积金", amount: 96_000 },
      { name: "重疾险现金价值", amount: 22_000, note: "退保才能取，视为长期" },
    ],
  },
] as const satisfies readonly AssetCategory[];

/** 负债分类。不画环形图，所以不需要 `colorSlot`。 */
export const liabilityCategories = [
  {
    id: "mortgage",
    name: "房贷",
    description: "自住房按揭",
    items: [{ name: "商业贷款余额", amount: 980_000, note: "年利率 3.1%，剩余 18 年" }],
  },
  {
    id: "consumerLoan",
    name: "消费贷",
    description: "分期与信用贷",
    items: [{ name: "汽车分期", amount: 62_000, note: "剩余 14 期" }],
  },
  {
    id: "creditCard",
    name: "信用卡",
    description: "已出账未还款部分",
    items: [{ name: "本期账单", amount: 6_800, note: "最后还款日 2026-10-25" }],
  },
  {
    id: "other",
    name: "其他负债",
    description: "不易归类的人情债",
    items: [{ name: "亲友借款", amount: 20_000, note: "无息" }],
  },
] as const satisfies readonly LiabilityCategory[];

/**
 * 构建期体检。**不要删。**
 * 它在模块加载时执行，所以 `pnpm build` 会跑到：配置写坏了构建就失败。
 * 这是刻意的 —— 宁可构建报错，也不要发布一个数字悄悄错掉的资产页。
 */
assertLedgerIsSound(assetCategories, liabilityCategories);

/** 从数据本身推导出分类 id 的联合类型，供别处引用（不需要手工维护）。 */
export type AssetCategoryId = (typeof assetCategories)[number]["id"];
export type LiabilityCategoryId = (typeof liabilityCategories)[number]["id"];
