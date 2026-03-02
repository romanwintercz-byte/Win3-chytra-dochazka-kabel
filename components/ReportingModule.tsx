
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
    employees.find(e => String(e.id) === String(selectedEmployeeId)) || employees[0], 
  [employees, selectedEmployeeId]);

  const filteredEntries = useMemo(() => 
    entries.filter(e => String(e.employeeId) === String(employee?.id) && e.date.startsWith(monthStr)),
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
      
      // Robustní filtrování dne (ignorujeme časovou část)
      const dayEntries = filteredEntries.filter(e => e.date.split('T')[0] === dateStr);
      
      const stats = {
        work: dayEntries.filter(e => e.type === WorkType.REGULAR || e.type === WorkType.OVERTIME).reduce((s, e) => s + e.hours, 0),
        doctor: dayEntries.filter(e => e.type === WorkType.DOCTOR).reduce((s, e) => s + e.hours, 0),
        vacation: dayEntries.filter(e => e.type === WorkType.VACATION).reduce((s, e) => s + e.hours, 0),
        sick: dayEntries.filter(e => e.type === WorkType.SICK_DAY).reduce((s, e) => s + e.hours, 0),
        other: dayEntries.filter(e => ![WorkType.REGULAR, WorkType.OVERTIME, WorkType.DOCTOR, WorkType.VACATION, WorkType.SICK_DAY].includes(e.type)).reduce((s, e) => s + e.hours, 0),
        total: dayEntries.reduce((s, e) => s + e.hours, 0),
        projects: Array.from(new Set(dayEntries.filter(e => e.project && e.project !== '').map(e => e.project))).join(', ')
      };

      days.push({
        dateStr,
        isWeekend,
        holiday,
        ...stats
      });
    }

    const fund = workingDays * 8;
    const totalHours = filteredEntries.reduce((sum, e) => sum + e.hours, 0);
    return { fund, totalHours, days, diff: totalHours - fund };
  }, [year, month, filteredEntries]);

  const typeSummary = useMemo(() => {
    const summary: Record<string, number> = {};
    Object.values(WorkType).forEach(t => summary[t] = 0);
    filteredEntries.forEach(e => {
        if (summary[e.type] !== undefined) summary[e.type] += e.hours;
    });
    return summary;
  }, [filteredEntries]);

  const jobSummary = useMemo(() => {
    const summary: Record<string, { regular: number, overtime: number }> = {};
    filteredEntries.forEach(e => {
      if (!e.project) return;
      if (!summary[e.project]) summary[e.project] = { regular: 0, overtime: 0 };
      if (e.type === WorkType.OVERTIME) {
        summary[e.project].overtime += e.hours;
      } else if (e.type === WorkType.REGULAR) {
        summary[e.project].regular += e.hours;
      }
    });
    return summary;
  }, [filteredEntries]);

  const shorten = (text: string, len: number = 30) => 
    text.length > len ? text.substring(0, len - 3) + '...' : text;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20 print:pb-0 print:max-w-none print:m-0">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center no-print">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Mzdový report</h2>
          <p className="text-xs text-slate-500">Zaměstnanec: {employee?.name} | {monthStr}</p>
        </div>
        <button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors shadow-lg">Vytisknout A4</button>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-none md:rounded-xl shadow-none md:shadow-sm border-0 md:border border-gray-100 print:p-0 print:m-0 print:border-none print:shadow-none relative">
        
        {monthStatus?.status === TimesheetStatus.APPROVED && (
          <div className="absolute top-10 right-10 border-4 border-green-600/30 text-green-600/30 font-black text-4xl px-4 py-2 rounded-xl -rotate-12 pointer-events-none select-none uppercase tracking-widest hidden print:block">
            SCHVÁLENO
          </div>
        )}

        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-2 mb-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 uppercase">Výkaz práce</h1>
            <p className="text-sm font-bold text-indigo-600">{employee?.name}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-black text-slate-900">{monthStr}</p>
            <p className="text-[9px] text-slate-400 uppercase font-bold">Export: {new Date().toLocaleDateString('cs-CZ')}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="border-l-4 border-indigo-600 pl-2">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Celkem hodin</p>
            <p className="text-xl font-black text-slate-900">{monthStats.totalHours.toFixed(1)}h</p>
          </div>
          <div className="border-l-4 border-slate-300 pl-2">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Fond</p>
            <p className="text-xl font-black text-slate-900">{monthStats.fund}h</p>
          </div>
          <div className="border-l-4 border-orange-500 pl-2">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Přesčasy</p>
            <p className="text-xl font-black text-orange-600">{(typeSummary[WorkType.OVERTIME] as number || 0).toFixed(1)}h</p>
          </div>
          <div className={`border-l-4 pl-2 ${monthStats.diff >= 0 ? 'border-green-500' : 'border-red-500'}`}>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Rozdíl</p>
            <p className={`text-xl font-black ${monthStats.diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {monthStats.diff > 0 ? '+' : ''}{monthStats.diff.toFixed(1)}h
            </p>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-[10px] font-black text-slate-900 uppercase mb-1 bg-slate-100 p-1 border-l-2 border-slate-900">Přehled zakázek</h3>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="text-[8px] p-1 font-black">ZAKÁZKA</th>
                <th className="text-[8px] p-1 font-black text-right w-16">BĚŽNÁ</th>
                <th className="text-[8px] p-1 font-black text-right w-16 text-orange-400">PŘESČAS</th>
                <th className="text-[8px] p-1 font-black text-right w-16">CELKEM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 border-b border-slate-200">
              {Object.entries(jobSummary).length > 0 ? (
                Object.entries(jobSummary).map(([name, data]) => (
                  <tr key={name} className="hover:bg-slate-50">
                    <td className="text-[9px] p-1 font-medium text-slate-800">{name}</td>
                    <td className="text-[9px] p-1 text-right">{data.regular > 0 ? `${data.regular.toFixed(1)}h` : '-'}</td>
                    <td className="text-[9px] p-1 text-right font-bold text-orange-600">{data.overtime > 0 ? `${data.overtime.toFixed(1)}h` : '-'}</td>
                    <td className="text-[9px] p-1 text-right font-black text-indigo-600">{(data.regular + data.overtime).toFixed(1)}h</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-[9px] p-2 text-center text-slate-500 italic">Žádné záznamy na zakázkách v tomto měsíci.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="text-[10px] font-black text-slate-900 uppercase mb-1 bg-slate-100 p-1 border-l-2 border-slate-900">Denní přehled (Matrix)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-4">
            {/* První polovina měsíce */}
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="text-[8px] p-0.5 text-left w-10">DATUM</th>
                  <th className="text-[8px] p-0.5 text-left">PROJEKTY</th>
                  <th className="text-[8px] p-0.5 text-center w-6">PR.</th>
                  <th className="text-[8px] p-0.5 text-center w-6">LÉK.</th>
                  <th className="text-[8px] p-0.5 text-center w-6">DOV.</th>
                  <th className="text-[8px] p-0.5 text-center w-6">NEM.</th>
                  <th className="text-[8px] p-0.5 text-center w-6">OST.</th>
                  <th className="text-[8px] p-0.5 text-right w-8">CELK.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 border-b border-slate-200">
                {monthStats.days.slice(0, 16).map(day => (
                  <tr key={day.dateStr} className={`${day.isWeekend ? 'bg-slate-50' : ''} ${day.holiday ? 'bg-amber-50' : ''}`}>
                    <td className="text-[8px] p-0.5 font-bold whitespace-nowrap">
                      {new Date(day.dateStr).toLocaleDateString('cs-CZ', { day: '2-digit', weekday: 'short' })}
                    </td>
                    <td className="text-[8px] p-0.5 text-slate-600 italic truncate max-w-[80px]">
                      {shorten(day.projects, 20)} {day.holiday && <span className="text-amber-600 font-bold ml-1">({day.holiday})</span>}
                    </td>
                    <td className={`text-[8px] p-0.5 text-center ${day.work > 0 ? 'font-bold' : 'text-slate-300'}`}>{day.work || '-'}</td>
                    <td className={`text-[8px] p-0.5 text-center ${day.doctor > 0 ? 'font-bold text-indigo-600' : 'text-slate-300'}`}>{day.doctor || '-'}</td>
                    <td className={`text-[8px] p-0.5 text-center ${day.vacation > 0 ? 'font-bold text-green-600' : 'text-slate-300'}`}>{day.vacation || '-'}</td>
                    <td className={`text-[8px] p-0.5 text-center ${day.sick > 0 ? 'font-bold text-red-600' : 'text-slate-300'}`}>{day.sick || '-'}</td>
                    <td className={`text-[8px] p-0.5 text-center ${day.other > 0 ? 'font-bold text-slate-600' : 'text-slate-300'}`}>{day.other || '-'}</td>
                    <td className={`text-[8px] p-0.5 text-right font-black ${day.total > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                      {day.total > 0 ? `${day.total.toFixed(1)}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Druhá polovina měsíce */}
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="text-[8px] p-0.5 text-left w-10">DATUM</th>
                  <th className="text-[8px] p-0.5 text-left">PROJEKTY</th>
                  <th className="text-[8px] p-0.5 text-center w-6">PR.</th>
                  <th className="text-[8px] p-0.5 text-center w-6">LÉK.</th>
                  <th className="text-[8px] p-0.5 text-center w-6">DOV.</th>
                  <th className="text-[8px] p-0.5 text-center w-6">NEM.</th>
                  <th className="text-[8px] p-0.5 text-center w-6">OST.</th>
                  <th className="text-[8px] p-0.5 text-right w-8">CELK.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 border-b border-slate-200">
                {monthStats.days.slice(16).map(day => (
                  <tr key={day.dateStr} className={`${day.isWeekend ? 'bg-slate-50' : ''} ${day.holiday ? 'bg-amber-50' : ''}`}>
                    <td className="text-[8px] p-0.5 font-bold whitespace-nowrap">
                      {new Date(day.dateStr).toLocaleDateString('cs-CZ', { day: '2-digit', weekday: 'short' })}
                    </td>
                    <td className="text-[8px] p-0.5 text-slate-600 italic truncate max-w-[80px]">
                      {shorten(day.projects, 20)} {day.holiday && <span className="text-amber-600 font-bold ml-1">({day.holiday})</span>}
                    </td>
                    <td className={`text-[8px] p-0.5 text-center ${day.work > 0 ? 'font-bold' : 'text-slate-300'}`}>{day.work || '-'}</td>
                    <td className={`text-[8px] p-0.5 text-center ${day.doctor > 0 ? 'font-bold text-indigo-600' : 'text-slate-300'}`}>{day.doctor || '-'}</td>
                    <td className={`text-[8px] p-0.5 text-center ${day.vacation > 0 ? 'font-bold text-green-600' : 'text-slate-300'}`}>{day.vacation || '-'}</td>
                    <td className={`text-[8px] p-0.5 text-center ${day.sick > 0 ? 'font-bold text-red-600' : 'text-slate-300'}`}>{day.sick || '-'}</td>
                    <td className={`text-[8px] p-0.5 text-center ${day.other > 0 ? 'font-bold text-slate-600' : 'text-slate-300'}`}>{day.other || '-'}</td>
                    <td className={`text-[8px] p-0.5 text-right font-black ${day.total > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                      {day.total > 0 ? `${day.total.toFixed(1)}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Společná patička se součty */}
          <table className="w-full border-collapse mt-2">
            <tfoot>
              <tr className="bg-slate-100 font-black border-y-2 border-slate-300">
                <td className="text-[9px] p-1.5 text-right uppercase w-1/2">Součty za měsíc (Práce / Lék. / Dov. / Nem. / Ost.):</td>
                <td className="text-[9px] p-1.5 text-center w-12">{(typeSummary[WorkType.REGULAR] as number || 0) + (typeSummary[WorkType.OVERTIME] as number || 0)}h</td>
                <td className="text-[9px] p-1.5 text-center w-12 text-indigo-600">{typeSummary[WorkType.DOCTOR]}h</td>
                <td className="text-[9px] p-1.5 text-center w-12 text-green-600">{typeSummary[WorkType.VACATION]}h</td>
                <td className="text-[9px] p-1.5 text-center w-12 text-red-600">{typeSummary[WorkType.SICK_DAY]}h</td>
                <td className="text-[9px] p-1.5 text-center w-12 text-slate-500">
                  {Object.entries(typeSummary).reduce((s, [k, v]) => ![WorkType.REGULAR, WorkType.OVERTIME, WorkType.DOCTOR, WorkType.VACATION, WorkType.SICK_DAY].includes(k as WorkType) ? s + (v as number) : s, 0)}h
                </td>
                <td className="text-[10px] p-1.5 text-right w-16 text-indigo-700">{monthStats.totalHours.toFixed(1)}h</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-8 flex justify-between gap-12 border-t border-slate-100 pt-4">
          <div className="flex-1 border-t border-slate-300 pt-2">
            <p className="text-[9px] font-bold text-slate-400 uppercase">Podpis zaměstnance</p>
          </div>
          <div className="flex-1 border-t border-slate-300 pt-2 text-right">
            <p className="text-[9px] font-bold text-slate-400 uppercase">Schválil</p>
            {monthStatus?.status === TimesheetStatus.APPROVED && (
              <p className="text-[10px] font-black text-slate-900 mt-2">ELEKTRONICKY POTVRZENO</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
export default ReportingModule;
