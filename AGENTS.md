# AGENTS.md — 本仓库对 AI 助手的工作要求

这是一个**只读展示**的个人资产负债表，有两个形态：

| 形态                          | 怎么跑                | 数据从哪来                                     |
| ----------------------------- | --------------------- | ---------------------------------------------- |
| **Windows 桌面应用**（Tauri） | 双击图标              | 运行期读 `%APPDATA%\assets-ledger\assets.yaml` |
| **网页**                      | `pnpm dev` 或静态托管 | 运行期 `fetch` 构建时同步出来的副本            |

两个形态共用同一套前端。**核心约束：构建产物里不含任何数字。** 数据一律运行期读，
所以 CI 构建时接触不到你的资产，改一次数据也不需要重新打包。

结构是**平铺**的：`assets` 和 `liabilities` 两个列表，每条 = 一个名字 + 一个金额。
没有二级分类。

## 1. 每次改完代码，必须依次完成以下检查（禁止跳过）

```bash
pnpm format:check   # 1. Prettier，必须 0 处不一致
pnpm lint           # 2. ESLint，必须 0 error
pnpm build          # 3. 类型检查 + 静态导出
```

一条命令跑前两项：`pnpm check`（**不含 build**，别拿它当完整校验）。

- `pnpm format:check` 报出来的差异一律用 `pnpm format` 修，**不要手工去对齐** ——
  类名顺序由 `prettier-plugin-tailwindcss` 决定，手排的会被重排回去。
- `pnpm lint` 必须修到 **0 error**。想加 `eslint-disable` 前先确认那是不是真问题。
- **`pnpm build` 不检查配置。** 配置是运行期读的，构建时根本没有数据 ——
  这是刻意的（见开头）。所以「配置写错了」不会再让构建失败，
  而是让应用里显示一个错误页。

**改完前端之后，本机能验到哪一步**：

```bash
pnpm dev            # 网页形态，走 fetch 数据源，能看到真实数据与各种错误态
pnpm build          # 静态导出，产物不含数据
node --import ./register.mjs ...   # 想单测校验逻辑见第 4 节
```

**桌面形态本机验不了** —— 这台机器是 WSL，没有 Rust 工具链也没有 Windows。
那边只能靠 GitHub Actions 构建，所以改动 `src-tauri/` 后**必须特别小心**，
见第 6 节的坑。

## 2. Git commit message 格式

首行：`[改动类型](改动核心模块): 细节描述`

**改动类型**（常用）：`feat` `fix` `perf` `chore` `test` `refactor` `docs` `style` `build` `revert`

**核心模块**（对应本仓库实际目录）：

| 模块       | 对应位置                                              | 职责                                 |
| ---------- | ----------------------------------------------------- | ------------------------------------ |
| `data`     | `lib/ledger.ts`、`lib/parse-ledger.ts`                | 类型、汇总、排序、形状校验与业务规则 |
| `source`   | `lib/data-source.ts`、`scripts/web-data.mjs`          | 数据源抽象与网页数据同步             |
| `desktop`  | `src-tauri/`、`.github/workflows/`                    | Tauri 外壳、Rust 命令、Windows 打包  |
| `views`    | `components/ledger-app.tsx`、`status-panel.tsx`       | 客户端编排与各种状态界面             |
| `charts`   | `components/ranking-list.tsx`、`app/globals.css`      | 条形榜与两极色                       |
| `sections` | `components/net-worth-panel.tsx`、`site-*.tsx`、`ui/` | 页面各区块                           |
| `config`   | `config/assets.example.yaml`、`config/site.ts`        | 数据模板、站点身份                   |
| `build`    | `package.json`、`next.config.ts`、`scripts/`          | 工具链与构建脚本                     |

**规则**：首行简洁说清楚「改了什么、为什么」；改动多时首行后空一行，用「- 」分点。

示例：

```
[feat](desktop): 首启自动创建配置文件并提示路径

- 配置读不到时返回 Missing 而不是报错，界面给出「创建配置文件」按钮
- 模板用 include_str! 直接引用 config/assets.example.yaml，不复制第二份
```

## 3. 格式化与静态检查（本仓库的分工）

| 工具         | 管什么                                              | 不管什么   |
| ------------ | --------------------------------------------------- | ---------- |
| **Prettier** | 排版：分号、引号、行宽、换行、Tailwind 类名顺序     | 代码对不对 |
| **ESLint**   | 正确性：React Hooks 规则、Next.js 规则、TS 可疑写法 | 排版       |

