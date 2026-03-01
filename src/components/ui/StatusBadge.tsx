import React from 'react';
import { CheckCircle, XCircle, Ban, Clock } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { getTheme, borderRadius, fontSize } from '../../theme/tokens';

export type StatusType = 'active' | 'inactive' | 'blocked' | 'pending' | 'completed' | 'cancelled';

interface StatusBadgeProps {
  status: StatusType;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showIcon = true,
  size = 'md',
}) => {
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);

  const statusConfig: Record<StatusType, {
    label: string;
    icon: React.ReactNode;
    backgroundColor: string;
    color: string;
  }> = {
    active: {
      label: 'نشط',
      icon: <CheckCircle size={16} />,
      backgroundColor: theme.status.success.light,
      color: theme.status.success.dark,
    },
    inactive: {
      label: 'غير نشط',
      icon: <XCircle size={16} />,
      backgroundColor: theme.secondary.light,
      color: theme.text.secondary,
    },
    blocked: {
      label: 'محظور',
      icon: <Ban size={16} />,
      backgroundColor: theme.status.error.light,
      color: theme.status.error.dark,
    },
    pending: {
      label: 'قيد الانتظار',
      icon: <Clock size={16} />,
      backgroundColor: theme.status.warning.light,
      color: theme.status.warning.dark,
    },
    completed: {
      label: 'مكتمل',
      icon: <CheckCircle size={16} />,
      backgroundColor: theme.status.success.light,
      color: theme.status.success.dark,
    },
    cancelled: {
      label: 'ملغي',
      icon: <XCircle size={16} />,
      backgroundColor: theme.status.error.light,
      color: theme.status.error.dark,
    },
  };

  const sizeMap = {
    sm: {
      padding: '0.25rem 0.5rem',
      fontSize: fontSize.xs,
      gap: '0.25rem',
    },
    md: {
      padding: '0.375rem 0.75rem',
      fontSize: fontSize.sm,
      gap: '0.375rem',
    },
    lg: {
      padding: '0.5rem 1rem',
      fontSize: fontSize.base,
      gap: '0.5rem',
    },
  };

  const config = statusConfig[status];
  const sizeStyles = sizeMap[size];

  const badgeStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: sizeStyles.gap,
    padding: sizeStyles.padding,
    backgroundColor: config.backgroundColor,
    color: config.color,
    borderRadius: borderRadius.DEFAULT,
    fontSize: sizeStyles.fontSize,
    fontWeight: '500',
    whiteSpace: 'nowrap',
  };

  return (
    <span style={badgeStyles}>
      {showIcon && config.icon}
      {config.label}
    </span>
  );
};
