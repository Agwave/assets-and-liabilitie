// Windows 发布版不弹控制台窗口（debug 版保留，方便看日志）
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;

/// 配置目录名。**用 ASCII 是有意的** —— 中文路径在命令行、日志和各种工具里
/// 都可能撞上编码问题，而用户是靠界面上的「打开配置文件夹」按钮找到它的，
/// 不需要靠名字认路。
const APP_DIR: &str = "assets-ledger";
const CONFIG_FILE: &str = "assets.yaml";

/// 首次启动时用的模板。
///
/// **直接引用仓库里那份，不复制第二份** —— 两份模板迟早会不一致。
/// 它是编译期嵌进二进制的（`include_str!`），所以运行时不需要这个文件在旁边，
/// 也就不必折腾 Tauri 的资源路径那一套。
const TEMPLATE: &str = include_str!("../../config/assets.example.yaml");

#[derive(Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
enum LedgerError {
    /// 还没有配置文件。带上路径 —— 前端要把它显示出来告诉用户去哪建。
    Missing { path: String },
    Io { message: String },
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LedgerFile {
    /// 原始 YAML 文本。**Rust 不解析它** —— 校验和汇总全部走前端的 TypeScript。
    /// 在这里再实现一遍那套规则，两份实现迟早会不一致。
    yaml: String,
    path: String,
    /// 内容与内置模板一字不差，说明用户还没填过自己的数据。
    /// 前端据此显示「先把示例换成你自己的」，而不是把模板数字当真数据展示。
    is_template: bool,
}

/// 备用位置：`%APPDATA%\assets-ledger\`（Windows）/ `~/.config/assets-ledger/`（其他平台）
fn appdata_dir() -> PathBuf {
    if let Ok(appdata) = std::env::var("APPDATA") {
        PathBuf::from(appdata).join(APP_DIR)
    } else if let Ok(home) = std::env::var("HOME") {
        PathBuf::from(home).join(".config").join(APP_DIR)
    } else {
        PathBuf::from(".").join(APP_DIR)
    }
}

/// 配置文件所在目录。
///
/// **发布版就放在 exe 旁边** —— 装完一个文件夹里既有程序又有配置，拷走整个文件夹就能用，
/// 用户也不用去别的目录找。
///
/// 能这么放的前提是安装模式为 `currentUser`（见 `tauri.conf.json` 的
/// `bundle.windows.nsis.installMode`）：那样程序装在 `%LOCALAPPDATA%` 下面，
/// **当前用户可写**，改配置不需要管理员权限。要是改成 `perMachine`（装进
/// Program Files），这里就写不进去了 —— 改那个配置项之前先想清楚这一点。
///
/// **调试版仍然用 `%APPDATA%`**：否则配置会被写进 `target/debug/`，
/// 一次 `cargo clean` 就没了，调试起来很别扭。
fn config_dir() -> PathBuf {
    if !cfg!(debug_assertions) {
        if let Some(dir) = std::env::current_exe()
            .ok()
            .and_then(|exe| exe.parent().map(Path::to_path_buf))
        {
            return dir;
        }
    }
    appdata_dir()
}

fn config_path() -> PathBuf {
    config_dir().join(CONFIG_FILE)
}

#[tauri::command]
fn read_ledger() -> Result<LedgerFile, LedgerError> {
    let path = config_path();
    let display = path.display().to_string();

    if !path.exists() {
        return Err(LedgerError::Missing { path: display });
    }

    let yaml = fs::read_to_string(&path).map_err(|error| LedgerError::Io {
        message: format!("读取 {display} 失败：{error}"),
    })?;

    Ok(LedgerFile {
        is_template: yaml.trim() == TEMPLATE.trim(),
        yaml,
        path: display,
    })
}

/// 用内置模板建一份配置文件。已经存在就什么都不做，直接返回路径。
#[tauri::command]
fn create_config_from_template() -> Result<String, LedgerError> {
    let path = config_path();

    if path.exists() {
        return Ok(path.display().to_string());
    }

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| LedgerError::Io {
            message: format!("创建目录 {} 失败：{error}", parent.display()),
        })?;
    }

    fs::write(&path, TEMPLATE).map_err(|error| LedgerError::Io {
        message: format!("写入 {} 失败：{error}", path.display()),
    })?;

    Ok(path.display().to_string())
}

/// 用系统文件管理器打开配置目录。目录不存在就先建出来（空目录也比报错好）。
#[tauri::command]
fn open_config_folder() -> Result<(), LedgerError> {
    let dir = config_dir();

    fs::create_dir_all(&dir).map_err(|error| LedgerError::Io {
        message: format!("创建目录 {} 失败：{error}", dir.display()),
    })?;

    let spawn_error = |error: std::io::Error| LedgerError::Io {
        message: format!("打开文件夹失败：{error}"),
    };

    #[cfg(target_os = "windows")]
    {
        // explorer 成功时也常返回非零退出码，这是它的老毛病 ——
        // 所以只看能不能启动，不检查 status。
        std::process::Command::new("explorer")
            .arg(&dir)
            .spawn()
            .map_err(spawn_error)?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&dir)
            .spawn()
            .map_err(spawn_error)?;
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        std::process::Command::new("xdg-open")
            .arg(&dir)
            .spawn()
            .map_err(spawn_error)?;
    }

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            read_ledger,
            create_config_from_template,
            open_config_folder
        ])
        .run(tauri::generate_context!())
        .expect("启动应用失败");
}
