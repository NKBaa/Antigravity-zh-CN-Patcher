mod commands;
pub mod constants;
pub mod error;
#[cfg(target_os = "linux")]
mod linux_graphics;
mod models;
mod modules;
mod proxy; // Proxy service module
mod utils;

use modules::logger;
use std::sync::Arc;
use tauri::Manager;
use tracing::{error, info, warn};

#[derive(Clone, Copy)]
struct AppRuntimeFlags {
    tray_enabled: bool,
}

fn env_flag_enabled(name: &str) -> bool {
    std::env::var(name)
        .map(|v| {
            matches!(
                v.trim().to_ascii_lowercase().as_str(),
                "1" | "true" | "yes" | "on"
            )
        })
        .unwrap_or(false)
}

#[cfg(target_os = "linux")]
fn is_wayland_session() -> bool {
    std::env::var("WAYLAND_DISPLAY")
        .map(|v| !v.trim().is_empty())
        .unwrap_or(false)
        || std::env::var("XDG_SESSION_TYPE")
            .map(|v| v.eq_ignore_ascii_case("wayland"))
            .unwrap_or(false)
}

fn should_enable_tray() -> bool {
    if env_flag_enabled("ANTIGRAVITY_DISABLE_TRAY") {
        info!("Tray disabled by ANTIGRAVITY_DISABLE_TRAY");
        return false;
    }

    #[cfg(target_os = "linux")]
    {
        if is_wayland_session() && !env_flag_enabled("ANTIGRAVITY_FORCE_TRAY") {
            // 智能自适应检测：检查系统中是否存在有效的 AppIndicator / StatusNotifier 动态链接库
            let has_appindicator = [
                "/usr/lib/x86_64-linux-gnu/libayatana-appindicator3.so.1",
                "/usr/lib/x86_64-linux-gnu/libappindicator3.so.1",
                "/usr/lib64/libayatana-appindicator3.so.1",
                "/usr/lib64/libappindicator3.so.1",
                "/usr/lib/libayatana-appindicator3.so.1",
                "/usr/lib/libappindicator3.so.1",
            ]
            .iter()
            .any(|path| std::path::Path::new(path).exists());

            if has_appindicator {
                info!("Linux Wayland session detected with valid AppIndicator libraries. Enabling tray automatically.");
                return true;
            }

            warn!(
                "Linux Wayland session detected without AppIndicator libraries; disabling tray by default to avoid GTK crashes. Install libayatana-appindicator3 or set ANTIGRAVITY_FORCE_TRAY=1 to force-enable."
            );
            return false;
        }
    }

    true
}

fn credential_state(value: &str) -> &'static str {
    if value.trim().is_empty() {
        "not set"
    } else {
        "set"
    }
}

#[cfg(target_os = "linux")]
fn nvidia_proprietary_loaded() -> bool {
    std::path::Path::new("/dev/nvidia0").exists()
        || std::path::Path::new("/proc/driver/nvidia/version").exists()
}

#[cfg(target_os = "linux")]
fn configure_linux_graphics() {
    use linux_graphics::{
        desktop_is_wlroots_family, should_disable_webkit_dmabuf, should_force_x11_backend,
    };

    let is_wayland = is_wayland_session();
    let has_x11_display = std::env::var("DISPLAY")
        .map(|v| !v.trim().is_empty())
        .unwrap_or(false);
    let desktop = std::env::var("XDG_CURRENT_DESKTOP")
        .unwrap_or_else(|_| std::env::var("XDG_SESSION_DESKTOP").unwrap_or_default());
    let force_wayland = env_flag_enabled("ANTIGRAVITY_FORCE_WAYLAND");
    let force_x11 = env_flag_enabled("ANTIGRAVITY_FORCE_X11");
    let gdk_already_set = std::env::var("GDK_BACKEND").is_ok();

    if should_force_x11_backend(
        gdk_already_set,
        force_x11,
        force_wayland,
        is_wayland,
        has_x11_display,
        &desktop,
    ) {
        // Force X11 backend under GNOME/KDE Wayland to avoid a GTK shm crash.
        std::env::set_var("GDK_BACKEND", "x11");
        warn!(
            "Forcing GDK_BACKEND=x11 for stability on Wayland. Set ANTIGRAVITY_FORCE_WAYLAND=1 to keep Wayland backend."
        );
    } else if is_wayland && !gdk_already_set && desktop_is_wlroots_family(&desktop) {
        info!(
            "Keeping native Wayland GDK backend on {} (Xwayland DISPLAY is not a reason to force X11).",
            desktop
        );
    }

    let webkit_already_set = std::env::var("WEBKIT_DISABLE_DMABUF_RENDERER").is_ok();
    if should_disable_webkit_dmabuf(
        webkit_already_set,
        is_wayland,
        nvidia_proprietary_loaded(),
        &desktop,
    ) {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        info!(
            "WEBKIT_DISABLE_DMABUF_RENDERER=1 (WebKit DMA-BUF workaround on this Wayland setup). Set it yourself to override."
        );
    }
}

