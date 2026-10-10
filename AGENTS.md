# AGENTS.md — 本仓库对 AI 助手的工作要求

这是一个**只读展示**的个人资产负债表：数据全部来自配置文件，页面没有任何编辑入口、
没有数据库、没有接口。技术栈 Next.js（App Router）+ Tailwind v4 + shadcn/ui 约定。

数据在 `config/assets.yaml`（**被 gitignore，不进仓库**），模板是
`config/assets.example.yaml`。结构是**平铺**的：一条记录就是一个名字 + 一个金额，
没有二级分类。

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
- `pnpm build` 同时承担 TypeScript 类型检查**和配置校验**。所以它失败时往往
  **不是「构建坏了」，而是「数据写错了」**：
  - 组件之间传错类型 → TypeScript 拦住
  - 配置写错（字段名拼错、金额带逗号、重名）→ `lib/config.ts` 拦住，见下条

### 构建期体检（**配置是 YAML，所以这层校验是必需品而不是装饰**）

配置从 TypeScript 换成 YAML 之后，**编辑器不再帮你检查字段名了**。而且 YAML 有好几个
会静默出错的写法 —— `amout:` 少打一个字母不会报错，只会给出一条 `amount` 为
`undefined` 的记录；`1,600,000` 会被解析成**字符串**。这些都会一路飘到汇总数字里
才暴露。所以 `lib/config.ts` 的校验不是可选的装饰，它是换掉类型系统之后补上的那个洞。

校验分两层，`pnpm build` 会跑到：

**第一层：形状**（`lib/config.ts`）—— 字段名、类型、结构

| 拦住的错误                       | 为什么必须在构建期拦                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| 不认识的字段（如 `amout`）       | 拼错键名会静默变 `undefined`，是 YAML 最危险的失败模式。会顺便猜你本来想写哪个        |
| `amount` 是字符串                | `1,600,000` / `1_600_000` / `"¥85000"` 都会被 YAML 当字符串。报错里直接给出该写成什么 |
| 顶层字段不对 / `assets` 不是列表 | 结构错了，后面的检查没有意义                                                          |
| 缺 `profile` 的某个字段          | 页头会渲染出 `undefined`                                                              |
| 配置文件不存在                   | 被 gitignore 了，新克隆必须 `cp` 一份。报错里直接给出那条 `cp` 命令                   |

**第二层：业务规则**（`lib/ledger.ts` 的 `collectLedgerProblems`）

| 拦住的错误            | 为什么必须在构建期拦                               |
| --------------------- | -------------------------------------------------- |
| 金额 ≤ 0 或不是有限数 | 负号会让「资产减负债」算成加法，页面看起来完全正常 |
| 同一侧里名字重复      | 「总共多少」变得无法核对，React key 也会冲突       |
| 名字是空字符串        | 名字会直接显示在页面上                             |
| 资产一条都没有        | 页面只剩一个 ¥0 和空列表，几乎肯定是误操作         |

**负债为空是允许的**（无债一身轻），页面显示空态而不是报错。

两层是分开报的：形状不对时数据还不是 `Entry[]` 的样子，跑规则检查会给出误导性结果。
所以先把形状问题全报完，改对了才会看到规则问题。**每一层内部都是一次报全**，
不会让你改一个跑一次。

这是刻意设计的失败：**宁可构建报错，也不要发布一个数字悄悄错掉的资产页。**

## 2. Git commit message 格式

首行：`[改动类型](改动核心模块): 细节描述`

**改动类型**（常用）：`feat` `fix` `perf` `chore` `test` `refactor` `docs` `style` `build` `revert`

**核心模块**（对应本仓库实际目录）：

