/**
 * 本机验证 Rust 代码能不能编译 —— 不用等 CI。
 *
 * ## 为什么这么绕
 *
 * 直接 `cargo check` 会失败，但**不是因为我们的代码**：Tauri 在 Linux 上依赖
 * webkit2gtk / dbus 这些系统开发库，本机没装，也装不了（没有免密 sudo）。
 *
 * 绕法是把编译目标换成 **Windows**：那样 cargo 压根不会去碰 Linux 那套系统库，
 * 而这本来就是我们真正要编的目标。
 *
 * 换成 Windows 目标后还差一步：`tauri-build` 会调 `windres` 把图标编进 Windows
 * 资源文件，本机没有 mingw。但 **`cargo check` 只做类型检查、不链接**，
 * 那个 .res 的内容根本用不到 —— 所以这里造一个只建空文件的桩替掉它。
 *
 * 这个桩只影响本机检查，跟 CI 上真正打包用的 windres 没有任何关系。
 *
 * ## 它能验和不能验的
 *
 * 能验：语法、类型、借用检查、我们这份 main.rs 里所有的编译错误 ——
 *       已经靠它抓出过 `Path` 没导入、`@tauri-apps/cli` 没装这类问题。
 * 不能验：链接、Windows 资源嵌入、NSIS 打包、运行时行为。
 *
 * 用法：pnpm check:rust
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const TARGET = "x86_64-pc-windows-gnu";
const CARGO_BIN = path.join(os.homedir(), ".cargo", "bin");
const STUB_DIR = path.join(os.tmpdir(), "assets-ledger-rust-check");
const STUB_NAME = "x86_64-w64-mingw32-windres";

function fail(message) {
  console.error(`\n[check-rust] ${message}\n`);
  process.exit(1);
}

/** 找到 cargo；本机装的是 rustup 默认位置，也允许已经在 PATH 里 */
function findCargo() {
  const candidates = [path.join(CARGO_BIN, "cargo"), "cargo"];
  for (const candidate of candidates) {
    const probe = spawnSync(candidate, ["--version"], { stdio: "ignore", shell: false });
    if (probe.status === 0) return candidate;
  }
  return null;
}

const cargo = findCargo();
if (!cargo) {
  fail(
    "找不到 cargo。本机装一个 Rust 工具链即可（不影响 CI，CI 上会自己装）：\n" +
      "    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal\n",
  );
}

// 环境：把 cargo 目录和桩目录都放进 PATH
const env = {
  ...process.env,
  PATH: [STUB_DIR, CARGO_BIN, process.env.PATH].filter(Boolean).join(path.delimiter),
};

/** Windows 目标没装的话装上（约 30MB，一次性） */
const targets = spawnSync("rustup", ["target", "list"], { encoding: "utf8", env });
if (targets.status !== 0) fail("rustup 跑不起来，看看上面的输出。");
if (!(targets.stdout ?? "").includes(`${TARGET} (installed)`)) {
  console.log(`[check-rust] 正在安装目标 ${TARGET}（一次性，约 30MB）…`);
  const add = spawnSync("rustup", ["target", "add", TARGET], { stdio: "inherit", env });
  if (add.status !== 0) fail(`安装目标 ${TARGET} 失败。`);
}

const STUB_PATH = path.join(STUB_DIR, STUB_NAME);

/**
 * windres 桩。有真的 windres 就用真的，没有才造桩 ——
 * 这样在装了 mingw 的机器上这个脚本也会走正常路径。
 *
 * 判断"有没有真的"时**必须把桩目录排除在 PATH 之外**：桩对任何参数都返回 0，
 * 不排除的话第二次运行就会把自己的桩认成真的（踩过一次）。
 */
function ensureWindres() {
  const envWithoutStub = {
    ...env,
    PATH: [CARGO_BIN, process.env.PATH].filter(Boolean).join(path.delimiter),
  };
  const found = spawnSync("sh", ["-c", `command -v ${STUB_NAME} || true`], {
    encoding: "utf8",
    env: envWithoutStub,
  });
  const realPath = (found.stdout ?? "").trim();
  if (realPath && realPath !== STUB_PATH) return `用系统里的 windres（${realPath}）`;

  mkdirSync(STUB_DIR, { recursive: true });
  writeFileSync(
    STUB_PATH,
    [
      "#!/bin/sh",
      "# cargo check 不链接，资源文件内容用不到；按 -o 建个空文件让它继续就行",
      'out=""',
      'while [ $# -gt 0 ]; do case "$1" in -o) out="$2"; shift 2 ;; *) shift ;; esac; done',
      '[ -n "$out" ] && : > "$out"',
      "exit 0",
      "",
    ].join("\n"),
    { mode: 0o755 },
  );
  return "本机没有 mingw，用 windres 桩（cargo check 不链接，资源文件用不到）";
}

console.log(`[check-rust] 目标 ${TARGET}，${ensureWindres()}`);

const result = spawnSync(cargo, ["check", "--target", TARGET], {
  cwd: "src-tauri",
  stdio: "inherit",
  env,
});

if (result.status === 0) {
  console.log("\n[check-rust] ✓ Rust 编译通过\n");
} else {
  console.error("\n[check-rust] ✗ Rust 编译失败，看上面的报错\n");
}
process.exit(result.status ?? 1);
