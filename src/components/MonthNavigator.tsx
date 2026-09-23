import React from 'react';

interface MonthNavigatorProps {
  selectedMonth: string; // YYYY-MM
  onMonthChange: (month: string) => void;
}

const MonthNavigator: React.FC<MonthNavigatorProps> = ({ selectedMonth, onMonthChange }) => {
  const [year, month] = selectedMonth.split('-').map(Number);
  
  const move = (offset: number) => {
    const d = new Date(year, month - 1 + offset, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    onMonthChange(`${y}-${m}`);
  };

  const getMonthLabel = () => {
    try {
      const d = new Date(year, month - 1, 1);
      const name = d.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });
      return name.charAt(0).toUpperCase() + name.slice(1);
    } catch {
      return selectedMonth;
    }
  };

  const currentMonth = new Date().toISOString().slice(0, 7);
  const isCurrent = selectedMonth === currentMonth;

  return (
    <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs">
      <button 
        type="button"
        onClick={() => move(-1)} 
        className="w-9 h-9 hover:bg-slate-100 active:bg-slate-200 rounded-xl text-slate-700 font-bold flex items-center justify-center transition-colors"
        title="Předchozí měsíc"
      >
        ◀
      </button>

      <div className="flex items-center gap-2 px-3 text-center min-w-[140px] justify-center">
        <span className="font-extrabold text-sm text-slate-800">{getMonthLabel()}</span>
        {!isCurrent && (
          <span className="text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
            Historie
          </span>
        )}
      </div>

      <button 
        type="button"
        onClick={() => move(1)} 
        className="w-9 h-9 hover:bg-slate-100 active:bg-slate-200 rounded-xl text-slate-700 font-bold flex items-center justify-center transition-colors"
        title="Následující měsíc"
      >
        ▶
      </button>

      {!isCurrent && (
        <button
          type="button"
          onClick={() => onMonthChange(currentMonth)}
          className="ml-1 text-[11px] font-black uppercase px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition-colors border border-indigo-200"
          title="Vrátit se na aktuální měsíc"
        >
          Dnes
        </button>
      )}
    </div>
  );
};

export default MonthNavigator;