`.prettierrc.json` 的三个关键项：

- `tailwindStylesheet: "./app/globals.css"` —— **Tailwind v4 必须靠这个路径**
  才能读到本仓库自定义的 `@theme` token。改了 token 名，类名排序会跟着变。
- `tailwindFunctions: ["cn", "cva"]` —— 写在 `cn(...)` 里的类名**同样会被排序**，
  不要手工调 `cn()` 里的参数顺序。
- 自定义 utility（`.panel`、`.tech-glow`、`.tech-grid`）不是 Tailwind 类，
  排序插件不认识，会被排到标准类名之后 —— 这是预期行为。

**不要做**：手工对齐类名顺序、为过 lint 加 disable、在 `components/` 里写格式化逻辑。

## 4. 校验命令

| 目的                           | 命令                                           |
| ------------------------------ | ---------------------------------------------- |
| 排版 + lint + 类型（快速自检） | `pnpm check`                                   |
| 完整校验（含静态导出）         | `pnpm build`                                   |
| 开发服务器（网页形态）         | `pnpm dev`                                     |
| 预览导出产物                   | `pnpm build && pnpm serve`                     |
| 打 Windows 安装包              | `pnpm desktop:build`（需要 Rust，本机跑不了）  |
| 只跑 lint / 格式化 / 类型      | `pnpm lint` / `pnpm format` / `pnpm typecheck` |

### 测试校验逻辑

`lib/parse-ledger.ts` 是纯函数，可以用 Node 自带的类型剥离直接跑，不需要测试框架。
本机验证时的做法（在 `/tmp` 里建两个小文件，不污染仓库）：

```js
// register.mjs —— 让 Node 认识 `@/` 别名
import { register } from "node:module";
import { pathToFileURL } from "node:url";
register("./loader.mjs", pathToFileURL("./"));
// loader.mjs 里把 `@/x` 解析成 <仓库根>/x.ts
```

然后 `node --import ./register.mjs test.mjs`，在 test.mjs 里 `import { parseLedgerYaml }`。

**本仓库没有测试框架，这是刻意的。** 站点是纯静态展示，绝大部分逻辑是「把配置渲染成
HTML」。类型系统 + 运行期校验承担了测试的职责。

### 截图验证的坑（本机做不了）

本机**既没有中文字体也没有浏览器**（`fc-list :lang=zh` 返回 0 条，
没有 chromium / playwright）。无头浏览器截中文页会满屏豆腐块，这不代表页面有问题。

**本仓库当前的验证手段是检查产物和接口**：

```bash
pnpm build
# 首页外壳里不该有任何金额（数据是运行期取的）
grep -oE '¥[0-9,]+' out/index.html        # 应为空

# 桌面构建要额外确认数据副本被删掉了
node scripts/build-desktop.mjs
test ! -e out/ledger.json && echo "✓ 产物里没有数据副本"

# 网页形态下数据接口可用
pnpm dev &
curl -sS http://localhost:3000/ledger.json | head -c 200
```

> 写这类检查命令时**不要拿真实的条目名当例子** —— 那等于把「这人有哪些资产、哪笔是房贷」
> 写进仓库。用上面这种不依赖具体数据的判断（文件在不在、金额格式匹配不匹配）。

## 5. 数据流与校验分层

```
lib/data-source.ts          桌面 invoke / 网页 fetch，返回一段 YAML 文本
        ↓
lib/parse-ledger.ts         YAML 语法 + 字段形状（未知字段、类型、YAML 陷阱）
        ↓
lib/ledger.ts              业务规则（金额正负、重名、空表）+ summarize/sort
        ↓
components/ledger-app.tsx   状态机：loading / missing / template / problems / unavailable / ready
```

**两层校验分开报**：形状不对时数据还不是 `Entry[]` 的样子，跑业务规则会给出误导性结果。
所以先把形状问题报全，改对了才看得到规则问题。**每一层内部一次报全**，不让人改一个跑一次。

`lib/parse-ledger.ts` **返回结果而不是抛错** —— 它跑在应用里，错误得渲染成一个能读的
错误页，而不是把界面炸掉。（早期它跑在构建期，那时抛错是对的。）

**Rust 侧不解析 YAML。** 它只把文件读成字符串交给 JS。校验和汇总全部走上面那两层
TypeScript —— 在 Rust 里再实现一遍，两份实现迟早会不一致。

