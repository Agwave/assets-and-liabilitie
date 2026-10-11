# 个人资产负债看板

一个**只读**的个人资产 / 负债看板。数据来自一份本地 YAML —— 没有编辑入口、
没有数据库、没有账号、没有后端。

同时是 **Windows 桌面应用**和**网页**，共用同一套前端。

<!--
  截图放这里。把图片丢进 docs/screenshots/，然后取消下面的注释：

  | 深色 | 浅色 |
  | --- | --- |
  | ![深色](./docs/screenshots/dark.png) | ![浅色](./docs/screenshots/light.png) |
-->

## 这个项目里值得一提的几件事

**构建产物里不含任何数字。** 数据一律**运行期**读 —— 桌面端由 Rust 读本地文件、
网页端 fetch 一份同步副本。所以改一次数据不用重新打包应用，CI 构建时也根本
拿不到你的资产。

**8MB 的桌面应用。** 用 Tauri 而不是 Electron：Rust 编译成原生二进制，界面借
Windows 自带的 WebView2。Electron 会把整个 Chromium 塞进每个应用（150MB 起）。

**配色是算出来的，不是挑的。** 资产用绿、负债用红 —— 而绿红正是红绿色盲最经典的
混淆对。这四个色值是固定一侧、扫另一侧候选、逐组合跑验证器搜出来的：明度带 /
色度下限 / 对比度 / 色盲可分辨性四项检查，在明暗两种模式下全部通过。

**YAML 的静默陷阱全被拦住。** `1,600,000` 和 `1_600_000` 都会被 YAML 解析成
**字符串**；`amout:` 少打一个字母不报错，只会安静地变成 `undefined`。
这些在应用里会渲染成一张能读的错误页，指出是第几条、该怎么改。

**两种形态，一套代码。** 桌面和网页的差别只有一处 —— `lib/data-source.ts` 里
桌面走 `invoke`、网页走 `fetch`，其余全部共用。

**本机就能验证，不用等 CI。** 包括 Rust 那部分：`pnpm check:rust` 用 Windows
目标做类型检查，绕开了 Linux 缺 webkit2gtk 系统库的问题。

## 两种形态

| 形态                 | 怎么用                 | 数据在哪                     |
| -------------------- | ---------------------- | ---------------------------- |
| **Windows 桌面应用** | 双击图标               | **exe 旁边的** `assets.yaml` |
| **网页**             | `pnpm dev`，或静态托管 | `config/assets.yaml`         |

## 快速开始（网页形态）

```bash
pnpm install
cp config/assets.example.yaml config/assets.yaml   # 首次必须做
pnpm dev                                           # http://localhost:3000
```

改完 `config/assets.yaml` **刷新页面就行**，不用重启 dev server。

## 装成 Windows 桌面应用

本机不需要装任何工具链 —— 构建交给 GitHub Actions。

### 发一个版本（日常用这个）

```bash
git tag v0.1.0
git push origin v0.1.0
```

CI 会自动构建，并把安装包挂到 **Releases** 页：

```
https://github.com/Agwave/assets-and-liabilitie/releases
```

那里的安装包是**永久**的，点一下直接下 exe，不用解压 zip。以后发新版就把版本号往上加
（`v0.1.1`、`v0.2.0`…）。发版说明会从提交信息自动生成。

### 临时构建（改代码时调试用）

Actions 页面 → 「构建 Windows 安装包」→ **Run workflow**。产物挂在那次运行下面的
Artifacts 里，**保留 90 天**，下载是个 zip。

> 注意用 **Run workflow** 起一次新的运行，而不是在旧运行上点 **Re-run** ——
> 后者重跑的是**那一次对应的旧提交**，即使 main 已经往前走了。

### 你也可以用它

仓库里的代码是通用的，克隆下来换成自己的 `config/assets.yaml` 就行 ——
**里面没有我的任何数据**（`config/assets.yaml` 从来没进过 git，
而且有两道自动检查盯着，见下面「为什么它不在 git 里」）。

> **首次运行 Windows 会拦一次**，弹「Windows 已保护你的电脑」。
> 点「更多信息」→「仍要运行」。这是因为没有代码签名证书（一年几百到几千，
> 个人自用不值当）。

### 桌面应用的数据放哪

