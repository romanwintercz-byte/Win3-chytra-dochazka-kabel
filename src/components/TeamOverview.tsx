import React, { useState, useMemo } from 'react';
import { Employee, TimeEntry, MonthStatus, TimesheetStatus, formatDepartment, WorkType } from '../types';
import { getStoredRoles } from '../services/roleService';

interface TeamOverviewProps {
  employees: Employee[];
  allEntries: TimeEntry[];
  selectedMonth: string;
  onInspect: (id: string) => void;
  currentUserRole: string;
  currentUser?: Employee;
  statuses: MonthStatus[];
}

const TeamOverview: React.FC<TeamOverviewProps> = ({ 
  employees, 
  allEntries, 
  selectedMonth, 
  onInspect, 
  currentUser,
  statuses 
}) => {
  const roles = useMemo(() => getStoredRoles(), []);
  const [filterMode, setFilterMode] = useState<'all' | 'my_team'>('all');
  const [selectedSupervisorFilter, setSelectedSupervisorFilter] = useState<string>('all');

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
      .filter(e => String(e.employeeId) === String(empId) && e.date.startsWith(selectedMonth) && e.type !== WorkType.DRIVE)
      .reduce((sum, e) => sum + (e.hours || 0), 0);
  };

  const getEmpDriveHours = (empId: string) => {
    return allEntries
      .filter(e => String(e.employeeId) === String(empId) && e.date.startsWith(selectedMonth) && e.type === WorkType.DRIVE)
      .reduce((sum, e) => sum + (e.hours || 0), 0);
  };

  // Všichni vedoucí k filtrování
  const supervisorsList = useMemo(() => {
    return employees.filter(e => e.isActive && employees.some(sub => sub.supervisorId === e.id));
  }, [employees]);

  // Podřízení přihlášeného uživatele (pokud je vedoucí/mistr)
  const mySubordinates = useMemo(() => {
    if (!currentUser) return [];
    return employees.filter(e => e.isActive && e.supervisorId === currentUser.id);
  }, [employees, currentUser]);

  const activeEmployees = useMemo(() => {
    return employees
      .filter(e => e.isActive && e.role !== 'Manager')
      .filter(e => {
        if (filterMode === 'my_team' && currentUser) {
          return e.supervisorId === currentUser.id;
        }
        if (selectedSupervisorFilter !== 'all') {
          if (selectedSupervisorFilter === 'unassigned') {
            return !e.supervisorId;
          }
          return e.supervisorId === selectedSupervisorFilter;
        }
        return true;
      });
  }, [employees, filterMode, currentUser, selectedSupervisorFilter]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden mb-8">
      <div className="p-4 sm:px-6 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">👥</span>
          <div>
            <h3 className="font-extrabold text-sm text-slate-900">Týmový přehled zaměstnanců firmy Kabel</h3>
            <p className="text-[11px] text-slate-500">Měsíční kontrola a schvalování docházky vedoucími a mistry</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 mt-3 sm:mt-0 w-full sm:w-auto">
          {/* Přepínač Můj tým vs Všichni (pokud má přihlášený uživatel podřízené) */}
          {mySubordinates.length > 0 && (
            <div className="flex items-center bg-white p-0.5 rounded-xl border border-slate-200 shadow-2xs text-xs font-bold w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setFilterMode('my_team');
                  setSelectedSupervisorFilter('all');
                }}
                className={`flex-1 sm:flex-none px-2.5 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                  filterMode === 'my_team' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Můj tým ({mySubordinates.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`flex-1 sm:flex-none px-2.5 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                  filterMode === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Celá firma
              </button>
            </div>
          )}

          {/* Filtr podle vedoucího */}
          {filterMode === 'all' && supervisorsList.length > 0 && (
            <select
              value={selectedSupervisorFilter}
              onChange={e => setSelectedSupervisorFilter(e.target.value)}
              className="w-full sm:w-auto text-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-semibold text-slate-700 outline-none cursor-pointer shadow-2xs appearance-auto"
            >
              <option value="all">Všichni vedoucí</option>
              <option value="unassigned">⚠️ Bez vedoucího</option>
              {supervisorsList.map(s => (
                <option key={s.id} value={s.id}>
                  Tým: {s.name}
                </option>
              ))}
            </select>
          )}

          <span className="hidden sm:inline-block text-xs text-slate-500 font-black bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            {selectedMonth}
          </span>
        </div>
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
                const driveHours = getEmpDriveHours(e.id);
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
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5 flex-wrap">
                            <span>{e.name}</span>
                            {(() => {
                              const roleObj = roles.find(r => r.id === e.customRoleId);
                              if (!roleObj) return null;
                              return (
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${roleObj.badgeColor || 'bg-slate-100 text-slate-700 border-slate-300'}`}>
                                  {roleObj.name}
                                </span>
                              );
                            })()}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] flex-wrap">
                            <span className="text-slate-400">{e.email || 'Bez e-mailu'}</span>
                            {(() => {
                              const supervisor = e.supervisorId ? employees.find(s => s.id === e.supervisorId) : null;
                              if (!supervisor) return null;
                              return (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded text-[10px] font-bold inline-flex items-center gap-1">
                                    <span>👔</span>
                                    <span>Vedoucí: {supervisor.name}</span>
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {formatDepartment(e.department)}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(String(e.id))}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span className="font-black text-slate-900 text-sm">
                        {hours.toFixed(1)} h
                      </span>
                      {driveHours > 0 && (
                        <div className="text-[10px] font-bold text-cyan-700 whitespace-nowrap">
                          🚗 {driveHours.toFixed(1)} h jízda
                        </div>
                      )}
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
