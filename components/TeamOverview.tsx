
import React from 'react';
import { Employee, TimeEntry } from '../types';

const TeamOverview: React.FC<{employees: Employee[], allEntries: TimeEntry[], selectedMonth: string, onInspect: any, currentUserRole: string, reports: any, onMessage: any}> = ({ employees, allEntries, selectedMonth, onInspect }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
      <div className="p-4 bg-gray-50 border-b border-gray-200 font-bold text-sm">Týmový přehled ({selectedMonth})</div>
      <table className="w-full text-sm">
        <tbody className="divide-y divide-gray-100">
          {employees.map(e => (
            <tr key={e.id} className="hover:bg-slate-50">
              <td className="p-4 flex items-center gap-3">
                <img src={e.avatar} className="w-8 h-8 rounded-full" alt="" />
                <span className="font-bold">{e.name}</span>
              </td>
              <td className="p-4 text-right">
                <button onClick={() => onInspect(e.id)} className="text-indigo-600 font-bold text-xs uppercase tracking-widest">Zkontrolovat</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
export default TeamOverview;
