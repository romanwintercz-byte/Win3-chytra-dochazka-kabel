
import React from 'react';
import { TimeEntry, WorkType } from '../types';

interface TimesheetTableProps {
  entries: TimeEntry[];
  onDelete: (id: string) => void;
  onEdit: (entry: TimeEntry) => void;
}

const TimesheetTable: React.FC<TimesheetTableProps> = ({ entries, onDelete, onEdit }) => {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="p-4 font-bold text-gray-500 uppercase text-[10px]">Datum</th>
            <th className="p-4 font-bold text-gray-500 uppercase text-[10px]">Projekt</th>
            <th className="p-4 font-bold text-gray-500 uppercase text-[10px]">Popis</th>
            <th className="p-4 font-bold text-gray-500 uppercase text-[10px] text-right">Hodiny</th>
            <th className="p-4"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map(e => (
            <tr key={e.id} className="hover:bg-slate-50 transition-colors">
              <td className="p-4 font-medium text-slate-900">{new Date(e.date).toLocaleDateString('cs-CZ')}</td>
              <td className="p-4 text-slate-700">{e.project}</td>
              <td className="p-4 text-slate-500 italic">{e.description}</td>
              <td className="p-4 text-right font-bold text-slate-900">{e.hours.toFixed(1)}h</td>
              <td className="p-4 text-right whitespace-nowrap">
                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => onEdit(e)} 
                    className="text-indigo-600 hover:text-indigo-800 font-bold text-xs uppercase"
                  >
                    Upravit
                  </button>
                  <button 
                    onClick={() => onDelete(e.id)} 
                    className="text-red-400 hover:text-red-600 font-bold text-xs uppercase"
                  >
                    Smazat
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr><td colSpan={5} className="p-12 text-center text-slate-400">Žádné záznamy</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
export default TimesheetTable;
