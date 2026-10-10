/**
 * 人民币格式化。全站只展示人民币，没有汇率换算，所以这里的规则很简单：
 * 展示的每一个数字都是配置里写的那个数字，不做任何近似。
 */

const CNY = new Intl.NumberFormat("zh-CN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** `¥1,284,000` / `¥3,200.5` —— 用于明细行与汇总数字。 */
export function formatCNY(amount: number): string {
  return `¥${CNY.format(amount)}`;
}

/**
 * `128.4 万` / `1.28 亿` —— 用于空间紧张的地方（环形图中心、窄屏汇总卡）。
 * 万位以下不缩写，免得 `¥8,200` 变成 `0.82 万` 反而难读。
 */
export function formatCompactCNY(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  if (abs >= 100_000_000) return `${sign}¥${trim(abs / 100_000_000)}亿`;
  if (abs >= 10_000) return `${sign}¥${trim(abs / 10_000)}万`;
  return `${sign}¥${CNY.format(abs)}`;
}

/** 最多两位小数，且不保留无意义的尾随 0。 */
function trim(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/**
 * `42.3%` —— 占比。
 * `total` 为 0 时返回 `0.0%` 而不是 `NaN` 或 `Infinity`：
 * 空账本应该是「显示 0」，不该让页面崩掉。
 */
export function formatPercent(part: number, total: number): string {
  if (total <= 0) return "0.0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}

/** `1 分 20 秒` 之类的相对时间不做了 —— 全站静态生成，只显示配置里写死的日期。 */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${year} 年 ${Number(month)} 月 ${Number(day)} 日`;
}
