import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import type { Profile } from "@/lib/ledger";

type Props = {
  readonly profile: Profile;
  /**
   * 页头右侧的额外按钮（桌面端用来放「刷新」和「配置文件夹」）。
   * 网页端不传 —— 那边没有本地文件可刷新。
   */
  readonly actions?: ReactNode;
};

export function SiteHeader({ profile, actions }: Props) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 py-8 sm:py-12">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2.5">
          {/* 一个小小的状态灯，纯装饰 */}
          <span
            aria-hidden="true"
            className="size-2 rounded-full bg-accent shadow-[0_0_12px_var(--accent)]"
          />
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{profile.name}</h1>
        </div>

        <p className="text-base text-muted-foreground">{profile.subtitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {actions}
        <ThemeToggle />
      </div>
    </header>
  );
}
