# v2.11.0-patcher.4

基于 Antigravity 2.11.0 的增强汉化版本。

## 更新内容

- 补充模型配额、计划任务、项目设置、环境选择、分支选择等新版界面翻译。
- 补充对话分组与筛选、项目内新建对话、前进/返回导航和刷新 MCP 服务器等界面翻译。
- 补充置顶对话、安全预设、工作文件夹外访问策略、终端自动执行及高风险模式说明。
- 补充取消置顶、对话归档通知、归档恢复、后台任务输出与编辑对话标题等界面翻译。
- 增加代码内容保护，避免编辑器、Diff、终端和预格式化代码被翻译词典替换。
- 修复还原流程：新版 `app.asar` 与旧备份并存时保留新版，旧备份归档为 `.stale` 文件。
- 提供 Windows x64、macOS Intel 与 Apple Silicon 独立可执行文件，无需安装 Python。

## 下载

- `Windows-x64.zip`：适用于 64 位 Windows，内含汉化工具与还原工具。
- `macOS-arm64.zip`：适用于 Apple Silicon（M 系列芯片），内含汉化工具与还原工具。
- `macOS-x86_64.zip`：适用于 Intel 芯片，内含汉化工具与还原工具。

## SHA-256

```text
Antigravity-Patcher.exe  6C0F07F7FE7F2AF3507BC5C1B5B38839AF34B881F1644F1CC7058DC3B7B2841D
Restore.exe              0C1A6493728115AD14FD9FD45171DBA9C28B1A14C609F783882FFE580BDE9D80
Windows-x64.zip          3C471916E1717AED129A55E8ABD45C858ABD46139E135D4841C084CAFF544CCD
```

> Windows 可执行文件由 PyInstaller 构建，当前未进行数字签名，部分安全软件可能产生误报。