| 模块       | 对应位置                                                          | 职责                               |
| ---------- | ----------------------------------------------------------------- | ---------------------------------- |
| `config`   | `config/assets.example.yaml`、`lib/config.ts`                     | 模板、YAML 读取与字段校验          |
| `data`     | `lib/ledger.ts`                                                   | 类型、汇总计算、排序、业务规则体检 |
| `format`   | `lib/format.ts`                                                   | 人民币格式化与百分比               |
| `charts`   | `components/ranking-list.tsx`、`app/globals.css`                  | 条形榜与两极色                     |
| `sections` | `components/net-worth-panel.tsx`、`site-*.tsx`                    | 页面各区块                         |
| `ui`       | `components/ui/`、`app/globals.css`                               | 卡片、占比条、主题 token           |
| `theme`    | `components/theme-provider.tsx`、`theme-toggle.tsx`、`hooks/`     | 明暗切换                           |
| `page`     | `app/page.tsx`、`app/layout.tsx`、`app/robots.ts`、`app/icon.svg` | 页面组装与元信息                   |
| `build`    | `package.json`、`eslint.config.mjs`、`.prettierrc.json`           | 工具链配置                         |

**规则**：

- 首行简洁，说清楚「改了什么、为什么」
- 单次改动内容较多时，首行之后空一行，用「- 」短横线分点列出

示例：

```
[feat](charts): 资产明细改用横向条形榜

- 条目从分类+二级条目改为平铺，一个名字对一个金额
- 整榜单色，长度按占合计比例；不给每条配不同颜色，避免重复编码
- 排序按金额降序，长度与大小同序，便于直接比较
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
- 自定义的 utility（`.panel`、`.tech-glow`、`.tech-grid`）不是 Tailwind 类，
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
为它搭测试框架的收益低于维护成本。**类型系统 + 构建期配置校验承担了测试的职责**：
`pnpm build` 会拦住字段拼错、非法金额、重名等大多数真实错误 ——
只是校验从编译期挪到了构建期（配置是 YAML，编译期管不到它）。

**因此下列行为没有自动化覆盖，改动相关代码后必须人工验证**：

| 行为               | 验证方式                                                    |
| ------------------ | ----------------------------------------------------------- |
| 明暗两套配色       | 切换右上角三个按钮，两种模式下都确认文字对比度正常          |
| 极窄视口无横向滚动 | 320 / 360 / 390 / 414 宽度下 `window.scrollX` 必须恒为 0    |
| 无 JS 可用性       | 禁用 JS：所有数字、条长、占比都应照常显示                   |
| 汇总数字正确       | 手算 `净资产 = 总资产 − 总负债`，与页面上的 hero 数字对一遍 |
| 排序正确           | 资产/负债两侧都应严格按金额降序                             |
| 占比之和           | 每侧各项百分比加起来应约等于 100%（因四舍五入可能偏 0.1%）  |

### 截图验证的坑（本机做不了）

本机环境**既没有中文字体也没有浏览器**（`fc-list :lang=zh` 返回 0 条，
没有 chromium / playwright）。所以：

- 无头浏览器截中文页会满屏豆腐块 —— 这不代表页面有问题，真机有系统字体兜底
- **本仓库当前的验证手段是检查构建产物**：

```bash
pnpm build && pnpm start -p 3111 &
curl -sS http://localhost:3111/ -o /tmp/page.html
# 数字对不对（应按金额降序出现）
grep -oE '¥[0-9,]+' /tmp/page.html | uniq
# 条长应为「该项 ÷ 该侧合计」的百分比，最长的一条即为最大项
grep -oE 'width:[0-9.]+%' /tmp/page.html
```

注意页面 HTML 里汇总数字会出现多次 —— 一次在 `<body>`，其余在 Next 内联的
RSC flight 数据里。这不是重复渲染。

## 5. 图表与配色规矩（改颜色前必读）

配色是**算出来的，不是挑出来的**。改之前先跑验证器，不要凭眼睛判断。

### 条形榜的四条规矩

1. **整榜单色。** 给每个条配不同颜色，属于用颜色把「长度」这个信息重新编码一遍，
   白白烧掉唯一的身份通道。资产侧全部用 `--asset`，负债侧全部用 `--debt`。
   **不要改成按金额深浅渐变** —— 那是同一个错误换了个形式。
2. **条长 = 该项占该侧合计的比例。** 两侧各自用自己的合计作分母。
   所有条左端对齐、右端按比例，长度之间才可直接比较。
3. **按金额降序排列。** 这是条形榜存在的意义。不要"保持配置顺序" ——
   那样读者得自己一项项比。排序只改行的先后，整榜单色所以不存在
   「换个条件颜色就跟着变」的误导。
4. **名字超长就截断，金额永远不能被裁掉。** 名字截断了还能猜，金额截断了就是错的。
   所以名字是 `truncate` + 固定宽度，金额是 `shrink-0`。

### 两极色（绿 / 红）

`--asset`（绿）和 `--debt`（红）是一对**极性**色 —— 净值的一正一负两侧。
绿红是财务语境里最直觉的一对，但它同时是**红绿色盲最经典的混淆对**，
所以这四个色值是**一条条搜出来的，不是挑出来的**：

| 模式 | `--asset` | `--debt`  | 色盲模拟 ΔE  | 正常视觉 ΔE |
| ---- | --------- | --------- | ------------ | ----------- |
| 浅色 | `#078a07` | `#e34948` | 8.5 (deutan) | 32.9        |
| 暗色 | `#0d940d` | `#e06a6a` | 9.6 (protan) | 32.3        |

