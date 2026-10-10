# AGENTS.md — 本仓库对 AI 助手的工作要求

这是一个**只读展示**的个人资产负债表：数据全部来自配置文件，页面没有任何编辑入口、
没有数据库、没有接口。技术栈 Next.js（App Router）+ Tailwind v4 + shadcn/ui 约定。

## 1. 每次改完代码，必须依次完成以下检查（禁止跳过）

```bash
pnpm format:check   # 1. Prettier，必须 0 处不一致
pnpm lint           # 2. ESLint，必须 0 error
pnpm build          # 3. 类型检查 + 静态生成（构建期还会跑配置体检）
```

一条命令跑前两项：`pnpm check`（**不含 build**，别拿它当完整校验）。

- `pnpm format:check` 报出来的差异一律用 `pnpm format` 修，**不要手工去对齐** ——
  类名顺序由 `prettier-plugin-tailwindcss` 决定，手排的会被重排回去。
- `pnpm lint` 必须修到 **0 error**。想加 `eslint-disable` 前先确认那是不是真问题：
  见下面「本仓库的坑」里 `set-state-in-effect` 那条，那个是真问题。
- `pnpm build` 同时承担 TypeScript 类型检查。本仓库把业务约束放进了类型系统，
  所以它失败时往往**不是「构建坏了」，而是「数据写错了」**：
  - 金额写成字符串 / 漏字段 → `LineItem` 类型拦住
  - 资产分类用了第 6 个配色槽位 → `SeriesSlot` 是 `0 | 1 | 2 | 3 | 4`，写不出来
  - `config/assets.ts` 里的数字本身不合法 → 构建期体检抛错，见下条

### 构建期体检

`config/assets.ts` 末尾调用了 `assertLedgerIsSound()`，它在**模块加载时**执行，
所以 `pnpm build` 会跑到。以下数据问题会让构建**直接失败**，并指出是哪个分类哪个条目：

| 拦住的错误                       | 为什么必须在构建期拦                               |
| -------------------------------- | -------------------------------------------------- |
| 金额 ≤ 0 或不是有限数            | 负号会让「资产减负债」算成加法，页面看起来完全正常 |
| 两个资产分类用同一个 `colorSlot` | 两个扇区同色，读者无法区分                         |
| 分类 `id` 重复                   | React key 冲突，渲染行为未定义                     |
| 分类下没有任何条目               | 空分类会渲染出一条 0% 的占比条，是噪音             |
| 分类合计 ≤ 0                     | 同上                                               |

这是刻意设计的失败：**宁可构建报错，也不要发布一个数字悄悄错掉的资产页。**

## 2. Git commit message 格式

首行：`[改动类型](改动核心模块): 细节描述`

**改动类型**（常用）：`feat` `fix` `perf` `chore` `test` `refactor` `docs` `style` `build` `revert`

**核心模块**（对应本仓库实际目录）：

| 模块       | 对应位置                                                            | 职责                           |
| ---------- | ------------------------------------------------------------------- | ------------------------------ |
| `config`   | `config/assets.ts`、`config/profile.ts`                             | 数据源与站点身份               |
| `data`     | `lib/ledger.ts`                                                     | 账本类型、汇总计算、构建期体检 |
| `format`   | `lib/format.ts`                                                     | 人民币格式化与百分比           |
| `charts`   | `components/allocation-donut.tsx`、`lib/palette.ts`                 | 环形图与配色槽位               |
| `sections` | `components/category-card.tsx`、`net-worth-panel.tsx`、`site-*.tsx` | 页面各区块                     |
| `ui`       | `components/ui/`、`app/globals.css`                                 | 卡片、占比条、主题 token       |
| `theme`    | `components/theme-provider.tsx`、`theme-toggle.tsx`、`hooks/`       | 明暗切换                       |
| `page`     | `app/page.tsx`、`app/layout.tsx`                                    | 页面组装与元信息               |
| `build`    | `package.json`、`eslint.config.mjs`、`.prettierrc.json`             | 工具链配置                     |

