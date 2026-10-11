"use client";

import { FolderOpen, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { LoadingState, StatusPanel } from "@/components/status-panel";
import { NetWorthPanel } from "@/components/net-worth-panel";
import { RankingList } from "@/components/ranking-list";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { useIsHydrated } from "@/hooks/use-is-hydrated";
import {
  createConfigFromTemplate,
  isDesktop,
  loadLedgerSource,
  openConfigFolder,
} from "@/lib/data-source";
import { formatCNY } from "@/lib/format";
import { summarize, type Profile } from "@/lib/ledger";
import { parseLedgerYaml, type ParsedLedger } from "@/lib/parse-ledger";

/**
 * 整个页面的客户端编排。
 *
 * 为什么必须是客户端组件：桌面应用的数据在**运行期**从本地文件读，
 * 构建产物里不含任何数字。所以没法像以前那样在构建期把数据渲染进 HTML ——
 * 页面先出一层外壳，再由这里把数据取回来填进去。
 *
 * 代价是失去了「禁用 JS 也能看」。这是「数据不烤进产物」换来的，见 AGENTS.md。
 */

type Path = string | null;

type State =
  | { readonly status: "loading" }
  /** 桌面端首启：文件还不存在 */
  | { readonly status: "missing"; readonly path: Path }
  /** 文件在，但内容和示例模板一字不差 —— 用户还没填自己的数据 */
  | { readonly status: "template"; readonly path: Path }
  /** 读不出来，或者内容不合法 */
  | { readonly status: "problems"; readonly problems: readonly string[]; readonly path: Path }
  /** 这个环境根本没有数据源（比如网页版没打包数据文件） */
  | { readonly status: "unavailable"; readonly message: string }
  | { readonly status: "ready"; readonly ledger: ParsedLedger; readonly path: Path };

/** 取数据 + 解析校验，合成一个状态。抽出来是为了让 effect 里只 setState 一次。 */
async function resolveState(): Promise<State> {
  const outcome = await loadLedgerSource();

  if (!outcome.ok) {
    return outcome.kind === "missing"
      ? { status: "missing", path: outcome.path }
      : { status: "unavailable", message: outcome.message };
  }

  const parsed = parseLedgerYaml(outcome.yaml);
  if (!parsed.ok) {
    return { status: "problems", problems: parsed.problems, path: outcome.path };
  }

  // 解析通过但内容还是模板：**不要当成真数据显示**。
  // 模板里是「自住房 ¥1,600,000」这种示例数字，长得和真账一模一样。
  if (outcome.isTemplate) {
    return { status: "template", path: outcome.path };
  }

  return { status: "ready", ledger: parsed.ledger, path: outcome.path };
}

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
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-faint-foreground">{description}</p>
      </div>
      <span className="text-base text-muted-foreground tabular-nums">{formatCNY(total)}</span>
    </div>
  );
}

export function LedgerApp({ profile }: { readonly profile: Profile }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [nonce, setNonce] = useState(0);

  /*
    必须等水合完成再判断是不是桌面端。静态 HTML 是在 Node 里生成的，
    那时候 `window` 上没有 Tauri 注入的东西 —— 渲染期直接调 isDesktop()
    会让服务端和客户端首次渲染结果不一致，触发 hydration 报错。
  */
  const hydrated = useIsHydrated();
  const desktop = hydrated && isDesktop();

  // setState 在 await 之后发生，不在 effect 体内同步调用 ——
  // 同步 setState 会被 react-hooks/set-state-in-effect 拦下。
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await resolveState();
      if (!cancelled) setState(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const reload = () => setNonce((n) => n + 1);

  const handleCreate = async () => {
    try {
      await createConfigFromTemplate();
    } catch {
      // 建不出来（比如权限问题）就照常重读，让状态自己说话
    }
    reload();
  };

  const toolbar = desktop ? (
    <>
      <Button variant="ghost" onClick={reload} title="重新读取配置文件">
        <RefreshCw aria-hidden="true" className="size-3.5" />
        刷新
      </Button>
      <Button
        variant="ghost"
        onClick={() => void openConfigFolder()}
        title="在文件管理器里打开配置目录"
      >
        <FolderOpen aria-hidden="true" className="size-3.5" />
        配置文件夹
      </Button>
    </>
  ) : null;

  const openFolderButton = desktop ? (
    <Button onClick={() => void openConfigFolder()}>打开所在文件夹</Button>
  ) : null;

  return (
    <>
      <div aria-hidden="true" className="tech-glow pointer-events-none fixed inset-0 -z-10" />
      <div aria-hidden="true" className="tech-grid pointer-events-none fixed inset-0 -z-10" />

      <div className="mx-auto flex w-full max-w-5xl flex-col px-4 sm:px-6 lg:px-8">
        <SiteHeader profile={profile} actions={toolbar} />

        <main className="flex flex-col gap-12">
          {state.status === "loading" ? <LoadingState /> : null}

          {state.status === "missing" ? (
            <StatusPanel
              title="还没有配置文件"
              message="点下面的按钮会按模板创建一份，然后用任意文本编辑器填上你自己的资产和负债。"
              path={state.path}
              actions={
                <>
                  <Button variant="primary" onClick={() => void handleCreate()}>
                    创建配置文件
                  </Button>
                  {openFolderButton}
                </>
              }
            />
          ) : null}

          {state.status === "template" ? (
            <StatusPanel
              tone="info"
              title="配置文件已创建，里面还是示例数据"
              message="模板里的「自住房」「沪深 300 指数基金」这些都只是占位，换成你自己的资产和负债，保存后点右上角的「刷新」。"
              path={state.path}
              actions={
                <>
                  {openFolderButton}
                  <Button variant="primary" onClick={reload}>
                    填好了，刷新
                  </Button>
                </>
              }
            />
          ) : null}

          {state.status === "unavailable" ? (
            <StatusPanel title="读不到数据" message={state.message} />
          ) : null}

          {state.status === "problems" ? (
            <StatusPanel
              title={`配置文件有 ${state.problems.length} 处问题`}
              message="改完保存，然后点右上角的「刷新」。"
              problems={state.problems}
              path={state.path}
              actions={
                <>
                  <Button variant="primary" onClick={reload}>
                    改好了，重新读取
                  </Button>
                  {openFolderButton}
                </>
              }
            />
          ) : null}

          {state.status === "ready" ? <Dashboard ledger={state.ledger} /> : null}
        </main>

        <SiteFooter profile={profile} />
      </div>
    </>
  );
}

function Dashboard({ ledger }: { readonly ledger: ParsedLedger }) {
  const summary = summarize(ledger.assets, ledger.liabilities);

  return (
    <>
      <NetWorthPanel
        summary={summary}
        assetCount={summary.assets.length}
        liabilityCount={summary.liabilities.length}
      />

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
            emptyHint="还没有登记任何资产。"
          />
        </Panel>
      </section>

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
    </>
  );
}
