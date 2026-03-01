import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { getTheme, borderRadius, fontSize, transitions } from '../../theme/tokens';

export interface TableColumn<T = any> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface TableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  zebra?: boolean;
  hover?: boolean;
  className?: string;
}

export const Table = <T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
  zebra = true,
  hover = true,
  className = '',
}: TableProps<T>) => {
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);
  const [hoveredRow, setHoveredRow] = React.useState<number | null>(null);

  const tableContainerStyles: React.CSSProperties = {
    width: '100%',
    overflowX: 'auto',
    backgroundColor: theme.background.card,
    borderRadius: borderRadius.DEFAULT,
    border: `1px solid ${theme.border.default}`,
  };

  const tableStyles: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
  };

  const theadStyles: React.CSSProperties = {
    backgroundColor: theme.secondary.light,
    borderBottom: `2px solid ${theme.border.default}`,
  };

  const thStyles: React.CSSProperties = {
    padding: '1rem',
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: theme.text.primary,
    textAlign: 'right',
    whiteSpace: 'nowrap',
  };

  const getTdStyles = (rowIndex: number, align?: 'left' | 'center' | 'right'): React.CSSProperties => {
    const isZebra = zebra && rowIndex % 2 === 1;
    const isHovered = hover && hoveredRow === rowIndex;

    return {
      padding: '1rem',
      fontSize: fontSize.base,
      color: theme.text.primary,
      textAlign: align || 'right',
      borderBottom: `1px solid ${theme.border.divider}`,
      backgroundColor: isHovered
        ? theme.background.hover
        : isZebra
        ? theme.background.filter
        : 'transparent',
      transition: transitions.fast,
    };
  };

  const getTrStyles = (rowIndex: number): React.CSSProperties => {
    return {
      cursor: onRowClick ? 'pointer' : 'default',
      transition: transitions.fast,
    };
  };

  const getCellContent = (row: T, column: TableColumn<T>) => {
    if (typeof column.accessor === 'function') {
      return column.accessor(row);
    }
    return row[column.accessor];
  };

  return (
    <div style={tableContainerStyles} className={className}>
      <table style={tableStyles}>
        <thead style={theadStyles}>
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                style={{
                  ...thStyles,
                  width: column.width,
                  textAlign: column.align || 'right',
                }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: '3rem',
                  textAlign: 'center',
                  color: theme.text.muted,
                  fontSize: fontSize.base,
                }}
              >
                لا توجد بيانات
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                style={getTrStyles(rowIndex)}
                onMouseEnter={() => setHoveredRow(rowIndex)}
                onMouseLeave={() => setHoveredRow(null)}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column, colIndex) => (
                  <td
                    key={colIndex}
                    style={getTdStyles(rowIndex, column.align)}
                  >
                    {getCellContent(row, column)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