**规则**：

- 首行简洁，说清楚「改了什么、为什么」
- 单次改动内容较多时，首行之后空一行，用「- 」短横线分点列出

示例：

```
[feat](charts): 资产结构改用环形图展示各类占比

- 纯手写 SVG，不加图表库，页面不增客户端 JS
- 扇区之间留 2px 表面色间隙做分隔，不描边
- 配色取验证过的 5 个分类色槽，不按金额重排
```

```
[fix](ui): 修复 320px 下净资产数字撑出卡片
```

## 3. 格式化与静态检查（本仓库的分工）

两个工具各管一摊，**不要越界**：

| 工具         | 管什么                                              | 不管什么                   |
| ------------ | --------------------------------------------------- | -------------------------- |
| **Prettier** | 排版：分号、引号、行宽、换行、Tailwind 类名顺序     | 代码对不对                 |
| **ESLint**   | 正确性：React Hooks 规则、Next.js 规则、TS 可疑写法 | 排版（一条格式规则都没开） |

配置在 `.prettierrc.json`：

- `printWidth: 100`、双引号、分号、`trailingComma: "all"`
- `tailwindStylesheet: "./app/globals.css"` —— **Tailwind v4 必须靠这个路径**
  才能读到本仓库自定义的 `@theme` token。改 `globals.css` 的 token 名之后，
  类名排序会跟着变，重跑 `pnpm format` 即可。
- `tailwindFunctions: ["cn", "cva"]` —— 写在 `cn(...)` 里的类名**同样会被排序**。
  不要试图手工调整 `cn()` 里的参数顺序，会被重排。
- 自定义的 utility（`.panel`、`.tech-grid`、`.donut-seg`）不是 Tailwind 类，
  排序插件不认识它们，它们会被排到标准类名之后 —— 这是预期行为。

**因此下面这些事不要做**：

- ❌ 手工对齐 Tailwind 类名顺序（跑 `pnpm format` 就行）
- ❌ 为了过 lint 加 `eslint-disable`（先判断是不是真问题）
- ❌ 在 `components/` 里写格式化逻辑

## 4. 校验命令

| 目的                           | 命令                       |
| ------------------------------ | -------------------------- |
| 排版 + lint + 类型（快速自检） | `pnpm check`               |
| 完整校验（含静态生成）         | `pnpm build`               |
| 只跑 lint                      | `pnpm lint`                |
| lint 并自动修可修项            | `pnpm lint:fix`            |
| 只格式化                       | `pnpm format`              |
| 只查类型                       | `pnpm typecheck`           |
| 本地预览生产构建               | `pnpm build && pnpm start` |
| 开发服务器                     | `pnpm dev`                 |

### 本仓库没有测试框架

**刻意不引入。** 这个站点是纯静态展示，绝大部分逻辑是「把配置渲染成 HTML」，
为它搭测试框架的收益低于维护成本。**类型系统 + 构建期体检承担了测试的职责**：
`pnpm build` 会拦住漏字段、非法金额、配色槽位撞车等大多数真实错误。

**因此下列行为没有自动化覆盖，改动相关代码后必须人工验证**：

| 行为               | 验证方式                                                                       |
| ------------------ | ------------------------------------------------------------------------------ |
| 明暗两套配色       | 切换右上角三个按钮，两种模式下都确认文字对比度正常、无「同色不可辨」的相邻扇区 |
| 极窄视口无横向滚动 | 320 / 360 / 390 / 414 宽度下 `window.scrollX` 必须恒为 0                       |
| 无 JS 可用性       | 禁用 JS：所有数字仍完整、环形图仍渲染、跟随系统偏好出正确配色                  |
| 环比数字正确       | 手算 `净资产 = 总资产 − 总负债`，与页面上的 hero 数字对一遍                    |
| 占比之和           | 资产侧五个分类的百分比加起来应约等于 100%（因四舍五入可能偏 0.1%）             |

