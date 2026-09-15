
import React from 'react';
import { TimeEntry } from '../types';

interface DashboardProps {
  entries: TimeEntry[];
  selectedMonth: string;
}

const Dashboard: React.FC<DashboardProps> = ({ entries, selectedMonth }) => {
  const total = entries.reduce((acc, curr) => acc + curr.hours, 0);
  const fund = 160;
  const progress = Math.min(100, (total / fund) * 100);

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Pracovní fond ({selectedMonth})</h3>
        <div className="flex justify-between items-end mb-2">
            <div className="text-3xl font-black text-slate-900">{total.toFixed(1)} <span className="text-sm font-normal text-slate-500">/ {fund}h</span></div>
            <div className="text-sm font-bold text-indigo-600">{Math.round(progress)}%</div>
        </div>
        <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
             <p className="text-xs font-bold text-gray-400 uppercase">Projekty</p>
             <p className="text-xl font-bold">{new Set(entries.map(e=>e.project)).size}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
             <p className="text-xs font-bold text-gray-400 uppercase">Průměr / den</p>
             <p className="text-xl font-bold">{(total / (entries.length || 1)).toFixed(1)}h</p>
          </div>
      </div>
    </div>
  );
};
export default Dashboard;
