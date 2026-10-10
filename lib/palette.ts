/**
 * 图表配色的「语义槽位」。
 *
 * 色值本身写在 `app/globals.css` 的 `--series-1..5` 里（明暗两套各一份），
 * 这里只负责把槽位映射成 CSS 变量名 —— 这样换配色只改 CSS 一处，
 * 组件永远只引用角色（`seriesVar(slot)`），不引用具体色值。
 *
 * 槽位顺序不是随便排的，它是色盲安全机制本身。下面这 5 个色相
 * （蓝 / 橙 / 青 / 紫 / 品红）是跑 `validate_palette.js` 验证过的顺序：
 * 明暗两种模式下相邻槽位在红绿色盲模拟下 ΔE ≥ 9，正常视觉 ΔE ≥ 19，
 * 对比度全部 ≥ 3:1。**不要随意重排或增删槽位** —— 见 AGENTS.md。
 */

/** 可用的分类色槽位。上限是 5：再多就没有验证过的安全配色可用了。 */
export const SERIES_SLOTS = 5 as const;
export type SeriesSlot = 0 | 1 | 2 | 3 | 4;

/** 槽位 → CSS 变量引用，可直接塞进 SVG 的 fill / 内联样式。 */
export function seriesVar(slot: SeriesSlot): string {
  return `var(--series-${slot + 1})`;
}
