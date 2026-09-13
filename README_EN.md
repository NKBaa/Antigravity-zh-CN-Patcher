# Antigravity Patcher

Antigravity Patcher is a desktop utility for Antigravity localization and standalone proxy configuration.

This is a lightweight Patcher build. Its visual language and navigation layout are inspired by [Antigravity-Manager](https://github.com/lbjlaq/Antigravity-Manager), while the original project's broader feature set is intentionally excluded.

## Features

- Detect the installed Antigravity App / IDE automatically
- Apply localization or restore the original files
- Save an isolated proxy for the desktop app or `agy` CLI
- Launch targets silently without a console window
- Configure startup launch, silent startup, and minimize-on-close
- Check, download, and install updates from the app

## Differences from Earlier Versions

- Reframed from a full management suite into a focused Antigravity localization and standalone-proxy utility.
- Removed account, quota, API proxy-pool, monitoring, security, Docker/deployment scripts, and MiniView modules.
- Retained and simplified automatic installation scanning, apply/restore localization, App/CLI process-level proxying, target launch/restart, and tray controls.
- Proxy protocol, host, port, credentials, proxy directory, and enabled state are persisted locally. Proxying is scoped to the target process and does not change the system proxy.
- Target processes launch without a visible console window. Startup launch, silent startup, minimize-on-close, and in-app updates remain available.

## UI Reference

Visual reference: [lbjlaq/Antigravity-Manager](https://github.com/lbjlaq/Antigravity-Manager). Only the visual direction is reused; the feature set and code structure have been reorganized for the Patcher's minimal scope.

## Development

```powershell
npm install
npm run dev
```

Build the frontend:

```powershell
npm run build
```

Building the desktop installer requires Tauri, Rust, the Visual Studio C++ toolchain, and CMake:

```powershell
npm run tauri build
```

## Layout

- `src/`: Patcher UI and localization resources
- `src-tauri/src/commands/localization.rs`: localization, proxy, and target-launch commands
- `src-tauri/src/modules/`: proxy service and system integration internals
- `src-tauri/icons/`: Antigravity icon assets

## License

See [LICENSE](LICENSE).
