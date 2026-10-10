import { ShareBar } from "@/components/ui/share-bar";
import { formatCNY, formatPercent } from "@/lib/format";
import type { RankedEntry } from "@/lib/ledger";

/**
 * 条形榜。一行 = 一项资产（或一笔负债）：名字、一条按金额长的条、金额。
 *
 * 为什么是横向条形而不是环形图：条目是**平铺**的，有十几条。
 * 环形图的扇区上限是 6 个左右，十几个扇区既画不开、也没有那么多
 * 色盲可分辨的颜色可用。横向条形对条目数量没有限制，
 * 而且长度按同一基准并排，比角度好比较得多 —— 角度是出了名的难比较。
 *
 * 整榜是**单色**的。给每个条配不同颜色属于把「长度」这个信息
 * 用颜色再编码一遍，白白烧掉唯一的身份通道，什么也没多告诉读者。
 */
type Props = {
  readonly rows: readonly RankedEntry[];
  /** 该侧合计，用来算条长和百分比 */
  readonly total: number;
  /** 条的颜色：资产传 `var(--asset)`，负债传 `var(--debt)` */
  readonly color: string;
  /** 空态里用的词，「资产」或「负债」 */
  readonly sideName: string;
  readonly emptyHint: string;
};

export function RankingList({ rows, total, color, sideName, emptyHint }: Props) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-faint-foreground">
        {emptyHint}
      </p>
    );
  }

  return (
    <ol className="flex flex-col">
      {rows.map(({ entry, share }) => (
        <li
          key={entry.name}
          className="-mx-2 flex flex-col gap-2 rounded-lg border-b border-border px-2 py-3 transition-colors last:border-b-0 hover:bg-muted/50"
        >
          <div className="flex items-center gap-3">
            {/*
              名字给固定宽度、条占剩余空间 —— 这样所有条左端对齐、右端按比例，
              长度之间才可直接比较。名字超长就截断：金额永远不能被裁掉，
              名字截断了还能猜。
            */}
            <span className="w-24 shrink-0 truncate text-sm sm:w-44" title={entry.name}>
              {entry.name}
            </span>

            <ShareBar share={share} color={color} height="sm" className="min-w-0 flex-1" />

            <span className="hidden shrink-0 text-xs text-faint-foreground tabular-nums sm:inline">
              {formatPercent(entry.amount, total)}
            </span>

            <span className="shrink-0 text-right text-sm tabular-nums">
              {formatCNY(entry.amount)}
            </span>
          </div>

          {entry.note ? (
            <p className="pl-0 text-xs leading-relaxed text-faint-foreground sm:pl-[11.75rem]">
              {entry.note}
            </p>
          ) : null}
        </li>
      ))}

      <li className="sr-only">
        共 {rows.length} 项{sideName}，合计 {formatCNY(total)}
      </li>
    </ol>
  );
}
