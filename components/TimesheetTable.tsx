
import React from 'react';
import { TimeEntry, WorkType } from '../types';

interface TimesheetTableProps {
  entries: TimeEntry[];
  onDelete: (id: string) => void;
  onEdit: (entry: TimeEntry) => void;
  isLocked?: boolean;
}

const TimesheetTable: React.FC<TimesheetTableProps> = ({ entries, onDelete, onEdit, isLocked }) => {
  // Seřazení podle data sestupně
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  const getTypeBadge = (type: WorkType) => {
    const colors: Record<string, string> = {
      [WorkType.REGULAR]: 'bg-slate-100 text-slate-600',
      [WorkType.VACATION]: 'bg-green-100 text-green-700',
      [WorkType.DOCTOR]: 'bg-indigo-100 text-indigo-700',
      [WorkType.SICK_DAY]: 'bg-red-100 text-red-700',
      [WorkType.OVERTIME]: 'bg-orange-100 text-orange-700',
    };
    return <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${colors[type] || 'bg-gray-100 text-gray-600'}`}>{type}</span>;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-20 md:mb-8">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="p-4 font-bold text-gray-500 uppercase text-[10px]">Datum</th>
            <th className="p-4 font-bold text-gray-500 uppercase text-[10px]">Projekt & Typ</th>
            <th className="p-4 font-bold text-gray-500 uppercase text-[10px]">Popis</th>
            <th className="p-4 font-bold text-gray-500 uppercase text-[10px] text-right">Hodiny</th>
            {!isLocked && <th className="p-4"></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map((e, idx) => {
            const dateOnly = e.date.split('T')[0];
            const isFirstInDay = idx === 0 || sorted[idx - 1].date.split('T')[0] !== dateOnly;
            
            // Výpočet součtu pro celý den (zobrazujeme jen u prvního řádku dne)
            const dayTotal = isFirstInDay 
              ? sorted.filter(entry => entry.date.split('T')[0] === dateOnly).reduce((sum, entry) => sum + entry.hours, 0)
              : 0;

            return (
              <tr key={e.id} className={`hover:bg-slate-50 transition-colors ${!isFirstInDay ? 'bg-slate-50/40 border-l-4 border-l-indigo-300' : ''}`}>
                <td className="p-4 align-top">
                  {isFirstInDay ? (
                    <div>
                      <div className="font-bold text-slate-900">{new Date(dateOnly).toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', weekday: 'short' })}</div>
                      <div className="text-[10px] font-black text-indigo-500 mt-1 uppercase">Suma: {dayTotal.toFixed(1)}h</div>
                    </div>
                  ) : (
                    <div className="text-[9px] text-slate-300 italic pl-4">pokračování...</div>
                  )}
                </td>
                <td className="p-4">
                  <div className="font-medium text-slate-700">{e.project || '-'}</div>
                  <div className="mt-1">{getTypeBadge(e.type)}</div>
                </td>
                <td className="p-4 text-slate-500 italic text-xs">{e.description || '-'}</td>
                <td className="p-4 text-right font-black text-slate-900">{e.hours.toFixed(1)}h</td>
                {!isLocked && (
                  <td className="p-4 text-right whitespace-nowrap">
                    <div className="flex justify-end gap-3">
                      <button 
                        onClick={() => onEdit(e)} 
                        className="text-indigo-600 hover:text-indigo-800 font-bold text-[10px] uppercase p-1"
                        title="Upravit"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => onDelete(e.id)} 
                        className="text-red-400 hover:text-red-600 font-bold text-[10px] uppercase p-1"
                        title="Smazat"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr><td colSpan={isLocked ? 4 : 5} className="p-12 text-center text-slate-400 font-medium">Zatím jste nezapsali žádné hodiny.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
export default TimesheetTable;