**就在 exe 旁边。** 默认装在 `%LOCALAPPDATA%\个人资产看板\`，装完那个文件夹里是：

```
个人资产看板\
├── 个人资产看板.exe      ← 程序
├── assets.yaml          ← 你的数据（第一次打开应用时创建）
└── uninstall.exe
```

第一次打开会提示还没有配置文件，点「创建配置文件」按模板建好，再点「打开配置文件夹」
就能找到它。用任意文本编辑器改，保存后在应用里点右上角「刷新」。

**不用重新打包应用** —— 数据是运行期读的。

> **卸载前会自动备份。** 配置文件在安装目录里，而卸载器会整个删掉那个目录 ——
> 不备份的话，卸个软件就把资产数据一起删了。所以卸载时会把 `assets.yaml` 复制到
> `文档\AssetsLedger-backup\` 并弹窗告诉你位置（静默卸载不弹窗）。
> 重新装回来之后，把它拷回 exe 旁边即可。

**建议自己再留一份。** 全部数据就在这一个文件里，拷一份到网盘或另一台机器是很便宜的保险。

### 为什么能放在安装目录里

因为安装模式固定为 `currentUser`（见 `src-tauri/tauri.conf.json` 的
`bundle.windows.nsis.installMode`）：程序装在 `%LOCALAPPDATA%` 下面，
**当前用户可写**，改配置不需要管理员权限。

**不要改成 `perMachine`。** 那样会装进 `Program Files`，普通权限改不了配置，
应用会一直显示「还没有配置文件」而创建又失败。`src-tauri/src/main.rs` 里
`config_dir()` 的注释也写了这一点。

## 改成你自己的数据

**`config/assets.yaml` 只放资产项和负债项**，顶层只有 `assets` 和 `liabilities` 两个键：

```yaml
assets:
  - name: 自住房
    amount: 1600000
    note: 按 2026-08 同小区成交价估值
  - name: 招商银行 · 活期
    amount: 85000

liabilities:
  - name: 住房商业贷款
    amount: 980000
    note: 年利率 3.1%，剩余 18 年
```

三条规矩：

1. **金额写正数**，单位是元。房贷写 `980000`，不是 `-980000` ——
   正负由它放在 `assets` 还是 `liabilities` 下面决定。
2. **金额不要带千分位逗号、下划线、引号或 ¥ 符号**，直接写 `1600000`。
   YAML 会把 `1,600,000` 和 `1_600_000` 当成**字符串**（下划线是 JS 的写法，YAML 不认）。
3. **同一侧里名字不能重复。**

顺序随便写，页面会按金额从大到小自己排。

### 写错了会怎样

不会静默出错。**字段名拼错、类型不对、金额带逗号，应用里会显示一个错误页**，
一次性把所有问题报全：

```
配置文件有 3 处问题

· 资产 第 2 条的 amount 是字符串 "1,600,000" —— YAML 里数字不能带千分位逗号、
  下划线或引号，它们会让整串变成字符串。去掉分隔符，写成 1600000。
· 资产 第 4 条有一个不认识的字段 `amout`，是不是想写 `amount`？
  可用的字段只有 name / amount / note。
