import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { getTheme } from '../theme/theme';

const DEFAULT_COLOR = '#3dfc55';
const STORAGE_KEY = 'expexc_theme_color';
const MODE_KEY = 'expexc_color_mode';

type ColorMode = 'dark' | 'light' | 'system';

interface CustomThemeContextType {
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  resetTheme: () => void;
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  resolvedMode: 'dark' | 'light';
}

const CustomThemeContext = createContext<CustomThemeContextType | undefined>(undefined);

function getSystemMode(): 'dark' | 'light' {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'dark';
  }
}

export const CustomThemeContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [primaryColor, setPrimaryColorState] = useState<string>(() => {
    try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_COLOR; }
    catch { return DEFAULT_COLOR; }
  });

  const [colorMode, setColorModeState] = useState<ColorMode>(() => {
    try { return (localStorage.getItem(MODE_KEY) as ColorMode) || 'dark'; }
    catch { return 'dark'; }
  });

  const [systemMode, setSystemMode] = useState<'dark' | 'light'>(getSystemMode);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemMode(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const resolvedMode: 'dark' | 'light' = colorMode === 'system' ? systemMode : colorMode;

  const theme = useMemo(() => getTheme(primaryColor, resolvedMode), [primaryColor, resolvedMode]);

  const setPrimaryColor = (color: string) => {
    setPrimaryColorState(color);
    try { localStorage.setItem(STORAGE_KEY, color); } catch { }
  };

  const setColorMode = (mode: ColorMode) => {
    setColorModeState(mode);
    try { localStorage.setItem(MODE_KEY, mode); } catch { }
  };

  const resetTheme = () => setPrimaryColor(DEFAULT_COLOR);

  return (
    <CustomThemeContext.Provider value={{ primaryColor, setPrimaryColor, resetTheme, colorMode, setColorMode, resolvedMode }}>
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    </CustomThemeContext.Provider>
  );
};

export const useCustomTheme = () => {
  const context = useContext(CustomThemeContext);
  if (!context) {
    throw new Error('useCustomTheme must be used within a CustomThemeContextProvider');
  }
  return context;
};
