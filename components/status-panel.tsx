import { Info, Loader2, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { Panel } from "@/components/ui/panel";

/**
 * 加载中 / 出错 / 需要用户注意的界面。
 *
 * 以前配置校验跑在构建期，坏配置直接让构建失败就够了 —— 用户根本看不到页面。
 * 现在校验跑在应用里，**同一个错误必须以界面形式呈现**，而且要说清楚
 * 「哪个文件、哪一条、该怎么改」，否则用户只会看到一个白屏。
 *
 * `tone` 区分「需要用户处理的问题」（warning）和「一句说明」（info）——
 * 「配置文件还是模板」不算错误，但也不能当成正常数据展示。
 */

export function LoadingState({ label = "正在读取数据…" }: { readonly label?: string }) {
  return (
    <Panel className="flex items-center justify-center gap-3 p-12">
      <Loader2 aria-hidden="true" className="size-4 animate-spin text-muted-foreground" />
      <span className="text-sm text-muted-foreground">{label}</span>
    </Panel>
  );
}

type StatusPanelProps = {
  readonly tone?: "warning" | "info";
  readonly title: string;
  readonly message?: string;
  /** 逐条列出的问题。可以含换行，用 whitespace-pre-line 渲染。 */
  readonly problems?: readonly string[];
  /** 配置文件路径，会以可选中复制的等宽字体显示 */
  readonly path?: string | null;
  readonly actions?: ReactNode;
};

export function StatusPanel({
  tone = "warning",
  title,
  message,
  problems,
  path,
  actions,
}: StatusPanelProps) {
  const Icon = tone === "info" ? Info : TriangleAlert;
  const iconColor = tone === "info" ? "var(--status-good)" : "var(--status-warning)";

  return (
    <Panel className="flex flex-col gap-5 p-6 sm:p-8">
      <div className="flex items-start gap-3">
        <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" style={{ color: iconColor }} />
        <div className="flex flex-col gap-1.5">
          <h2 className="text-base font-semibold">{title}</h2>
          {message ? (
            <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>
          ) : null}
        </div>
      </div>

      {problems && problems.length > 0 ? (
        <ul className="flex flex-col gap-2.5 rounded-xl border border-border bg-card-raised p-4">
          {problems.map((problem) => (
            <li key={problem} className="flex gap-2.5 text-sm leading-relaxed whitespace-pre-line">
              <span aria-hidden="true" className="text-faint-foreground select-none">
                ·
              </span>
              <span className="min-w-0">{problem}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {path ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-faint-foreground">配置文件位置</span>
          <code className="rounded-lg border border-border bg-muted/50 px-3 py-2 font-mono text-xs break-all select-all">
            {path}
          </code>
        </div>
      ) : null}

      {actions ? <div className="flex flex-wrap gap-2.5">{actions}</div> : null}
    </Panel>
  );
}
