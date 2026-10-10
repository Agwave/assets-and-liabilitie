import { ThemeToggle } from "@/components/theme-toggle";
import { formatDate } from "@/lib/format";
import type { Profile } from "@/config/profile";

export function SiteHeader({ profile }: { readonly profile: Profile }) {
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

        <p className="text-sm text-faint-foreground">数据截至 {formatDate(profile.asOf)}</p>
      </div>

      <ThemeToggle />
    </header>
  );
}
