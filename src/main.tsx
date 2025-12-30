import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { themeManager } from './lib/themeManager.ts';
import './index.css';

const savedTheme = themeManager.getSavedTheme() || 'auto';
themeManager.applyTheme(savedTheme);

if (savedTheme === 'auto') {
  themeManager.listenToSystemThemeChanges((theme) => {
    themeManager.applyTheme('auto');
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