### 截图验证的坑（本机做不了）

本机环境**既没有中文字体也没有浏览器**（`fc-list :lang=zh` 返回 0 条，
没有 chromium / playwright）。所以：

- 无头浏览器截中文页会满屏豆腐块 —— 这不代表页面有问题，真机有系统字体兜底
- **本仓库当前的验证手段是检查构建产物**：

```bash
pnpm build && pnpm start -p 3111 &
curl -sS http://localhost:3111/ -o /tmp/page.html
# 数字对不对
grep -oE '¥[0-9,]+' /tmp/page.html | sort -u
# 环形图几何：应为 5 个扇区，颜色分别引用 --series-1..5
grep -o 'class="donut-seg"' /tmp/page.html | wc -l
grep -oE 'stroke="var\(--series-[0-9]\)"' /tmp/page.html | sort -u
```

注意页面 HTML 里每个数字会出现 2~5 次 —— 一次在 `<body>`，其余在 Next 内联的
RSC flight 数据里。这不是重复渲染。

## 5. 图表规矩（改配色/图表前必读）

配色是**算出来的，不是挑出来的**。改之前先跑验证器，不要凭眼睛判断。

### 五条硬规则

1. **分类色槽顺序不能重排，也不能加第 6 个。**
   当前顺序（蓝 `#3987e5` / 橙 `#d95926` / 青 `#199e70` / 紫 `#9085e9` / 品红 `#d55181`
   —— 暗色模式值）跑过色盲安全验证：相邻槽位在红绿色盲模拟下 ΔE ≥ 9.4，
   正常视觉 ΔE ≥ 19.7，对比度全部 ≥ 3:1。**重排会让任意两色相邻，
   验证过的保证立刻失效**（实测品红↔青在红绿色盲下 ΔE 只有 1.6，几乎同色）。
   改配色后必须重跑 dataviz skill 的 `scripts/validate_palette.js`。
2. **扇区顺序 = 配置顺序，永远不要按金额排序。**
   排序会把任意两个色相凑成邻居，上面那条保证就没了。
   金额大小靠右侧图例的数值和占比表达 —— 那些才是不依赖颜色的通道。
3. **分隔靠 2px 表面色间隙，不靠描边。** 描边是给数据加非数据的墨。
4. **文字永远不穿数据色。** 数值、图例、标签一律用文字 token
   （primary / secondary / faint），身份由旁边的色块承担。浅色的青和品红当文字读不清。
5. **全页只有一个 hero 数字**（净资产，≥48px）。环形图圆心那个是标签不是 hero，
   所以字号压在 24px。大号独立数字用**比例字形**，只有需要纵向对齐的列
   （明细行、表格）才加 `tabular-nums` —— 等宽数字会让大号数字看起来松垮。

### 状态色的用法

`--status-good/warning/serious/critical` 和 `--positive/--negative` 是**语义色**，
表达「健康与否」，不是「第几条数据」。它们有两条额外约束：

- **固定不随主题变**，所以只在 `:root` 声明一次，不在两个暗色块里
- **必须配文字标签一起出现**（负债率旁边永远有「稳健 / 适中 / 偏高 / 高」）。
  浅色模式下 warning / serious 对比度低于 3:1，这是刻意的 ——
  补偿通道就是那个文字标签，颜色从不单独表意

### 用状态色 vs 用分类色

- 说「这是第几类资产」→ 分类色（`--series-N`）
- 说「这个指标健康吗」→ 状态色
- **同一个图里不能混用**：不能让一个分类色去冒充状态，也不能让状态色去当第 4 条系列

## 6. 本仓库的坑（改动前务必先读）

这些都是实际踩过的，**不要「顺手改回去」**：

