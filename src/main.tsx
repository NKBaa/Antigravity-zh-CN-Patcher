import React from "react";
import ReactDOM from "react-dom/client";
import App from './App';
import './i18n'; // Import i18n config
import "./App.css";

import { isTauri } from "./utils/env";
// 启动时显式调用 Rust 命令显示窗口；开机静默启动时保持隐藏。
if (isTauri()) {
  import("@tauri-apps/api/core").then(({ invoke }) => {
    invoke<boolean>("should_start_minimized")
      .catch(() => false)
      .then((minimized) => {
        if (!minimized) return invoke("show_main_window");
        return undefined;
      })
      .catch(console.error);
  });
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />

  </React.StrictMode>,
);