## 6. 本仓库的坑（改动前务必先读）

这些都是实际踩过的，**不要「顺手改回去」**：

### 桌面端特有的

- **构建产物里绝不能有数据。** 网页形态会在构建时把 `config/assets.yaml` 同步成
  `public/ledger.json`（网页端运行期要 fetch 它）。**桌面形态必须把它删掉** ——
  否则本地构建一次，你的真实资产就被打进安装包了。这件事由
  `scripts/build-desktop.mjs` 在 `tauri.conf.json` 的 `beforeBuildCommand` 里做。
  改了 `scripts/web-data.mjs` 里的输出路径，**记得同步改那边**（它现在是从
  `TARGET` 推算的，别再写死文件名）。
- **`include_str!` 的路径是相对源文件解析的，不是相对项目根。**
  `src-tauri/src/main.rs` 里写的是 `../../config/assets.example.yaml`。
  挪动那个文件或那个 rs 文件，构建会直接失败。
- **本机验不了 `src-tauri/` 的编译，但能验到「Rust 之前」那一段。**
  跑 `pnpm desktop:build`：它会找到 `tauri` 命令、读取并**严格校验**
  `tauri.conf.json`，然后停在 `cargo: No such file or directory`。
  停在这一句就说明配置是好的；停在别的地方就是真有问题。改动后**一定要跑一次**，
  别等 CI —— 下面两条就是靠这一步当场抓出来的。
- **`tauri.conf.json` 会 schema 校验，不能靠多加字段写注释。** JSON 没有注释语法，
  而 Tauri 用 schema 严格校验：多加一个 `"comment"` 键会直接报
  `Additional properties are not allowed`。要记决策就写进文档，别写进配置。
- **`@tauri-apps/cli` 和 `@tauri-apps/api` 是两个包，都要装。**
  前者是构建工具（提供 `tauri` 命令），后者是运行时库（提供 `invoke`）。
  只装后者的话 `pnpm desktop:build` 会报 `tauri: not found`。
- **CSP 现在是 `null`，这是有意的。** 应用只从本地自定义协议加载自己的资源，
  不加载远程内容，默认隔离够用；而加严格 CSP 需要把 Tauri IPC 的源写对，
  写错会在 Windows 上直接白屏 —— 那个环境本机测不了。要加的话先在目标平台验证过再上。
- **`productName` 是中文。** 它决定安装目录、开始菜单项和 exe 名，也决定
  NSIS 脚本里的字符串编码。这是 CI 上最可能出问题的一处，如果打包失败先怀疑它。

### 前端特有的

- **不要用构建期读文件那一套。** 早期版本在构建期读 `config/assets.yaml` 并渲染进
  HTML，那个模型已经被推翻了：数据必须运行期读，否则改一次数据就要重新打包应用。
  想加回「构建期烤数据」之前先想清楚这一点。
- **`isDesktop()` 不能在渲染期直接调。** 静态 HTML 是在 Node 里生成的，那时候
  `window` 上没有 Tauri 注入的东西 —— 直接调会让服务端和客户端首次渲染结果不一致，
  触发 hydration 报错。要用 `useIsHydrated()` 之后再看。
- **`output: "export"` 下路由处理器必须显式声明 `export const dynamic = "force-static"`。**
  `app/robots.ts` 里有这一行。少了它构建会直接报错。
- **静态导出产物不能双击 `file://` 打开**（资源是绝对路径），也跑不了 `next start`。
  本地预览用 `pnpm serve`。
- **`useEffect` 里同步 setState 会被 lint 拦下**（`react-hooks/set-state-in-effect`）。
  取数据的写法是：await 之后再 setState，见 `components/ledger-app.tsx` 里的 effect。
- **不要用 shadcn 的 `Card` / `Table` / `Separator`。** 那几个组件带 `"use client"`，
  用在纯静态卡片上会白白推进客户端包。`components/ui/` 里的都是手写的。
- **`config/assets.yaml` 必须留在 `.gitignore` 里。** 里面是真实的个人财务数据。
  仓库里提交的是 `config/assets.example.yaml`。
- **「配置还是模板」这个判断不能省。** 首启创建的配置里是「自住房 ¥1,600,000」
  这种示例数字，**长得和真账一模一样**。桌面端在 Rust 里比对模板（`is_template`），
  网页端在同步数据时比对（`isTemplate`），两边都要保留 —— 少一边就会出现
  「刚装好打开，以为这些数字就是自己的」。

