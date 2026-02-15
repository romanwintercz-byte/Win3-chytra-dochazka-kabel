
import React from 'react';
import { TimeEntry, Employee, Job } from '../types';

const ReportingModule: React.FC<{entries: TimeEntry[], employees: Employee[], currentUserRole: string, jobs: Job[], selectedEmployeeId?: string, selectedMonth?: string}> = ({ entries, employees, selectedEmployeeId, selectedMonth }) => {
  const filtered = entries.filter(e => (!selectedEmployeeId || e.employeeId === selectedEmployeeId) && (!selectedMonth || e.date.startsWith(selectedMonth)));
  const total = filtered.reduce((acc, curr) => acc + curr.hours, 0);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Reportování</h2>
          <p className="text-xs text-slate-500">{selectedMonth || 'Celá historie'}</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => window.print()} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm">Tisk A4</button>
            <button className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm">CSV / Excel</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase mb-2">Celkem hodin</p>
          <p className="text-4xl font-black text-indigo-600">{total.toFixed(1)}h</p>
        </div>
      </div>
    </div>
  );
};
export default ReportingModule;
