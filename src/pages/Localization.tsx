import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, Network, RefreshCw, Download, Save, RotateCcw, Check, ChevronDown, CheckCircle2, FolderSearch, ShieldCheck, CircleHelp, Power, Moon, Minimize2, Loader2, RotateCw } from 'lucide-react';
import { request as invoke } from '../utils/request';
import { showToast } from '../components/common/ToastContainer';
import { check as tauriCheck } from '@tauri-apps/plugin-updater';
import { relaunch as tauriRelaunch } from '@tauri-apps/plugin-process';
import { isTauri } from '../utils/env';

type Installation = { path: string; executable?: string; resources: string };
type UpdateInfo = { has_update: boolean; latest_version: string; current_version: string; release_notes?: string; download_url?: string };
type UpdateState = 'idle' | 'checking' | 'current' | 'available' | 'downloading' | 'ready' | 'unsupported' | 'error';

type SelectOption = { value: string; label: string };

function SelectField({ value, options, onChange, ariaLabel }: { value: string; options: SelectOption[]; onChange: (value: string) => void; ariaLabel: string }) {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const selected = options.find(option => option.value === value) || options[0];

    useEffect(() => {
        if (!open) return;
        const close = (event: MouseEvent) => {
            if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);

    return (
        <div className="relative" ref={wrapperRef}>
            <button type="button" aria-label={ariaLabel} aria-expanded={open} onClick={() => setOpen(current => !current)} className="flex h-12 w-full items-center justify-between rounded-2xl border border-slate-300 bg-slate-100 px-4 text-left text-slate-800 transition-colors hover:bg-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-400/50 dark:border-0 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:bg-slate-900">
                <span>{selected?.label}</span><ChevronDown size={16} className={`shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div role="listbox" aria-label={ariaLabel} className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-950/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
                    {options.map(option => (
                        <button type="button" role="option" aria-selected={option.value === value} key={option.value} onClick={() => { onChange(option.value); setOpen(false); }} className={`mb-1 flex min-h-10 w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-colors last:mb-0 ${option.value === value ? 'bg-blue-500 text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'}`}>
                            <span>{option.label}</span>{option.value === value && <Check size={16} />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

const PAGE_COPY = {
    zh: { brand: 'Antigravity Patcher', title: '汉化与独立代理', subtitle: '管理界面语言与独立网络出口。', scan: '扫描安装', checkUpdates: '检查更新', upToDate: '当前已是最新版本', updateFound: '发现新版本', updates: '应用更新', updatesDesc: '检查新版本并在桌面端直接下载安装。', currentVersion: '当前版本', latestVersion: '最新版本', installUpdate: '下载并安装', downloading: '正在下载更新', installReady: '更新已下载，重启后完成安装', restartNow: '立即重启', desktopOnly: '自动更新需要在桌面版中使用', updateError: '更新失败', installation: '安装位置', found: '已发现', missing: '未发现', installHint: '请安装 Antigravity，或点击右上角扫描。', resources: '资源目录', waiting: '等待检测', language: '界面语言', languageDesc: '修改界面文本，随时可恢复。', apply: '应用汉化', restore: '取消汉化', proxy: '独立代理', proxyDesc: '只影响选定的 Antigravity App 或 CLI，不修改系统全局代理。', proxyEnabled: '代理已开启', proxyDisabled: '代理已关闭', checkProxy: '检测代理', proxyChecking: '正在检测', proxyReachable: '代理可用', proxyUnreachable: '代理不可用', process: '进程级配置', target: '目标程序', ide: 'App / IDE 桌面端', cli: 'Antigravity CLI', protocol: '代理协议', host: '代理 IP / 域名', port: '端口', username: '用户名', password: '密码', optional: '可选', noAuth: '留空表示无认证', proxyDir: '代理目录', proxyDirHint: '留空自动写入当前目标的 ide / cli 目录', saveHint: '保存后可直接静默启动目标程序', save: '保存代理配置', launch: '启动目标', restartTarget: '重启目标', behavior: '启动与代理行为', behaviorDesc: '设置保存后立即生效', autoStart: '开机自启', autoStartDesc: '系统登录后自动启动 Antigravity Patcher', silent: '静默启动', silentDesc: '启动后保持在托盘，不弹出窗口', minimize: '关闭后最小化', minimizeDesc: '点击关闭时隐藏到托盘，托盘退出仍可结束进程', onlyOpen: '仅 App 打开时代理', onlyOpenDesc: '代理配置随目标 App 使用，避免影响其他程序' },
    en: { brand: 'Antigravity Patcher', title: 'Localization & standalone proxy', subtitle: 'Manage interface language and standalone network routing.', scan: 'Scan installation', checkUpdates: 'Check for updates', upToDate: 'You are up to date', updateFound: 'Update available', updates: 'App update', updatesDesc: 'Check for a new version and install it from the desktop app.', currentVersion: 'Current version', latestVersion: 'Latest version', installUpdate: 'Download and install', downloading: 'Downloading update', installReady: 'Update downloaded. Restart to finish installation.', restartNow: 'Restart now', desktopOnly: 'Automatic updates are available in the desktop app.', updateError: 'Update failed', installation: 'Installation', found: 'Found', missing: 'Not found', installHint: 'Install Antigravity or scan again from the top right.', resources: 'Resources', waiting: 'Waiting for scan', language: 'Interface language', languageDesc: 'Change interface text and restore it at any time.', apply: 'Apply localization', restore: 'Restore original', proxy: 'Standalone proxy', proxyDesc: 'Only affects the selected Antigravity app or CLI, not the system proxy.', proxyEnabled: 'Proxy enabled', proxyDisabled: 'Proxy disabled', checkProxy: 'Test proxy', proxyChecking: 'Testing', proxyReachable: 'Proxy reachable', proxyUnreachable: 'Proxy unavailable', process: 'Process-level config', target: 'Target', ide: 'App / IDE desktop', cli: 'Antigravity CLI', protocol: 'Protocol', host: 'Proxy host', port: 'Port', username: 'Username', password: 'Password', optional: 'Optional', noAuth: 'Leave empty for no authentication', proxyDir: 'Proxy directory', proxyDirHint: 'Leave empty to use the current ide / cli directory', saveHint: 'Save then launch the target silently', save: 'Save proxy', launch: 'Launch target', restartTarget: 'Restart target', behavior: 'Startup & proxy behavior', behaviorDesc: 'Changes take effect immediately', autoStart: 'Launch at startup', autoStartDesc: 'Start Antigravity Patcher when you sign in', silent: 'Silent startup', silentDesc: 'Start in the tray without opening a window', minimize: 'Minimize on close', minimizeDesc: 'Hide to the tray when closed; use Quit in the tray to exit', onlyOpen: 'Proxy only while app is open', onlyOpenDesc: 'Keep the proxy scoped to the target app' },
    'zh-TW': { brand: 'Antigravity Patcher', title: '漢化與獨立代理', subtitle: '管理介面語言與獨立網路出口。', scan: '掃描安裝', checkUpdates: '檢查更新', upToDate: '目前已是最新版本', updateFound: '發現新版本', updates: '應用程式更新', updatesDesc: '檢查新版本並在桌面版直接下載安裝。', currentVersion: '目前版本', latestVersion: '最新版本', installUpdate: '下載並安裝', downloading: '正在下載更新', installReady: '更新已下載，重新啟動後完成安裝', restartNow: '立即重啟', desktopOnly: '自動更新需在桌面版使用', updateError: '更新失敗', installation: '安裝位置', found: '已發現', missing: '未發現', installHint: '請安裝 Antigravity，或點擊右上角掃描。', resources: '資源目錄', waiting: '等待檢測', language: '介面語言', languageDesc: '修改介面文字，隨時可恢復。', apply: '套用漢化', restore: '取消漢化', proxy: '獨立代理', proxyDesc: '只影響選定的 Antigravity App 或 CLI，不修改系統全域代理。', proxyEnabled: '代理已開啟', proxyDisabled: '代理已關閉', checkProxy: '檢測代理', proxyChecking: '正在檢測', proxyReachable: '代理可用', proxyUnreachable: '代理不可用', process: '進程級配置', target: '目標程式', ide: 'App / IDE 桌面端', cli: 'Antigravity CLI', protocol: '代理協議', host: '代理 IP / 網域', port: '連接埠', username: '使用者名稱', password: '密碼', optional: '可選', noAuth: '留空表示無驗證', proxyDir: '代理目錄', proxyDirHint: '留空自動寫入目前目標的 ide / cli 目錄', saveHint: '儲存後可直接靜默啟動目標程式', save: '儲存代理配置', launch: '啟動目標', behavior: '啟動與代理行為', behaviorDesc: '儲存後立即生效', autoStart: '開機自啟', autoStartDesc: '登入系統後自動啟動 Antigravity Patcher', silent: '靜默啟動', silentDesc: '啟動後停留在系統匣，不彈出視窗', minimize: '關閉後最小化', minimizeDesc: '關閉時隱藏至系統匣，從系統匣退出可結束進程', onlyOpen: '僅 App 開啟時代理', onlyOpenDesc: '代理配置只隨目標 App 使用，避免影響其他程式' },
    ja: { brand: 'Antigravity Patcher', title: '日本語化と独立プロキシ', subtitle: '表示言語と独立したネットワーク出口を管理します。', scan: 'インストールをスキャン', checkUpdates: '更新を確認', upToDate: '最新バージョンです', updateFound: '新しいバージョンがあります', updates: 'アプリ更新', updatesDesc: '新しいバージョンを確認し、デスクトップ版から直接インストールします。', currentVersion: '現在のバージョン', latestVersion: '最新バージョン', installUpdate: 'ダウンロードしてインストール', downloading: '更新をダウンロード中', installReady: '更新をダウンロードしました。再起動してインストールします。', restartNow: '今すぐ再起動', desktopOnly: '自動更新はデスクトップ版で利用できます', updateError: '更新に失敗しました', installation: 'インストール先', found: '検出済み', missing: '未検出', installHint: 'Antigravity をインストールするか、右上から再スキャンしてください。', resources: 'リソース', waiting: 'スキャン待ち', language: '表示言語', languageDesc: '表示テキストを変更し、いつでも復元できます。', apply: '日本語化を適用', restore: '元に戻す', proxy: '独立プロキシ', proxyDesc: '選択した Antigravity App または CLI のみに適用し、システム設定は変更しません。', proxyEnabled: 'プロキシ有効', proxyDisabled: 'プロキシ無効', checkProxy: 'プロキシを確認', proxyChecking: '確認中', proxyReachable: 'プロキシ接続済み', proxyUnreachable: 'プロキシに接続できません', process: 'プロセス単位の設定', target: '対象アプリ', ide: 'App / IDE デスクトップ', cli: 'Antigravity CLI', protocol: 'プロトコル', host: 'プロキシ IP / ホスト', port: 'ポート', username: 'ユーザー名', password: 'パスワード', optional: '任意', noAuth: '認証なしは空欄', proxyDir: 'プロキシフォルダー', proxyDirHint: '空欄で現在の ide / cli フォルダーを使用', saveHint: '保存後に対象アプリを静かに起動', save: 'プロキシを保存', launch: '対象を起動', behavior: '起動とプロキシの動作', behaviorDesc: '保存するとすぐに反映されます', autoStart: '自動起動', autoStartDesc: 'サインイン時に Antigravity Patcher を起動', silent: 'サイレント起動', silentDesc: 'ウィンドウを開かずトレイで起動', minimize: '閉じると最小化', minimizeDesc: '閉じるとトレイに隠し、トレイの終了から完全終了', onlyOpen: 'App 起動中のみプロキシ', onlyOpenDesc: '対象 App の実行中だけプロキシを使用' }
} as const;

const Localization = () => {
    const { i18n } = useTranslation();
    const languageKey = (i18n.resolvedLanguage || i18n.language || 'en') as keyof typeof PAGE_COPY;
    const c = PAGE_COPY[languageKey] || PAGE_COPY.en;
    const [installation, setInstallation] = useState<Installation | null>(null);
    const [target, setTarget] = useState<'ide' | 'cli'>('ide');
    const [host, setHost] = useState('127.0.0.1');
    const [port, setPort] = useState('7890');
    const [proxyType, setProxyType] = useState('socks5');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [proxyDir, setProxyDir] = useState('');
    const [proxyEnabled, setProxyEnabled] = useState(true);
    const [proxyCheckState, setProxyCheckState] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
    const [proxyCheckMessage, setProxyCheckMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const [updateState, setUpdateState] = useState<UpdateState>('idle');
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
    const [updateError, setUpdateError] = useState('');
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [autoStart, setAutoStart] = useState(false);
    const [silentStart, setSilentStart] = useState(true);
    const [minimizeOnClose, setMinimizeOnClose] = useState(true);
    const [proxyOnlyWhileOpen, setProxyOnlyWhileOpen] = useState(true);

    useEffect(() => {
        invoke<boolean>('is_auto_launch_enabled').then(setAutoStart).catch(() => {});
        setSilentStart(localStorage.getItem('ag.silentStart') !== 'false');
        setMinimizeOnClose(localStorage.getItem('ag.minimizeOnClose') !== 'false');
        setProxyOnlyWhileOpen(localStorage.getItem('ag.proxyOnlyWhileOpen') !== 'false');
        setProxyEnabled(localStorage.getItem('ag.proxyEnabled') !== 'false');
    }, []);

    useEffect(() => {
        let cancelled = false;
        const rememberedDir = localStorage.getItem(`ag.proxyDir.${target}`) || '';
        invoke<{ enabled: boolean; host: string; port: number; proxy_type: string; username: string; password: string; proxy_dir: string } | null>('localization_load_proxy', { target, proxyDir: rememberedDir })
            .then(saved => {
                if (cancelled || !saved) return;
                setHost(saved.host);
                setPort(String(saved.port));
                setProxyType(saved.proxy_type);
                setUsername(saved.username);
                setPassword(saved.password);
                setProxyDir(saved.proxy_dir);
                setProxyEnabled(saved.enabled);
                localStorage.setItem('ag.proxyEnabled', String(saved.enabled));
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [target]);

    const updatePreference = async (key: string, value: boolean) => {
        localStorage.setItem(`ag.${key}`, String(value));
        if (key === 'autoStart') {
            try { await invoke('toggle_auto_launch', { enable: value }); } catch (e) { showToast(String(e), 'error'); setAutoStart(!value); }
        }
    };

    const scan = async () => {
        if (!isTauri()) {
            setInstallation(null);
            return;
        }
        try {
            const result = await invoke<Installation | null>('localization_detect_installation');
            setInstallation(result);
            if (!result) showToast('未找到 Antigravity 安装目录', 'warning');
        } catch (error) {
            showToast(String(error), 'error');
        }
    };

    const checkUpdates = async () => {
        if (!isTauri()) {
            setUpdateInfo(null);
            setUpdateError('');
            setUpdateState('unsupported');
            return;
        }
        setUpdateState('checking');
        setUpdateInfo(null);
        setUpdateError('');
        try {
            const info = await invoke<UpdateInfo>('check_for_updates');
            await invoke('update_last_check_time').catch(() => {});
            setUpdateInfo(info);
            setUpdateState(info.has_update ? 'available' : 'current');
        } catch (error) {
            const message = String(error);
            setUpdateError(message);
            setUpdateState('error');
            showToast(message, 'error', 5000);
        }
    };

    const installUpdate = async () => {
        if (!isTauri()) {
            setUpdateState('unsupported');
            return;
        }
        setUpdateState('downloading');
        setUpdateError('');
        setDownloadProgress(0);
        try {
            const update = await tauriCheck();
            if (!update) throw new Error('桌面更新源暂未提供可安装包');
            let downloaded = 0;
            let contentLength = 0;
            await update.downloadAndInstall(event => {
                if (event.event === 'Started') contentLength = event.data.contentLength || 0;
                if (event.event === 'Progress') {
                    downloaded += event.data.chunkLength;
                    if (contentLength > 0) setDownloadProgress(Math.min(100, Math.round(downloaded / contentLength * 100)));
                }
                if (event.event === 'Finished') setDownloadProgress(100);
            });
            setDownloadProgress(100);
            setUpdateState('ready');
        } catch (error) {
            const message = String(error);
            setUpdateError(message);
            setUpdateState('error');
            showToast(message, 'error', 6000);
        }
    };

    const restartForUpdate = async () => {
        try {
            await tauriRelaunch();
        } catch (error) {
            const message = String(error);
            setUpdateError(message);
            setUpdateState('error');
            showToast(message, 'error', 6000);
        }
    };

    useEffect(() => { scan(); }, []);

    const run = async (command: 'localization_apply' | 'localization_restore') => {
        setBusy(true);
        try {
            await invoke(command);
            showToast(command === 'localization_apply' ? '汉化已应用，重启 Antigravity 后生效' : '已取消汉化并恢复原版', 'success');
        } catch (error) {
            showToast(String(error), 'error', 6000);
        } finally {
            setBusy(false);
        }
    };

    const saveProxy = async () => {
        const numericPort = Number(port);
        if (!host.trim() || !Number.isInteger(numericPort) || numericPort < 1 || numericPort > 65535) {
            showToast('请输入有效的代理地址和端口', 'warning');
            return;
        }
        setBusy(true);
        try {
            localStorage.setItem(`ag.proxyDir.${target}`, proxyDir);
            const path = await invoke<string>('localization_save_proxy', { target, host, port: numericPort, proxyType, username, password, proxyDir, enabled: proxyEnabled });
            showToast(`代理配置已保存：${path}`, 'success', 5000);
        } catch (error) {
            showToast(String(error), 'error', 6000);
        } finally {
            setBusy(false);
        }
    };

    const toggleProxy = async (enabled: boolean) => {
        setProxyEnabled(enabled);
        localStorage.setItem('ag.proxyEnabled', String(enabled));
        try {
            await invoke('localization_set_proxy_enabled', { target, enabled, proxyDir });
            showToast(enabled ? c.proxyEnabled : c.proxyDisabled, 'success');
        } catch (error) {
            // A config may not exist until the first save; keep the choice for that save.
            const message = String(error);
            if (!message.includes('未找到代理配置')) showToast(message, 'error');
        }
    };

    const checkProxy = async () => {
        const numericPort = Number(port);
        if (!host.trim() || !Number.isInteger(numericPort) || numericPort < 1 || numericPort > 65535) {
            setProxyCheckState('error');
            setProxyCheckMessage('请输入有效的代理地址和端口');
            return;
        }
        setProxyCheckState('checking');
        setProxyCheckMessage('');
        try {
            const result = await invoke<{ ok: boolean; latency_ms: number; message: string }>('localization_check_proxy', {
                host,
                port: numericPort,
                proxyType,
                username,
                password,
            });
            setProxyCheckState(result.ok ? 'success' : 'error');
            setProxyCheckMessage(`${result.ok ? c.proxyReachable : c.proxyUnreachable} · ${result.message}${result.ok ? ` · ${result.latency_ms} ms` : ''}`);
        } catch (error) {
            setProxyCheckState('error');
            setProxyCheckMessage(String(error));
        }
    };

    const launch = async () => {
        try {
            await invoke('localization_launch', { target, proxyDir });
            showToast('已静默启动目标程序', 'success');
        } catch (error) {
            showToast(String(error), 'error');
        }
    };

    const restartTarget = async () => {
        setBusy(true);
        try {
            await invoke('localization_restart', { target, proxyDir });
            showToast('目标程序已重启', 'success');
        } catch (error) {
            showToast(String(error), 'error');
        } finally {
            setBusy(false);
        }
    };

    useEffect(() => {
        const onLaunch = () => { void launch(); };
        const onRestart = () => { void restartTarget(); };
        window.addEventListener('antigravity:launch-target', onLaunch);
        window.addEventListener('antigravity:restart-target', onRestart);
        return () => {
            window.removeEventListener('antigravity:launch-target', onLaunch);
            window.removeEventListener('antigravity:restart-target', onRestart);
        };
    });

    return (
        <div data-page-scroll className="h-full overflow-y-auto px-5 py-4 lg:px-7 lg:py-5 max-w-7xl mx-auto w-full space-y-4">
            <div className="space-y-4">
                <section className="bg-white dark:bg-base-100 rounded-2xl border border-gray-100 dark:border-base-200 shadow-sm p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div><div className="text-xs font-semibold tracking-wider text-gray-400 uppercase">{c.installation}</div><h2 className="text-lg font-bold text-gray-900 dark:text-white mt-1">Antigravity</h2></div>
                        <div className={`badge gap-1 ${installation ? 'badge-success' : 'badge-warning'}`}><CheckCircle2 size={13} />{installation ? c.found : c.missing}</div>
                    </div>
                    <div className="mt-4 p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/70 font-mono text-xs break-all text-slate-700 dark:text-slate-300 min-h-11 flex items-center">{installation?.path || c.installHint}</div>
                    <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400 truncate">{c.resources}：{installation?.resources || c.waiting}</div>
                </section>
                <section className="bg-white dark:bg-base-100 rounded-2xl border border-gray-100 dark:border-base-200 shadow-sm px-5 py-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <div className="text-[11px] font-semibold tracking-[0.16em] text-gray-400 uppercase">{c.language}</div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white mt-1">{c.language}</h2>
                            <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400 mt-1">{c.languageDesc}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full lg:w-auto lg:min-w-[360px]">
                            <button className="btn btn-sm h-10 px-4 justify-center gap-2 rounded-xl border border-blue-400/25 bg-blue-500/15 text-blue-700 shadow-none dark:text-blue-100 hover:bg-blue-500/25 hover:shadow-none focus:shadow-none" onClick={() => run('localization_apply')} disabled={busy || !installation}><Languages size={15} />{c.apply}</button>
                            <button className="btn btn-ghost btn-sm h-10 px-4 justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700/70 bg-slate-100 dark:bg-slate-900/30 hover:bg-slate-200 dark:hover:bg-slate-800" onClick={() => run('localization_restore')} disabled={busy || !installation}><RotateCcw size={15} />{c.restore}</button>
                        </div>
                    </div>
                </section>
            </div>

            <div className="bg-white dark:bg-base-100 rounded-xl border border-gray-100 dark:border-base-200 shadow-sm overflow-hidden">
                 <div className="px-6 py-5 border-b border-slate-200 dark:border-base-200 flex flex-wrap items-center gap-3"><div className="w-10 h-10 shrink-0 rounded-xl bg-blue-500/10 flex items-center justify-center"><Network className="text-blue-500" size={21} /></div><div className="min-w-0"><h2 className="font-bold text-gray-900 dark:text-white">{c.proxy}</h2><p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.proxyDesc}</p></div><div className="ml-auto flex flex-wrap items-center justify-end gap-2"><div className="hidden xl:flex items-center gap-1.5 text-xs text-gray-500"><ShieldCheck size={15} className="text-emerald-500" />{c.process}</div><label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200"><span>{proxyEnabled ? c.proxyEnabled : c.proxyDisabled}</span><input type="checkbox" className="toggle toggle-primary toggle-sm" checked={proxyEnabled} onChange={e => toggleProxy(e.target.checked)} /></label></div></div>
                <div className="px-6 pb-6 pt-8 md:px-7 md:pb-7 md:pt-9">
                    <div className="mx-auto w-full max-w-5xl space-y-5">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5">
                        <label className="form-control block"><span className="label-text block text-xs font-medium mb-2">{c.target}</span><SelectField ariaLabel={c.target} value={target} onChange={value => setTarget(value as 'ide' | 'cli')} options={[{ value: 'ide', label: c.ide }, { value: 'cli', label: c.cli }]} /></label>
                        <label className="form-control block"><span className="label-text block text-xs font-medium mb-2">{c.protocol}</span><SelectField ariaLabel={c.protocol} value={proxyType} onChange={setProxyType} options={[{ value: 'socks5', label: 'SOCKS5' }, { value: 'http', label: 'HTTP CONNECT' }]} /></label>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5">
                        <label className="form-control block"><span className="label-text block text-xs font-medium mb-2">{c.host}</span><input className="input input-bordered rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700/60 text-slate-800 dark:text-slate-100 placeholder:text-slate-500 px-4 focus:outline-none focus:ring-1 focus:ring-blue-400/50 focus:border-blue-400/50" value={host} onChange={e => setHost(e.target.value)} placeholder="127.0.0.1" /></label>
                        <label className="form-control block"><span className="label-text block text-xs font-medium mb-2">{c.port}</span><input inputMode="numeric" className="input input-bordered w-full max-w-[240px] rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700/60 text-slate-800 dark:text-slate-100 placeholder:text-slate-500 px-4 focus:outline-none focus:ring-1 focus:ring-blue-400/50 focus:border-blue-400/50" value={port} onChange={e => setPort(e.target.value)} placeholder="7890" /></label>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5">
                        <label className="form-control block"><span className="label-text block text-xs font-medium mb-2">{c.username} <span className="text-gray-400">{c.optional}</span></span><input className="input input-bordered rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700/60 text-slate-800 dark:text-slate-100 placeholder:text-slate-500 px-4 focus:outline-none focus:ring-1 focus:ring-blue-400/50 focus:border-blue-400/50" value={username} onChange={e => setUsername(e.target.value)} placeholder={c.noAuth} /></label>
                        <label className="form-control block"><span className="label-text block text-xs font-medium mb-2">{c.password} <span className="text-gray-400">{c.optional}</span></span><input type="password" className="input input-bordered rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700/60 text-slate-800 dark:text-slate-100 placeholder:text-slate-500 px-4 focus:outline-none focus:ring-1 focus:ring-blue-400/50 focus:border-blue-400/50" value={password} onChange={e => setPassword(e.target.value)} placeholder={c.noAuth} /></label>
                    </div>
                    <label className="form-control block"><span className="label-text block text-xs font-medium mb-2 flex items-center gap-1">{c.proxyDir} <span className="text-gray-400">{c.optional}</span><CircleHelp size={13} className="text-gray-400" /></span><input className="input input-bordered rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700/60 text-slate-800 dark:text-slate-100 placeholder:text-slate-500 px-4 focus:outline-none focus:ring-1 focus:ring-blue-400/50 focus:border-blue-400/50" value={proxyDir} onChange={e => setProxyDir(e.target.value)} placeholder={c.proxyDirHint} /></label>
                    </div>
                    </div>
                <div className="border-t border-slate-200 dark:border-white/10 px-6 py-4 md:px-7"><div className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-xs text-gray-500 flex items-center gap-1.5"><FolderSearch size={14} />{c.saveHint}</p>{proxyCheckMessage && <p className={`mt-1 text-xs ${proxyCheckState === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-300'}`}>{proxyCheckMessage}</p>}</div><div className="flex flex-wrap gap-2"><button className="btn btn-ghost btn-sm px-4 gap-2 rounded-xl border border-slate-300 dark:border-slate-600/70 shadow-none hover:shadow-none focus:shadow-none" onClick={checkProxy} disabled={busy || proxyCheckState === 'checking'}><Network size={17} strokeWidth={1.8} className={`shrink-0 ${proxyCheckState === 'checking' ? 'animate-pulse' : ''}`} />{proxyCheckState === 'checking' ? c.proxyChecking : c.checkProxy}</button><button className="btn btn-primary btn-sm px-4 gap-2 rounded-xl border border-slate-300 dark:border-slate-600/70 shadow-none hover:shadow-none focus:shadow-none" onClick={saveProxy} disabled={busy}><Save size={17} strokeWidth={1.8} className="shrink-0" />{c.save}</button></div></div></div>
            </div>

            <div className="bg-white dark:bg-base-100 rounded-xl border border-gray-100 dark:border-base-200 shadow-sm p-5">
                <div className="flex items-center gap-3 mb-4"><div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center"><Power size={18} className="text-violet-500" /></div><div><h2 className="font-bold text-gray-900 dark:text-white">{c.behavior}</h2><p className="text-xs text-gray-500 dark:text-gray-400">{c.behaviorDesc}</p></div></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {([{value:autoStart,key:'autoStart',title:c.autoStart,desc:c.autoStartDesc,Icon:Power},{value:silentStart,key:'silentStart',title:c.silent,desc:c.silentDesc,Icon:Moon},{value:minimizeOnClose,key:'minimizeOnClose',title:c.minimize,desc:c.minimizeDesc,Icon:Minimize2},{value:proxyOnlyWhileOpen,key:'proxyOnlyWhileOpen',title:c.onlyOpen,desc:c.onlyOpenDesc,Icon:Network}]).map(({value,key,title,desc,Icon}) => <label key={key} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-slate-100 px-3 py-3 text-slate-900 transition-colors hover:bg-slate-200 dark:border-base-200 dark:bg-slate-900/50 dark:text-slate-100 dark:hover:bg-slate-800/70"><input type="checkbox" className="toggle toggle-primary toggle-sm" checked={value} onChange={e => { const v=e.target.checked; if(key==='autoStart') setAutoStart(v); else if(key==='silentStart') setSilentStart(v); else if(key==='minimizeOnClose') setMinimizeOnClose(v); else setProxyOnlyWhileOpen(v); updatePreference(key,v); }} /><Icon size={16} className="text-gray-500 dark:text-gray-400" /><span><span className="block text-sm font-medium">{title}</span><span className="block text-[11px] text-gray-600 dark:text-gray-400">{desc}</span></span></label>)}
                </div>
            </div>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-base-200 dark:bg-base-100">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10"><Download size={18} className="text-blue-500" /></div>
                        <div><h2 className="font-bold text-gray-900 dark:text-white">{c.updates}</h2><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{c.updatesDesc}</p></div>
                    </div>
                    <button onClick={checkUpdates} className="btn btn-sm h-10 shrink-0 gap-2 rounded-xl border border-slate-300 bg-slate-100 px-4 shadow-none hover:bg-slate-200 dark:border-slate-700/70 dark:bg-slate-800/40 dark:hover:bg-slate-700/60" disabled={busy || updateState === 'checking' || updateState === 'downloading'}><RefreshCw size={15} className={updateState === 'checking' ? 'animate-spin' : ''} />{c.checkUpdates}</button>
                </div>
                <div className="mt-4 border-t border-slate-200 pt-4 dark:border-white/10">
                    {updateState === 'idle' && <p className="text-xs text-gray-500 dark:text-gray-400">{c.updatesDesc}</p>}
                    {updateState === 'checking' && <p className="flex items-center gap-2 text-sm text-gray-500"><Loader2 size={15} className="animate-spin" />{c.checkUpdates}...</p>}
                    {updateState === 'current' && updateInfo && <p className="text-sm text-emerald-600 dark:text-emerald-400">{c.upToDate} · v{updateInfo.current_version}</p>}
                    {updateState === 'available' && updateInfo && <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-blue-600 dark:text-blue-300">{c.updateFound} · v{updateInfo.current_version} → v{updateInfo.latest_version}</p><button onClick={installUpdate} className="btn btn-sm h-10 gap-2 rounded-xl border border-blue-400/30 bg-blue-500/15 px-4 text-blue-700 shadow-none hover:bg-blue-500/25 dark:text-blue-100"><Download size={15} />{c.installUpdate}</button></div>}
                    {updateState === 'downloading' && <div className="space-y-2"><div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300"><span className="flex items-center gap-2"><Loader2 size={15} className="animate-spin" />{c.downloading}</span><span>{downloadProgress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-blue-500 transition-[width] duration-300" style={{ width: `${downloadProgress}%` }} /></div></div>}
                    {updateState === 'ready' && <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-emerald-600 dark:text-emerald-400">{c.installReady}</p><button onClick={restartForUpdate} className="btn btn-sm h-10 gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-4 text-emerald-700 shadow-none hover:bg-emerald-500/25 dark:text-emerald-100"><RotateCw size={15} />{c.restartNow}</button></div>}
                    {updateState === 'unsupported' && <p className="text-sm text-amber-600 dark:text-amber-300">{c.desktopOnly}</p>}
                    {updateState === 'error' && <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-red-600 dark:text-red-300">{c.updateError}: {updateError}</p><button onClick={checkUpdates} className="btn btn-sm h-9 gap-2 rounded-xl border border-red-300/50 bg-red-500/10 px-3 text-red-700 shadow-none hover:bg-red-500/20 dark:text-red-200"><RotateCw size={14} />{c.checkUpdates}</button></div>}
                </div>
            </section>

        </div>
    );
};

export default Localization;