四项检查（明度带 / 色度下限 / 对比度 / 色盲可分辨性）在两种模式下**全部 PASS**。
搜的方法是：固定一侧、扫另一侧的候选，逐组合跑验证器取最优。

想调色就照这个流程来，**不要凭眼睛改**：

```bash
cd <dataviz skill>/scripts
for g in "#0ca30c" "#0d940d" "#008300"; do for r in "#e66767" "#e06a6a" "#e34948"; do
  node validate_palette.js "$g,$r" --mode dark --surface "#0e131c" | grep -E "\[|→"
done; done
```

两个坑：

- **暗色的明度带上限是 0.67**，比浅色紧。浅色行得通的亮红（如 `#f0706f`，L 0.714）
  在暗色直接 FAIL，别照搬。
- **绿红的两极色只在「两色不同时出现在一个比较里」时成立。** 本页的绿条和红条
  分处两个面板、各有标题、各有合计 —— 读者从不需要靠颜色分辨哪个是资产。
  如果哪天改版把两者放进同一个图里（比如加一个「资产 vs 负债」的对比图），
  这个配色就不成立了，得回去用蓝红之类色相更远的一对。

### 状态色的用法

`--status-good/warning/serious/critical` 是**状态色**，只在负债率仪表上用。
它们和两极色的区别是：状态色表达「健康与否」，两极色表达「这是资产还是负债」。

- **固定不随主题变**，所以只在 `:root` 声明一次，不在两个暗色块里
- **必须配文字标签一起出现**（负债率旁边永远有「稳健 / 适中 / 偏高 / 高」）。
  浅色模式下 warning / serious 对比度低于 3:1，这是刻意的 ——
  补偿通道就是那个文字标签，颜色从不单独表意

### 通用

- **文字永远不穿数据色。** 数值、标签一律用文字 token（primary / secondary / faint），
  身份由旁边的色块承担。
- **全页只有一个 hero 数字**（净资产，≥48px）。大号独立数字用**比例字形**，
  只有需要纵向对齐的列（明细行、表格）才加 `tabular-nums` ——
  等宽数字会让大号数字看起来松垮。

## 6. 本仓库的坑（改动前务必先读）

这些都是实际踩过的，**不要「顺手改回去」**：

- **不要引入图表库。** 现在是纯 CSS 的条形（`ShareBar` 里两个 div 一宽一窄），
  服务端组件直接渲染，页面运行时零图表 JS。引 recharts / chart.js 会带进
  `"use client"`，一个纯展示页面凭空多出几百 KB 客户端 JS。
- **不要用 shadcn 的 `Card` / `Table` / `Separator`。** 这几个组件带 `"use client"`，
  用在纯静态卡片上会白白把整块推进客户端包。`components/ui/` 里的组件都是手写的、
  没有 `"use client"`，是给这种静态展示用的。
