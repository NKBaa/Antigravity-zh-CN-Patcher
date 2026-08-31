# v2.11.0-patcher.1

基于 Antigravity 2.11.0 的增强汉化版本。

## 更新内容

- 补充模型配额、计划任务、项目设置、环境选择、分支选择等新版界面翻译。
- 增加代码内容保护，避免编辑器、Diff、终端和预格式化代码被翻译词典替换。
- 修复还原流程：新版 `app.asar` 与旧备份并存时保留新版，旧备份归档为 `.stale` 文件。
- 提供 Windows x64、macOS Intel 与 Apple Silicon 独立可执行文件，无需安装 Python。

## 下载

- `Windows-x64-exe.zip`：包含汉化工具和还原工具，推荐 Windows 用户下载。
- `macOS-arm64.zip`：适用于 Apple Silicon（M 系列芯片）。
- `macOS-x86_64.zip`：适用于 Intel 芯片。
- `Antigravity-Patcher.exe`：一键汉化工具。
- `Restore.exe`：纯净版还原工具。

## SHA-256

```text
Antigravity-Patcher.exe  108A34C0804B933151DE181A1874FE0912B2A729C6CC8BB7ECB3330B8EB026D2
Restore.exe              F8C206CCED9F8B8C61D9A60000CA78692C1D1998E321D119EBCCE9BCCBF42684
Windows-x64-exe.zip      1284B875E2A08F221FDA00E0D531B2E36484CA6AA7F19F0018D43AA189CEAB2F
macOS-arm64.zip          32C9754BAAF236C1E8937A0BF6A1A613E7C333A811958531E0674E472E285BAB
macOS-x86_64.zip         5B07ABFF7DA114739FF43C6FC0D9065CED2A142B4482447CC9E3BD8C80BC7A28
```

> Windows 可执行文件由 PyInstaller 构建，当前未进行数字签名，部分安全软件可能产生误报。
