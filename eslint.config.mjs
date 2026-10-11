import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Rust 构建产物。ESLint 的 flat config **不读 .gitignore**，
    // 所以 .gitignore 里那条 `src-tauri/target/` 管不到这里 ——
    // 少了这两行，只要本机跑过一次 cargo，`pnpm lint` 就会被
    // target/ 里上千个生成文件刷屏报「Parsing error」。
    "src-tauri/target/**",
    "src-tauri/gen/**",
  ]),
]);

export default eslintConfig;