### 通用的（沿用的旧坑）

- **暗色 token 有两处声明，改配色时两块都要改**：一处在
  `@media (prefers-color-scheme: dark) { :root:where(:not(.light)) }`（兜住关掉 JS / 首屏
  未水合时跟随系统偏好），一处在 `.dark`。两处优先级相同，靠 `.light` 守卫 + 书写顺序
  决定胜负 —— **不要「优化」成一处**。
- **字体栈必须带 CJK 回退。** `system-ui` 在不少 Linux / 容器环境没有中文字形，
  删掉 `globals.css` 里 PingFang / 微软雅黑 / Noto CJK 那一串，中文页会全变豆腐块。
- **hero 数字的字号分三档是算过的。** 320px 视口下卡片内宽只有 240px，
  `¥1,550,700` 在 48px 下约 240.4px，正好溢出。不要改成固定 `text-5xl`。
- **条形榜在窄屏折成两行，也是算过的。** 一行排下来条形只剩 30 多像素，
  最大项和最小项会缩成差不多宽，条形就失去意义了。用 `flex-wrap` + `order-*` 做的，
  **不是两套 DOM**。
- **`CLAUDE.md` 是指向 `AGENTS.md` 的软链接，不要改成实体文件。**
  `next dev` 会检查 AGENTS.md 里有没有 `nextjs-agent-rules` 块。
- **`pnpm <script>` 偶尔会解析失败**（报 `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL`），
  加 `run` 就好。脚本里用 `pnpm run` 更稳。
- **本机 shell 是 zsh，不做未加引号变量的分词。** 写检查脚本时把参数写全。

## 7. 图表与配色规矩（改颜色前必读）

配色是**算出来的，不是挑出来的**。改之前先跑验证器，不要凭眼睛判断。

### 条形榜的四条规矩

1. **整榜单色。** 给每个条配不同颜色，属于用颜色把「长度」这个信息重新编码一遍，
   白白烧掉唯一的身份通道。资产侧全用 `--asset`，负债侧全用 `--debt`。
   **不要改成按金额深浅渐变** —— 那是同一个错误换了个形式。
2. **条长 = 该项占该侧合计的比例。** 两侧各自用自己的合计作分母，所有条左端对齐。
3. **按金额降序排列。** 这是条形榜存在的意义。排序只改行的先后，整榜单色，
   所以不存在「换个条件颜色就跟着变」的误导。
4. **名字超长就截断，金额永远不能被裁掉。** 名字截断了还能猜，金额截断了就是错的。

### 两极色（绿 / 红）

`--asset`（绿）和 `--debt`（红）是一对**极性**色。绿红同时是**红绿色盲最经典的混淆对**，
所以这四个色值是**一条条搜出来的**：

| 模式 | `--asset` | `--debt`  | 色盲模拟 ΔE  | 正常视觉 ΔE |
| ---- | --------- | --------- | ------------ | ----------- |
| 浅色 | `#078a07` | `#e34948` | 8.5 (deutan) | 32.9        |
| 暗色 | `#0d940d` | `#e06a6a` | 9.6 (protan) | 32.3        |

四项检查（明度带 / 色度下限 / 对比度 / 色盲可分辨性）在两种模式下**全部 PASS**。
改之前跑 dataviz skill 的 `scripts/validate_palette.js`：

```bash
node validate_palette.js "#0d940d,#e06a6a" --mode dark --surface "#0e131c"
```

两个坑：**暗色的明度带上限是 0.67**，比浅色紧（浅色好用的亮红 `#f0706f` 在暗色直接 FAIL）；
**绿红只在「两色不同时出现在一个比较里」时成立** —— 本页两条分处两个面板、各有标题和合计，
读者从不需要靠颜色分辨哪个是资产。哪天把两者放进同一个图里比较，这个配色就不成立了。

### 状态色的用法

`--status-good/warning/serious/critical` 只在负债率仪表上用，**固定不随主题变**
（所以只在 `:root` 声明一次），且**必须配文字标签**（「稳健 / 适中 / 偏高 / 高」）。
浅色下 warning / serious 对比度低于 3:1 是刻意的，补偿通道就是那个文字标签。

### 通用

- **文字永远不穿数据色。** 身份由旁边的色块承担。
- **全页只有一个 hero 数字**（净资产）。大号独立数字用**比例字形**，
  只有需要纵向对齐的列才加 `tabular-nums`。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
