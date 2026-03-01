import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { getTheme, transitions, borderRadius, fontSize, fontWeight } from '../../theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  loading?: boolean;
  tooltip?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  fullWidth = false,
  loading = false,
  disabled = false,
  tooltip,
  className = '',
  style = {},
  ...props
}) => {
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);

  const getVariantStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      transition: transitions.DEFAULT,
      fontWeight: fontWeight.medium,
      borderRadius: borderRadius.DEFAULT,
      border: 'none',
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      opacity: disabled || loading ? 0.5 : 1,
      width: fullWidth ? '100%' : 'auto',
    };

    const variantMap: Record<ButtonVariant, React.CSSProperties> = {
      primary: {
        backgroundColor: theme.primary.main,
        color: theme.text.inverse,
        boxShadow: theme.shadow.sm,
      },
      secondary: {
        backgroundColor: theme.secondary.light,
        color: theme.text.primary,
        border: `1px solid ${theme.border.default}`,
      },
      success: {
        backgroundColor: theme.status.success.main,
        color: theme.text.inverse,
      },
      warning: {
        backgroundColor: theme.status.warning.main,
        color: theme.text.inverse,
      },
      error: {
        backgroundColor: theme.status.error.main,
        color: theme.text.inverse,
      },
      ghost: {
        backgroundColor: 'transparent',
        color: theme.text.secondary,
        border: 'none',
      },
    };

    return { ...baseStyles, ...variantMap[variant] };
  };

  const getSizeStyles = (): React.CSSProperties => {
    const sizeMap: Record<ButtonSize, React.CSSProperties> = {
      sm: {
        padding: '0.5rem 1rem',
        fontSize: fontSize.sm,
      },
      md: {
        padding: '0.625rem 1.25rem',
        fontSize: fontSize.base,
      },
      lg: {
        padding: '0.75rem 1.5rem',
        fontSize: fontSize.lg,
      },
    };

    return sizeMap[size];
  };

  const getHoverStyles = (): React.CSSProperties => {
    if (disabled || loading) return {};

    const hoverMap: Record<ButtonVariant, React.CSSProperties> = {
      primary: {
        backgroundColor: theme.primary.hover,
      },
      secondary: {
        backgroundColor: theme.background.hover,
        borderColor: theme.border.hover,
      },
      success: {
        backgroundColor: theme.status.success.dark,
      },
      warning: {
        backgroundColor: theme.status.warning.dark,
      },
      error: {
        backgroundColor: theme.status.error.dark,
      },
      ghost: {
        backgroundColor: theme.background.hover,
      },
    };

    return hoverMap[variant];
  };

  const [isHovered, setIsHovered] = React.useState(false);

  const combinedStyles: React.CSSProperties = {
    ...getVariantStyles(),
    ...getSizeStyles(),
    ...(isHovered ? getHoverStyles() : {}),
    ...style,
  };

  const buttonContent = (
    <>
      {loading && (
        <svg
          className="animate-spin"
          style={{ width: '1rem', height: '1rem' }}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            style={{ opacity: 0.25 }}
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            style={{ opacity: 0.75 }}
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {icon && iconPosition === 'left' && !loading && icon}
      {children}
      {icon && iconPosition === 'right' && !loading && icon}
    </>
  );

  return (
    <div style={{ position: 'relative', display: fullWidth ? 'block' : 'inline-block' }}>
      <button
        {...props}
        disabled={disabled || loading}
        style={combinedStyles}
        className={className}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={tooltip}
      >
        {buttonContent}
      </button>
      {disabled && tooltip && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '0.5rem',
            padding: '0.5rem 0.75rem',
            backgroundColor: theme.text.primary,
            color: theme.text.inverse,
            fontSize: fontSize.xs,
            borderRadius: borderRadius.sm,
            whiteSpace: 'nowrap',
            opacity: isHovered ? 1 : 0,
            pointerEvents: 'none',
            transition: transitions.DEFAULT,
            zIndex: 50,
          }}
        >
          {tooltip}
        </div>
      )}
    </div>
  );
};