/// Increase file descriptor limit for macOS to prevent "Too many open files" errors
#[cfg(target_os = "macos")]
fn increase_nofile_limit() {
    unsafe {
        let mut rl = libc::rlimit {
            rlim_cur: 0,
            rlim_max: 0,
        };

        if libc::getrlimit(libc::RLIMIT_NOFILE, &mut rl) == 0 {
            info!(
                "Current open file limit: soft={}, hard={}",
                rl.rlim_cur, rl.rlim_max
            );

            // Attempt to increase to 4096 or maximum hard limit
            let target = 4096.min(rl.rlim_max);
            if rl.rlim_cur < target {
                rl.rlim_cur = target;
                if libc::setrlimit(libc::RLIMIT_NOFILE, &rl) == 0 {
                    info!("Successfully increased hard file limit to {}", target);
                } else {
                    warn!("Failed to increase file descriptor limit");
                }
            }
        }
    }
}

/// Windows FFI calls to disable Efficiency Mode (EcoQoS / Power Throttling)
/// to prevent background freezes when minimized/hidden.
#[cfg(target_os = "windows")]
mod windows_api {
    type Bool = i32;
    type Handle = *mut std::ffi::c_void;

    #[repr(C)]
    struct ProcessPowerThrottlingState {
        version: u32,
        control_mask: u32,
        state_mask: u32,
    }

    #[link(name = "Kernel32")]
    extern "system" {
        fn GetCurrentProcess() -> Handle;
        fn SetProcessInformation(
            h_process: Handle,
            process_information_class: u32,
            process_information: *mut std::ffi::c_void,
            process_information_size: u32,
        ) -> Bool;
    }

