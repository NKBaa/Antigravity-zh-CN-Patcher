import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LogoIcon from '../../../src-tauri/icons/icon.png';

export function NavLogo() {
    const { t } = useTranslation();

    return (
        <Link to="/" draggable="false" className="flex w-full min-w-0 items-center gap-2 text-xl font-semibold text-gray-900 dark:text-base-content">
            <div className="relative flex shrink-0 items-center justify-center">
                <img
                    src={LogoIcon}
                    alt="Logo"
                    className="relative z-10 h-8 w-8 shrink-0 cursor-pointer object-contain transition-transform active:scale-95"
                    draggable="false"
                />
            </div>

            {/* 父容器宽度 < 200px 隐藏 */}
            <span className="hidden @[200px]/logo:inline text-nowrap">{t('common.app_name', 'Antigravity Patcher')}</span>
        </Link>
    );
}
