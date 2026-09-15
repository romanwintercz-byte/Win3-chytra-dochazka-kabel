
import React from 'react';
import { Employee, TimeEntry, MonthStatus, TimesheetStatus } from '../types';

interface TeamOverviewProps {
  employees: Employee[];
  allEntries: TimeEntry[];
  selectedMonth: string;
  onInspect: (id: string) => void;
  currentUserRole: string;
  statuses: MonthStatus[];
}

const TeamOverview: React.FC<TeamOverviewProps> = ({ employees, selectedMonth, onInspect, statuses }) => {
  const getStatusBadge = (empId: string) => {
    const status = statuses.find(s => String(s.employeeId) === String(empId) && s.month === selectedMonth);
    switch (status?.status) {
      case TimesheetStatus.SUBMITTED:
        return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[9px] font-black border border-amber-200 animate-pulse">KE SCHVÁLENÍ</span>;
      case TimesheetStatus.APPROVED:
        return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[9px] font-black border border-green-200">SCHVÁLENO</span>;
      case TimesheetStatus.REJECTED:
        return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[9px] font-black border border-red-200">VRÁCENO</span>;
      default:
        return <span className="bg-slate-100 text-slate-400 px-2 py-0.5 rounded text-[9px] font-black border border-slate-200">ROZPRACOVÁNO</span>;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-8">
      <div className="p-4 bg-slate-50 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-bold text-sm text-slate-700">Týmový přehled – Lucie</h3>
        <span className="text-[10px] text-slate-400 font-bold uppercase">{selectedMonth}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            {employees.filter(e => e.role !== 'Manager').map(e => (
              <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 flex items-center gap-3">
                  <div className="relative">
                    <img src={e.avatar} className="w-9 h-9 rounded-full border border-slate-200" alt="" />
                    {statuses.find(s => String(s.employeeId) === String(e.id) && s.month === selectedMonth)?.status === TimesheetStatus.SUBMITTED && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-white"></span>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{e.name}</div>
                    <div className="text-[10px] text-slate-400">{e.email}</div>
                  </div>
                </td>
                <td className="p-4 text-center">
                  {getStatusBadge(String(e.id))}
                </td>
                <td className="p-4 text-right">
                  <button 
                    onClick={() => onInspect(String(e.id))} 
                    className="bg-white border border-slate-200 hover:border-indigo-600 hover:text-indigo-600 text-slate-600 px-4 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm"
                  >
                    Zkontrolovat
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeamOverview;
