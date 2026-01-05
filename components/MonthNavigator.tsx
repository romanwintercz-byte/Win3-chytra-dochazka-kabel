import React from 'react';

interface MonthNavigatorProps {
  selectedMonth: string; // YYYY-MM
  onMonthChange: (newMonth: string) => void;
}

const MonthNavigator: React.FC<MonthNavigatorProps> = ({ selectedMonth, onMonthChange }) => {
  const [year, month] = selectedMonth.split('-').map(Number);
  
  const formatDate = () => {
    const date = new Date(year, month - 1, 1);
    const monthName = date.toLocaleDateString('cs-CZ', { month: 'long' });
    return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
  };

  const handlePrev = () => {
    let newYear = year;
    let newMonth = month - 1;
    if (newMonth === 0) {
      newMonth = 12;
      newYear -= 1;
    }
    onMonthChange(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const handleNext = () => {
    let newYear = year;
    let newMonth = month + 1;
    if (newMonth === 13) {
      newMonth = 1;
      newYear += 1;
    }
    onMonthChange(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const handleToday = () => {
    onMonthChange(new Date().toISOString().slice(0, 7));
  };

  const isCurrentMonth = selectedMonth === new Date().toISOString().slice(0, 7);

  return (
    <div className="bg-white px-4 py-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between mb-6 animate-fade-in">
      <div className="flex items-center gap-2 sm:gap-4">
        <button 
          onClick={handlePrev}
          className="p-2 rounded-lg hover:bg-indigo-50 text-indigo-600 transition-colors"
          title="Předchozí měsíc"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="flex flex-col items-center">
            <span className={`text-sm font-bold sm:text-lg transition-colors ${!isCurrentMonth ? 'text-orange-600' : 'text-slate-900'}`}>
                {formatDate()}
            </span>
            {!isCurrentMonth && <span className="text-[10px] text-orange-400 font-bold uppercase tracking-wider">Historie</span>}
        </div>

        <button 
          onClick={handleNext}
          className="p-2 rounded-lg hover:bg-indigo-50 text-indigo-600 transition-colors"
          title="Následující měsíc"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <button 
        onClick={handleToday}
        disabled={isCurrentMonth}
        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            isCurrentMonth 
            ? 'bg-gray-50 text-gray-300 cursor-not-allowed' 
            : 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700 active:scale-95'
        }`}
      >
        DNES
      </button>
    </div>
  );
};

export default MonthNavigator;