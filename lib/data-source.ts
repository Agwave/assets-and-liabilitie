/**
 * 数据源抽象。**这是桌面端和网页端唯一不同的地方。**
 *
 *   桌面（Tauri）→ invoke 让 Rust 去读本地文件
 *   网页         → fetch 构建期同步到 public/ 里的那份
 *
 * 上层（`components/ledger-app.tsx`）拿到的一律是一段 YAML 文本，
 * 后面解析、校验、渲染的路径完全一致。
 */

/** Tauri 侧 `read_ledger` 失败时返回的结构（见 src-tauri/src/main.rs 的 LedgerError）。 */
type DesktopError =
  | { readonly kind: "missing"; readonly path: string }
  | { readonly kind: "io"; readonly message: string };

export type LoadOutcome =
  | {
      readonly ok: true;
      readonly yaml: string;
      /** 配置文件在磁盘上的路径。网页端没有 */
      readonly path: string | null;
      /**
       * 内容和示例模板一字不差 —— 说明用户还没填过自己的数据。
       * 首启创建出来的就是模板，里面是「自住房 ¥1,600,000」这种示例数字，
       * 不标出来的话用户会以为那就是自己的账。
       */
      readonly isTemplate: boolean;
    }
  | {
      readonly ok: false;
      /** missing = 还没建配置文件（桌面端首启）；unavailable = 这个环境根本没有数据源 */
      readonly kind: "missing" | "unavailable";
      readonly message: string;
      readonly path: string | null;
    };

/** 由 scripts/web-data.mjs 生成，含 YAML 文本和模板标记 */
const WEB_DATA_FILE = "ledger.json";

/**
 * 当前是不是跑在 Tauri 窗口里。
 *
 * Tauri v2 会往 webview 注入 `__TAURI_INTERNALS__`，用它判断最省事，
 * 也免得为了一个判断把 `@tauri-apps/api` 静态 import 进来、拖进网页端的包。
 */
export function isDesktop(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function loadFromDesktop(): Promise<LoadOutcome> {
  // 动态 import：网页端用不到这个包，静态引入会白白打进生产包
  const { invoke } = await import("@tauri-apps/api/core");

  try {
    const file = await invoke<{ yaml: string; path: string; isTemplate: boolean }>("read_ledger");
    return {
      ok: true,
      yaml: file.yaml,
      path: file.path,
      isTemplate: file.isTemplate,
    };
  } catch (error) {
    const detail = error as DesktopError;
    if (detail?.kind === "missing") {
      return { ok: false, kind: "missing", message: "还没有配置文件。", path: detail.path };
    }
    return {
      ok: false,
      kind: "unavailable",
      message: detail?.kind === "io" ? detail.message : `读取配置文件失败：${String(error)}`,
      path: null,
    };
  }
}

async function loadFromWeb(): Promise<LoadOutcome> {
  try {
    // 带上时间戳并且 no-store：本地预览时改完配置要立刻看到新数字
    const response = await fetch(`${WEB_DATA_FILE}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) {
      return {
        ok: false,
        kind: "unavailable",
        message:
          response.status === 404
            ? "网页版没有打包数据文件。构建前需要先有 config/assets.yaml。"
            : `读取数据失败（HTTP ${response.status}）。`,
        path: null,
      };
    }
    const payload = (await response.json()) as { yaml: string; isTemplate?: boolean };
    return { ok: true, yaml: payload.yaml, path: null, isTemplate: payload.isTemplate === true };
  } catch (error) {
    return {
      ok: false,
      kind: "unavailable",
      message: `读取数据失败：${error instanceof Error ? error.message : String(error)}`,
      path: null,
    };
  }
}

/** 按当前环境取账本 YAML。 */
export async function loadLedgerSource(): Promise<LoadOutcome> {
  return isDesktop() ? loadFromDesktop() : loadFromWeb();
}

/** 桌面端首启：用内置模板建一份配置文件，返回它的路径。网页端调不通。 */
export async function createConfigFromTemplate(): Promise<string> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<string>("create_config_from_template");
}

/** 桌面端：用系统文件管理器打开配置文件所在目录。 */
export async function openConfigFolder(): Promise<void> {
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("open_config_folder");
}
