
import React from 'react';

interface MonthNavigatorProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}

const MonthNavigator: React.FC<MonthNavigatorProps> = ({ selectedMonth, onMonthChange }) => {
  const [year, month] = selectedMonth.split('-').map(Number);
  
  const move = (offset: number) => {
    const d = new Date(year, month - 1 + offset, 1);
    onMonthChange(d.toISOString().slice(0, 7));
  };

  return (
    <div className="flex items-center gap-4 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
      <button onClick={() => move(-1)} className="p-1 hover:bg-gray-100 rounded">◀</button>
      <span className="font-bold min-w-[100px] text-center">{selectedMonth}</span>
      <button onClick={() => move(1)} className="p-1 hover:bg-gray-100 rounded">▶</button>
    </div>
  );
};
export default MonthNavigator;
