# 🚀 Antigravity Patcher

**Antigravity Patcher** 是面向 Antigravity App / IDE / CLI 的轻量桌面工具：一处完成汉化、独立代理、目标启动和更新管理。🛠️

项目从早期的“只执行汉化的脚本工具”重写为 **Tauri + React + Rust** 桌面应用，保持操作简单、流量链路短、配置本地保存，并且全程不弹黑色命令行窗口。✨

当前版本：[v2.1.3](https://github.com/NKBaa/Antigravity-zh-CN-Patcher/releases/tag/v2.1.3) 📦

## ✨ 核心功能

- 🔎 自动扫描 Antigravity App / IDE 安装位置
- 🌐 一键应用汉化或恢复原版
- 🧩 为桌面端或 `agy` CLI 保存独立代理配置
- 🎯 代理只注入选定目标进程，不修改系统全局代理
- 🚀 启动、重启目标程序，支持托盘右键操作
- 🤫 静默启动，不弹出黑色命令行窗口
- ⚙️ 开机自启、静默启动、关闭后最小化
- 💾 代理 IP、端口、协议、账号密码和目录持久化保存
- 🛡️ 升级或卸载默认保留配置与代理数据
- 🔄 应用内检查、下载并安装更新，更新后自动清理安装包

## 🆚 与之前“仅汉化”版本的区别

| 对比项 | 之前的仅汉化版本 | 当前 Antigravity Patcher |
| --- | --- | --- |
| 使用方式 | 手动运行 `.py` / `.exe` | 🖥️ 图形化桌面界面 |
| 汉化操作 | 执行脚本 | ✅ 应用汉化 / 取消汉化按钮 |
| 安装路径 | 手动填写或固定路径 | 🔎 自动扫描 App / IDE |
| 代理能力 | 无 | 🌐 App / CLI 独立代理 |
| 代理范围 | 不适用 | 🎯 仅目标进程生效，不改系统代理 |
| 代理配置 | 不保存或分散 | 💾 IP、端口、协议、认证、目录持久化 |
| 启动控制 | 手动启动目标 | 🚀 启动、重启、托盘右键操作 |
| 后台体验 | 可能出现黑框 | 🤫 隐藏控制台、静默启动、关闭后最小化 |
| 更新方式 | 手动下载替换 | 🔄 应用内检查、安装并清理安装包 |

## 🎨 UI 参考

UI 参考项目：[lbjlaq/Antigravity-Manager](https://github.com/lbjlaq/Antigravity-Manager)。本项目仅参考其整体视觉语言、导航布局和深色界面方向，功能与代码结构均已围绕 Patcher 重新设计，不依赖原项目的管理功能。🎯

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
