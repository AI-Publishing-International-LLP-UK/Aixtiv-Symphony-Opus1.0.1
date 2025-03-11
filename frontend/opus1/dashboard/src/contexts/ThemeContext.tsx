import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Tailwind-compatible theme colors
interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  error: string;
  success: string;
  warning: string;
  info: string;
}

// Predefined themes for ASOOS
export interface Theme {
  name: string;
  mode: 'light' | 'dark';
  colors: ThemeColors;
  fontFamily: string;
  borderRadius: string;
  spacing: Record<string, string>;
}

// Theme configurations
const lightTheme: Theme = {
  name: 'light',
  mode: 'light',
  colors: {
    primary: '#4f46e5', // indigo-600
    secondary: '#7c3aed', // violet-600
    background: '#ffffff',
    surface: '#f9fafb', // gray-50
    text: '#111827', // gray-900
    error: '#ef4444', // red-500
    success: '#10b981', // emerald-500
    warning: '#f59e0b', // amber-500
    info: '#3b82f6', // blue-500
  },
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  borderRadius: '0.25rem',
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  }
};

const darkTheme: Theme = {
  name: 'dark',
  mode: 'dark',
  colors: {
    primary: '#6366f1', // indigo-500
    secondary: '#8b5cf6', // violet-500
    background: '#18181b', // zinc-900
    surface: '#27272a', // zinc-800
    text: '#f9fafb', // gray-50
    error: '#f87171', // red-400
    success: '#34d399', // emerald-400
    warning: '#fbbf24', // amber-400
    info: '#60a5fa', // blue-400
  },
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  borderRadius: '0.25rem',
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  }
};

// ASOOS special branded theme
const symphonyTheme: Theme = {
  name: 'symphony',
  mode: 'dark',
  colors: {
    primary: '#6d28d9', // violet-700
    secondary: '#4f46e5', // indigo-600
    background: '#0f172a', // slate-900
    surface: '#1e293b', // slate-800
    text: '#f1f5f9', // slate-100
    error: '#ef4444', // red-500
    success: '#10b981', // emerald-500
    warning: '#f59e0b', // amber-500
    info: '#3b82f6', // blue-500
  },
  fontFamily: '"Poppins", system-ui, -apple-system, sans-serif',
  borderRadius: '0.5rem',
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  }
};

const availableThemes = {
  light: lightTheme,
  dark: darkTheme,
  symphony: symphonyTheme
};

interface ThemeContextType {
  theme: Theme;
  setTheme: (name: keyof typeof availableThemes) => void;
  allThemes: typeof availableThemes;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Local storage key for theme preference
const THEME_STORAGE_KEY = 'asoos_theme_preference';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize with stored theme or system preference
  const getInitialTheme = (): Theme => {
    if (typeof window !== 'undefined') {
      // Check for saved preference
      const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (storedTheme && availableThemes[storedTheme as keyof typeof availableThemes]) {
        return availableThemes[storedTheme as keyof typeof availableThemes];
      }
      
      // Check for system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return darkTheme;
      }
    }
    
    // Default to symphony theme
    return symphonyTheme;
  };

  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  // Apply theme changes to document
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove previous theme classes
    root.classList.remove('light-theme', 'dark-theme', 'symphony-theme');
    
    // Add current theme class
    root.classList.add(`${theme.name}-theme`);
    
    // Set theme mode for Tailwind
    if (theme.mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Set CSS variables for the theme
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    
    root.style.setProperty('--font-family', theme.fontFamily);
    root.style.setProperty('--border-radius', theme.borderRadius);
    
    // Save theme preference to local storage
    localStorage.setItem(THEME_STORAGE_KEY, theme.name);
  }, [theme]);

  const setTheme = (name: keyof typeof availableThemes) => {
    if (availableThemes[name]) {
      setThemeState(availableThemes[name]);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, allThemes: availableThemes }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

