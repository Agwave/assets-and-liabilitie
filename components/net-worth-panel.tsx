import { TrendingDown, TrendingUp } from "lucide-react";

import { ShareBar } from "@/components/ui/share-bar";
import { formatCNY, formatPercent } from "@/lib/format";

/**
 * 负债率的严重度档位。
 *
 * 这里用状态色（而不是分类色）是**合规的**：它表达的是「健康与否」这个状态，
 * 不是「第几条数据」这个身份。状态色按规范必须配一个文字档位一起出现 ——
 * 所以下面永远有「稳健 / 适中 / 偏高 / 高」这几个字，颜色不单独承担含义。
 *
 * 阈值是常见口径，不是普适真理，按自己的情况改。
 */
function debtLevel(ratio: number): { readonly label: string; readonly color: string } {
  if (ratio < 0.3) return { label: "稳健", color: "var(--status-good)" };
  if (ratio < 0.5) return { label: "适中", color: "var(--status-warning)" };
  if (ratio < 0.7) return { label: "偏高", color: "var(--status-serious)" };
  return { label: "高", color: "var(--status-critical)" };
}

type TileProps = {
  readonly label: string;
  readonly value: number;
  readonly color: string;
  readonly Icon: typeof TrendingUp;
  readonly hint: string;
};

function StatTile({ label, value, color, Icon, hint }: TileProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card-raised p-4">
      <div className="flex items-center gap-1.5 text-sm text-faint-foreground">
        {/* 图标 + 文字标签成对出现，颜色从不单独表意 */}
        <Icon aria-hidden="true" className="size-4" style={{ color }} />
        <span>{label}</span>
      </div>
      <span className="text-xl font-semibold tabular-nums">{formatCNY(value)}</span>
      <span className="text-xs text-faint-foreground">{hint}</span>
    </div>
  );
}

/**
 * 只声明真正用到的那四个数字，不写 `LedgerSummary<Category, Category>` ——
 * 后者会牵扯到泛型型变，调用方不得不靠断言才能塞进来。这里结构够用，
 * 而且 `summarize()` 的返回类型天然满足它。
 */
type Props = {
  readonly summary: {
    readonly netWorth: number;
    readonly totalAssets: number;
    readonly totalLiabilities: number;
    readonly debtRatio: number;
  };
  readonly assetCount: number;
  readonly liabilityCount: number;
};

export function NetWorthPanel({ summary, assetCount, liabilityCount }: Props) {
  const { netWorth, totalAssets, totalLiabilities, debtRatio } = summary;
  const level = debtLevel(debtRatio);

  return (
    <div className="panel flex flex-col gap-6 p-6 sm:p-8">
      <div className="flex flex-col gap-3">
        <span className="text-sm tracking-widest text-faint-foreground">净资产</span>

        {/*
          全页唯一的 hero 数字，用比例字形。
          这里刻意不加 `tabular-nums` —— 等宽数字会让大号标题数字看起来松垮。

          尺寸分三档而不是直接上 48px：320px 视口下卡片内宽只有 240px，
          `¥1,550,700` 在 48px 下算出来约 240.4px，正好溢出。36px 起跳才安全。
        */}
        <p className="text-4xl leading-none font-semibold sm:text-5xl lg:text-6xl">
          {formatCNY(netWorth)}
        </p>

        <p className="text-base text-muted-foreground tabular-nums">
          总资产 {formatCNY(totalAssets)} − 总负债 {formatCNY(totalLiabilities)}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="总资产"
          value={totalAssets}
          color="var(--asset)"
          Icon={TrendingUp}
          hint={`共 ${assetCount} 项`}
        />
        <StatTile
          label="总负债"
          value={totalLiabilities}
          color="var(--debt)"
          Icon={TrendingDown}
          hint={liabilityCount > 0 ? `共 ${liabilityCount} 笔` : "当前没有负债"}
        />

        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card-raised p-4">
          <div className="flex items-center gap-1.5 text-sm text-faint-foreground">
            <span
              aria-hidden="true"
              className="size-4 rounded-full"
              style={{ backgroundColor: level.color }}
            />
            <span>负债率</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold tabular-nums">
              {formatPercent(totalLiabilities, totalAssets)}
            </span>
            <span className="text-sm text-muted-foreground">{level.label}</span>
          </div>
          <ShareBar share={debtRatio} color={level.color} height="sm" className="mt-auto" />
        </div>
      </div>
    </div>
  );
}
