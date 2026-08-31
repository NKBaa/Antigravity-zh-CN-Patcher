# v2.11.0-patcher.3

基于 Antigravity 2.11.0 的增强汉化版本。

## 更新内容

- 补充模型配额、计划任务、项目设置、环境选择、分支选择等新版界面翻译。
- 补充对话分组与筛选、项目内新建对话、前进/返回导航和刷新 MCP 服务器等界面翻译。
- 补充置顶对话、安全预设、工作文件夹外访问策略、终端自动执行及高风险模式说明。
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
Antigravity-Patcher.exe  4E35FC41A47E9BA9459E933FEC344A8DDF7608F4CE50BC70975D794E0CA082B1
Restore.exe              64A55D24441C94757CFA354BD7AF8169A83537E3DF0E9D4F600FCD636E39F36B
Windows-x64-exe.zip      0B9C06A85CC5D27B3F78AA8D130D30BF14F7C1F875F631F0DC53783D82E9F36D
```

> Windows 可执行文件由 PyInstaller 构建，当前未进行数字签名，部分安全软件可能产生误报。