    pub fn disable_efficiency_mode() {
        unsafe {
            let mut state = ProcessPowerThrottlingState {
                version: 1,        // PROCESS_POWER_THROTTLING_STATE::VERSION
                control_mask: 0x1, // PROCESS_POWER_THROTTLING_CURRENT_EXECUTION_SPEED
                state_mask: 0,
            };
            let process_handle = GetCurrentProcess();
            // ProcessPowerThrottling = 4
            let res = SetProcessInformation(
                process_handle,
                4,
                &mut state as *mut _ as *mut std::ffi::c_void,
                std::mem::size_of::<ProcessPowerThrottlingState>() as u32,
            );
            if res == 0 {
                let err = std::io::Error::last_os_error();
                tracing::warn!(
                    "Failed to disable Windows Power Throttling / EcoQoS: {}",
                    err
                );
            } else {
                tracing::info!(
                    "Successfully disabled Windows Power Throttling / EcoQoS for the process."
                );
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Disable Windows background throttling/EcoQoS
    #[cfg(target_os = "windows")]
    windows_api::disable_efficiency_mode();

    // Check for headless mode
    let args: Vec<String> = std::env::args().collect();
    let is_headless = args.iter().any(|arg| arg == "--headless");

    // Increase file descriptor limit (macOS only)
    #[cfg(target_os = "macos")]
    increase_nofile_limit();

    // Initialize logger
    logger::init_logger();

    #[cfg(target_os = "linux")]
    configure_linux_graphics();

    // Initialize token stats database
    if let Err(e) = modules::token_stats::init_db() {
        error!("Failed to initialize token stats database: {}", e);
    }

    // Initialize security database
    if let Err(e) = modules::security_db::init_db() {
        error!("Failed to initialize security database: {}", e);
    }

    // Initialize user token database
    if let Err(e) = modules::user_token_db::init_db() {
        error!("Failed to initialize user token database: {}", e);
    }

    if is_headless {
        info!("Starting in HEADLESS mode...");

        let rt = tokio::runtime::Runtime::new().expect("Failed to create Tokio runtime");
        rt.block_on(async {
            // Initialize states manually
            // [FIX] Initialize log bridge for headless mode
            // Pass a dummy app handle or None since we don't have a Tauri app handle in headless mode
            // Actually log_bridge relies on AppHandle to emit events.
            // In headless mode, we don't emit events, but we still need the buffer.
            // We need to modify log_bridge to handle missing AppHandle gracefully, which it already does (Option).
            // But init_log_bridge requires AppHandle.
            // We'll skip passing AppHandle for now and just leverage the global buffer capability.
            // Since init_log_bridge takes AppHandle, we might need a separate init for headless or just not call init and rely on lazy init of buffer?
            // Checking log_bridge code again...
            // "static LOG_BUFFER: OnceLock<...> = OnceLock::new();" -> lazy init.
            // So we just need to ensure the tracing layer is added.
            // And `logger::init_logger()` adds the layer?
            // Let's check `modules::logger`.

            let proxy_state = commands::proxy::ProxyServiceState::new();
            let cf_state = Arc::new(commands::cloudflared::CloudflaredState::new());

            // Load config
            match modules::config::load_app_config() {
                Ok(mut config) => {
                    let mut modified = false;
                    // Headless/docker 默认允许 LAN 访问（绑定 0.0.0.0）
                    // 若设置 ABV_BIND_LOCAL_ONLY，则仅绑定 127.0.0.1
                    let bind_local_only = std::env::var("ABV_BIND_LOCAL_ONLY")
                        .map(|v| matches!(v.to_lowercase().as_str(), "1" | "true" | "yes" | "on"))
                        .unwrap_or(false);
                    if bind_local_only {
                        config.proxy.allow_lan_access = false;
                        modified = true;
                    } else {
                        config.proxy.allow_lan_access = true;
                    }

                    // [FIX] Force auth mode to AllExceptHealth in headless mode if it's Off or Auto
                    // This ensures Web UI login validation works properly
                    if matches!(config.proxy.auth_mode, crate::proxy::ProxyAuthMode::Off | crate::proxy::ProxyAuthMode::Auto) {
                        info!("Headless mode: Forcing auth_mode to AllExceptHealth for Web UI security");
                        config.proxy.auth_mode = crate::proxy::ProxyAuthMode::AllExceptHealth;
                        modified = true;
                    }

                    // [NEW] 支持通过环境变量注入 API Key
                    // 优先级：ABV_API_KEY > API_KEY > 配置文件
                    let env_key = std::env::var("ABV_API_KEY")
                        .or_else(|_| std::env::var("API_KEY"))
                        .ok();

                    if let Some(key) = env_key {
                        if !key.trim().is_empty() {
                            info!("Using API Key from environment variable");
                            config.proxy.api_key = key;
                            modified = true;
                        }
                    }

                    // [NEW] 支持通过环境变量注入 Web UI 密码
                    // 优先级：ABV_WEB_PASSWORD > WEB_PASSWORD > 配置文件
                    let env_web_password = std::env::var("ABV_WEB_PASSWORD")
                        .or_else(|_| std::env::var("WEB_PASSWORD"))
                        .ok();

                    if let Some(pwd) = env_web_password {
                        if !pwd.trim().is_empty() {
                            info!("Using Web UI Password from environment variable");
                            config.proxy.admin_password = Some(pwd);
                            modified = true;
                        }
                    }

                    // [NEW] 支持通过环境变量注入鉴权模式
                    // 优先级：ABV_AUTH_MODE > AUTH_MODE > 配置文件
                    let env_auth_mode = std::env::var("ABV_AUTH_MODE")
                        .or_else(|_| std::env::var("AUTH_MODE"))
                        .ok();

                    if let Some(mode_str) = env_auth_mode {
                        let mode = match mode_str.to_lowercase().as_str() {
                            "off" => Some(crate::proxy::ProxyAuthMode::Off),
                            "strict" => Some(crate::proxy::ProxyAuthMode::Strict),
                            "all_except_health" => Some(crate::proxy::ProxyAuthMode::AllExceptHealth),
                            "auto" => Some(crate::proxy::ProxyAuthMode::Auto),
                            _ => {
                                warn!("Invalid AUTH_MODE: {}, ignoring", mode_str);
                                None
                            }
                        };
                        if let Some(m) = mode {
                            info!("Using Auth Mode from environment variable: {:?}", m);
                            config.proxy.auth_mode = m;
                            modified = true;
                        }
                    }

                    info!("--------------------------------------------------");
                    info!("🚀 Headless mode proxy service starting...");
                    info!("📍 Port: {}", config.proxy.port);
                    info!("🔑 Current API Key: {}", credential_state(&config.proxy.api_key));
                    if let Some(ref pwd) = config.proxy.admin_password {
                        info!("🔐 Web UI Password: {}", credential_state(pwd));
                    } else {
                        info!("🔐 Web UI Password: (Same as API Key)");
                    }
                    info!("💡 Tips: You can use these keys to login to Web UI and access AI APIs.");
                    info!("💡 Search docker logs or grep gui_config.json to find them.");
                    info!("--------------------------------------------------");

                    // [FIX #1460] Persist environment overrides to ensure they are visible in Web UI/load_config
                    if modified {
                        if let Err(e) = modules::config::save_app_config(&config) {
                            error!("Failed to persist environment overrides: {}", e);
                        } else {
                            info!("Environment overrides persisted to gui_config.json");
                        }
                    }

                    // Start proxy service
                    if let Err(e) = commands::proxy::internal_start_proxy_service(
                        config.proxy,
                        &proxy_state,
                        crate::modules::integration::SystemManager::Headless,
                        cf_state.clone(),
                    ).await {
                        error!("Failed to start proxy service in headless mode: {}", e);
                        std::process::exit(1);
                    }

                    info!("Headless proxy service is running.");

                    // Start smart scheduler for 7-day weekly reset warmup
                    modules::scheduler::start_scheduler(None, proxy_state.clone());
                    info!("Smart scheduler (7-Day Weekly Reset Warmup) started in headless mode.");
                }
                Err(e) => {
                    error!("Failed to load config for headless mode: {}", e);
                    std::process::exit(1);
                }
            }

            // Wait for Ctrl-C
            tokio::signal::ctrl_c().await.ok();
            info!("Headless mode shutting down");
        });
        return;
    }

    let tray_enabled = should_enable_tray();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(
                    tauri_plugin_window_state::StateFlags::all()
                        .difference(tauri_plugin_window_state::StateFlags::VISIBLE),
                )
                .build(),
        )
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app.get_webview_window("main").map(|window| {
                let _ = window.show();
                let _ = window.set_focus();
                #[cfg(target_os = "macos")]
                app.set_activation_policy(tauri::ActivationPolicy::Regular)
                    .unwrap_or(());
            });
        }))
        .manage(commands::proxy::ProxyServiceState::new())
        .manage(commands::cloudflared::CloudflaredState::new())
        .manage(AppRuntimeFlags { tray_enabled })
        .setup(|app| {
            info!("Setup starting...");

            let cleaned_update_artifacts = modules::update_checker::cleanup_stale_update_artifacts();
            if cleaned_update_artifacts > 0 {
                info!(
                    "Cleaned {} stale updater artifact(s) from the system temp directory",
                    cleaned_update_artifacts
                );
            }

            // Initialize log bridge with app handle for debug console
            modules::log_bridge::init_log_bridge(app.handle().clone());

            // Linux: Workaround for transparent window crash/freeze
            // The transparent window feature is unstable on Linux with WebKitGTK
            // We disable the visual alpha channel to prevent softbuffer-related crashes
            #[cfg(target_os = "linux")]
            {
                use tauri::Manager;
                if is_wayland_session() {
                    info!("Linux Wayland session detected; skipping transparent window workaround");
                } else if let Some(window) = app.get_webview_window("main") {
                    // Access GTK window and disable transparency at the GTK level
                    if let Ok(gtk_window) = window.gtk_window() {
                        use gtk::prelude::WidgetExt;
                        // Remove the visual's alpha channel to disable transparency
                        if let Some(screen) = gtk_window.screen() {
                            // Use non-composited visual if available
                            if let Some(visual) = screen.system_visual() {
                                gtk_window.set_visual(Some(&visual));
                            }
                            info!("Linux: Applied transparent window workaround");
                        }
                    }
                }
            }

            let runtime_flags = app.state::<AppRuntimeFlags>();
            if runtime_flags.tray_enabled {
                modules::tray::create_tray(app.handle())?;
                info!("Tray created");
            } else {
                info!("Tray disabled for this session");
            }

            // 立即启动管理服务器 (8045)，以便 Web 端能访问
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                // Load config
                if let Ok(config) = modules::config::load_app_config() {
                    let state = handle.state::<commands::proxy::ProxyServiceState>();
                    let cf_state = handle.state::<commands::cloudflared::CloudflaredState>();
                    let integration =
                        crate::modules::integration::SystemManager::Desktop(handle.clone());

                    // 1. 确保管理后台开启
                    if let Err(e) = commands::proxy::ensure_admin_server(
                        config.proxy.clone(),
                        &state,
                        integration.clone(),
                        Arc::new(cf_state.inner().clone()),
                    )
                    .await
                    {
                        error!("Failed to start admin server: {}", e);
                    } else {
                        info!(
                            "Admin server (port {}) started successfully",
                            config.proxy.port
                        );
                    }

                    // 2. 自动启动转发逻辑
                    if config.proxy.auto_start {
                        if let Err(e) = commands::proxy::internal_start_proxy_service(
                            config.proxy,
                            &state,
                            integration,
                            Arc::new(cf_state.inner().clone()),
                        )
                        .await
                        {
                            error!("Failed to auto-start proxy service: {}", e);
                        } else {
                            info!("Proxy service auto-started successfully");
                        }
                    }
                } else {
                    // 配置加载失败不能再被静默吞掉：否则重启后“服务没起来”时无任何痕迹可查。
                    error!(
                        "Failed to load app config at startup; admin server and proxy service were NOT started. \
                         Fix or reset the config file and restart the app."
                    );
                }
            });

            // Start smart scheduler for 7-day weekly reset warmup
            let scheduler_state = app.handle().state::<commands::proxy::ProxyServiceState>();
            modules::scheduler::start_scheduler(Some(app.handle().clone()), scheduler_state.inner().clone());
            info!("Smart scheduler (7-Day Weekly Reset Warmup) initialized.");

            // [PHASE 1] 已整合至 Axum 端口 (8045)，不再单独启动 19527 端口
            info!("Management API integrated into main proxy server (port 8045)");

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let tray_enabled = window
                    .app_handle()
                    .try_state::<AppRuntimeFlags>()
                    .map(|flags| flags.tray_enabled)
                    .unwrap_or(true);

                if tray_enabled {
                    let _ = window.hide();
                    #[cfg(target_os = "macos")]
                    {
                        use tauri::Manager;
                        window
                            .app_handle()
                            .set_activation_policy(tauri::ActivationPolicy::Accessory)
                            .unwrap_or(());
                    }
                    api.prevent_close();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            // Patcher surface: configuration, installation controls, startup, and updates.
            commands::load_config,
            commands::save_config,
            commands::show_main_window,
            commands::should_start_minimized,
            commands::set_window_theme,
            commands::get_antigravity_path,
            commands::get_antigravity_cli_path,
            commands::get_antigravity_args,
            commands::check_for_updates,
            commands::open_update_download,
            commands::get_update_settings,
            commands::save_update_settings,
            commands::should_check_updates,
            commands::update_last_check_time,
            commands::autostart::toggle_auto_launch,
            commands::autostart::is_auto_launch_enabled,
            commands::localization_detect_installation,
            commands::localization_apply,
            commands::localization_restore,
            commands::localization_save_proxy,
            commands::localization_load_proxy,
            commands::localization_check_proxy,
            commands::localization_set_proxy_enabled,
            commands::localization_launch,
            commands::localization_restart,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            match event {
                // Handle app exit - cleanup background tasks
                tauri::RunEvent::Exit => {
                    tracing::info!("Application exiting, cleaning up background tasks...");
                    if let Some(state) =
                        app_handle.try_state::<crate::commands::proxy::ProxyServiceState>()
                    {
                        tauri::async_runtime::block_on(async {
                            // Use timeout-based read() instead of try_read() to handle lock contention
                            match tokio::time::timeout(
                                std::time::Duration::from_secs(3),
                                state.instance.read(),
                            )
                            .await
                            {
                                Ok(guard) => {
                                    if let Some(instance) = guard.as_ref() {
                                        // Use graceful_shutdown with 2s timeout for task cleanup
                                        instance
                                            .token_manager
                                            .graceful_shutdown(std::time::Duration::from_secs(2))
                                            .await;
                                    }
                                }
                                Err(_) => {
                                    tracing::warn!(
                                        "Lock acquisition timed out after 3s, forcing exit"
                                    );
                                }
                            }
                        });
                    }
                }
                // Handle macOS dock icon click to reopen window
                #[cfg(target_os = "macos")]
                tauri::RunEvent::Reopen { .. } => {
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.unminimize();
                        let _ = window.set_focus();
                        app_handle
                            .set_activation_policy(tauri::ActivationPolicy::Regular)
                            .unwrap_or(());
                    }
                }
                _ => {}
            }
        });
}
