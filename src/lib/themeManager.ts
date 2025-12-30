export type Theme = 'light' | 'dark' | 'auto';

const THEME_STORAGE_KEY = 'image-pro-theme';
const THEME_ATTRIBUTE = 'data-theme';

export const themeManager = {
  getSystemTheme: (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  },

  getSavedTheme: (): Theme | null => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      return saved as Theme | null;
    } catch (e) {
      console.warn('Failed to read theme from localStorage:', e);
      return null;
    }
  },

  saveTheme: (theme: Theme): void => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (e) {
      console.warn('Failed to save theme to localStorage:', e);
    }
  },

  getEffectiveTheme: (theme: Theme): 'light' | 'dark' => {
    if (theme === 'auto') {
      return themeManager.getSystemTheme();
    }
    return theme;
  },

  applyTheme: (theme: Theme): void => {
    const effectiveTheme = themeManager.getEffectiveTheme(theme);

    if (typeof document === 'undefined') return;

    document.documentElement.setAttribute(THEME_ATTRIBUTE, effectiveTheme);

    if (theme === 'auto') {
      document.documentElement.removeAttribute(THEME_ATTRIBUTE);
    }
  },

  initializeTheme: (theme: Theme): void => {
    themeManager.saveTheme(theme);
    themeManager.applyTheme(theme);
  },

  listenToSystemThemeChanges: (callback: (theme: 'light' | 'dark') => void): (() => void) => {
    if (typeof window === 'undefined') return () => {};

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      callback(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  },
};
