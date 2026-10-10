import { cn } from "@/lib/utils";

type ShareBarProps = {
  /** 占比，0..1。超出范围会被夹紧，不让它画出格子外面。 */
  readonly share: number;
  /** 填充色，传 `seriesVar(slot)` 或 `var(--negative)` 这类 CSS 值。 */
  readonly color: string;
  /** 轨道色。默认是同色淡化 —— 也就是「同一色阶的浅一档」，不是灰色。 */
  readonly trackColor?: string;
  readonly height?: "sm" | "md" | "lg";
  readonly className?: string;
};

const HEIGHTS = {
  sm: "h-1.5",
  md: "h-2",
  lg: "h-2.5",
} as const;

/**
 * 占比条。
 *
 * 形状按设计规范来：填充条**靠基线的一端是方的，数据端 4px 圆角** ——
 * 圆角只给增长的那头，读者一眼能看出往哪个方向长。
 *
 * 无障碍：整条标记为装饰（`aria-hidden`），因为占比数字永远在它旁边以文本形式
 * 出现。让读屏软件读两遍同一个数字是噪音，不是可访问性。
 */
export function ShareBar({ share, color, trackColor, height = "md", className }: ShareBarProps) {
  const clamped = Number.isFinite(share) ? Math.min(Math.max(share, 0), 1) : 0;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "w-full overflow-hidden rounded-l-[2px] rounded-r-[4px]",
        HEIGHTS[height],
        className,
      )}
      style={{ backgroundColor: trackColor ?? `color-mix(in oklab, ${color} 16%, var(--card))` }}
    >
      <div
        className="h-full rounded-l-[2px] rounded-r-[4px] transition-[width] duration-500 ease-out"
        style={{ width: `${clamped * 100}%`, backgroundColor: color }}
      />
    </div>
  );
}
