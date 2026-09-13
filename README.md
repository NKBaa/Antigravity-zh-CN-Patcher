# Antigravity Patcher

Antigravity Patcher 是一个 Windows/macOS 桌面工具，用于管理 Antigravity 的界面汉化和独立代理。

本项目当前版本为轻量化 Patcher，界面参考 [Antigravity-Manager](https://github.com/lbjlaq/Antigravity-Manager)，仅借鉴其整体视觉语言与导航布局，不包含原项目的完整功能集合。

## 功能

- 自动扫描 Antigravity App / IDE 安装位置
- 一键应用汉化或恢复原版
- 为桌面端或 `agy` CLI 保存独立代理配置
- 静默启动目标程序，不弹出黑色命令行窗口
- 开机自启、静默启动、关闭后最小化
- 在应用内检查、下载并安装更新

## 与以前版本的区别

- 从原来的综合管理工具改为只处理 Antigravity 的汉化和独立代理。
- 移除账户、配额、API 代理池、监控、安全管理、Docker/脚本部署以及 MiniView 等无关模块。
- 保留并简化为自动扫描安装路径、应用/取消汉化、App/CLI 进程级代理、启动/重启目标和托盘控制。
- 代理配置（协议、IP、端口、认证、代理目录及开关）本地持久化保存，仅在目标程序运行时生效，不修改系统全局代理。
- 启动目标使用隐藏窗口方式执行，避免弹出黑色命令行窗口；支持开机自启、静默启动、关闭后最小化和应用内更新。

## UI 参考

UI 参考项目：[lbjlaq/Antigravity-Manager](https://github.com/lbjlaq/Antigravity-Manager)。本项目只复用其视觉方向，功能和代码结构已按 Patcher 的最小需求重新整理。

## 开发

```powershell
npm install
npm run dev
```

构建前端：

```powershell
npm run build
```

构建桌面安装包需要 Tauri、Rust、Visual Studio C++ 工具链和 CMake：

```powershell
npm run tauri build
```

## 目录说明

- `src/`：Patcher 界面和本地化资源
- `src-tauri/src/commands/localization.rs`：汉化、代理保存和目标启动命令
- `src-tauri/src/modules/`：代理服务和系统集成底层代码
- `src-tauri/icons/`：Antigravity 官方图标资源

## 许可

详见 [LICENSE](LICENSE)。
