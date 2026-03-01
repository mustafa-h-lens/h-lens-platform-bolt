import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { getTheme, transitions, borderRadius, fontSize } from '../../theme/tokens';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  fullWidth = false,
  className = '',
  style = {},
  ...props
}) => {
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);
  const [isFocused, setIsFocused] = React.useState(false);

  const containerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    width: fullWidth ? '100%' : 'auto',
  };

  const labelStyles: React.CSSProperties = {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: theme.text.primary,
  };

  const inputWrapperStyles: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  };

  const inputStyles: React.CSSProperties = {
    width: '100%',
    padding: icon ? '0.625rem 0.625rem 0.625rem 2.5rem' : '0.625rem 1rem',
    fontSize: fontSize.base,
    color: theme.text.primary,
    backgroundColor: theme.background.input,
    border: `1px solid ${error ? theme.status.error.main : isFocused ? theme.border.focus : theme.border.default}`,
    borderRadius: borderRadius.DEFAULT,
    outline: 'none',
    transition: transitions.DEFAULT,
    ...style,
  };

  const iconStyles: React.CSSProperties = {
    position: 'absolute',
    left: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: theme.text.muted,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  };

  const errorStyles: React.CSSProperties = {
    fontSize: fontSize.sm,
    color: theme.status.error.main,
  };

  return (
    <div style={containerStyles} className={className}>
      {label && <label style={labelStyles}>{label}</label>}
      <div style={inputWrapperStyles}>
        {icon && <div style={iconStyles}>{icon}</div>}
        <input
          {...props}
          style={inputStyles}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
        />
      </div>
      {error && <span style={errorStyles}>{error}</span>}
    </div>
  );
};
