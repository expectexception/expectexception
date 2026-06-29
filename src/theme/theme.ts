import { createTheme, alpha, Theme } from '@mui/material/styles';

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

export const getTheme = (primaryColor: string = '#3dfc55'): Theme => {
  return createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: primaryColor,
        light: alpha(primaryColor, 0.8),
        dark: alpha(primaryColor, 1.2),
        contrastText: '#000000', // Black text on neon background for premium contrast
      },
      secondary: {
        main: '#00e5ff', // Neon Cyan
        contrastText: '#000000',
      },
      background: {
        default: '#050505', // Ultra-dark background
        paper: '#0d0e12',   // Premium charcoal card background
      },
      glass: {
        light: alpha('#0d0e12', 0.6),
        main: alpha('#050505', 0.7),
        dark: alpha('#010102', 0.8),
      },
      text: {
        primary: '#ffffff', // Pure white text
        secondary: '#94a3b8', // Cool slate grey text
      },
      divider: alpha('#ffffff', 0.08),
      action: {
        hover: alpha(primaryColor, 0.08),
        selected: alpha(primaryColor, 0.12),
      },
    },
    typography: {
      fontFamily: '"Outfit", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontWeight: 800,
        fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
        lineHeight: 1.1,
        letterSpacing: '-0.02em',
        color: '#ffffff',
      },
      h2: {
        fontWeight: 700,
        fontSize: 'clamp(1.8rem, 4.5vw, 2.75rem)',
        lineHeight: 1.2,
        letterSpacing: '-0.01em',
      },
      h3: {
        fontWeight: 700,
        fontSize: 'clamp(1.4rem, 3.5vw, 2.2rem)',
      },
      h4: {
        fontWeight: 600,
        fontSize: 'clamp(1.15rem, 3vw, 1.6rem)',
      },
      button: {
        fontWeight: 600,
        textTransform: 'none',
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: '#050505',
            color: '#ffffff',
            scrollbarColor: `${alpha(primaryColor, 0.3)} #050505`,
            '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
              borderRadius: 8,
              backgroundColor: alpha(primaryColor, 0.3),
              minHeight: 24,
              border: '2px solid #050505',
              '&:hover': {
                backgroundColor: primaryColor,
              },
            },
            '&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track': {
              backgroundColor: '#050505',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '10px 24px',
            boxShadow: 'none',
            fontSize: '0.95rem',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '@media (max-width:600px)': {
              padding: '8px 16px',
              fontSize: '0.85rem',
            },
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: `0 8px 20px ${alpha(primaryColor, 0.25)}`,
            },
          },
          contained: {
            background: primaryColor,
            color: '#000000',
            '&:hover': {
              background: alpha(primaryColor, 0.9),
              boxShadow: `0 8px 25px ${alpha(primaryColor, 0.4)}`,
            },
          },
          outlined: {
            borderColor: alpha('#ffffff', 0.2),
            color: '#ffffff',
            '&:hover': {
              borderColor: primaryColor,
              color: primaryColor,
              backgroundColor: alpha(primaryColor, 0.04),
            },
          },
          text: {
            color: '#ffffff',
            '&:hover': {
              color: primaryColor,
              backgroundColor: alpha(primaryColor, 0.04),
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: alpha('#0d0e12', 0.6),
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: '0 4px 30px rgba(0, 0, 0, 0.4)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              borderColor: alpha(primaryColor, 0.3),
              boxShadow: `0 15px 30px -10px ${alpha(primaryColor, 0.15)}`,
              transform: 'translateY(-4px)',
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: alpha('#050505', 0.75),
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              backgroundColor: alpha('#0d0e12', 0.4),
              '& fieldset': {
                borderColor: alpha('#ffffff', 0.1),
              },
              '&:hover fieldset': {
                borderColor: alpha('#ffffff', 0.25),
              },
              '&.Mui-focused fieldset': {
                borderColor: primaryColor,
              },
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: 'rgba(13, 14, 18, 0.6)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor: 'rgba(255, 255, 255, 0.05)',
            color: '#94a3b8',
          },
          head: {
            color: '#ffffff',
            fontWeight: 700,
          },
        },
      },
      MuiPaginationItem: {
        styleOverrides: {
          root: {
            color: '#94a3b8',
            '&.Mui-selected': {
              backgroundColor: alpha(primaryColor, 0.15),
              color: primaryColor,
              border: `1px solid ${alpha(primaryColor, 0.3)}`,
              fontWeight: 700,
              '&:hover': {
                backgroundColor: alpha(primaryColor, 0.25),
              },
            },
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: '#ffffff',
            },
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: 'rgba(255, 255, 255, 0.06)',
          },
        },
      },
    },
  });
};

export const theme = getTheme();