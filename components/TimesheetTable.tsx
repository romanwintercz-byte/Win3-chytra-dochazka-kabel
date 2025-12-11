
import React from 'react';
import { TimeEntry, WorkType } from '../types';
import { getHolidayName } from '../services/holidayService';

interface TimesheetTableProps {
  entries: TimeEntry[];
  onDelete: (id: string) => void;
  onEdit: (date: string) => void;
  isLocked?: boolean; // Visual state (is status Submitted/Approved?)
  canEdit?: boolean;  // Functional state (does user have permission?)
}

const TimesheetTable: React.FC<TimesheetTableProps> = ({ entries, onDelete, onEdit, isLocked = false, canEdit = true }) => {
  // 1. Group entries by Date
  const groupedEntries = entries.reduce((acc, entry) => {
    if (!acc[entry.date]) {
      acc[entry.date] = [];
    }
    acc[entry.date].push(entry);
    return acc;
  }, {} as Record<string, TimeEntry[]>);

  // 2. Sort dates descending
  const sortedDates = Object.keys(groupedEntries).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const getWorkTypeBadge = (type: WorkType) => {
    switch (type) {
      case WorkType.REGULAR: return 'bg-blue-100 text-blue-800 border border-blue-200';
      case WorkType.OVERTIME: return 'bg-orange-100 text-orange-800 border border-orange-200';
      case WorkType.VACATION: return 'bg-green-100 text-green-800 border border-green-200';
      case WorkType.SICK_DAY: return 'bg-red-100 text-red-800 border border-red-200';
      case WorkType.HOLIDAY: return 'bg-indigo-100 text-indigo-800 border border-indigo-200';
      case WorkType.DOCTOR: return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case WorkType.BUSINESS_TRIP: return 'bg-purple-100 text-purple-800 border border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    const dayName = date.toLocaleDateString('cs-CZ', { weekday: 'short' });
    return dayName.charAt(0).toUpperCase() + dayName.slice(1);
  };

  const getDayColor = (hours: number, isWeekend: boolean, isHoliday: boolean) => {
      if (isHoliday) return 'bg-indigo-50 border-indigo-200';
      if (isWeekend) return 'bg-slate-50 border-slate-200'; // Darker gray for weekends
      if (hours === 8) return 'bg-white border-green-200 shadow-sm ring-1 ring-green-500/10'; // Subtle green ring
      if (hours > 8) return 'bg-orange-50 border-orange-200 shadow-sm';
      if (hours < 8 && hours > 0) return 'bg-white border-orange-300 border-l-4 border-l-orange-400 shadow-sm';
      return 'bg-white border-gray-200 shadow-sm';
  };

  return (
    <div className="space-y-4">
      {sortedDates.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
           <p className="text-gray-500">Zatím žádné záznamy. {(!canEdit && isLocked) ? 'V uzamčeném měsíci nelze přidávat data.' : 'Použijte formulář nebo přidejte den ručně.'}</p>
        </div>
      ) : (
        sortedDates.map((date) => {
          const dayEntries = groupedEntries[date];
          const totalHours = dayEntries.reduce((sum, e) => sum + e.hours, 0);
          const holidayName = getHolidayName(date);
          const dayName = getDayName(date);
          const isWeekend = dayName === 'So' || dayName === 'Ne';
          
          return (
            <div 
                key={date} 
                className={`rounded-xl border overflow-hidden transition-all hover:shadow-md ${getDayColor(totalHours, isWeekend, !!holidayName)}`}
            >
              {/* Header Row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-3">
                 
                 {/* Left: Date Info */}
                 <div className="flex items-center gap-4 min-w-[180px]">
                    <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg border shadow-sm ${
                        isWeekend 
                        ? 'bg-white border-gray-300 text-gray-500' 
                        : (holidayName ? 'bg-indigo-100 border-indigo-200 text-indigo-700' : 'bg-indigo-600 border-indigo-700 text-white')
                    }`}>
                        <span className="text-xs font-bold uppercase opacity-90">{dayName}</span>
                        <span className="text-lg font-bold leading-none">{new Date(date).getDate()}</span>
                    </div>
                    <div>
                        <div className="font-bold text-gray-900 flex items-center gap-2 text-lg">
                            {new Date(date).toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-0.5">
                             {holidayName && <span className="text-[10px] uppercase font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200">{holidayName}</span>}
                             <span className={`text-sm ${isWeekend || holidayName ? 'text-gray-600' : 'text-gray-500'}`}>
                                {dayEntries.length} {dayEntries.length === 1 ? 'činnost' : (dayEntries.length >= 2 && dayEntries.length <= 4 ? 'činnosti' : 'činností')}
                             </span>
                        </div>
                    </div>
                 </div>

                 {/* Middle: Quick Preview (only on desktop) */}
                 <div className="flex-1 hidden md:flex flex-wrap gap-2 items-center">
                    {dayEntries.map(entry => (
                        <div key={entry.id} className="flex items-center gap-2 text-xs bg-white border border-gray-200 px-2.5 py-1.5 rounded-md text-gray-700 shadow-sm max-w-[220px]">
                            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${entry.type === WorkType.REGULAR ? 'bg-blue-500' : 'bg-orange-500'}`}></span>
                            <span className="font-semibold truncate">{entry.project}</span>
                            <span className="text-gray-500 border-l border-gray-200 pl-2 ml-1">{entry.hours}h</span>
                            {entry.attachmentUrl && (
                                <span className="text-indigo-500 ml-1" title="Obsahuje přílohu">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                                    </svg>
                                </span>
                            )}
                        </div>
                    ))}
                 </div>

                 {/* Right: Total & Actions */}
                 <div className="flex items-center justify-between w-full sm:w-auto gap-6 pl-2 sm:pl-0 border-t sm:border-t-0 border-gray-200 pt-3 sm:pt-0 mt-2 sm:mt-0">
                    <div className="text-right">
                        <div className={`text-xl font-bold font-mono ${totalHours > 8 ? 'text-orange-600' : (totalHours < 8 && !isWeekend && !holidayName ? 'text-orange-600' : 'text-gray-900')}`}>
                            {totalHours.toFixed(1)} <span className="text-sm font-sans font-normal text-gray-500">h</span>
                        </div>
                    </div>
                    
                    <button
                        onClick={() => onEdit(date)}
                        disabled={!canEdit}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm ${
                            !canEdit
                             ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed' 
                             : (isLocked 
                                ? 'bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100' // Manager override style
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200')
                        }`}
                    >
                        {!canEdit ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        )}
                        <span>
                            {!canEdit ? 'Zamčeno' : (isLocked ? 'Upravit (Manažer)' : 'Upravit')}
                        </span>
                    </button>
                 </div>
              </div>

              {/* Mobile Detail View (Rows underneath) - Visible mostly on mobile where "Quick Preview" is hidden */}
              <div className="md:hidden border-t border-gray-200 divide-y divide-gray-100 bg-white">
                  {dayEntries.map(entry => (
                      <div key={entry.id} className="p-3 flex justify-between items-start text-sm">
                          <div>
                              <div className="font-bold text-gray-900 flex items-center gap-2">
                                  {entry.project}
                                  {entry.attachmentUrl && (
                                      <a href={entry.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-500" onClick={(e) => e.stopPropagation()}>
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                                          </svg>
                                      </a>
                                  )}
                              </div>
                              {entry.description && <div className="text-gray-600 text-xs mt-0.5">{entry.description}</div>}
                              <div className={`mt-2 inline-flex text-[10px] px-2 py-0.5 rounded font-medium ${getWorkTypeBadge(entry.type)}`}>{entry.type}</div>
                          </div>
                          <div className="font-mono font-bold text-gray-900 bg-gray-50 px-2 py-1 rounded border border-gray-100">{entry.hours}h</div>
                      </div>
                  ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default TimesheetTable;
