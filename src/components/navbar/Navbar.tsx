import { useEffect, useState } from 'react';
import { useConfigStore } from '../../stores/useConfigStore';
import { isTauri, isLinux } from '../../utils/env';
import { NavLogo } from './NavLogo';
import { NavSettings } from './NavSettings';
import i18n from '../../i18n';
import { Rocket, RotateCw } from 'lucide-react';

function TargetActions() {
    const isChinese = (i18n.language || '').startsWith('zh');
    const launchLabel = i18n.t('localization.launch', isChinese ? '启动目标' : 'Launch target');
    const restartLabel = i18n.t('localization.restartNow', isChinese ? '立即重启' : 'Restart target');
    const emit = (action: 'launch' | 'restart') => {
        window.dispatchEvent(new CustomEvent(`antigravity:${action}-target`));
    };

    // Keep both target actions comfortably tappable while preserving the compact navbar.
    const buttonClass = 'h-11 min-h-11 whitespace-nowrap px-5 gap-2.5 rounded-xl border border-slate-300 dark:border-slate-600/70 bg-transparent text-slate-700 dark:text-slate-200 shadow-none hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:shadow-none focus:shadow-none touch-manipulation';
    const iconClass = 'shrink-0';
    return (
        <div className="flex items-center gap-2">
            <button className={`btn btn-ghost btn-sm hidden min-[480px]:inline-flex ${buttonClass}`} onClick={() => emit('launch')} title={launchLabel} aria-label={launchLabel}>
                <Rocket size={17} strokeWidth={1.8} className={iconClass} />{launchLabel}
            </button>
            <button className={`btn btn-ghost btn-sm hidden min-[480px]:inline-flex ${buttonClass}`} onClick={() => emit('restart')} title={restartLabel} aria-label={restartLabel}>
                <RotateCw size={17} strokeWidth={1.8} className={iconClass} />{restartLabel}
            </button>
            <button className="btn btn-ghost btn-sm inline-flex min-[480px]:hidden h-11 w-11 min-h-11 min-w-11 rounded-xl border border-slate-300 p-0 text-slate-700 shadow-none dark:border-slate-600/70 dark:text-slate-200 touch-manipulation" onClick={() => emit('launch')} title={launchLabel} aria-label={launchLabel}>
                <Rocket size={17} strokeWidth={1.8} />
            </button>
            <button className="btn btn-ghost btn-sm inline-flex min-[480px]:hidden h-11 w-11 min-h-11 min-w-11 rounded-xl border border-slate-300 p-0 text-slate-700 shadow-none dark:border-slate-600/70 dark:text-slate-200 touch-manipulation" onClick={() => emit('restart')} title={restartLabel} aria-label={restartLabel}>
                <RotateCw size={17} strokeWidth={1.8} />
            </button>
        </div>
    );
}

/**
 * Navbar 主组件
 * 
 * 职责: 只负责布局 and 状态管理,不处理响应式细节
 * 响应式逻辑由各个子组件独立处理
 */
function Navbar() {
    const { config, saveConfig } = useConfigStore();
    const [isScrolled, setIsScrolled] = useState(false);

    // 内容区域独立滚动时，让标题栏进入紧凑状态。
    useEffect(() => {
        const scrollContainer = document.querySelector<HTMLElement>('[data-page-scroll]');
        if (!scrollContainer) return;

        const updateScrollState = () => setIsScrolled(scrollContainer.scrollTop > 12);
        updateScrollState();
        scrollContainer.addEventListener('scroll', updateScrollState, { passive: true });
        return () => scrollContainer.removeEventListener('scroll', updateScrollState);
    }, []);

    // 主题切换逻辑(带 View Transition 动画)
    const toggleTheme = async (event: React.MouseEvent<HTMLButtonElement>) => {
        if (!config) return;

        const newTheme = config.theme === 'light' ? 'dark' : 'light';

        // Use View Transition API if supported, but skip on Linux (may cause crash)
        if ('startViewTransition' in document && !isLinux()) {
            const x = event.clientX;
            const y = event.clientY;
            const endRadius = Math.hypot(
                Math.max(x, window.innerWidth - x),
                Math.max(y, window.innerHeight - y)
            );

            // @ts-ignore
            const transition = document.startViewTransition(async () => {
                saveConfig({
                    ...config,
                    theme: newTheme,
                    language: config.language
                }, true);
            });

            transition.ready.then(() => {
                const isDarkMode = newTheme === 'dark';
                const clipPath = isDarkMode
                    ? [`circle(${endRadius}px at ${x}px ${y}px)`, `circle(0px at ${x}px ${y}px)`]
                    : [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`];

                document.documentElement.animate(
                    {
                        clipPath: clipPath
                    },
                    {
                        duration: 500,
                        easing: 'ease-in-out',
                        fill: 'forwards',
                        pseudoElement: isDarkMode ? '::view-transition-old(root)' : '::view-transition-new(root)'
                    }
                );
            });
        } else {
            // Fallback: direct switch (Linux or browsers without View Transition)
            await saveConfig({
                ...config,
                theme: newTheme,
                language: config.language
            }, true);
        }
    };

    // 语言切换逻辑
    const handleLanguageChange = async (langCode: string) => {
        await i18n.changeLanguage(langCode);
        document.documentElement.dir = langCode === 'ar' ? 'rtl' : 'ltr';
        if (!config) return;
        await saveConfig({
            ...config,
            language: langCode,
            theme: config.theme
        }, true);
    };

    return (
        <nav
            style={{ position: 'sticky', top: 0, zIndex: 50 }}
            className="bg-transparent pt-1 transition-all duration-300"
        >
            {/* 窗口拖拽区域 - Tauri 专用 */}
            {isTauri() && (
                <div
                    className="absolute top-1 left-0 right-0 h-14"
                    style={{ zIndex: 5, backgroundColor: 'rgba(0,0,0,0.001)' }}
                    data-tauri-drag-region
                />
            )}

            <div
                className="relative w-full bg-transparent px-5 shadow-none backdrop-blur-none transition-[padding] duration-300 ease-out sm:px-6"
                style={{ zIndex: 10, transform: `scale(${isScrolled ? 0.985 : 1})`, transformOrigin: 'center center', transition: 'transform 300ms ease-out, padding 300ms ease-out' }}
            >
                {/* Flexbox 布局 - 子组件自己处理响应式 */}
                <div className={`flex items-center gap-4 transition-[height] duration-300 ease-out ${isScrolled ? 'h-12' : 'h-14'}`}>
                    {/* Logo - 使用剩余空间承载品牌，操作按钮固定在右侧 */}
                    <div className="@container/logo min-w-0 flex-1">
                        <NavLogo />
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                        <TargetActions />
                        <NavSettings
                            theme={(config?.theme as 'light' | 'dark') || 'light'}
                            currentLanguage={config?.language || 'en'}
                            onThemeToggle={toggleTheme}
                            onLanguageChange={handleLanguageChange}
                        />
                    </div>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
