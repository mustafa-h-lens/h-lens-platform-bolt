import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { getTheme, borderRadius } from '../../theme/tokens';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  style = {},
  padding = 'lg',
}) => {
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);

  const paddingMap = {
    none: '0',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
  };

  const cardStyles: React.CSSProperties = {
    backgroundColor: theme.background.card,
    border: `1px solid ${theme.border.default}`,
    borderRadius: borderRadius.DEFAULT,
    padding: paddingMap[padding],
    boxShadow: theme.shadow.sm,
    ...style,
  };

  return (
    <div style={cardStyles} className={className}>
      {children}
    </div>
  );
};