- **环形图是手写 SVG，不要引入图表库。** 引 recharts / chart.js 会把整个图表
  推进客户端包（`"use client"`），一个纯展示页面凭空多出几百 KB JS。
  现在的实现是服务端组件里直接拼 SVG 路径，构建期就生成好，页面 Runtime 零图表 JS。
  扇区之间的 2px 间隙是**按弧长换算成圆心角**算出来的（`GAP_PX / 2 / RADIUS`），
  不是描边，也不是 `stroke-dasharray`。
- **不要用 shadcn 的 `Card` / `Table` / `Separator`。** 这几个组件带 `"use client"`，
  用在纯静态卡片上会白白把整块推进客户端包。`components/ui/` 里的组件都是手写的、
  没有 `"use client"`，是给这种静态展示用的。
- **`useEffect` 里同步 setState 会被 lint 拦下。** `react-hooks/set-state-in-effect`
  会报 error。要写「是否已挂载」这类判断，用 `hooks/use-is-hydrated.ts`
  的 `useIsHydrated()`（基于 `useSyncExternalStore`），不要写
  `useState(false) + useEffect(() => setMounted(true))` 那套老写法。
- **`<title>` 里不要混文本和表达式。** JSX 会把它们变成数组，React 会警告
  「children 不是单个字符串」。用模板字符串：``<title>{`${a}：${b}`}</title>``。
- **暗色 token 有两处声明，改配色时两块都要改。** 一处在
  `@media (prefers-color-scheme: dark) { :root:where(:not(.light)) }`（兜住
  关掉 JS / 首屏未水合时跟随系统偏好），一处在 `.dark`（next-themes 写进 `<html>`，
  让手动开关压过系统偏好）。两处优先级相同，靠 `.light` 守卫 + 书写顺序决定胜负，
  实测四种组合（系统明/暗 × 手动明/暗）都正确 —— **不要「优化」成一处**。
- **字体栈必须带 CJK 回退。** `system-ui` 在不少 Linux / 容器环境没有中文字形，
  删掉 `globals.css` 里 PingFang / 微软雅黑 / Noto CJK 那一串，中文页会全变豆腐块。
- **hero 数字的字号分了三档，是算过的。** 320px 视口下卡片内宽只有 240px，
  `¥1,550,700` 在 48px 下约 240.4px，正好溢出。所以是
  `text-4xl sm:text-5xl lg:text-6xl`，不要直接改成固定 `text-5xl`。
  同理环形图图例里的金额和占比是 `shrink-0` 且**不给固定宽度** ——
  窄屏宁可截断分类名，也不能让数字被裁掉。
- **占比条的两个层级用的是同一个分母。** 卡片条和条目条都是
  「占该侧合计的比例」，所以条目条正好拼成卡片条，两层可以互相比较。
  改成「条目占本类比例」会让两层不可比，是退步。
- **`CLAUDE.md` 是指向 `AGENTS.md` 的软链接，不要改成实体文件。**
  `next dev` 会检查 AGENTS.md 里有没有 `nextjs-agent-rules` 块：有就只 upsert
  AGENTS.md、跳过 CLAUDE.md，软链接不会被动。**如果删掉 AGENTS.md 末尾那个块，
  Next 会转而把块写进 CLAUDE.md，把软链接覆盖成实体文件。**
- **依赖安装走镜像。** `.npmrc` 指向 `registry.npmmirror.com`（官方源实测约 11 MB/s，
  镜像是它两倍多）。注意 `create-next-app` 会拒绝在含 `.npmrc` 的目录里脚手架。
- **`pnpm <script>` 偶尔会解析失败**（报 `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL`），
  加 `run` 就好：`pnpm run format`。写脚本时用 `pnpm run` 更稳。
- **构建期体检不要在 `next.config.ts` 里做，要在 config 模块加载时做。**
  现在这样任何入口（build / dev / 单独的 node 脚本）导入配置都会触发，
  放在 next.config 里只有构建才跑得到。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
