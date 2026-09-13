// 探测环境
const isTauri = typeof window !== 'undefined' && (!!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__);

// Only the commands used by the patcher screen are exposed in web mode.
// The old Manager dashboard mappings were dead after the account UI was removed.
const COMMAND_MAPPING: Record<string, { url: string; method: 'GET' | 'POST' | 'DELETE' | 'PATCH' }> = {
  load_config: { url: '/api/config', method: 'GET' },
  save_config: { url: '/api/config', method: 'POST' },
  is_auto_launch_enabled: { url: '/api/system/autostart/status', method: 'GET' },
  toggle_auto_launch: { url: '/api/system/autostart/toggle', method: 'POST' },
  check_for_updates: { url: '/api/system/updates/check', method: 'POST' },
  update_last_check_time: { url: '/api/system/updates/touch', method: 'POST' },
  localization_detect_installation: { url: '/api/localization/installation', method: 'GET' },
  localization_apply: { url: '/api/localization/apply', method: 'POST' },
  localization_restore: { url: '/api/localization/restore', method: 'POST' },
  localization_save_proxy: { url: '/api/localization/proxy', method: 'POST' },
  localization_load_proxy: { url: '/api/localization/proxy', method: 'GET' },
  localization_check_proxy: { url: '/api/localization/proxy/check', method: 'POST' },
  localization_set_proxy_enabled: { url: '/api/localization/proxy/enabled', method: 'POST' },
  localization_launch: { url: '/api/localization/launch', method: 'POST' },
};

export async function request<T>(cmd: string, args?: any): Promise<T> {
  // 1. Tauri 环境：直接使用 invoke ...
  if (isTauri) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<T>(cmd, args);
    } catch (error) {
      console.error(`Tauri Invoke Error [${cmd}]:`, error);
      throw error;
    }
  }

  // 2. Web 环境：映射到 HTTP API
  const mapping = COMMAND_MAPPING[cmd];
  if (!mapping) {
    console.error(`Command [${cmd}] is not yet mapped for Web mode. Failing.`);
    throw new Error(`Command [${cmd}] not supported in Web mode.`);
  }

  let url = mapping.url;
  // [FIX] 创建 args 副本，用于移除已使用的路径参数
  let bodyArgs = args ? { ...args } : undefined;

  // 通用路径参数处理：替换 :key 为 args[key]
  if (args) {
    Object.keys(args).forEach(key => {
      const placeholder = `:${key}`;
      if (url.includes(placeholder)) {
        url = url.replace(placeholder, encodeURIComponent(String(args[key])));
        // [FIX] 从 body 参数中移除已用于路径的参数
        if (bodyArgs) {
          delete bodyArgs[key];
        }
      }
    });
  }

  const apiKey = typeof window !== 'undefined' ? sessionStorage.getItem('abv_admin_api_key') : null;

  const options: RequestInit = {
    method: mapping.method,
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? {
        'Authorization': `Bearer ${apiKey}`,
        'x-api-key': apiKey
      } : {}),
    },
  };

  if ((mapping.method === 'GET' || mapping.method === 'DELETE') && args) {
    const params = new URLSearchParams();
    Object.entries(args).forEach(([key, value]) => {
      // [FIX] 跳过已用于路径替换的参数
      if (url.includes(encodeURIComponent(String(value)))) return;
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  } else if ((mapping.method === 'POST' || mapping.method === 'PATCH') && bodyArgs) {
    // [FIX] 如果有 request 包装，提取其内容作为 body
    const body = bodyArgs.request !== undefined ? bodyArgs.request : bodyArgs;
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      if (!isTauri && response.status === 401) {
        // [FIX #1163] 增加防抖锁，避免重复事件导致 UI 抖动
        const now = Date.now();
        const lastAuthError = (window as any)._lastAuthErrorTime || 0;
        if (now - lastAuthError > 2000) {
          (window as any)._lastAuthErrorTime = now;
          window.dispatchEvent(new CustomEvent('abv-unauthorized'));
        }
      }
      const errorData = await response.json().catch(() => ({}));
      throw errorData.error || `HTTP Error ${response.status}`;
    }

    // 如果是 204 No Content，直接返回 null
    if (response.status === 204) {
      return null as unknown as T;
    }

    const text = await response.text();
    if (!text) {
      return null as unknown as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch (e) {
      console.warn(`Failed to parse JSON response for [${cmd}]:`, text);
      return text as unknown as T; // Fallback for plain text responses
    }
  } catch (error) {
    console.error(`Web Fetch Error [${cmd}]:`, error);
    throw error;
  }
}
