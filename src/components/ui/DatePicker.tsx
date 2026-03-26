import { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const AR_DAYS = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];

interface DatePickerProps {
  value?: string;
  onChange: (date: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
}

export const DatePicker = ({ value, onChange, placeholder = 'اختر التاريخ', label, required }: DatePickerProps) => {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) return new Date(value);
    return new Date();
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedDate = value ? new Date(value) : null;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Build calendar grid (6 weeks max)
  const days: { day: number; month: number; year: number; isOther: boolean }[] = [];

  // Previous month fill
  const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Adjust for Monday start
  for (let i = startOffset - 1; i >= 0; i--) {
    days.push({ day: daysInPrevMonth - i, month: month - 1, year: month === 0 ? year - 1 : year, isOther: true });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ day: d, month, year, isOther: false });
  }

  // Next month fill
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    days.push({ day: d, month: month + 1, year: month === 11 ? year + 1 : year, isOther: true });
  }

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const selectDay = (d: typeof days[0]) => {
    const date = new Date(d.year, d.month, d.day);
    const iso = date.toISOString().split('T')[0];
    onChange(iso);
    setOpen(false);
  };

  const isToday = (d: typeof days[0]) => !d.isOther && d.day === today.getDate() && d.month === today.getMonth() && d.year === today.getFullYear();
  const isSelected = (d: typeof days[0]) => {
    if (!selectedDate) return false;
    return d.day === selectedDate.getDate() && d.month === selectedDate.getMonth() && d.year === selectedDate.getFullYear();
  };

  const displayValue = value ? value : '';

  return (
    <div className="input-group" ref={ref} style={{ position: 'relative' }}>
      {label && <label className="input-label">{label} {required && <span className="req">*</span>}</label>}
      <input
        className="input"
        value={displayValue}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        readOnly
        dir="ltr"
        style={{ textAlign: 'right', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 13 }}
      />
      {open && (
        <div className="date-picker" style={{ position: 'absolute', top: '100%', right: 0, zIndex: 100, marginTop: 4 }}>
          <div className="dp-header">
            <button type="button" onClick={nextMonth}><ChevronRight size={16} /></button>
            <span className="dp-title">{AR_MONTHS[month]} {year}</span>
            <button type="button" onClick={prevMonth}><ChevronLeft size={16} /></button>
          </div>
          <div className="dp-grid">
            {AR_DAYS.map(d => <span key={d} className="dp-dayname">{d}</span>)}
            {days.map((d, i) => (
              <span
                key={i}
                className={`dp-day ${d.isOther ? 'other-month' : ''} ${isToday(d) ? 'today' : ''} ${isSelected(d) ? 'selected' : ''}`}
                onClick={() => selectDay(d)}
              >
                {d.day}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
