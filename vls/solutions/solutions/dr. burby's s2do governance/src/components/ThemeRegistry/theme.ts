import { createTheme, PaletteMode } from '@mui/material';

// Define color values from tailwind.config.js
const primaryColor = {
  light: '#3f51b5', // Replace with actual primary color from Tailwind
  main: '#3f51b5',
  dark: '#303f9f',
  contrastText: '#fff',
};

const secondaryColor = {
  light: '#f50057', // Replace with actual secondary color from Tailwind
  main: '#f50057',
  dark: '#c51162',
  contrastText: '#fff',
};

// Common theme settings
const commonThemeSettings = {
  typography: {
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
      '"Segoe UI Symbol"',
    ].join(','),
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
    },
    body1: {
      fontSize: '1rem',
    },
    body2: {
      fontSize: '0.875rem',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: 600,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
};

// Light theme settings
const lightTheme = {
  palette: {
    mode: 'light' as PaletteMode,
    primary: primaryColor,
    secondary: secondaryColor,
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
      disabled: 'rgba(0, 0, 0, 0.38)',
    },
    divider: 'rgba(0, 0, 0, 0.12)',
  },
};

// Dark theme settings
const darkTheme = {
  palette: {
    mode: 'dark' as PaletteMode,
    primary: primaryColor,
    secondary: secondaryColor,
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
      disabled: 'rgba(255, 255, 255, 0.5)',
    },
    divider: 'rgba(255, 255, 255, 0.12)',
  },
};

/**
 * Creates a theme object for the specified color mode
 * @param mode - The color mode ('light' or 'dark')
 * @returns Theme object
 */
export const createAppTheme = (mode: PaletteMode) => {
  return createTheme({
    ...commonThemeSettings,
    ...(mode === 'light' ? lightTheme : darkTheme),
  });
};

export default createAppTheme;

