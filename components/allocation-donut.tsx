import { formatCNY, formatCompactCNY, formatPercent } from "@/lib/format";
import type { AssetCategory, CategoryShare } from "@/lib/ledger";
import { seriesVar } from "@/lib/palette";
import { cn } from "@/lib/utils";

/**
 * 资产结构环形图。
 *
 * 设计约束（改之前先读 AGENTS.md 的「图表规矩」一节）：
 *  · 纯服务端渲染，不引图表库。没有 `"use client"`，这段 SVG 在构建期就生成好，
 *    页面里不含任何图表 JS。
 *  · 扇区之间留 **2px 表面色间隙**做分隔，不描边 —— 描边是给数据加非数据的墨。
 *  · 扇区顺序**固定等于配置顺序**，不按金额排序。相邻色是验证过的色盲安全组合，
 *    排序会把任意两色凑一起，验证过的保证就没了。金额大小靠右侧图例的表达。
 */

const SIZE = 220;
const CENTER = SIZE / 2;
const RADIUS = 74;
/** 环宽，不超过 24px —— 就是设计规范里柱子的最大厚度 */
const THICKNESS = 22;
/** 相邻扇区之间露出的表面色间隙 */
const GAP_PX = 2;
const TAU = Math.PI * 2;
/** 从 12 点方向起笔，顺时针 */
const START_ANGLE = -Math.PI / 2;

type Props = {
  readonly shares: readonly CategoryShare<AssetCategory>[];
  readonly total: number;
};

/** 坐标留 3 位小数：SSR 输出稳定，也免得 DOM 里全是浮点长尾。 */
function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function pointOn(angle: number, radius: number): readonly [number, number] {
  return [round(CENTER + radius * Math.cos(angle)), round(CENTER + radius * Math.sin(angle))];
}

function arcPath(startAngle: number, endAngle: number): string {
  const [x0, y0] = pointOn(startAngle, RADIUS);
  const [x1, y1] = pointOn(endAngle, RADIUS);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${x0} ${y0} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${x1} ${y1}`;
}

export function AllocationDonut({ shares, total }: Props) {
  // 只有一类时画整环：单个扇区没有邻居，也就不需要间隙
  const isFullRing = shares.length === 1;

  // 每端各内缩半个间隙，两个扇区之间就正好露出 GAP_PX
  const halfGapAngle = GAP_PX / 2 / RADIUS;

  let cursor = START_ANGLE;
  const segments = shares.map((share) => {
    const span = total > 0 ? (share.total / total) * TAU : 0;
    const start = cursor;
    cursor += span;
    return { share, start: start + halfGapAngle, end: cursor - halfGapAngle };
  });

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
      <div className="relative shrink-0">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="donut size-[180px] sm:size-[200px]"
          role="img"
          aria-label={`资产结构环形图，共 ${shares.length} 个分类，明细见右侧列表`}
        >
          {/* 轨道：整环铺一层极淡的底色，让极小占比的扇区也有参照 */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            strokeWidth={THICKNESS}
            className="stroke-muted"
          />

          {isFullRing ? (
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              strokeWidth={THICKNESS}
              stroke={seriesVar(shares[0].category.colorSlot)}
            >
              {/*
                用模板字符串而不是多个表达式拼 child：<title> 的 children 混了
                文本和表达式会变成数组，React 会警告「children 不是单个字符串」。
              */}
              <title>{`${shares[0].category.name}：${formatCNY(shares[0].total)}（100%）`}</title>
            </circle>
          ) : (
            segments.map(({ share, start, end }) => {
              // 占比小到内缩后不剩弧度就跳过 —— 它的数值在右侧列表里，
              // 画一个负宽度的弧只会变成一团糊
              if (end <= start) return null;
              const color = seriesVar(share.category.colorSlot);
              return (
                <path
                  key={share.category.id}
                  className="donut-seg"
                  d={arcPath(start, end)}
                  fill="none"
                  stroke={color}
                  strokeWidth={THICKNESS}
                  strokeLinecap="butt"
                >
                  <title>{`${share.category.name}：${formatCNY(share.total)}（${formatPercent(
                    share.total,
                    total,
                  )}）`}</title>
                </path>
              );
            })
          )}
        </svg>

        {/* 圆心：总资产。压得比 hero 小得多，全页只有一个 hero 数字 */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] tracking-wider text-faint-foreground">总资产</span>
          <span className="mt-0.5 text-2xl font-semibold tabular-nums">
            {formatCompactCNY(total)}
          </span>
        </div>
      </div>

      {/*
        图例就是这张图的「表格视图」—— 每个分类的金额和占比都明文写在这里，
        所以任何数值都不必靠 hover 才能读到。
      */}
      <ul className="w-full min-w-0 space-y-2.5">
        {shares.map((share) => (
          <li key={share.category.id} className="flex items-baseline gap-2.5 text-sm">
            <span
              aria-hidden="true"
              className="mt-[2px] size-2.5 shrink-0 rounded-[3px]"
              style={{ backgroundColor: seriesVar(share.category.colorSlot) }}
            />
            {/*
              金额和占比都是 shrink-0 且不给固定宽度：窄屏下宁可截断分类名，
              也不能让数字被裁掉 —— 名字截断还能猜，数字截断就是错的。
            */}
            <span className="min-w-0 flex-1 truncate">{share.category.name}</span>
            <span className="shrink-0 text-xs text-faint-foreground tabular-nums">
              {formatPercent(share.total, total)}
            </span>
            <span className="shrink-0 text-right tabular-nums">{formatCNY(share.total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 环形图的空态。配置里一个资产分类都没有时用它，而不是画一个空环。 */
export function EmptyDonut({ className }: { readonly className?: string }) {
  return (
    <div
      className={cn(
        "flex h-[180px] items-center justify-center rounded-full border border-dashed border-border text-xs text-faint-foreground sm:h-[200px]",
        className,
      )}
    >
      暂无资产分类
    </div>
  );
}
