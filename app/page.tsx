import { AllocationDonut, EmptyDonut } from "@/components/allocation-donut";
import { CategoryCard } from "@/components/category-card";
import { NetWorthPanel } from "@/components/net-worth-panel";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Panel } from "@/components/ui/panel";
import { assetCategories, liabilityCategories } from "@/config/assets";
import { profile } from "@/config/profile";
import { formatCNY } from "@/lib/format";
import { summarize } from "@/lib/ledger";
import { seriesVar } from "@/lib/palette";

/**
 * 唯一的页面。全服务端渲染，构建期就生成好静态 HTML。
 *
 * 页面上没有任何客户端交互逻辑，只有主题切换那一个小按钮是客户端组件 ——
 * 所以点开这个页面，网络里几乎只有 HTML 和一份 CSS。
 */

function SectionHeading({
  title,
  description,
  total,
}: {
  readonly title: string;
  readonly description: string;
  readonly total: number;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        <p className="text-xs text-faint-foreground">{description}</p>
      </div>
      <span className="text-sm text-muted-foreground tabular-nums">{formatCNY(total)}</span>
    </div>
  );
}

export default function Page() {
  const summary = summarize(assetCategories, liabilityCategories);

  return (
    <>
      {/* 背景装饰：两层 fixed 元素，不参与交互也不进无障碍树 */}
      <div aria-hidden="true" className="tech-glow pointer-events-none fixed inset-0 -z-10" />
      <div aria-hidden="true" className="tech-grid pointer-events-none fixed inset-0 -z-10" />

      <div className="mx-auto flex w-full max-w-6xl flex-col px-4 sm:px-6 lg:px-8">
        <SiteHeader profile={profile} />

        <main className="flex flex-col gap-12">
          {/* ── 总览：净资产 + 资产结构 ─────────────────────────── */}
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <NetWorthPanel summary={summary} />

            <Panel className="flex flex-col gap-6 p-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-sm font-semibold tracking-wide">资产结构</h2>
                <p className="text-xs text-faint-foreground">
                  扇区顺序与配色固定绑定分类，不随金额大小重排
                </p>
              </div>

              {summary.assetShares.length >= 2 ? (
                <AllocationDonut shares={summary.assetShares} total={summary.totalAssets} />
              ) : (
                <EmptyDonut />
              )}
            </Panel>
          </section>

          {/* ── 资产明细 ──────────────────────────────────────── */}
          <section className="flex flex-col gap-5">
            <SectionHeading
              title="资产明细"
              description="条形长度 = 该条目占「总资产」的比例，与卡片条同一口径"
              total={summary.totalAssets}
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {summary.assetShares.map(({ category, total }) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  total={total}
                  grandTotal={summary.totalAssets}
                  color={seriesVar(category.colorSlot)}
                />
              ))}
            </div>
          </section>

          {/* ── 负债明细 ──────────────────────────────────────── */}
          <section className="flex flex-col gap-5">
            <SectionHeading
              title="负债明细"
              description="条形长度 = 该条目占「总负债」的比例。负债是同一类东西，所以只用一种颜色，不按分类上色"
              total={summary.totalLiabilities}
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {summary.liabilityShares.map(({ category, total }) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  total={total}
                  grandTotal={summary.totalLiabilities}
                  color="var(--negative)"
                />
              ))}
            </div>
          </section>
        </main>

        <SiteFooter profile={profile} />
      </div>
    </>
  );
}