```

改完保存，点右上角「刷新」。

### 标题这些在哪

页头标题、副标题、页脚备注是**固定信息，不随数据变**，在 `config/site.ts` 里。
想让看板换个名字就改那里。

> 页头曾经显示过「数据截至 …」。那个日期写死在代码里，**改 `assets.yaml` 不会动它**，
> 每期都得手动同步一次 —— 与其让人记着改，不如去掉。要加回来的话，
> 它更适合放在 `assets.yaml` 里跟着数据走，而不是在代码里。

### 为什么它不在 git 里

`config/assets.yaml` 被 `.gitignore` 排除了 —— 里面是你真实的资产数据。
仓库里提交的是模板 `config/assets.example.yaml`。

好处不只是「不进仓库」：因为 CI 拿不到这个文件，也**不可能**把它打进安装包。
（本地构建时它存在，所以构建脚本会额外把产物里的副本删掉，见 `scripts/build-desktop.mjs`。）

**而且这个仓库是公开的，所以有两道网盯着它别误提交：**

| 检查     | 位置                          | 挡住什么                               |
| -------- | ----------------------------- | -------------------------------------- |
| Git 钩子 | `.githooks/pre-commit`        | 本地提交时，暂存区里出现数据文件就拦下 |
| CI 检查  | `.github/workflows/guard.yml` | 兜住 `--no-verify` 和网页端提交        |

钩子靠 `core.hooksPath` 生效，`pnpm install` 会自动配好（见 `scripts/setup-hooks.mjs`）；
没生效的话跑一次 `node scripts/setup-hooks.mjs`。

> 两道网都只能查**路径**。把真实数字粘进 README 这类内容层面的漏，它们都管不了 ——
> 它们不该知道你的数据长什么样。所以自己提交前扫一眼仍然是最后的防线。

## 目录结构

```
config/assets.example.yaml  ← 数据模板，进 git
config/assets.yaml          ← 你的真实数据，被 gitignore
config/site.ts              ← 标题、副标题、页脚备注
lib/ledger.ts               ← 类型、汇总计算、排序、业务规则
lib/parse-ledger.ts         ← YAML 解析与字段校验（纯函数，桌面和网页共用）
lib/data-source.ts          ← 数据源抽象：桌面 invoke / 网页 fetch
components/ledger-app.tsx   ← 客户端编排与各种状态界面
components/ranking-list.tsx ← 条形榜
components/net-worth-panel.tsx ← 净资产 hero + 统计卡 + 负债率仪表
src-tauri/                  ← 桌面外壳（Rust）
scripts/                    ← 构建与数据同步脚本
```

## 命令

| 命令                 | 作用                                               |
| -------------------- | -------------------------------------------------- |
| `pnpm dev`           | 开发服务器（网页形态）                             |
| `pnpm build`         | 类型检查 + 静态导出到 `out/`                       |
| `pnpm serve`         | 预览 `out/`（先 `pnpm build`）                     |
| `pnpm check`         | 快速自检：排版 + lint + 类型                       |
| `pnpm format`        | Prettier 格式化（含 Tailwind 类名排序）            |
| `pnpm lint`          | ESLint                                             |
| `pnpm typecheck`     | 只查类型                                           |
| `pnpm check:rust`    | 检查 Rust 代码能不能编译（改 `src-tauri/` 后必跑） |
| `pnpm desktop:build` | 打 Windows 安装包（需要完整 Rust 工具链）          |

**本仓库没有测试框架，这是刻意的。** 类型系统 + 运行期校验承担了测试的职责。

## 设计上的几个决定

**数据运行期读，不烤进产物。** 早期版本在构建期把 YAML 渲染进 HTML，
结果是改一次数据就要重新打包一次应用 —— 那还不如用网页。现在产物里一个数字都没有。

**Rust 侧不解析 YAML。** 它只把文件读成字符串交给前端，校验和汇总全走 TypeScript。
在 Rust 里再实现一遍那套规则，两份实现迟早会不一致。

**条形榜而不是环形图，而且是单色的。** 条目是平铺的，有十几条 —— 环形图的扇区上限
在 6 个左右。给每个条配不同颜色，属于把「长度」这个信息用颜色再编码一遍，
白白烧掉唯一的身份通道。资产用绿、负债用红，是一对**极性**色，不是身份色。

**配色是算出来的，不是挑的。** 绿红正是红绿色盲最经典的混淆对，所以这四个色值是
一条条搜出来的 —— 在明度带、色度下限、对比度、色盲可分辨性四项约束下逐组合试到全部通过：

| 模式 | 资产      | 负债      | 色盲模拟 ΔE | 正常视觉 ΔE |
| ---- | --------- | --------- | ----------- | ----------- |
| 浅色 | `#078a07` | `#e34948` | 8.5         | 32.9        |
| 暗色 | `#0d940d` | `#e06a6a` | 9.6         | 32.3        |

换色前先跑 `dataviz` skill 里的 `scripts/validate_palette.js`，不要凭眼睛判断。

**页面默认不被搜索引擎收录。** `app/robots.ts` 和 `<meta name="robots">` 两道闸都上了。

## 已知限制

- **没有编辑功能。** 改数据要编辑 YAML 文件。`lib/data-source.ts` 那层抽象已经为
  加一个「写」的方法留好了位置。
- **没有多端同步。** 数据就在本地文件里。手机上要看的话得另外想办法
  （iCloud / OneDrive 同步那个文件是一种，但要注意云盘方能看到明文）。
- **只做了 Windows 打包。** Tauri 也支持 macOS / Linux，改 CI 的 runner 即可，
  但这次没做。
- **没有代码签名**，首次运行会被 SmartScreen 拦一次。

## 开发环境的一个坑

开发机是 WSL，**没有 Windows**，所以桌面形态的「装完能不能跑」只能靠 CI 加真机验证。

不过 Rust 代码本身是能在本机验的：`pnpm check:rust`。原理是把编译目标换成
Windows —— 那样 cargo 就不会去碰 Linux 上缺失的 webkit2gtk / dbus 系统库，
而这本来就是真正要编的目标。`tauri-build` 要的 `windres` 用一个空文件桩顶替，
因为 `cargo check` 只做类型检查、不链接，那个资源文件的内容用不到。

也踩过一些坑，都记在 [AGENTS.md](./AGENTS.md) 里了 —— Tauri 会严格校验
`tauri.conf.json`（连加个注释字段都不行）、ESLint 的 flat config 不读 `.gitignore`、
NSIS 对含非 ASCII 的脚本要求 UTF-8 BOM，等等。
