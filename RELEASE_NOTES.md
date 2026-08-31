# v2.11.0-patcher.2

基于 Antigravity 2.11.0 的增强汉化版本。

## 更新内容

- 补充模型配额、计划任务、项目设置、环境选择、分支选择等新版界面翻译。
- 补充对话分组与筛选、项目内新建对话、前进/返回导航和刷新 MCP 服务器等界面翻译。
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
Antigravity-Patcher.exe  C414E1982E114F027AE994BD54052648EE758F6FAE7260F262B763F40D615D40
Restore.exe              D3AFF52FB746DE2B92486820FDDA067F6BEC06A4B782D990586AD1104D568F32
Windows-x64-exe.zip      88A7DE7E714333A24C28FE77AFE69CCCD42D636934E45B7BC1341F3D215CB216
```

> Windows 可执行文件由 PyInstaller 构建，当前未进行数字签名，部分安全软件可能产生误报。
