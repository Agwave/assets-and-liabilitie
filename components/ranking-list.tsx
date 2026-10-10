import { ShareBar } from "@/components/ui/share-bar";
import { formatCNY, formatPercent } from "@/lib/format";
import type { RankedEntry } from "@/lib/ledger";

/**
 * 条形榜。一行 = 一项资产（或一笔负债）：名字、金额、一条按金额长的条、占比。
 *
 * 为什么是横向条形而不是环形图：条目是**平铺**的，有十几条。
 * 环形图的扇区上限是 6 个左右，十几个扇区既画不开、也没有那么多
 * 色盲可分辨的颜色可用。横向条形对条目数量没有限制，
 * 而且长度按同一基准并排，比角度好比较得多 —— 角度是出了名的难比较。
 *
 * 整榜是**单色**的。给每个条配不同颜色属于把「长度」这个信息
 * 用颜色再编码一遍，白白烧掉唯一的身份通道，什么也没多告诉读者。
 *
 * 排版：宽屏是一行（名字 | 条 | 占比 | 金额），窄屏折成两行
 * （名字 + 金额 / 条 + 占比）。折行的理由是长度：320px 下一行排下来
 * 条形只剩 30 多像素，最大项和最小项的条会缩成差不多宽，条形就白画了。
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
      <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-faint-foreground">
        {emptyHint}
      </p>
    );
  }

  return (
    <ol className="flex flex-col">
      {rows.map(({ entry, share }) => (
        <li
          key={entry.name}
          className="-mx-2 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border-b border-border px-2 py-3.5 transition-colors last:border-b-0 hover:bg-muted/50"
        >
          {/*
            名字在窄屏占满剩余宽度、宽屏固定成一条整齐的列。
            超长就截断：金额永远不能被裁掉 —— 名字截断了还能猜，金额截断了就是错的。
          */}
          <span
            className="order-1 min-w-0 flex-1 truncate text-base sm:w-52 sm:flex-none"
            title={entry.name}
          >
            {entry.name}
          </span>

          <span className="order-2 ml-auto shrink-0 text-base font-medium tabular-nums sm:order-3 sm:ml-0">
            {formatCNY(entry.amount)}
          </span>

          {/* 条 + 占比。窄屏靠 `w-full` 独占一行，宽屏回到中间当弹性列。 */}
          <div className="order-3 flex w-full min-w-0 items-center gap-3 sm:order-2 sm:w-auto sm:flex-1">
            <ShareBar share={share} color={color} height="md" className="min-w-0 flex-1" />
            <span className="w-12 shrink-0 text-right text-sm text-faint-foreground tabular-nums sm:w-14">
              {formatPercent(entry.amount, total)}
            </span>
          </div>

          {entry.note ? (
            <p className="order-4 w-full text-sm leading-relaxed text-faint-foreground sm:pl-[13.75rem]">
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
