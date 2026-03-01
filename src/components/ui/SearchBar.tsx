import React from 'react';
import { Search } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { getTheme, transitions, borderRadius, fontSize } from '../../theme/tokens';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'بحث...',
  className = '',
}) => {
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);
  const [isFocused, setIsFocused] = React.useState(false);

  const containerStyles: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    marginBottom: '1.5rem',
  };

  const inputStyles: React.CSSProperties = {
    width: '100%',
    padding: '0.875rem 1rem 0.875rem 3rem',
    fontSize: fontSize.base,
    color: theme.text.primary,
    backgroundColor: theme.background.input,
    border: `1px solid ${isFocused ? theme.border.focus : theme.border.default}`,
    borderRadius: borderRadius.DEFAULT,
    outline: 'none',
    transition: transitions.DEFAULT,
  };

  const iconStyles: React.CSSProperties = {
    position: 'absolute',
    right: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: theme.text.muted,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  };

  return (
    <div style={containerStyles} className={className}>
      <div style={iconStyles}>
        <Search size={20} />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyles}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </div>
  );
};
