import type { Profile } from "@/config/profile";

export function SiteFooter({ profile }: { readonly profile: Profile }) {
  return (
    <footer className="mt-16 flex flex-col gap-2 border-t border-border pt-6 text-xs leading-relaxed text-faint-foreground">
      <p>{profile.note}</p>
      <p>
        数据来自 <code className="text-muted-foreground">config/assets.ts</code>
        ，页面本身没有编辑入口 —— 改数据请改配置文件后重新构建。
      </p>
    </footer>
  );
}
