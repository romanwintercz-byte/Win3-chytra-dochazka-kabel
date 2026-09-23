import React, { useState, useMemo, useRef, useEffect } from 'react';

interface DatePickerWithWeekendsProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  label?: string;
  id?: string;
  required?: boolean;
}

const MONTH_NAMES = [
  'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'
];

const WEEKDAYS = [
  { key: 'po', label: 'Po', full: 'Pondělí', isWeekend: false },
  { key: 'ut', label: 'Út', full: 'Úterý', isWeekend: false },
  { key: 'st', label: 'St', full: 'Středa', isWeekend: false },
  { key: 'ct', label: 'Čt', full: 'Čtvrtek', isWeekend: false },
  { key: 'pa', label: 'Pá', full: 'Pátek', isWeekend: false },
  { key: 'so', label: 'So', full: 'Sobota', isWeekend: true },
  { key: 'ne', label: 'Ne', full: 'Neděle', isWeekend: true },
];

export const isDateWeekend = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return false;
  const dateObj = new Date(y, m - 1, d);
  const day = dateObj.getDay();
  return day === 0 || day === 6; // 0 = Neděle, 6 = Sobota
};

export const getDayInfo = (dateStr: string) => {
  if (!dateStr) return { dayName: '', isWeekend: false, formatted: '' };
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return { dayName: '', isWeekend: false, formatted: '' };
  const dateObj = new Date(y, m - 1, d);
  const day = dateObj.getDay();
  const dayName = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'][day];
  const isWeekend = day === 0 || day === 6;
  return {
    dayName,
    isWeekend,
    formatted: `${dayName} ${d}. ${m}. ${y}`
  };
};

