
import React from 'react';
import { Employee, TimeEntry, MonthStatus, TimesheetStatus } from '../types';

interface TeamOverviewProps {
  employees: Employee[];
  allEntries: TimeEntry[];
  selectedMonth: string;
  onInspect: (employeeId: string) => void;
  currentUserRole: string;
  reports: MonthStatus[];
  onMessage: (employeeId: string, name: string) => void;
  onlineUserIds?: Set<string>; // New Prop
}

const TeamOverview: React.FC<TeamOverviewProps> = ({ employees, allEntries, selectedMonth, onInspect, currentUserRole, reports, onMessage, onlineUserIds }) => {
  if (currentUserRole !== 'Manager') return null;

  const getStatsForEmployee = (empId: string) => {
    const empEntries = allEntries.filter(e => e.employeeId === empId && e.date.startsWith(selectedMonth));
    const totalHours = empEntries.reduce((sum, e) => sum + e.hours, 0);
    const lastEntry = empEntries.length > 0 
        ? empEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date 
        : null;
    
    // Estimate "Work Fund" (Simple calculation: 20 days * 8h = 160h approx)
    const estimatedFund = 160; 
    const progress = Math.min(100, (totalHours / estimatedFund) * 100);

    return { totalHours, lastEntry, progress, entryCount: empEntries.length };
  };

  const getStatusBadge = (empId: string) => {
    const report = reports.find(r => r.employeeId === empId);
    const status = report ? report.status : TimesheetStatus.DRAFT;

    switch (status) {
        case TimesheetStatus.DRAFT:
            return <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-600">Rozpracováno</span>;
        case TimesheetStatus.SUBMITTED:
            return <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 animate-pulse">Čeká na schválení</span>;
        case TimesheetStatus.APPROVED:
            return <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Schváleno</span>;
        case TimesheetStatus.REJECTED:
            return <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Vráceno</span>;
        default:
            return null;
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        Týmový přehled ({selectedMonth})
      </h3>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zaměstnanec</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stav výkazu</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Odpracováno</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Poslední aktivita</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Postup</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Akce</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {employees.map(emp => {
                    const stats = getStatsForEmployee(emp.id);
                    const isOnline = onlineUserIds?.has(emp.id);
                    
                    return (
                        <tr key={emp.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                    <div className="relative">
                                        <img className="h-8 w-8 rounded-full mr-3" src={emp.avatar} alt="" />
                                        {isOnline && (
                                            <span className="absolute bottom-0 right-3 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
                                        )}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                            {emp.name}
                                            {isOnline && <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">Online</span>}
                                        </div>
                                        <div className="text-xs text-gray-500">{emp.role}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                                {getStatusBadge(emp.id)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                                <span className="text-sm font-bold text-gray-900">{stats.totalHours.toFixed(1)} h</span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                {stats.lastEntry ? new Date(stats.lastEntry).toLocaleDateString('cs-CZ') : '-'}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap align-middle">
                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                    <div className="bg-indigo-600 h-2 rounded-full" style={{width: `${stats.progress}%`}}></div>
                                </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                                <button 
                                    onClick={() => onMessage(emp.id, emp.name)}
                                    className="text-gray-500 hover:text-indigo-600 border border-gray-200 hover:border-indigo-300 p-1.5 rounded-md transition-all relative"
                                    title="Poslat zprávu"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 00-2-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    {isOnline && <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-white"></span>}
                                </button>
                                <button 
                                    onClick={() => onInspect(emp.id)}
                                    className="text-indigo-600 hover:text-indigo-900 border border-indigo-100 hover:bg-indigo-50 px-3 py-1 rounded-md transition-colors"
                                >
                                    Zkontrolovat
                                </button>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeamOverview;
