import React from 'react';
import { TimeEntry, WorkType, Job } from '../types';

interface TimesheetTableProps {
  entries: TimeEntry[];
  onDelete: (id: string) => void;
  onEdit: (entry: TimeEntry) => void;
  isLocked?: boolean;
  jobs: Job[];
}

const TimesheetTable: React.FC<TimesheetTableProps> = ({ entries, onDelete, onEdit, isLocked, jobs }) => {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  const getProjectName = (projectIdOrName: string) => {
    if (!projectIdOrName) return '';
    const job = jobs.find(j => String(j.id) === String(projectIdOrName) || j.code === projectIdOrName);
    return job ? `${job.code} - ${job.name}` : projectIdOrName;
  };

  const getTypeBadge = (type: WorkType) => {
    const colors: Record<string, string> = {
      [WorkType.REGULAR]: 'bg-slate-100 text-slate-700 border-slate-200',
      [WorkType.VACATION]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      [WorkType.DOCTOR]: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      [WorkType.SICK_DAY]: 'bg-rose-100 text-rose-800 border-rose-200',
      [WorkType.OVERTIME]: 'bg-orange-100 text-orange-800 border-orange-200 font-black',
      [WorkType.COMPENSATORY_LEAVE]: 'bg-teal-100 text-teal-800 border-teal-200',
    };
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase border ${colors[type] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
        {type}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs mb-20 md:mb-8 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left min-w-[540px]">
          <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-4 py-3.5 w-36">Datum</th>
              <th className="px-4 py-3.5">Zakázka & Činnost</th>
              <th className="px-4 py-3.5">Popis / Poznámka</th>
              <th className="px-4 py-3.5 text-right w-24">Hodiny</th>
              {!isLocked && <th className="px-4 py-3.5 text-right w-24">Akce</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((e, idx) => {
              const dateOnly = e.date ? e.date.split('T')[0] : '';
              const isFirstInDay = idx === 0 || (sorted[idx - 1].date ? sorted[idx - 1].date.split('T')[0] !== dateOnly : false);
              
              // Výpočet součtu pro celý den
              const dayTotal = isFirstInDay 
                ? sorted.filter(entry => (entry.date ? entry.date.split('T')[0] === dateOnly : false)).reduce((sum, entry) => sum + entry.hours, 0)
                : 0;

              const dateParts = dateOnly.split('-').map(Number);
              const dateObj = new Date(dateParts[0], (dateParts[1] || 1) - 1, dateParts[2] || 1);
              const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

              return (
                <tr 
                  key={e.id} 
                  className={`hover:bg-slate-50/70 transition-colors ${
                    !isFirstInDay 
                      ? 'bg-slate-50/30 border-l-4 border-l-indigo-300' 
                      : isWeekend 
                        ? 'bg-amber-50/20' 
                        : ''
                  }`}
                >
                  <td className="px-4 py-3.5 align-top">
                    {isFirstInDay ? (
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`font-extrabold text-sm ${isWeekend ? 'text-amber-900' : 'text-slate-900'}`}>
                            {dateObj.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', weekday: 'short' })}
                          </span>
                          {isWeekend && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                              Víkend
                            </span>
                          )}
                        </div>
                        {e.lunchTime ? (
                          <div className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-1 inline-flex items-center gap-1 font-semibold">
                            <span>🍽️ Oběd: {e.lunchTime}</span>
                          </div>
                        ) : e.breakMinutes ? (
                          <div className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-1 inline-flex items-center gap-1 font-semibold">
                            <span>🍽️ Oběd: {e.breakMinutes}m</span>
                          </div>
                        ) : null}
                        <div className="text-[10px] font-black text-indigo-600 mt-1 uppercase">
                          Suma dne: {dayTotal.toFixed(1)} h
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 font-semibold pl-2 sm:pl-3">
                        ↳ další činnost
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3.5">
                    <div className="font-bold text-slate-800 text-sm">{getProjectName(e.project) || '-'}</div>
                    {(e.startTime && e.endTime) || e.lunchTime ? (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {e.startTime && e.endTime && (
                          <div className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            <span>🕒 {e.startTime} – {e.endTime}</span>
                          </div>
                        )}
                      </div>
                    ) : null}
                    <div className="mt-1.5">{getTypeBadge(e.type)}</div>
                  </td>

                  <td className="px-4 py-3.5 text-slate-600 italic text-xs max-w-[200px] truncate" title={e.description || ''}>
                    {e.description || '-'}
                  </td>

                  <td className="px-4 py-3.5 text-right font-black text-slate-900 text-base">
                    {e.hours.toFixed(1)} h
                  </td>

                  {!isLocked && (
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1.5">
                        <button 
                          type="button"
                          onClick={() => onEdit(e)} 
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg transition-colors"
                          title="Upravit celý tento den"
                        >
                          Upravit
                        </button>
                        <button 
                          type="button"
                          onClick={() => onDelete(e.id)} 
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Smazat záznam"
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
              <tr>
                <td colSpan={isLocked ? 4 : 5} className="p-12 text-center text-slate-400 font-medium">
                  Zatím jste nezapsali žádné odpracované hodiny.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TimesheetTable;
