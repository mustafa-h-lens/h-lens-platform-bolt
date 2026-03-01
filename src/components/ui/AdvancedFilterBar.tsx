import React from 'react';
import { X } from 'lucide-react';
import { DateRangeInput } from './DateRangeInput';
import { NumericRangeInput } from './NumericRangeInput';

export interface SelectFilter {
  type: 'select';
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}

export interface DateRangeFilter {
  type: 'dateRange';
  label: string;
  fromValue: string;
  toValue: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}

export interface NumericRangeFilter {
  type: 'numericRange';
  label: string;
  minValue: string;
  maxValue: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
  placeholder?: { min?: string; max?: string };
}

export type FilterConfig = SelectFilter | DateRangeFilter | NumericRangeFilter;

interface AdvancedFilterBarProps {
  filters: FilterConfig[];
  onReset?: () => void;
  className?: string;
}

export const AdvancedFilterBar: React.FC<AdvancedFilterBarProps> = ({
  filters,
  onReset,
  className = '',
}) => {
  return (
    <div
      className={`flex items-end gap-4 p-4 rounded-lg mb-6 flex-wrap ${className}`}
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {filters.map((filter, index) => {
        if (filter.type === 'select') {
          return (
            <div key={index} className="flex flex-col gap-2 min-w-[180px]">
              <label className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                {filter.label}
              </label>
              <select
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border transition-all focus:outline-none focus:ring-2 cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        if (filter.type === 'dateRange') {
          return (
            <DateRangeInput
              key={index}
              label={filter.label}
              fromValue={filter.fromValue}
              toValue={filter.toValue}
              onFromChange={filter.onFromChange}
              onToChange={filter.onToChange}
              className="min-w-[280px]"
            />
          );
        }

        if (filter.type === 'numericRange') {
          return (
            <NumericRangeInput
              key={index}
              label={filter.label}
              minValue={filter.minValue}
              maxValue={filter.maxValue}
              onMinChange={filter.onMinChange}
              onMaxChange={filter.onMaxChange}
              placeholder={filter.placeholder}
              className="min-w-[220px]"
            />
          );
        }

        return null;
      })}

      {onReset && (
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all hover:opacity-80"
          style={{
            color: 'var(--color-text-secondary)',
            backgroundColor: 'var(--color-background-hover)',
          }}
        >
          <X size={16} />
          إعادة تعيين
        </button>
      )}
    </div>
  );
};
