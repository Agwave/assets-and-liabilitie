; NSIS 安装器钩子。
;
; 这里**只用 ASCII**，一个中文字都没有，是刻意的：NSIS 对含非 ASCII 的 .nsh
; 要求文件带 UTF-8 BOM，否则 makensis 会按 ANSI 读、中文全部乱码。而本机
; 跑不了 makensis，验证不了 BOM 到底有没有生效。备份文件夹的名字是给人看的，
; 用英文零风险，把中文说明留给文档就够了。
;
; 这个文件在 tauri.conf.json 的 bundle.windows.nsis.installerHooks 里被引用。

; ─────────────────────────────────────────────────────────────────────
; 卸载前把配置文件备份出去。
;
; 为什么需要：配置文件就放在安装目录里（见 src/main.rs 的 config_dir），
; 而卸载器会整个删掉 $INSTDIR —— 不备份的话，用户卸个软件就把自己的
; 资产数据一起删了，而且没有任何提示。
;
; 升级时 Tauri 也可能先跑一遍卸载流程，所以这个钩子对升级同样有意义。
; ─────────────────────────────────────────────────────────────────────
!macro NSIS_HOOK_PREUNINSTALL
  IfFileExists "$INSTDIR\assets.yaml" 0 assets_ledger_backup_done
    CreateDirectory "$DOCUMENTS\AssetsLedger-backup"
    CopyFiles /SILENT "$INSTDIR\assets.yaml" "$DOCUMENTS\AssetsLedger-backup\assets.yaml"
    DetailPrint "Backed up assets.yaml to $DOCUMENTS\AssetsLedger-backup"
    ; 静默卸载（/S）下不要弹窗，否则会卡住自动化流程
    IfSilent assets_ledger_backup_done
    MessageBox MB_OK|MB_ICONINFORMATION "Your data file has been backed up to:$\n$\n$DOCUMENTS\AssetsLedger-backup\assets.yaml$\n$\nCopy it back next to the app if you reinstall."
  assets_ledger_backup_done:
!macroend
