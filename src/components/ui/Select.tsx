import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { getTheme, transitions, borderRadius, fontSize } from '../../theme/tokens';

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  fullWidth?: boolean;
  error?: string;
  className?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  value,
  options,
  onChange,
  placeholder,
  fullWidth = false,
  error,
  className = '',
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

  const selectStyles: React.CSSProperties = {
    width: '100%',
    padding: '0.625rem 1rem',
    fontSize: fontSize.base,
    color: value ? theme.text.primary : theme.text.secondary,
    backgroundColor: theme.background.input,
    border: `1px solid ${error ? theme.status.error.main : isFocused ? theme.border.focus : theme.border.default}`,
    borderRadius: borderRadius.DEFAULT,
    outline: 'none',
    cursor: 'pointer',
    transition: transitions.DEFAULT,
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'left 1rem center',
    paddingLeft: '2.5rem',
  };

  const errorStyles: React.CSSProperties = {
    fontSize: fontSize.sm,
    color: theme.status.error.main,
  };

  return (
    <div style={containerStyles} className={className}>
      {label && <label style={labelStyles}>{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={selectStyles}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span style={errorStyles}>{error}</span>}
    </div>
  );
};
