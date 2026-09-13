import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from './components/layout/Layout';
import ThemeManager from './components/common/ThemeManager';
import Localization from './pages/Localization';
import { useConfigStore } from './stores/useConfigStore';

const router = createBrowserRouter([
  { path: '/', element: <Layout />, children: [
    { index: true, element: <Localization /> },
    { path: 'localization', element: <Localization /> },
  ]},
]);

function App() {
  const { config, loadConfig } = useConfigStore();
  const { i18n } = useTranslation();

  useEffect(() => { loadConfig(); }, [loadConfig]);
  useEffect(() => {
    if (!config?.language) return;
    i18n.changeLanguage(config.language);
    document.documentElement.dir = config.language === 'ar' ? 'rtl' : 'ltr';
  }, [config?.language, i18n]);

  return <><ThemeManager /><RouterProvider router={router} /></>;
}

export default App;
