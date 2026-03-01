import React from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { getTheme, borderRadius, fontSize } from '../../theme/tokens';
import { Button } from './Button';

export interface FilterOption {
  label: string;
  value: string;
}

export interface Filter {
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

interface FilterBarProps {
  filters: Filter[];
  onReset?: () => void;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onReset,
  className = '',
}) => {
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);

  const containerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: theme.background.filter,
    border: `1px solid ${theme.border.default}`,
    borderRadius: borderRadius.DEFAULT,
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
  };

  const filterGroupStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  const labelStyles: React.CSSProperties = {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: theme.text.secondary,
    whiteSpace: 'nowrap',
  };

  const selectStyles: React.CSSProperties = {
    padding: '0.5rem 0.75rem',
    fontSize: fontSize.sm,
    color: theme.text.primary,
    backgroundColor: theme.background.input,
    border: `1px solid ${theme.border.default}`,
    borderRadius: borderRadius.DEFAULT,
    outline: 'none',
    cursor: 'pointer',
    minWidth: '150px',
  };

  return (
    <div style={containerStyles} className={className}>
      {filters.map((filter, index) => (
        <div key={index} style={filterGroupStyles}>
          <label style={labelStyles}>{filter.label}:</label>
          <select
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
            style={selectStyles}
          >
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}
      {onReset && (
        <Button
          variant="ghost"
          size="sm"
          icon={<X size={16} />}
          onClick={onReset}
        >
          إعادة تعيين
        </Button>
      )}
    </div>
  );
};
