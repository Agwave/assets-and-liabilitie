import { ShareBar } from "@/components/ui/share-bar";
import { formatCNY, formatPercent } from "@/lib/format";
import type { Category } from "@/lib/ledger";

type Props = {
  readonly category: Category;
  /** 该分类的金额合计 */
  readonly total: number;
  /**
   * 分栏合计（资产侧传总资产，负债侧传总负债）。
   * **卡片条和条目条用的是同一个分母** —— 所以条目条正好拼成卡片条，
   * 两层的长度可以直接互相比较，不会出现「这张卡的 100% 只是那张卡的 20%」这种歧义。
   */
  readonly grandTotal: number;
  /** 条形与色块的颜色，传 CSS 颜色值 */
  readonly color: string;
};

export function CategoryCard({ category, total, grandTotal, color }: Props) {
  return (
    <article className="panel flex flex-col gap-4 p-5">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-2.5 shrink-0 rounded-[3px]"
            style={{ backgroundColor: color }}
          />
          <h3 className="flex-1 text-sm font-semibold">{category.name}</h3>
          <span className="text-xs text-faint-foreground tabular-nums">
            {formatPercent(total, grandTotal)}
          </span>
        </div>

        <p className="text-xs leading-relaxed text-faint-foreground">{category.description}</p>

        <p className="text-xl font-semibold tabular-nums">{formatCNY(total)}</p>

        <ShareBar share={grandTotal > 0 ? total / grandTotal : 0} color={color} height="md" />
      </header>

      <ul className="flex flex-col gap-3 border-t border-border pt-4">
        {category.items.map((item) => (
          <li key={item.name} className="flex flex-col gap-1.5">
            <div className="flex items-baseline gap-3">
              <span className="min-w-0 flex-1 truncate text-sm">{item.name}</span>
              <span className="shrink-0 text-sm tabular-nums">{formatCNY(item.amount)}</span>
            </div>

            {/* 条长 = 该条目占分栏合计的比例，单位与上一层的卡片条一致 */}
            <ShareBar
              share={grandTotal > 0 ? item.amount / grandTotal : 0}
              color={color}
              height="sm"
            />

            {item.note ? (
              <span className="text-xs leading-relaxed text-faint-foreground">{item.note}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </article>
  );
}
