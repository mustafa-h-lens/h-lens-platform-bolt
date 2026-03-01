export const lightTheme = {
  primary: {
    main: '#3b82f6',
    hover: '#2563eb',
    active: '#1d4ed8',
    light: '#dbeafe',
    dark: '#1e40af',
  },
  secondary: {
    main: '#64748b',
    hover: '#475569',
    active: '#334155',
    muted: '#94a3b8',
    light: '#e2e8f0',
  },
  status: {
    success: {
      main: '#10b981',
      light: '#d1fae5',
      dark: '#047857',
    },
    warning: {
      main: '#f59e0b',
      light: '#fef3c7',
      dark: '#d97706',
    },
    error: {
      main: '#ef4444',
      light: '#fee2e2',
      dark: '#dc2626',
    },
    info: {
      main: '#06b6d4',
      light: '#cffafe',
      dark: '#0891b2',
    },
  },
  background: {
    page: '#f8fafc',
    card: '#ffffff',
    hover: '#f1f5f9',
    filter: '#f8fafc',
    input: '#ffffff',
  },
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    muted: '#94a3b8',
    disabled: '#cbd5e1',
    inverse: '#ffffff',
  },
  border: {
    default: '#e2e8f0',
    hover: '#cbd5e1',
    focus: '#3b82f6',
    divider: '#f1f5f9',
  },
  shadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  },
};

export const darkTheme = {
  primary: {
    main: '#60a5fa',
    hover: '#3b82f6',
    active: '#2563eb',
    light: '#1e3a5f',
    dark: '#93c5fd',
  },
  secondary: {
    main: '#94a3b8',
    hover: '#cbd5e1',
    active: '#e2e8f0',
    muted: '#64748b',
    light: '#334155',
  },
  status: {
    success: {
      main: '#34d399',
      light: '#064e3b',
      dark: '#6ee7b7',
    },
    warning: {
      main: '#fbbf24',
      light: '#78350f',
      dark: '#fcd34d',
    },
    error: {
      main: '#f87171',
      light: '#7f1d1d',
      dark: '#fca5a5',
    },
    info: {
      main: '#22d3ee',
      light: '#164e63',
      dark: '#67e8f9',
    },
  },
  background: {
    page: '#0f172a',
    card: '#1e293b',
    hover: '#334155',
    filter: '#1a2332',
    input: '#1e293b',
  },
  text: {
    primary: '#f1f5f9',
    secondary: '#cbd5e1',
    muted: '#94a3b8',
    disabled: '#475569',
    inverse: '#0f172a',
  },
  border: {
    default: '#334155',
    hover: '#475569',
    focus: '#60a5fa',
    divider: '#1e293b',
  },
  shadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
    DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.4)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.4)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.4)',
  },
};

export type Theme = typeof lightTheme;

export const getTheme = (isDark: boolean): Theme => {
  return isDark ? darkTheme : lightTheme;
};

export const spacing = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '1rem',       // 16px
  lg: '1.5rem',     // 24px
  xl: '2rem',       // 32px
  '2xl': '3rem',    // 48px
};

export const borderRadius = {
  sm: '0.25rem',    // 4px
  DEFAULT: '0.5rem', // 8px
  md: '0.75rem',    // 12px
  lg: '1rem',       // 16px
  full: '9999px',
};

export const fontSize = {
  xs: '0.75rem',    // 12px
  sm: '0.875rem',   // 14px
  base: '1rem',     // 16px
  lg: '1.125rem',   // 18px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  '3xl': '1.875rem', // 30px
};

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export const transitions = {
  fast: '150ms ease-in-out',
  DEFAULT: '200ms ease-in-out',
  slow: '300ms ease-in-out',
};
