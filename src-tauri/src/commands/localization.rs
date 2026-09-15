use serde::Serialize;
use serde_json::json;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::Instant;
use tauri::{AppHandle, Manager};
use tokio::time::Duration;
use url::Url;

const ANTIGRAVITY_HEALTH_URL: &str =
    "https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist";

#[derive(Debug, Serialize)]
pub struct LocalizationInstall {
    pub path: String,
    pub executable: Option<String>,
    pub resources: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct SavedProxy {
    pub enabled: bool,
    pub host: String,
    pub port: u16,
    pub proxy_type: String,
    pub username: String,
    pub password: String,
    pub proxy_dir: String,
}

#[derive(Debug, Serialize)]
pub struct ProxyCheckResult {
    pub ok: bool,
    pub latency_ms: u128,
    pub message: String,
}

fn candidate_dirs() -> Vec<PathBuf> {
    let mut dirs = Vec::new();
    if cfg!(target_os = "windows") {
        if let Some(local) = dirs::data_local_dir() {
            dirs.push(local.join("Programs/Antigravity"));
            dirs.push(local.join("Programs/antigravity"));
            dirs.push(local.join("Antigravity"));
        }
        if let Some(program_files) = std::env::var_os("ProgramFiles") {
            dirs.push(PathBuf::from(program_files).join("Antigravity"));
        }
        if let Some(program_files) = std::env::var_os("ProgramFiles(x86)") {
            dirs.push(PathBuf::from(program_files).join("Antigravity"));
        }
    } else if cfg!(target_os = "macos") {
        dirs.push(PathBuf::from("/Applications/Antigravity.app"));
    }
    dirs
}

fn resources_dir(path: &Path) -> PathBuf {
    if path.extension().and_then(|v| v.to_str()) == Some("app") {
        path.join("Contents/Resources")
    } else {
        path.join("resources")
    }
}

fn detect_path() -> Option<LocalizationInstall> {
    for path in candidate_dirs() {
        let resources = resources_dir(&path);
        let archive = resources.join("app.asar");
        let disabled = resources.join("app.asar.disabled");
        let unpacked = resources.join("app");
        if archive.exists() || disabled.exists() || unpacked.exists() {
            let exe = if cfg!(target_os = "windows") {
                path.join("Antigravity.exe")
            } else {
                path.join("Contents/MacOS/Antigravity")
            };
            return Some(LocalizationInstall {
                path: path.to_string_lossy().to_string(),
                executable: exe.exists().then(|| exe.to_string_lossy().to_string()),
                resources: resources.to_string_lossy().to_string(),
            });
        }
    }
    None
}

#[tauri::command]
pub async fn localization_detect_installation() -> Result<Option<LocalizationInstall>, String> {
    Ok(detect_path())
}

fn patcher_candidates(app: Option<&AppHandle>) -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    if let Some(app) = app {
        if let Ok(resource_dir) = app.path().resource_dir() {
            candidates.push(resource_dir.join("Antigravity-Patcher.exe"));
            candidates.push(resource_dir.join("Antigravity-Patcher.py"));
            candidates.push(resource_dir.join("dist/Antigravity-Patcher.exe"));
        }
    }
    if let Ok(value) = std::env::var("ANTIGRAVITY_PATCHER_PATH") {
        candidates.push(PathBuf::from(value));
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            candidates.push(parent.join("Antigravity-Patcher.exe"));
            candidates.push(parent.join("../dist/Antigravity-Patcher.exe"));
            for ancestor in parent.ancestors().take(6) {
                candidates.push(ancestor.join("dist/Antigravity-Patcher.exe"));
                candidates.push(ancestor.join("Antigravity-Patcher.py"));
            }
        }
    }
    if let Ok(current) = std::env::current_dir() {
        candidates.push(current.join("dist/Antigravity-Patcher.exe"));
        candidates.push(current.join("Antigravity-Patcher.py"));
        candidates.push(current.join("../Antigravity-Patcher.py"));
    }
    candidates
}

