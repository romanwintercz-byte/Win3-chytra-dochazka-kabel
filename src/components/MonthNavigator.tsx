
import React from 'react';

interface MonthNavigatorProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}

const MonthNavigator: React.FC<MonthNavigatorProps> = ({ selectedMonth, onMonthChange }) => {
  const [year, month] = selectedMonth.split('-').map(Number);
  
  const move = (offset: number) => {
    // Použijeme Date pouze pro výpočet posunu, ale výsledek složíme ručně
    const d = new Date(year, month - 1 + offset, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    onMonthChange(`${y}-${m}`);
  };

  return (
    <div className="flex items-center gap-4 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
      <button onClick={() => move(-1)} className="p-1 hover:bg-gray-100 rounded w-8 h-8 flex items-center justify-center transition-colors">◀</button>
      <span className="font-bold min-w-[100px] text-center text-slate-800">{selectedMonth}</span>
      <button onClick={() => move(1)} className="p-1 hover:bg-gray-100 rounded w-8 h-8 flex items-center justify-center transition-colors">▶</button>
    </div>
  );
};
export default MonthNavigator;
