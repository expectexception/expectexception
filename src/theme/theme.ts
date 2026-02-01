import { createTheme, alpha } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    glass: {
      light: string;
      main: string;
      dark: string;
    };
  }
  interface PaletteOptions {
    glass?: {
      light?: string;
      main?: string;
      dark?: string;
    };
  }
}

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#3b82f6', // Bright, vibrant blue
      light: '#60a5fa',
      dark: '#2563eb',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#8b5cf6', // Violet
      light: '#a78bfa',
      dark: '#7c3aed',
      contrastText: '#ffffff',
    },
    background: {
      default: '#0f172a', // Slate 900
      paper: '#1e293b',   // Slate 800
    },
    glass: {
      light: alpha('#1e293b', 0.6),
      main: alpha('#0f172a', 0.7),
      dark: alpha('#020617', 0.8),
    },
    text: {
      primary: '#f1f5f9', // Slate 100
      secondary: '#94a3b8', // Slate 400
    },
    divider: alpha('#94a3b8', 0.1),
    action: {
      hover: alpha('#3b82f6', 0.08),
      selected: alpha('#3b82f6', 0.12),
    },
  },
  typography: {
    fontFamily: '"Outfit", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 800,
      fontSize: 'clamp(2.2rem, 6vw, 3.5rem)',
      lineHeight: 1.1,
      letterSpacing: '-0.02em',
      background: 'linear-gradient(to right, #60a5fa, #a78bfa)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    h2: {
      fontWeight: 700,
      fontSize: 'clamp(1.75rem, 4.5vw, 2.5rem)',
      lineHeight: 1.2,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontWeight: 700,
      fontSize: 'clamp(1.4rem, 3.5vw, 2rem)',
    },
    h4: {
      fontWeight: 600,
      fontSize: 'clamp(1.15rem, 3vw, 1.5rem)',
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: '#334155 #0f172a',
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 8,
            backgroundColor: '#334155',
            minHeight: 24,
            border: '2px solid #0f172a',
          },
          '&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track': {
            backgroundColor: '#0f172a',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 24px',
          boxShadow: 'none',
          fontSize: '0.95rem',
          transition: 'all 0.2s',
          '@media (max-width:600px)': {
            padding: '8px 12px',
            fontSize: '0.85rem',
          },
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
          },
        },
        contained: {
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: alpha('#1e293b', 0.6),
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            borderColor: 'rgba(59, 130, 246, 0.3)',
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          padding: '6px 12px',
          '@media (max-width:600px)': {
            padding: '6px 10px',
            fontSize: '0.85rem',
            minWidth: 'unset',
          },
          '&.Mui-selected': {
            boxShadow: '0 6px 16px rgba(59,130,246,0.12)'
          }
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          padding: 8,
          '@media (max-width:600px)': {
            padding: 6,
          }
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          height: 28,
          '@media (max-width:600px)': {
            height: 22,
            fontSize: '0.75rem',
            paddingLeft: 6,
            paddingRight: 6,
          }
        },
        sizeSmall: {
          height: 20,
          fontSize: '0.7rem'
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: alpha('#0f172a', 0.8),
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: alpha('#1e293b', 0.5),
            '& fieldset': {
              borderColor: alpha('#94a3b8', 0.2),
            },
            '&:hover fieldset': {
              borderColor: alpha('#94a3b8', 0.4),
            },
            '&.Mui-focused fieldset': {
              borderColor: '#3b82f6',
            },
          },
        },
      },
    },
    
  },
});