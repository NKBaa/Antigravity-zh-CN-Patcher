import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Sun, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Language } from './constants';

// useClickOutside Hook
export function useClickOutside(
    ref: React.RefObject<HTMLElement | null>,
    handler: () => void
) {
    useEffect(() => {
        const listener = (event: MouseEvent) => {
            if (!ref.current || ref.current.contains(event.target as Node)) {
                return;
            }
            handler();
        };

        document.addEventListener('mousedown', listener);
        return () => document.removeEventListener('mousedown', listener);
    }, [ref, handler]);
}

// 语言下拉菜单组件
interface LanguageDropdownProps {
    currentLanguage: string;
    languages: Language[];
    onLanguageChange: (langCode: string) => void;
    className?: string;
}

export function LanguageDropdown({
    currentLanguage,
    languages,
    onLanguageChange,
    className = ''
}: LanguageDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { t } = useTranslation();

    useClickOutside(menuRef, () => setIsOpen(false));

    const handleLanguageChange = (langCode: string) => {
        onLanguageChange(langCode);
        setIsOpen(false);
    };

    return (
        <div className={`relative ${className}`} ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-10 h-10 rounded-full bg-gray-100 dark:bg-base-200 hover:bg-gray-200 dark:hover:bg-base-100 flex items-center justify-center transition-colors"
                title={t('settings.general.language')}
            >
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                    {languages.find(l => l.code === currentLanguage)?.short || 'EN'}
                </span>
            </button>

            {/* 下拉菜单 */}
            {isOpen && (
                <div className="absolute ltr:right-0 rtl:left-0 mt-2 w-32 bg-white dark:bg-base-200 rounded-xl shadow-lg border border-gray-100 dark:border-base-100 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-200 ltr:origin-top-right rtl:origin-top-left">
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => handleLanguageChange(lang.code)}
                            className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-50 dark:hover:bg-base-100 transition-colors ${currentLanguage === lang.code
                                ? 'text-blue-500 font-medium bg-blue-50 dark:bg-blue-900/10'
                                : 'text-gray-700 dark:text-gray-300'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="font-mono font-bold w-6">{lang.short}</span>
                                <span className="text-xs opacity-70">{lang.label}</span>
                            </div>
                            {currentLanguage === lang.code && (
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// 更多菜单组件 (< 480px)
interface MoreDropdownProps {
    theme: 'light' | 'dark';
    currentLanguage: string;
    languages: Language[];
    onThemeToggle: (event: React.MouseEvent<HTMLButtonElement>) => void;
    onLanguageChange: (langCode: string) => void;
}

export function MoreDropdown({
    theme,
    currentLanguage,
    languages,
    onThemeToggle,
    onLanguageChange
}: MoreDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { t } = useTranslation();
    useClickOutside(menuRef, () => setIsOpen(false));

    const handleThemeToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
        onThemeToggle(event);
        setIsOpen(false);
    };

    const handleLanguageChange = (langCode: string) => {
        onLanguageChange(langCode);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-10 h-10 rounded-full bg-gray-100 dark:bg-base-200 hover:bg-gray-200 dark:hover:bg-base-100 flex items-center justify-center transition-colors"
                title={t('nav.more', '更多')}
            >
                <MoreVertical className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>

            {/* 下拉菜单 */}
            {isOpen && (
                <div className="absolute ltr:right-0 rtl:left-0 mt-2 w-40 bg-white dark:bg-base-200 rounded-xl shadow-lg border border-gray-100 dark:border-base-100 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-200 ltr:origin-top-right rtl:origin-top-left">
                    {/* 主题切换 */}
                    <button
                        onClick={handleThemeToggle}
                        className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-base-100 transition-colors text-gray-700 dark:text-gray-300"
                    >
                        {theme === 'light' ? (
                            <Moon className="w-4 h-4" />
                        ) : (
                            <Sun className="w-4 h-4" />
                        )}
                        <span>{theme === 'light' ? t('nav.theme_to_dark') : t('nav.theme_to_light')}</span>
                    </button>

                    {/* 分隔线 */}
                    <div className="my-1 border-t border-gray-100 dark:border-base-100"></div>

                    {/* 语言选择 */}
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => handleLanguageChange(lang.code)}
                            className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-50 dark:hover:bg-base-100 transition-colors ${currentLanguage === lang.code
                                ? 'text-blue-500 font-medium bg-blue-50 dark:bg-blue-900/10'
                                : 'text-gray-700 dark:text-gray-300'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs">{lang.short}</span>
                                <span className="text-xs opacity-70">{lang.label}</span>
                            </div>
                            {currentLanguage === lang.code && (
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            )}
                        </button>
                    ))}

                </div>
            )}
        </div>
    );
}