- **`useEffect` 里同步 setState 会被 lint 拦下。** `react-hooks/set-state-in-effect`
  会报 error。要写「是否已挂载」这类判断，用 `hooks/use-is-hydrated.ts`
  的 `useIsHydrated()`（基于 `useSyncExternalStore`），不要写
  `useState(false) + useEffect(() => setMounted(true))` 那套老写法。
- **`<title>` 里不要混文本和表达式。** JSX 会把它们变成数组，React 会警告
  「children 不是单个字符串」。用模板字符串：`<title>{\`${a}：${b}\`}</title>`。
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
- **条形榜在窄屏折成两行，是算过的。** 宽屏一行（名字 | 条 | 占比 | 金额），
  窄屏折成「名字 + 金额 / 条 + 占比」。理由还是长度：320px 卡片内宽 248px，
  一行排下来（名字列 + 金额 `¥1,600,000` + 间距）条形只剩 30 多像素，
  最大项和最小项的条会缩成差不多宽，条形就白画了。
  这是用 `flex-wrap` + `order-*` 做的，**不是两套 DOM** —— 不要为了「简单」
  改成写两遍再各自 `hidden`，那样两份结构迟早会不一致。
- **`CLAUDE.md` 是指向 `AGENTS.md` 的软链接，不要改成实体文件。**
  `next dev` 会检查 AGENTS.md 里有没有 `nextjs-agent-rules` 块：有就只 upsert
  AGENTS.md、跳过 CLAUDE.md，软链接不会被动。**如果删掉 AGENTS.md 末尾那个块，
  Next 会转而把块写进 CLAUDE.md，把软链接覆盖成实体文件。**
- **依赖安装走镜像。** `.npmrc` 指向 `registry.npmmirror.com`（官方源实测约 11 MB/s，
  镜像是它两倍多）。注意 `create-next-app` 会拒绝在含 `.npmrc` 的目录里脚手架。
- **`pnpm <script>` 偶尔会解析失败**（报 `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL`），
  加 `run` 就好：`pnpm run format`。写脚本时用 `pnpm run` 更稳。
- **构建期体检不要在 `next.config.ts` 里做，要在 `lib/config.ts` 里做。**
  那样任何入口（build / dev / 单独的 node 脚本）只要读到配置就会触发，
  放在 next.config 里只有构建才跑得到。
- **`getLedgerConfig()` 的 mtime 缓存是 dev 体验的必需品，不要「优化」掉。**
  YAML 是用 `fs` 读的，**不在 Turbopack 的模块图里** —— 改它不会触发重编译。
  早先的写法是在模块加载时读一次并缓存成常量，结果是改完配置刷新页面看到的
  还是旧数字，必须重启 dev server 才生效。那种「改了没反应」极容易被误判成
  代码有 bug，所以现在每次渲染都 `stat` 一下，只有 mtime 变了才重新解析。
  改成 `export const ledgerConfig = loadLedgerConfig()` 会把这个坑带回来。
- **`config/assets.yaml` 必须留在 `.gitignore` 里。** 里面是真实的个人财务数据。
  仓库里提交的是 `config/assets.example.yaml`。代价是从仓库部署时构建机会读不到它 ——
  部署方式见 README 的「部署」一节。删掉这条 ignore 之前先想清楚这一点。
- **YAML 有几个会静默出错的写法**，这也是 `lib/config.ts` 那层校验存在的理由：
  `1,600,000` 和 `1_600_000` 都会被解析成**字符串**（下划线是 JS 的写法，YAML 不认）；
  值里的半角冒号会让整份文件解析失败（`name: 招商银行: 活期` 要加引号）；
  拼错的键名（`amout:`）不会有任何提示。加新字段时，校验里的
  `ENTRY_KEYS` / `PROFILE_KEYS` 必须同步加，否则合法字段会被当成拼写错误拒掉。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
