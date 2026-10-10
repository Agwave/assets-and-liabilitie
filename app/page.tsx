import { NetWorthPanel } from "@/components/net-worth-panel";
import { RankingList } from "@/components/ranking-list";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Panel } from "@/components/ui/panel";
import { assets, liabilities } from "@/config/assets";
import { profile } from "@/config/profile";
import { formatCNY } from "@/lib/format";
import { summarize } from "@/lib/ledger";

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
  const summary = summarize(assets, liabilities);

  return (
    <>
      {/* 背景装饰：两层 fixed 元素，不参与交互也不进无障碍树 */}
      <div aria-hidden="true" className="tech-glow pointer-events-none fixed inset-0 -z-10" />
      <div aria-hidden="true" className="tech-grid pointer-events-none fixed inset-0 -z-10" />

      <div className="mx-auto flex w-full max-w-5xl flex-col px-4 sm:px-6 lg:px-8">
        <SiteHeader profile={profile} />

        <main className="flex flex-col gap-12">
          {/* ── 总览：净资产 + 三个汇总指标 ────────────────────── */}
          <NetWorthPanel
            summary={summary}
            assetCount={summary.assets.length}
            liabilityCount={summary.liabilities.length}
          />

          {/* ── 资产明细 ──────────────────────────────────────── */}
          <section className="flex flex-col gap-5">
            <SectionHeading
              title="资产"
              description="按金额从大到小。条长 = 该项占总资产的比例"
              total={summary.totalAssets}
            />
            <Panel className="p-5 sm:p-6">
              <RankingList
                rows={summary.assets}
                total={summary.totalAssets}
                color="var(--asset)"
                sideName="资产"
                emptyHint="还没有登记任何资产。在 config/assets.ts 里加几条即可。"
              />
            </Panel>
          </section>

          {/* ── 负债明细 ──────────────────────────────────────── */}
          <section className="flex flex-col gap-5">
            <SectionHeading
              title="负债"
              description="按金额从大到小。条长 = 该笔占总负债的比例"
              total={summary.totalLiabilities}
            />
            <Panel className="p-5 sm:p-6">
              <RankingList
                rows={summary.liabilities}
                total={summary.totalLiabilities}
                color="var(--debt)"
                sideName="负债"
                emptyHint="当前没有任何负债。"
              />
            </Panel>
          </section>
        </main>

        <SiteFooter profile={profile} />
      </div>
    </>
  );
}
