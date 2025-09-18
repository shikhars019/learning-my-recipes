import { createTheme } from '@mui/material/styles';

/**
 * Material-UI Theme Configuration for My Recipes
 * 
 * This theme provides an Accenture-branded color palette with excellent
 * accessibility and responsive design considerations.
 * 
 * Educational Notes:
 * - Custom color palette using Accenture purple branding
 * - Responsive typography using fluid scaling
 * - Consistent spacing and elevation systems
 * - Dark mode support for better user experience
 */

// Define custom color palette
const colors = {
  // Primary colors - Accenture purple theme
  primary: {
    main: '#A100FF', // Accenture purple
    light: '#B833FF',
    dark: '#7B00CC',
    contrastText: '#FFFFFF',
  },
  
  // Secondary colors - Complementary green for fresh ingredients
  secondary: {
    main: '#4CAF50', // Fresh green
    light: '#81C784',
    dark: '#388E3C',
    contrastText: '#FFFFFF',
  },
  
  // Error colors
  error: {
    main: '#F44336',
    light: '#EF5350',
    dark: '#C62828',
  },
  
  // Warning colors
  warning: {
    main: '#FF9800',
    light: '#FFB74D',
    dark: '#F57C00',
  },
  
  // Info colors
  info: {
    main: '#2196F3',
    light: '#64B5F6',
    dark: '#1976D2',
  },
  
  // Success colors
  success: {
    main: '#4CAF50',
    light: '#81C784',
    dark: '#388E3C',
  },
  
  // Background colors
  background: {
    default: '#FAFAFA',
    paper: '#FFFFFF',
    accent: '#FFF3E0', // Light orange for cards/sections
  },
  
  // Text colors
  text: {
    primary: '#212121',
    secondary: '#757575',
    disabled: '#BDBDBD',
  },
};

// Create the theme
const theme = createTheme({
  palette: {
    mode: 'light',
    ...colors,
  },
  
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    
    // Responsive typography
    h1: {
      fontSize: 'clamp(2rem, 5vw, 3.5rem)',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: 'clamp(1.5rem, 3vw, 2rem)',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: 'clamp(1.25rem, 2.5vw, 1.5rem)',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: 'clamp(1.1rem, 2vw, 1.25rem)',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: 'clamp(1rem, 1.5vw, 1.1rem)',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
      letterSpacing: '0.00938em',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      letterSpacing: '0.01071em',
    },
    
    button: {
      textTransform: 'none',
      fontWeight: 600,
      fontSize: '0.875rem',
      letterSpacing: '0.02857em',
    },
    
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.4,
      letterSpacing: '0.03333em',
    },
  },
  
  spacing: 8, // Base spacing unit (8px)
  
  shape: {
    borderRadius: 12, // Rounded corners for modern look
  },
  
  shadows: [
    'none',
    '0px 2px 4px rgba(0, 0, 0, 0.05)',
    '0px 4px 8px rgba(0, 0, 0, 0.1)',
    '0px 8px 16px rgba(0, 0, 0, 0.1)',
    '0px 12px 24px rgba(0, 0, 0, 0.15)',
    // ... other shadow levels
    '0px 2px 4px rgba(0, 0, 0, 0.05)', // Fallback
    '0px 4px 8px rgba(0, 0, 0, 0.1)',
    '0px 8px 16px rgba(0, 0, 0, 0.1)',
    '0px 12px 24px rgba(0, 0, 0, 0.15)',
    '0px 16px 32px rgba(0, 0, 0, 0.2)',
    '0px 20px 40px rgba(0, 0, 0, 0.2)',
    '0px 24px 48px rgba(0, 0, 0, 0.25)',
    '0px 2px 4px rgba(0, 0, 0, 0.05)',
    '0px 4px 8px rgba(0, 0, 0, 0.1)',
    '0px 8px 16px rgba(0, 0, 0, 0.1)',
    '0px 12px 24px rgba(0, 0, 0, 0.15)',
    '0px 16px 32px rgba(0, 0, 0, 0.2)',
    '0px 20px 40px rgba(0, 0, 0, 0.2)',
    '0px 24px 48px rgba(0, 0, 0, 0.25)',
    '0px 2px 4px rgba(0, 0, 0, 0.05)',
    '0px 4px 8px rgba(0, 0, 0, 0.1)',
    '0px 8px 16px rgba(0, 0, 0, 0.1)',
    '0px 12px 24px rgba(0, 0, 0, 0.15)',
    '0px 16px 32px rgba(0, 0, 0, 0.2)',
    '0px 20px 40px rgba(0, 0, 0, 0.2)',
  ],
  
  components: {
    // Button component overrides
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          padding: '8px 24px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #FF6B35 0%, #FF8A65 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #E64100 0%, #FF6B35 100%)',
          },
        },
      },
    },
    
    // Card component overrides
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid rgba(0, 0, 0, 0.06)',
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
          transition: 'box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.12)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    
    // Paper component overrides
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        rounded: {
          borderRadius: 12,
        },
      },
    },
    
    // AppBar component overrides
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: colors.text.primary,
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
        },
      },
    },
    
    // TextField component overrides
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    
    // Button component overrides
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none', // Keep original case
          fontWeight: 600,
          padding: '10px 24px',
          transition: 'all 0.2s ease-in-out',
        },
        contained: {
          boxShadow: '0px 2px 8px rgba(161, 0, 255, 0.24)',
          '&:hover': {
            boxShadow: '0px 4px 16px rgba(161, 0, 255, 0.32)',
            transform: 'translateY(-1px)',
          },
        },
        outlined: {
          borderWidth: '2px',
          '&:hover': {
            borderWidth: '2px',
            backgroundColor: 'rgba(161, 0, 255, 0.04)',
          },
        },
      },
    },
  },
  
  // Breakpoints for responsive design
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
});

export default theme;