import React, { createContext, useContext, useEffect } from 'react';
import { useTheme as useThemeHook } from './use-theme';

interface ThemeContextType {
  setTheme: (colors: { primaryColor: string; secondaryColor?: string; accentColor?: string }) => void;
  resetTheme: () => void;
  loadSavedTheme: () => Promise<void>;
  applyTheme: (colors: { primaryColor: string; secondaryColor?: string; accentColor?: string }) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeHook();

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