fn run_patcher(action: &str, app: Option<&AppHandle>) -> Result<String, String> {
    let flag = if action == "restore" {
        "--restore"
    } else {
        "--apply"
    };
    let patcher = patcher_candidates(app)
        .into_iter()
        .find(|path| path.exists())
        .ok_or_else(|| "未找到 Antigravity-Patcher.exe 或 Antigravity-Patcher.py".to_string())?;
    let mut command = if patcher.extension().and_then(|v| v.to_str()) == Some("py") {
        let python = if cfg!(target_os = "windows") {
            "pythonw"
        } else {
            "python3"
        };
        let mut cmd = Command::new(python);
        cmd.arg(&patcher).arg(flag);
        cmd
    } else {
        let mut cmd = Command::new(&patcher);
        cmd.arg(flag);
        cmd
    };
    command
        .env("ANTIGRAVITY_PATCHER_MANAGED", "1")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    let output = command
        .output()
        .map_err(|e| format!("启动补丁器失败: {e}"))?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    if output.status.success() {
        Ok(stdout.lines().last().unwrap_or("操作完成").to_string())
    } else {
        Err(format!("{}{}", stdout, stderr).trim().to_string())
    }
}

#[tauri::command]
pub async fn localization_apply(app: AppHandle) -> Result<String, String> {
    tokio::task::spawn_blocking(move || run_patcher("apply", Some(&app)))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn localization_restore(app: AppHandle) -> Result<String, String> {
    tokio::task::spawn_blocking(move || run_patcher("restore", Some(&app)))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn localization_save_proxy(
    target: String,
    host: String,
    port: u16,
    proxy_type: String,
    username: String,
    password: String,
    proxy_dir: String,
    enabled: bool,
) -> Result<String, String> {
    let directory = proxy_directory(&target, &proxy_dir)?;
    fs::create_dir_all(&directory).map_err(|e| format!("创建代理目录失败: {e}"))?;
    let mut proxy = json!({"enabled": enabled, "host": host.trim(), "port": port, "type": proxy_type});
    if !username.trim().is_empty() {
        proxy["username"] = json!(username.trim());
    }
    if !password.is_empty() {
        proxy["password"] = json!(password);
    }
    let config = json!({
        "enabled": enabled,
        "proxy": proxy,
        "fake_ip": {"enabled": true, "cidr": "198.18.0.0/15"},
        "child_injection": true,
        "child_injection_mode": "filtered",
        "target_processes": ["agy.exe", "language_server.exe", "language_server_windows", "Antigravity.exe", "Antigravity IDE.exe", "node.exe"],
        "proxy_rules": {"allowed_ports": [80, 443], "dns_mode": "direct", "ipv6_mode": "proxy", "udp_mode": "auto"}
    });
    let path = directory.join("config.json");
    fs::write(
        &path,
        serde_json::to_vec_pretty(&config).map_err(|e| e.to_string())?,
    )
    .map_err(|e| format!("写入代理配置失败: {e}"))?;
    Ok(path.to_string_lossy().to_string())
}

fn proxy_directory(target: &str, proxy_dir: &str) -> Result<PathBuf, String> {
    let base = if proxy_dir.trim().is_empty() {
        detect_path()
            .map(|v| PathBuf::from(v.path))
            .ok_or_else(|| "未找到 Antigravity 安装目录".to_string())?
    } else {
        PathBuf::from(proxy_dir)
    };
    let leaf = if target.eq_ignore_ascii_case("cli") { "cli" } else { "ide" };
    Ok(if base.file_name().and_then(|v| v.to_str()).map(|v| v.eq_ignore_ascii_case(leaf)).unwrap_or(false) {
        base
    } else {
        base.join(leaf)
    })
}

#[tauri::command]
pub async fn localization_load_proxy(
    target: String,
    proxy_dir: String,
) -> Result<Option<SavedProxy>, String> {
    let directory = proxy_directory(&target, &proxy_dir)?;
    let path = directory.join("config.json");
    if !path.exists() {
        return Ok(None);
    }
    let raw = fs::read_to_string(&path).map_err(|e| format!("读取代理配置失败: {e}"))?;
    let config: serde_json::Value = serde_json::from_str(&raw).map_err(|e| format!("解析代理配置失败: {e}"))?;
    let proxy = config.get("proxy").and_then(|value| value.as_object());
    let Some(proxy) = proxy else { return Ok(None); };
    let host = proxy.get("host").and_then(|value| value.as_str()).unwrap_or_default().to_string();
    let port = proxy.get("port").and_then(|value| value.as_u64()).unwrap_or(0) as u16;
    if host.is_empty() || port == 0 { return Ok(None); }
    Ok(Some(SavedProxy {
        // Missing enabled flags are treated as disabled for a fresh install.
        enabled: config.get("enabled").and_then(|value| value.as_bool()).or_else(|| proxy.get("enabled").and_then(|value| value.as_bool())).unwrap_or(false),
        host,
        port,
        proxy_type: proxy.get("type").and_then(|value| value.as_str()).unwrap_or("socks5").to_string(),
        username: proxy.get("username").and_then(|value| value.as_str()).unwrap_or_default().to_string(),
        password: proxy.get("password").and_then(|value| value.as_str()).unwrap_or_default().to_string(),
        proxy_dir: directory.to_string_lossy().to_string(),
    }))
}

#[tauri::command]
pub async fn localization_check_proxy(
    host: String,
    port: u16,
    proxy_type: String,
    username: String,
    password: String,
) -> Result<ProxyCheckResult, String> {
    let host = host.trim().to_string();
    if host.is_empty() || port == 0 {
        return Ok(ProxyCheckResult { ok: false, latency_ms: 0, message: "代理地址或端口无效".to_string() });
    }

    // Request the Antigravity backend through the configured proxy. A HTTP response
    // (including 4xx/5xx from the service) proves that the proxy path is usable;
    // a 407 specifically indicates that proxy authentication was rejected.
    let scheme = match proxy_type.trim().to_ascii_lowercase().as_str() {
        "http" | "https" => "http",
        "socks4" | "socks4a" => "socks4",
        _ => "socks5h",
    };
    let proxy_host = if host.contains(':') && !host.starts_with('[') {
        format!("[{host}]")
    } else {
        host.clone()
    };
    let mut proxy_url = Url::parse(&format!("{scheme}://{proxy_host}:{port}"))
        .map_err(|error| format!("代理地址无效: {error}"))?;
    if !username.trim().is_empty() {
        proxy_url
            .set_username(username.trim())
            .map_err(|_| "代理用户名无效".to_string())?;
        proxy_url
            .set_password(Some(&password))
            .map_err(|_| "代理密码无效".to_string())?;
    }
    let proxy = reqwest::Proxy::all(proxy_url).map_err(|error| format!("代理配置无效: {error}"))?;
    let client = reqwest::Client::builder()
        .proxy(proxy)
        .timeout(Duration::from_secs(5))
        .build()
        .map_err(|error| format!("创建检测客户端失败: {error}"))?;
    let started = Instant::now();
    match client
        .post(ANTIGRAVITY_HEALTH_URL)
        .header(reqwest::header::USER_AGENT, "Antigravity-Patcher/1.0")
        .json(&serde_json::json!({ "metadata": { "ideType": "ANTIGRAVITY" } }))
        .send()
        .await
    {
        Ok(response) => {
            let latency_ms = started.elapsed().as_millis();
            let status = response.status();
            if status.as_u16() == 407 {
                Ok(ProxyCheckResult {
                    ok: false,
                    latency_ms,
                    message: "代理要求认证（用户名或密码错误）".to_string(),
                })
            } else {
                Ok(ProxyCheckResult {
                    ok: true,
                    latency_ms,
                    message: format!("反重力服务器响应 HTTP {status}"),
                })
            }
        }
        Err(error) if error.is_timeout() => Ok(ProxyCheckResult {
            ok: false,
            latency_ms: started.elapsed().as_millis(),
            message: "访问反重力服务器超时（超过 5 秒）".to_string(),
        }),
        Err(error) => Ok(ProxyCheckResult {
            ok: false,
            latency_ms: started.elapsed().as_millis(),
            message: format!("访问反重力服务器失败: {error}"),
        }),
    }
}

#[tauri::command]
pub async fn localization_set_proxy_enabled(
    target: String,
    enabled: bool,
    proxy_dir: String,
) -> Result<String, String> {
    let directory = proxy_directory(&target, &proxy_dir)?;
    let path = directory.join("config.json");
    if !path.exists() {
        return Err("未找到代理配置".to_string());
    }
    let raw = fs::read_to_string(&path).map_err(|e| format!("读取代理配置失败: {e}"))?;
    let mut config: serde_json::Value = serde_json::from_str(&raw).map_err(|e| format!("解析代理配置失败: {e}"))?;
    config["enabled"] = json!(enabled);
    if !config.get("proxy").map(|value| value.is_object()).unwrap_or(false) {
        config["proxy"] = json!({});
    }
    config["proxy"]["enabled"] = json!(enabled);
    fs::write(&path, serde_json::to_vec_pretty(&config).map_err(|e| e.to_string())?)
        .map_err(|e| format!("写入代理配置失败: {e}"))?;
    Ok(path.to_string_lossy().to_string())
}

fn proxy_scheme(proxy_type: &str) -> &'static str {
    match proxy_type.trim().to_ascii_lowercase().as_str() {
        "http" | "https" => "http",
        "socks4" | "socks4a" => "socks4",
        _ => "socks5",
    }
}

fn proxy_host_for_url(host: &str) -> String {
    if host.contains(':') && !host.starts_with('[') {
        format!("[{host}]")
    } else {
        host.to_string()
    }
}

#[tauri::command]
pub async fn localization_launch(target: String, proxy_dir: String) -> Result<(), String> {
    let install = detect_path().ok_or_else(|| "未找到 Antigravity 安装目录".to_string())?;
    let executable = if target.eq_ignore_ascii_case("cli") {
        PathBuf::from(&install.path).join("agy.exe")
    } else {
        PathBuf::from(
            install
                .executable
                .ok_or_else(|| "未找到 Antigravity.exe".to_string())?,
        )
    };
    if !executable.exists() {
        return Err(format!("未找到程序: {}", executable.display()));
    }
    let saved_proxy = localization_load_proxy(target.clone(), proxy_dir).await?;
    if target.eq_ignore_ascii_case("ide")
        && saved_proxy.as_ref().map(|proxy| proxy.enabled).unwrap_or(false)
        && crate::modules::process::is_antigravity_running(Some("ide"))
    {
        // Electron is single-instance and ignores proxy flags on a second launch.
        // Restart the existing IDE so the process-level proxy is actually applied.
        crate::modules::process::close_antigravity(10, Some("ide"))?;
    }
    let mut command = Command::new(executable);
    if let Some(proxy) = saved_proxy {
        if proxy.enabled {
            let scheme = proxy_scheme(&proxy.proxy_type);
            let endpoint = format!(
                "{scheme}://{}:{}",
                proxy_host_for_url(&proxy.host),
                proxy.port
            );
            let endpoint_with_credentials = if proxy.username.trim().is_empty() {
                endpoint.clone()
            } else {
                let mut url = Url::parse(&endpoint).map_err(|error| format!("代理地址无效: {error}"))?;
                url.set_username(proxy.username.trim()).map_err(|_| "代理用户名无效".to_string())?;
                url.set_password(Some(&proxy.password)).map_err(|_| "代理密码无效".to_string())?;
                url.to_string()
            };

            // Chromium/Electron uses --proxy-server, while CLI builds commonly
            // honor the standard proxy environment variables. Setting both keeps
            // the routing scoped to this process and its children.
            if !target.eq_ignore_ascii_case("cli") {
                // Chromium accepts the direct proxy endpoint. Credentials remain
                // available through environment variables for CLI/language-server.
                command.arg(format!("--proxy-server={endpoint}"));
            }
            command
                .env("HTTP_PROXY", &endpoint_with_credentials)
                .env("HTTPS_PROXY", &endpoint_with_credentials)
                .env("ALL_PROXY", &endpoint_with_credentials)
                .env("GRPC_PROXY_EXP", &endpoint_with_credentials)
                .env("grpc_proxy", &endpoint_with_credentials)
                .env("http_proxy", &endpoint_with_credentials)
                .env("https_proxy", &endpoint_with_credentials)
                .env("all_proxy", &endpoint_with_credentials);
        }
    }
    command
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    let _ = command.spawn().map_err(|e| format!("启动失败: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn localization_restart(target: String, proxy_dir: String) -> Result<(), String> {
    if target.eq_ignore_ascii_case("ide") {
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            for image in ["Antigravity.exe", "Antigravity IDE.exe"] {
                let _ = Command::new("taskkill")
                    .args(["/F", "/IM", image, "/T"])
                    .creation_flags(0x08000000)
                    .output();
            }
        }
        #[cfg(not(target_os = "windows"))]
        if crate::modules::process::is_antigravity_running(Some("ide")) {
            crate::modules::process::close_antigravity(10, Some("ide"))?;
        }
    } else {
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            for image in ["agy.exe", "language_server.exe"] {
                let _ = Command::new("taskkill")
                    .args(["/F", "/IM", image, "/T"])
                    .creation_flags(0x08000000)
                    .output();
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            let _ = crate::modules::process::close_antigravity(10, None);
        }
    }
    tokio::time::sleep(Duration::from_millis(700)).await;
    localization_launch(target, proxy_dir).await
}
