
import React, { useMemo } from 'react';
import { TimeEntry, Employee, Job, WorkType, MonthStatus, TimesheetStatus } from '../types';
import { getHolidayName } from '../services/holidayService';

interface ReportingModuleProps {
  entries: TimeEntry[];
  employees: Employee[];
  currentUserRole: string;
  jobs: Job[];
  selectedEmployeeId?: string;
  selectedMonth?: string;
  monthStatus?: MonthStatus;
}

const ReportingModule: React.FC<ReportingModuleProps> = ({ entries, employees, selectedEmployeeId, selectedMonth, monthStatus }) => {
  const monthStr = selectedMonth || new Date().toISOString().slice(0, 7);
  const [year, month] = monthStr.split('-').map(Number);
  
  const employee = useMemo(() => 
    employees.find(e => e.id === selectedEmployeeId) || employees[0], 
  [employees, selectedEmployeeId]);

  const filteredEntries = useMemo(() => 
    entries.filter(e => e.employeeId === employee?.id && e.date.startsWith(monthStr)),
  [entries, employee, monthStr]);

  const monthStats = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    let workingDays = 0;
    const days = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dateObj = new Date(year, month - 1, d);
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      const holiday = getHolidayName(dateStr);
      if (!isWeekend && !holiday) workingDays++;
      
      days.push({
        dateStr,
        isWeekend,
        holiday,
        entries: filteredEntries.filter(e => e.date === dateStr)
      });
    }

    const fund = workingDays * 8;
    const totalHours = filteredEntries.reduce((sum, e) => sum + e.hours, 0);
    return { fund, totalHours, days, diff: totalHours - fund };
  }, [year, month, filteredEntries]);

  const typeSummary = useMemo(() => {
    const summary: Record<string, number> = {};
    Object.values(WorkType).forEach(t => summary[t] = 0);
    filteredEntries.forEach(e => summary[e.type] += e.hours);
    return summary;
  }, [filteredEntries]);

  const jobSummary = useMemo(() => {
    const summary: Record<string, { regular: number, overtime: number }> = {};
    filteredEntries.forEach(e => {
      if (!summary[e.project]) summary[e.project] = { regular: 0, overtime: 0 };
      if (e.type === WorkType.OVERTIME) summary[e.project].overtime += e.hours;
      else summary[e.project].regular += e.hours;
    });
    return summary;
  }, [filteredEntries]);

  const shorten = (text: string, len: number = 25) => 
    text.length > len ? text.substring(0, len - 3) + '...' : text;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center no-print">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Mzdový report</h2>
          <p className="text-xs text-slate-500">Zaměstnanec: {employee?.name} | {monthStr}</p>
        </div>
        <button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors shadow-lg">Vytisknout A4</button>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-none md:rounded-xl shadow-none md:shadow-sm border-0 md:border border-gray-100 print:p-0 print:m-0 relative overflow-hidden">
        
        {/* Stavové razítko pro tisk */}
        {monthStatus?.status === TimesheetStatus.APPROVED && (
          <div className="absolute top-10 right-10 border-4 border-green-600/30 text-green-600/30 font-black text-4xl px-4 py-2 rounded-xl -rotate-12 pointer-events-none select-none uppercase tracking-widest hidden print:block">
            SCHVÁLENO
          </div>
        )}

        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase">Výkaz práce</h1>
            <p className="text-sm font-bold text-indigo-600">{employee?.name}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-slate-900">{monthStr}</p>
            <p className="text-[10px] text-slate-400 uppercase font-bold">Export: {new Date().toLocaleDateString('cs-CZ')}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="border-l-4 border-indigo-600 pl-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Celkem hodin</p>
            <p className="text-2xl font-black text-slate-900">{monthStats.totalHours.toFixed(1)}h</p>
          </div>
          <div className="border-l-4 border-slate-300 pl-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Fond</p>
            <p className="text-2xl font-black text-slate-900">{monthStats.fund}h</p>
          </div>
          <div className="border-l-4 border-orange-500 pl-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Přesčasy</p>
            <p className="text-2xl font-black text-orange-600">{typeSummary[WorkType.OVERTIME].toFixed(1)}h</p>
          </div>
          <div className={`border-l-4 pl-3 ${monthStats.diff >= 0 ? 'border-green-500' : 'border-red-500'}`}>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Rozdíl</p>
            <p className={`text-2xl font-black ${monthStats.diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {monthStats.diff > 0 ? '+' : ''}{monthStats.diff.toFixed(1)}h
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase mb-3 bg-slate-100 p-2 border-l-2 border-slate-900">Mzdové ukazatele</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              {Object.entries(typeSummary).filter(([_, h]) => h > 0).map(([type, hours]) => (
                <div key={type} className="flex justify-between border-b border-slate-100 py-1">
                  <span className="text-xs text-slate-600">{type}</span>
                  <span className="text-xs font-bold text-slate-900">{hours.toFixed(1)}h</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase mb-3 bg-slate-100 p-2 border-l-2 border-slate-900">Přehled zakázek</h3>
            <table className="w-full text-left">
              <thead><tr className="border-b border-slate-200"><th className="text-[9px] font-black py-1">ZAKÁZKA</th><th className="text-[9px] font-black py-1 text-right">BĚŽNÁ</th><th className="text-[9px] font-black py-1 text-right text-orange-600">PŘESČAS</th></tr></thead>
              <tbody className="divide-y divide-slate-50">
                {Object.entries(jobSummary).map(([name, data]) => (
                  <tr key={name}>
                    <td className="text-[10px] py-1">{shorten(name)}</td>
                    <td className="text-[10px] py-1 text-right font-medium">{data.regular.toFixed(1)}h</td>
                    <td className="text-[10px] py-1 text-right font-bold text-orange-600">{data.overtime > 0 ? data.overtime.toFixed(1) + 'h' : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-black text-slate-900 uppercase mb-3 bg-slate-100 p-2 border-l-2 border-slate-900">Denní detail docházky</h3>
          <table className="w-full border-collapse">
            <thead><tr className="bg-slate-800 text-white"><th className="text-[9px] p-1.5 text-left w-20">DATUM</th><th className="text-[9px] p-1.5 text-left">PROJEKT</th><th className="text-[9px] p-1.5 text-left w-24">DRUH</th><th className="text-[9px] p-1.5 text-right w-16">HODINY</th></tr></thead>
            <tbody className="divide-y divide-slate-200 border-b border-slate-200">
              {monthStats.days.map(day => {
                const rowEntries = day.entries;
                const totalDayHours = rowEntries.reduce((s, e) => s + e.hours, 0);
                return (
                  <tr key={day.dateStr} className={`${day.isWeekend ? 'bg-slate-50' : ''} ${day.holiday ? 'bg-amber-50' : ''}`}>
                    <td className="text-[10px] p-1.5 font-bold">{new Date(day.dateStr).toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', weekday: 'short' })}</td>
                    <td className="text-[10px] p-1.5">
                      {rowEntries.length > 0 ? rowEntries.map((e, idx) => (
                        <div key={idx} className="flex gap-2"><span>{shorten(e.project, 40)}</span></div>
                      )) : <span className="text-slate-300 italic">{day.holiday || (day.isWeekend ? 'Víkend' : '-')}</span>}
                    </td>
                    <td className="text-[9px] p-1.5 text-slate-500">{rowEntries.map((e, i) => <div key={i}>{e.type}</div>)}</td>
                    <td className="text-[10px] p-1.5 text-right font-black">{totalDayHours > 0 ? `${totalDayHours.toFixed(1)}h` : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-12 flex justify-between gap-12 border-t border-slate-100 pt-8">
          <div className="flex-1 border-t border-slate-300 pt-2">
            <p className="text-[9px] font-bold text-slate-400 uppercase">Podpis zaměstnance</p>
          </div>
          <div className="flex-1 border-t border-slate-300 pt-2 text-right">
            <p className="text-[9px] font-bold text-slate-400 uppercase">Schválil (manažer)</p>
            {monthStatus?.status === TimesheetStatus.APPROVED && (
              <p className="text-[10px] font-black text-slate-900 mt-2">ELEKTRONICKY SCHVÁLENO</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
export default ReportingModule;