const formatDateIso = (year: number, month: number, day: number): string => {
  const y = String(year);
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const DatePickerWithWeekends: React.FC<DatePickerWithWeekendsProps> = ({
  value,
  onChange,
  label = 'Datum',
  id,
  required = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parsedValue = useMemo(() => {
    if (!value) {
      const now = new Date();
      return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
    }
    const [y, m, d] = value.split('-').map(Number);
    return { y: y || new Date().getFullYear(), m: m || 1, d: d || 1 };
  }, [value]);

  const [viewYear, setViewYear] = useState(parsedValue.y);
  const [viewMonth, setViewMonth] = useState(parsedValue.m - 1); // 0-indexed

  useEffect(() => {
    setViewYear(parsedValue.y);
    setViewMonth(parsedValue.m - 1);
  }, [parsedValue.y, parsedValue.m]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const dayInfo = useMemo(() => getDayInfo(value), [value]);

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const startWeekday = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1;

    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isWeekend: boolean;
      isSelected: boolean;
      isToday: boolean;
    }> = [];

    const todayStr = new Date().toISOString().split('T')[0];

    // Dny z předchozího měsíce
    for (let i = startWeekday - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevM = viewMonth === 0 ? 12 : viewMonth;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dStr = formatDateIso(prevY, prevM, dayNum);
      const isWk = isDateWeekend(dStr);
      days.push({
        dateStr: dStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isWeekend: isWk,
        isSelected: dStr === value,
        isToday: dStr === todayStr
      });
    }

    // Dny aktuálního měsíce
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dStr = formatDateIso(viewYear, viewMonth + 1, d);
      const isWk = isDateWeekend(dStr);
      days.push({
        dateStr: dStr,
        dayNumber: d,
        isCurrentMonth: true,
        isWeekend: isWk,
        isSelected: dStr === value,
        isToday: dStr === todayStr
      });
    }

    // Dny následujícího měsíce
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextM = viewMonth === 11 ? 1 : viewMonth + 2;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dStr = formatDateIso(nextY, nextM, d);
      const isWk = isDateWeekend(dStr);
      days.push({
        dateStr: dStr,
        dayNumber: d,
        isCurrentMonth: false,
        isWeekend: isWk,
        isSelected: dStr === value,
        isToday: dStr === todayStr
      });
    }

    return days;
  }, [viewYear, viewMonth, value]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const selectDate = (dateStr: string) => {
    onChange(dateStr);
    setIsOpen(false);
  };

  const shiftDays = (delta: number) => {
    const [y, m, d] = (value || new Date().toISOString().split('T')[0]).split('-').map(Number);
    const dateObj = new Date(y, m - 1, d + delta);
    const newStr = formatDateIso(dateObj.getFullYear(), dateObj.getMonth() + 1, dateObj.getDate());
    onChange(newStr);
  };

  const jumpPrevWorkingDay = () => {
    const [y, m, d] = (value || new Date().toISOString().split('T')[0]).split('-').map(Number);
    let dateObj = new Date(y, m - 1, d - 1);
    while (dateObj.getDay() === 0 || dateObj.getDay() === 6) {
      dateObj = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() - 1);
    }
    const newStr = formatDateIso(dateObj.getFullYear(), dateObj.getMonth() + 1, dateObj.getDate());
    onChange(newStr);
  };

  const jumpToday = () => {
    const today = new Date().toISOString().split('T')[0];
    onChange(today);
    const [y, m] = today.split('-').map(Number);
    setViewYear(y);
    setViewMonth(m - 1);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={id} className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider">
          {label}
        </label>
        {dayInfo.isWeekend ? (
          <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-xs">
            <span>🏖️</span>
            <span>Víkend ({dayInfo.dayName})</span>
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-slate-500">
            {dayInfo.dayName}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => shiftDays(-1)}
          className="h-11 px-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl text-slate-600 font-bold text-xs transition-colors shrink-0"
          title="Předchozí den"
        >
          ◀
        </button>

        <div 
          onClick={() => setIsOpen(!isOpen)}
          className={`flex-1 h-11 px-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
            dayInfo.isWeekend
              ? 'border-amber-300 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-400'
              : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/60'
          } ${isOpen ? 'ring-2 ring-indigo-500 border-indigo-500' : ''}`}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-base shrink-0">{dayInfo.isWeekend ? '🏖️' : '📅'}</span>
            <div className="truncate">
              <span className={`text-sm font-black ${dayInfo.isWeekend ? 'text-amber-900' : 'text-slate-800'}`}>
                {dayInfo.formatted || value}
              </span>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-bold ml-1 shrink-0">
            {isOpen ? '▲' : '▼'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => shiftDays(1)}
          className="h-11 px-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl text-slate-600 font-bold text-xs transition-colors shrink-0"
          title="Následující den"
        >
          ▶
        </button>
      </div>

      <input
        type="date"
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 sm:left-auto sm:w-80 mt-1.5 p-3.5 bg-white rounded-2xl border-2 border-slate-200 shadow-xl animate-fade-in">
          <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 font-bold transition-colors"
              title="Předchozí měsíc"
            >
              ◀
            </button>
            <div className="text-sm font-black text-slate-800">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 font-bold transition-colors"
              title="Další měsíc"
            >
              ▶
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {WEEKDAYS.map(w => (
              <div
                key={w.key}
                className={`py-1 text-[11px] font-black uppercase rounded ${
                  w.isWeekend
                    ? 'bg-amber-100/70 text-amber-800 border border-amber-200/60'
                    : 'text-slate-400'
                }`}
                title={w.isWeekend ? `${w.full} (víkend)` : w.full}
              >
                {w.label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarDays.map((d, index) => {
              const weekendClass = d.isWeekend
                ? 'bg-amber-50/70 hover:bg-amber-100/90 text-amber-900 border border-amber-200/50 font-bold'
                : 'hover:bg-slate-100 text-slate-800 font-semibold';

              const selectedClass = d.isSelected
                ? '!bg-indigo-600 !text-white font-black !border-indigo-600 shadow-sm'
                : '';

              const todayClass = d.isToday && !d.isSelected
                ? 'ring-2 ring-indigo-400 font-black'
                : '';

              const otherMonthClass = !d.isCurrentMonth
                ? 'opacity-30'
                : '';

              return (
                <button
                  key={`${d.dateStr}-${index}`}
                  type="button"
                  onClick={() => selectDate(d.dateStr)}
                  className={`h-8 rounded-lg text-xs flex items-center justify-center transition-all ${weekendClass} ${selectedClass} ${todayClass} ${otherMonthClass}`}
                  title={`${d.dateStr}${d.isWeekend ? ' (Víkend)' : ''}`}
                >
                  {d.dayNumber}
                </button>
              );
            })}
          </div>

          <div className="pt-2.5 mt-2.5 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded bg-amber-100 border border-amber-300"></span>
                <span className="font-semibold text-amber-800">Víkend (So, Ne)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded bg-indigo-600"></span>
                <span>Vybraný den</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={jumpToday}
                className="flex-1 py-1 px-2 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
              >
                Dnes
              </button>
              <button
                type="button"
                onClick={jumpPrevWorkingDay}
                className="flex-1 py-1 px-2 text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors"
                title="Skočí na předchozí pracovní den (přeskočí víkend)"
              >
                Posl. prac. den
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePickerWithWeekends;
