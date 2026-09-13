use crate::modules;
use tauri::{
    image::Image,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    Listener, Manager,
};

pub fn create_tray(app: &tauri::AppHandle) -> tauri::Result<()> {
    // 1. Load config to get language settings
    let config = modules::load_app_config().unwrap_or_default();
    let texts = modules::i18n::get_tray_texts(&config.language);

    // Load the tray icon (macOS uses a template image; other platforms use full color).
    #[cfg(target_os = "macos")]
    let icon_bytes: &[u8] = include_bytes!("../../icons/tray-icon.png");
    #[cfg(not(target_os = "macos"))]
    let icon_bytes: &[u8] = include_bytes!("../../icons/icon.png");

    let img = image::load_from_memory(icon_bytes)
        .map_err(|e| {
            tauri::Error::Io(std::io::Error::new(
                std::io::ErrorKind::Other,
                e.to_string(),
            ))
        })?
        .to_rgba8();
    let (width, height) = img.dimensions();
    let icon = Image::new_owned(img.into_raw(), width, height);

    // Only expose actions that belong to this patcher. Account rotation and
    // quota reporting were inherited from Antigravity Tools and are not part
    // of the localization/proxy workflow.
    let show_i = MenuItem::with_id(app, "show", &texts.show_window, true, None::<&str>)?;
    let open_i = MenuItem::with_id(app, "open_target", &texts.open_target, true, None::<&str>)?;
    let restart_i = MenuItem::with_id(app, "restart_target", &texts.restart_target, true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", &texts.quit, true, None::<&str>)?;

    let sep = PredefinedMenuItem::separator(app)?;

    let menu = Menu::with_items(app, &[&show_i, &open_i, &restart_i, &sep, &quit_i])?;

    let _ = TrayIconBuilder::with_id("main")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .icon(icon)
        .icon_as_template(cfg!(target_os = "macos"))
        .on_menu_event(move |app, event| {
            match event.id().as_ref() {
                "show" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                        #[cfg(target_os = "macos")]
                        app.set_activation_policy(tauri::ActivationPolicy::Regular)
                            .unwrap_or(());
                    }
                }
                "open_target" | "restart_target" => {
                    let restart = event.id().as_ref() == "restart_target";
                    tauri::async_runtime::spawn(async move {
                        let target = preferred_target().await;
                        let result = if restart {
                            crate::commands::localization_restart(target, String::new()).await
                        } else {
                            crate::commands::localization_launch(target, String::new()).await
                        };
                        if let Err(error) = result {
                            modules::logger::log_error(&format!("托盘目标操作失败: {error}"));
                        }
                    });
                }
                "quit" => {
                    // 先停止 Admin Server 和反代服务，避免进程残留和端口占用
                    let state = app.state::<crate::commands::proxy::ProxyServiceState>();
                    let admin_server = state.admin_server.clone();
                    let instance = state.instance.clone();
                    tauri::async_runtime::spawn(async move {
                        {
                            let mut lock = admin_server.write().await;
                            if let Some(admin) = lock.take() {
                                admin.axum_server.stop();
                            }
                        }
                        {
                            let mut lock = instance.write().await;
                            if let Some(inst) = lock.take() {
                                inst.token_manager.abort_background_tasks().await;
                                inst.axum_server.set_running(false).await;
                            }
                        }
                        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
                        std::process::exit(0);
                    });
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                    #[cfg(target_os = "macos")]
                    app.set_activation_policy(tauri::ActivationPolicy::Regular)
                        .unwrap_or(());
                }
            }
        })
        .build(app)?;

    // Update status once on initialization
    let handle = app.clone();
    tauri::async_runtime::spawn(async move {
        update_tray_menus(&handle);
    });

    // Listen for config update events
    let handle = app.clone();
    app.listen("config://updated", move |_event| {
        modules::logger::log_info("Configuration updated, refreshing tray menu");
        update_tray_menus(&handle);
    });

    Ok(())
}

/// Helper function to update tray menu
pub fn update_tray_menus(app: &tauri::AppHandle) {
    let app_clone = app.clone();
    tauri::async_runtime::spawn(async move {
        // Rebuild only the localized system actions. No account or quota
        // state is shown in the patcher's tray menu.
        let config = modules::load_app_config().unwrap_or_default();
        let texts = modules::i18n::get_tray_texts(&config.language);
        let show_i = MenuItem::with_id(&app_clone, "show", &texts.show_window, true, None::<&str>);
        let open_i = MenuItem::with_id(&app_clone, "open_target", &texts.open_target, true, None::<&str>);
        let restart_i = MenuItem::with_id(&app_clone, "restart_target", &texts.restart_target, true, None::<&str>);
        let quit_i = MenuItem::with_id(&app_clone, "quit", &texts.quit, true, None::<&str>);

        if let (Ok(s), Ok(o), Ok(r), Ok(q), Ok(separator)) =
            (show_i, open_i, restart_i, quit_i, PredefinedMenuItem::separator(&app_clone))
        {
            let items: [&dyn tauri::menu::IsMenuItem<tauri::Wry>; 5] = [&s, &o, &r, &separator, &q];
            if let Ok(menu) = Menu::with_items(&app_clone, &items) {
                if let Some(tray) = app_clone.tray_by_id("main") {
                    let _ = tray.set_menu(Some(menu));
                }
            }
        }
    });
}

async fn preferred_target() -> String {
    for target in ["ide", "cli"] {
        if let Ok(Some(_)) = crate::commands::localization_load_proxy(
            target.to_string(),
            String::new(),
        )
        .await
        {
            return target.to_string();
        }
    }
    "ide".to_string()
}
