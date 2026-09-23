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

const TeamOverview: React.FC<TeamOverviewProps> = ({ 
  employees, 
  allEntries, 
  selectedMonth, 
  onInspect, 
  statuses 
}) => {
  const getStatusBadge = (empId: string) => {
    const status = statuses.find(s => String(s.employeeId) === String(empId) && s.month === selectedMonth);
    switch (status?.status) {
      case TimesheetStatus.SUBMITTED:
        return (
          <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-md text-[10px] font-black border border-amber-300 animate-pulse">
            ⏳ KE SCHVÁLENÍ
          </span>
        );
      case TimesheetStatus.APPROVED:
        return (
          <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-md text-[10px] font-black border border-emerald-300">
            ✓ SCHVÁLENO
          </span>
        );
      case TimesheetStatus.REJECTED:
        return (
          <span className="bg-rose-100 text-rose-800 px-2.5 py-1 rounded-md text-[10px] font-black border border-rose-300">
            ↩ VRÁCENO
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md text-[10px] font-black border border-slate-200">
            ✏️ ROZPRACOVÁNO
          </span>
        );
    }
  };

  const getEmpMonthlyHours = (empId: string) => {
    return allEntries
      .filter(e => String(e.employeeId) === String(empId) && e.date.startsWith(selectedMonth))
      .reduce((sum, e) => sum + (e.hours || 0), 0);
  };

  const activeEmployees = employees.filter(e => e.isActive && e.role !== 'Manager');

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden mb-8">
      <div className="p-4 sm:px-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-lg">👥</span>
          <div>
            <h3 className="font-extrabold text-sm text-slate-900">Týmový přehled zaměstnanců firmy Kabel</h3>
            <p className="text-[11px] text-slate-500">Měsíční kontrola a schvalování docházky mzdovou účetní</p>
          </div>
        </div>
        <span className="text-xs text-slate-500 font-black bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-2xs">
          {selectedMonth}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50/50 text-[10px] uppercase font-black tracking-wider text-slate-400 border-b border-slate-100">
            <tr>
              <th className="py-2.5 px-4 sm:px-6">Zaměstnanec</th>
              <th className="py-2.5 px-4 text-center">Středisko</th>
              <th className="py-2.5 px-4 text-center">Stav výkazu</th>
              <th className="py-2.5 px-4 text-right">Hodiny</th>
              <th className="py-2.5 px-4 sm:px-6 text-right">Akce</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activeEmployees.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400 text-xs font-medium">
                  Žádní zaměstnanci k zobrazení
                </td>
              </tr>
            ) : (
              activeEmployees.map(e => {
                const hours = getEmpMonthlyHours(e.id);
                const hasPendingApproval = statuses.find(s => String(s.employeeId) === String(e.id) && s.month === selectedMonth)?.status === TimesheetStatus.SUBMITTED;

                return (
                  <tr key={e.id} className={`hover:bg-slate-50/80 transition-colors ${hasPendingApproval ? 'bg-amber-50/30' : ''}`}>
                    <td className="py-3 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <img 
                            src={e.avatar} 
                            className="w-9 h-9 rounded-full border border-slate-200 bg-slate-100 object-cover" 
                            alt={e.name} 
                          />
                          {hasPendingApproval && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-white animate-ping" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{e.name}</div>
                          <div className="text-[11px] text-slate-400">{e.email || 'Bez e-mailu'}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {e.department === '10000' ? '10000 Kancelář' : e.department === '10001' ? '10001 Výroba' : e.department || '-'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(String(e.id))}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span className="font-black text-slate-900 text-sm">
                        {hours.toFixed(1)} h
                      </span>
                    </td>

                    <td className="py-3 px-4 sm:px-6 text-right">
                      <button 
                        type="button"
                        onClick={() => onInspect(String(e.id))} 
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-2xs ${
                          hasPendingApproval 
                            ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200' 
                            : 'bg-white border border-slate-300 hover:border-indigo-600 hover:text-indigo-600 text-slate-700'
                        }`}
                      >
                        {hasPendingApproval ? '⚡ Zkontrolovat' : 'Zkontrolovat'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeamOverview;
