'use client';

import * as React from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme, Theme, PaletteMode } from '@mui/material';
import EmotionCacheProvider from './EmotionCache';

// Define the light theme palette
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1a73e8',
      light: '#4285f4',
      dark: '#0d47a1',
    },
    secondary: {
      main: '#ea4335',
      light: '#ff7961',
      dark: '#c62828',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 500,
      fontSize: '2.5rem',
    },
    h2: {
      fontWeight: 500,
      fontSize: '2rem',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.08)',
        },
      },
    },
  },
});

// Define the dark theme palette
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4285f4',
      light: '#80b1ff',
      dark: '#0d47a1',
    },
    secondary: {
      main: '#ff5252',
      light: '#ff867f',
      dark: '#c50e29',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.15)',
        },
      },
    },
  },
});

// Create a context for theme mode switching
const ColorModeContext = React.createContext({ 
  toggleColorMode: () => {},
  mode: 'light' as PaletteMode
});

export const useColorMode = () => React.useContext(ColorModeContext);

export interface ThemeRegistryProps {
  children: React.ReactNode;
}

/**
 * ThemeRegistry component that provides Material UI theming with EmotionCache
 * for proper server-side rendering in Next.js 14 App Router
 */
export default function ThemeRegistry({ children }: ThemeRegistryProps) {
  // State for managing theme mode
  const [mode, setMode] = React.useState<PaletteMode>('light');
  
  // Memoize the color mode toggler to prevent unnecessary re-renders
  const colorMode = React.useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
      mode,
    }),
    [mode]
  );

  // Choose the appropriate theme based on the mode
  const theme = React.useMemo(
    () => (mode === 'light' ? lightTheme : darkTheme),
    [mode]
  );

  return (
    <EmotionCacheProvider options={{ key: 'mui' }}>
      <ColorModeContext.Provider value={colorMode}>
        <ThemeProvider theme={theme}>
          {/* CssBaseline kickstarts an elegant, consistent, and simple baseline to build upon */}
          <CssBaseline />
          {children}
        </ThemeProvider>
      </ColorModeContext.Provider>
    </EmotionCacheProvider>
  );
}

