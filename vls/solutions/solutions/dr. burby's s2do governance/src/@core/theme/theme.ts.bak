import { createTheme, ThemeOptions, PaletteMode } from '@mui/material';
import { deepmerge } from '@mui/utils';

// Tailwind CSS default color palette
const tailwindColors = {
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617'
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712'
  },
  zinc: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
    950: '#09090b'
  },
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554'
  },
  indigo: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
    950: '#1e1b4b'
  },
  purple: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
    950: '#3b0764'
  },
  teal: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
    950: '#042f2e'
  },
  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03'
  },
  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a'
  }
};

// Common typography settings
const typography = {
  fontFamily: [
    'Inter',
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
    '"Apple Color Emoji"',
    '"Segoe UI Emoji"',
    '"Segoe UI Symbol"'
  ].join(','),
  h1: {
    fontWeight: 700,
    fontSize: '2.5rem',
    lineHeight: 1.2
  },
  h2: {
    fontWeight: 700,
    fontSize: '2rem',
    lineHeight: 1.2
  },
  h3: {
    fontWeight: 600,
    fontSize: '1.75rem',
    lineHeight: 1.2
  },
  h4: {
    fontWeight: 600,
    fontSize: '1.5rem',
    lineHeight: 1.2
  },
  h5: {
    fontWeight: 600,
    fontSize: '1.25rem',
    lineHeight: 1.2
  },
  h6: {
    fontWeight: 600,
    fontSize: '1rem',
    lineHeight: 1.2
  },
  subtitle1: {
    fontSize: '1rem',
    lineHeight: 1.5
  },
  subtitle2: {
    fontSize: '0.875rem',
    lineHeight: 1.5,
    fontWeight: 500
  },
  body1: {
    fontSize: '1rem',
    lineHeight: 1.5
  },
  body2: {
    fontSize: '0.875rem',
    lineHeight: 1.5
  },
  button: {
    fontSize: '0.875rem',
    textTransform: 'none',
    fontWeight: 500
  },
  caption: {
    fontSize: '0.75rem',
    lineHeight: 1.5
  },
  overline: {
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em'
  }
};

// Common component overrides
const components = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        boxShadow: 'none',
        textTransform: 'none',
        '&:hover': {
          boxShadow: 'none'
        }
      },
      sizeSmall: {
        padding: '6px 16px'
      },
      sizeMedium: {
        padding: '8px 20px'
      },
      sizeLarge: {
        padding: '10px 24px'
      },
      contained: {
        '&:hover': {
          boxShadow: 'none'
        }
      }
    }
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        boxShadow: 
          '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)'
      }
    }
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: 12
      }
    }
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 12
      }
    }
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: 8
        }
      }
    }
  },
  MuiMenu: {
    styleOverrides: {
      paper: {
        boxShadow: 
          '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)'
      }
    }
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 6
      }
    }
  }
};

// Light theme
const lightTheme: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: tailwindColors.indigo[600],
      light: tailwindColors.indigo[500],
      dark: tailwindColors.indigo[700],
      contrastText: '#ffffff'
    },
    secondary: {
      main: tailwindColors.teal[600],
      light: tailwindColors.teal[500],
      dark: tailwindColors.teal[700],
      contrastText: '#ffffff'
    },
    error: {
      main: tailwindColors.red[600],
      light: tailwindColors.red[500],
      dark: tailwindColors.red[700]
    },
    warning: {
      main: tailwindColors.amber[500],
      light: tailwindColors.amber[400],
      dark: tailwindColors.amber[600]
    },
    info: {
      main: tailwindColors.blue[600],
      light: tailwindColors.blue[500],
      dark: tailwindColors.blue[700]
    },
    success: {
      main: tailwindColors.teal[600],
      light: tailwindColors.teal[500],
      dark: tailwindColors.teal[700]
    },
    text: {
      primary: tailwindColors.gray[900],
      secondary: tailwindColors.gray[700],
      disabled: tailwindColors.gray[400]
    },
    background: {
      default: tailwindColors.gray[50],
      paper: '#ffffff'
    },
    divider: tailwindColors.gray[200],
    action: {
      active: tailwindColors.gray[600],
      hover: tailwindColors.gray[100],
      selected: tailwindColors.gray[200],
      disabled: tailwindColors.gray[300],
      disabledBackground: tailwindColors.gray[200]
    }
  },
  typography,
  components,
  shadows: [
    'none',
    '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    ...Array(18).fill('none') // Fill the remaining shadow slots
  ]
};

// Dark theme
const darkTheme: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: {
      main: tailwindColors.indigo[500],
      light: tailwindColors.indigo[400],
      dark: tailwindColors.indigo[600],
      contrastText: '#ffffff'
    },
    secondary: {
      main: tailwindColors.teal[500],
      light: tailwindColors.teal[400],
      dark: tailwindColors.teal[600],
      contrastText: '#ffffff'
    },
    error: {
      main: tailwindColors.red[500],
      light: tailwindColors.red[400],
      dark: tailwindColors.red[600]
    },
    warning: {
      main: tailwindColors.amber[500],
      light: tailwindColors.amber[400],
      dark: tailwindColors.amber[600]
    },
    info: {
      main: tailwindColors.blue[500],
      light: tailwindColors.blue[400],
      dark: tailwindColors.blue[600]
    },
    success: {
      main: tailwindColors.teal[500],
      light: tailwindColors.teal[400],
      dark: tailwindColors.teal[600]
    },
    text: {
      primary: tailwindColors.gray[100],
      secondary: tailwindColors.gray[300],
      disabled: tailwindColors.gray[600]
    },
    background: {
      default: tailwindColors.gray[900],
      paper: tailwindColors.gray[800]
    },
    divider: tailwindColors.gray[700],
    action: {
      active: tailwindColors.gray[300],
      hover: tailwindColors.gray[700],
      selected: tailwindColors.gray[600],
      disabled: tailwindColors.gray[600],
      disabledBackground: tailwindColors.gray[700]
    }
  },
  typography,
  components: {
    ...components,
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundImage: 'none'
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.1)',
          backgroundImage: 'none'
        }
      }
    }
  },
  shadows: [
    'none',
    '0 1px 2px 0 rgba(0, 0, 0, 0.25)',
    '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.3)',
    '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
    '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.3)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    ...Array(18).fill('none') // Fill the remaining shadow slots
  ]
};

// Create MUI themes
export const createCustomTheme = (mode: PaletteMode) => {
  return createTheme(mode === 'dark' ? darkTheme : lightTheme);
};

// Export both themes for direct use
export const lightCustomTheme = createTheme(lightTheme);
export const darkCustomTheme = createTheme(darkTheme);

// Export theme options
export const getThemeOptions = (mode: 'light' | 'dark'): ThemeOptions => {
  return mode === 'dark' ? darkTheme : lightTheme;
};

export default createCustomTheme;
