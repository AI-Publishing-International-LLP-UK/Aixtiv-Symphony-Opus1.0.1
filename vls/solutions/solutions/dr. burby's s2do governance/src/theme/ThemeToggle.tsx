import React from 'react';
import { IconButton, Tooltip, useTheme as useMuiTheme } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useTheme } from './ThemeProvider';

const ThemeToggle: React.FC = () => {
  const { mode, toggleColorMode } = useTheme();
  const muiTheme = useMuiTheme();

  return (
    <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
      <IconButton 
        onClick={toggleColorMode} 
        color="inherit"
        aria-label="toggle light/dark theme"
      >
        {mode === 'dark' ? (
          <Brightness7Icon sx={{ color: muiTheme.palette.primary.main }} />
        ) : (
          <Brightness4Icon sx={{ color: muiTheme.palette.primary.main }} />
        )}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;

