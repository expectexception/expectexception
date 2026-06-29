import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { ThemeProvider, Theme } from '@mui/material/styles';
import { getTheme } from '../theme/theme';

interface CustomThemeContextType {
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  resetTheme: () => void;
}

const CustomThemeContext = createContext<CustomThemeContextType | undefined>(undefined);

export const CustomThemeContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [primaryColor, setPrimaryColor] = useState('#3dfc55'); // Default neon green

  const theme = useMemo(() => getTheme(primaryColor), [primaryColor]);

  const resetTheme = () => setPrimaryColor('#3dfc55');

  return (
    <CustomThemeContext.Provider value={{ primaryColor, setPrimaryColor, resetTheme }}>
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
