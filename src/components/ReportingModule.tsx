import React, { useMemo, useState } from 'react';
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

const ReportingModule: React.FC<ReportingModuleProps> = ({ 
  entries, 
  employees, 
  selectedEmployeeId, 
  selectedMonth, 
  monthStatus, 
  jobs 
}) => {
  const monthStr = selectedMonth || new Date().toISOString().slice(0, 7);
  const [year, month] = monthStr.split('-').map(Number);
  
  const [reportMode, setReportMode] = useState<'compact' | 'detailed'>('compact');

  const getProjectName = (projectIdOrName: string) => {
    if (!projectIdOrName) return '';
    const job = jobs?.find(j => String(j.id) === String(projectIdOrName) || j.code === projectIdOrName);
    return job ? `${job.code} - ${job.name}` : projectIdOrName;
  };
  
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
      
      const dayEntries = filteredEntries.filter(e => e.date.split('T')[0] === dateStr);
      
      const timeRanges = dayEntries
        .filter(e => e.startTime && e.endTime)
        .map(e => `${e.startTime}–${e.endTime}`);

      const lunchEntry = dayEntries.find(e => e.lunchTime || (e.breakMinutes && e.breakMinutes > 0));
      const lunchText = lunchEntry?.lunchTime 
        ? lunchEntry.lunchTime 
        : (lunchEntry?.breakMinutes ? `${lunchEntry.breakMinutes}m` : '');

      const stats = {
        work: dayEntries.filter(e => e.type === WorkType.REGULAR).reduce((s, e) => s + e.hours, 0),
        overtime: dayEntries.filter(e => e.type === WorkType.OVERTIME).reduce((s, e) => s + e.hours, 0),
        doctor: dayEntries.filter(e => e.type === WorkType.DOCTOR).reduce((s, e) => s + e.hours, 0),
        vacation: dayEntries.filter(e => e.type === WorkType.VACATION).reduce((s, e) => s + e.hours, 0),
        sick: dayEntries.filter(e => e.type === WorkType.SICK_DAY).reduce((s, e) => s + e.hours, 0),
        other: dayEntries.filter(e => ![WorkType.REGULAR, WorkType.OVERTIME, WorkType.DOCTOR, WorkType.VACATION, WorkType.SICK_DAY].includes(e.type)).reduce((s, e) => s + e.hours, 0),
        total: dayEntries.reduce((s, e) => s + e.hours, 0),
        projects: Array.from(new Set(dayEntries.filter(e => e.project && e.project !== '').map(e => getProjectName(e.project)))).join(', '),
        timeRanges,
        lunchText,
        details: dayEntries.map(e => {
          const proj = getProjectName(e.project);
          const parts = [];
          if (e.startTime && e.endTime) {
            parts.push(`[${e.startTime}–${e.endTime}]`);
          }
          if (proj) parts.push(proj);
          if (e.type === WorkType.OVERTIME) parts.push('(přesčas)');
          if (e.type === WorkType.COMPENSATORY_LEAVE) parts.push('(náhradní volno)');
          if (e.description) parts.push(`"${e.description}"`);
          if (e.hours > 0) parts.push(`(${e.hours}h)`);
          return parts.join(' ');
        }).filter(Boolean).join(' | ')
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
  }, [year, month, filteredEntries, jobs]);

  const typeSummary = useMemo(() => {
    const summary: Record<string, number> = {};
    Object.values(WorkType).forEach(t => summary[t] = 0);
    filteredEntries.forEach(e => {
      if (summary[e.type] !== undefined) summary[e.type] += e.hours;
    });
    return summary;
  }, [filteredEntries]);

  const jobSummary = useMemo(() => {
    const summary: Record<string, { regular: number; overtime: number }> = {};
    filteredEntries.forEach(e => {
      if (!e.project) return;
      const projectName = getProjectName(e.project);
      if (!summary[projectName]) summary[projectName] = { regular: 0, overtime: 0 };
      if (e.type === WorkType.OVERTIME) {
        summary[projectName].overtime += e.hours;
      } else if (e.type === WorkType.REGULAR) {
        summary[projectName].regular += e.hours;
      }
    });
    return summary;
  }, [filteredEntries, jobs]);

  const shorten = (text: string, len: number = 30) => 
    text.length > len ? text.substring(0, len - 3) + '...' : text;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20 print:pb-0 print:max-w-none print:m-0">
      {/* Horní ovládací lišta pro tisk a přepínání režimu */}
      <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span>📄</span>
            <span>Mzdový report pro firmu Kabel</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Zaměstnanec: <strong className="text-slate-800">{employee?.name}</strong> • Měsíc: <strong className="text-slate-800">{monthStr}</strong>
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setReportMode('compact')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                reportMode === 'compact' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Kompaktní (A4)
            </button>
            <button
              type="button"
              onClick={() => setReportMode('detailed')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                reportMode === 'detailed' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Podrobný
            </button>
          </div>

          <button 
            type="button"
            onClick={() => window.print()} 
            className="flex-1 sm:flex-none h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-md shadow-indigo-200 flex items-center justify-center gap-2"
          >
            <span>🖨️</span>
            <span>Vytisknout</span>
          </button>
        </div>
      </div>

      {/* Tiskový list A4 */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-xs print:p-0 print:border-none print:shadow-none relative">
        
        {/* Schvalovací razítko pro tisk */}
        {monthStatus?.status === TimesheetStatus.APPROVED && (
          <div className="absolute top-8 right-8 border-4 border-emerald-600/30 text-emerald-600/30 font-black text-4xl px-4 py-2 rounded-2xl -rotate-12 pointer-events-none select-none uppercase tracking-widest hidden print:block">
            SCHVÁLENO
          </div>
        )}

        {/* Hlavička reportu */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-indigo-600 text-lg">KABEL</span>
              <h1 className="text-xl font-black text-slate-900 uppercase">Měsíční výkaz práce</h1>
            </div>
            <p className="text-sm font-bold text-slate-800 mt-0.5">{employee?.name}</p>
            <p className="text-xs text-slate-500">{employee?.department === '10000' ? 'Středisko: 10000 Kancelář' : employee?.department === '10001' ? 'Středisko: 10001 Výroba kabelů' : ''}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-slate-900">{monthStr}</p>
            <p className="text-[10px] text-slate-400 uppercase font-bold">Kabel s.r.o. • {new Date().toLocaleDateString('cs-CZ')}</p>
          </div>
        </div>

        {/* 4 hlavní statistické karty */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="border-l-4 border-indigo-600 pl-2.5 py-0.5">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Celkem odpracováno</p>
            <p className="text-xl font-black text-slate-900">{monthStats.totalHours.toFixed(1)} h</p>
          </div>
          <div className="border-l-4 border-slate-400 pl-2.5 py-0.5">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Fond měsíce</p>
            <p className="text-xl font-black text-slate-900">{monthStats.fund} h</p>
          </div>
          <div className="border-l-4 border-orange-500 pl-2.5 py-0.5">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Přesčasy</p>
            <p className="text-xl font-black text-orange-600">{(typeSummary[WorkType.OVERTIME] || 0).toFixed(1)} h</p>
          </div>
          <div className={`border-l-4 pl-2.5 py-0.5 ${monthStats.diff >= 0 ? 'border-emerald-500' : 'border-rose-500'}`}>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Rozdíl oproti fondu</p>
            <p className={`text-xl font-black ${monthStats.diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {monthStats.diff > 0 ? '+' : ''}{monthStats.diff.toFixed(1)} h
            </p>
          </div>
        </div>

        {/* Tabulka zakázek */}
        <div className="mb-4">
          <h3 className="text-[10px] font-black text-slate-900 uppercase mb-1 bg-slate-100 p-1.5 rounded border-l-2 border-slate-900">
            Souhrn hodin na zakázkách firmy Kabel
          </h3>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-800 text-white text-[9px] font-black uppercase tracking-wider">
                <th className="p-1.5">Zakázka / Projekt</th>
                <th className="p-1.5 text-right w-20">Běžná</th>
                <th className="p-1.5 text-right w-20 text-orange-300">Přesčas</th>
                <th className="p-1.5 text-right w-20">Celkem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 border-b border-slate-200">
              {Object.entries(jobSummary).length > 0 ? (
                Object.entries(jobSummary).map(([name, data]) => (
                  <tr key={name} className="hover:bg-slate-50">
                    <td className="p-1.5 font-medium text-slate-800">{name}</td>
                    <td className="p-1.5 text-right">{data.regular > 0 ? `${data.regular.toFixed(1)} h` : '-'}</td>
                    <td className="p-1.5 text-right font-bold text-orange-600">{data.overtime > 0 ? `${data.overtime.toFixed(1)} h` : '-'}</td>
                    <td className="p-1.5 text-right font-black text-indigo-600">{(data.regular + data.overtime).toFixed(1)} h</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-2 text-center text-slate-400 italic">V tomto měsíci nejsou záznamy na zakázkách.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Denní maticový rozpis */}
        <div>
          <h3 className="text-[10px] font-black text-slate-900 uppercase mb-1 bg-slate-100 p-1.5 rounded border-l-2 border-slate-900">
            Denní maticový detail docházky
          </h3>
          
          <div className="flex flex-col md:flex-row print:flex-row gap-3">
            {reportMode === 'compact' ? (
              <>
                {/* Sloupec 1-16 */}
                <div className="w-full md:w-1/2 print:w-1/2">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-white text-[8px] font-black uppercase">
                        <th className="p-1 text-left w-10">DEN</th>
                        <th className="p-1 text-left">PROJEKTY</th>
                        <th className="p-1 text-center w-6">PR.</th>
                        <th className="p-1 text-center w-6 text-orange-300">PŘES.</th>
                        <th className="p-1 text-center w-6">LÉK.</th>
                        <th className="p-1 text-center w-6">DOV.</th>
                        <th className="p-1 text-center w-6">NEM.</th>
                        <th className="p-1 text-center w-6">OST.</th>
                        <th className="p-1 text-right w-8">SUM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 border-b border-slate-200 text-[8px]">
                      {monthStats.days.slice(0, 16).map(day => (
                        <tr key={day.dateStr} className={`${day.isWeekend ? 'bg-slate-50' : ''} ${day.holiday ? 'bg-amber-50' : ''}`}>
                          <td className="p-1 font-bold whitespace-nowrap">
                            {new Date(day.dateStr).toLocaleDateString('cs-CZ', { day: '2-digit', weekday: 'short' })}
                          </td>
                          <td className="p-1 text-slate-600 truncate max-w-[80px]" title={day.projects}>
                            {shorten(day.projects, 18)} {day.holiday && <span className="text-amber-600 font-bold">({day.holiday})</span>}
                          </td>
                          <td className={`p-1 text-center ${day.work > 0 ? 'font-bold' : 'text-slate-300'}`}>{day.work || '-'}</td>
                          <td className={`p-1 text-center ${day.overtime > 0 ? 'font-bold text-orange-600' : 'text-slate-300'}`}>{day.overtime || '-'}</td>
                          <td className={`p-1 text-center ${day.doctor > 0 ? 'font-bold text-indigo-600' : 'text-slate-300'}`}>{day.doctor || '-'}</td>
                          <td className={`p-1 text-center ${day.vacation > 0 ? 'font-bold text-emerald-600' : 'text-slate-300'}`}>{day.vacation || '-'}</td>
                          <td className={`p-1 text-center ${day.sick > 0 ? 'font-bold text-rose-600' : 'text-slate-300'}`}>{day.sick || '-'}</td>
                          <td className={`p-1 text-center ${day.other > 0 ? 'font-bold text-slate-600' : 'text-slate-300'}`}>{day.other || '-'}</td>
                          <td className={`p-1 text-right font-black ${day.total > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                            {day.total > 0 ? `${day.total.toFixed(1)}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Sloupec 17-konec */}
                <div className="w-full md:w-1/2 print:w-1/2">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-white text-[8px] font-black uppercase">
                        <th className="p-1 text-left w-10">DEN</th>
                        <th className="p-1 text-left">PROJEKTY</th>
                        <th className="p-1 text-center w-6">PR.</th>
                        <th className="p-1 text-center w-6 text-orange-300">PŘES.</th>
                        <th className="p-1 text-center w-6">LÉK.</th>
                        <th className="p-1 text-center w-6">DOV.</th>
                        <th className="p-1 text-center w-6">NEM.</th>
                        <th className="p-1 text-center w-6">OST.</th>
                        <th className="p-1 text-right w-8">SUM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 border-b border-slate-200 text-[8px]">
                      {monthStats.days.slice(16).map(day => (
                        <tr key={day.dateStr} className={`${day.isWeekend ? 'bg-slate-50' : ''} ${day.holiday ? 'bg-amber-50' : ''}`}>
                          <td className="p-1 font-bold whitespace-nowrap">
                            {new Date(day.dateStr).toLocaleDateString('cs-CZ', { day: '2-digit', weekday: 'short' })}
                          </td>
                          <td className="p-1 text-slate-600 truncate max-w-[80px]" title={day.projects}>
                            {shorten(day.projects, 18)} {day.holiday && <span className="text-amber-600 font-bold">({day.holiday})</span>}
                          </td>
                          <td className={`p-1 text-center ${day.work > 0 ? 'font-bold' : 'text-slate-300'}`}>{day.work || '-'}</td>
                          <td className={`p-1 text-center ${day.overtime > 0 ? 'font-bold text-orange-600' : 'text-slate-300'}`}>{day.overtime || '-'}</td>
                          <td className={`p-1 text-center ${day.doctor > 0 ? 'font-bold text-indigo-600' : 'text-slate-300'}`}>{day.doctor || '-'}</td>
                          <td className={`p-1 text-center ${day.vacation > 0 ? 'font-bold text-emerald-600' : 'text-slate-300'}`}>{day.vacation || '-'}</td>
                          <td className={`p-1 text-center ${day.sick > 0 ? 'font-bold text-rose-600' : 'text-slate-300'}`}>{day.sick || '-'}</td>
                          <td className={`p-1 text-center ${day.other > 0 ? 'font-bold text-slate-600' : 'text-slate-300'}`}>{day.other || '-'}</td>
                          <td className={`p-1 text-right font-black ${day.total > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                            {day.total > 0 ? `${day.total.toFixed(1)}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white text-[9px] font-black uppercase">
                      <th className="p-1.5 text-left w-14">DATUM</th>
                      <th className="p-1.5 text-left w-24">DOBA (OD–DO)</th>
                      <th className="p-1.5 text-left w-24 text-amber-300">OBĚD</th>
                      <th className="p-1.5 text-left">PROJEKTY A ČINNOSTI</th>
                      <th className="p-1.5 text-center w-8">PR.</th>
                      <th className="p-1.5 text-center w-8 text-orange-300">PŘES.</th>
                      <th className="p-1.5 text-center w-8">LÉK.</th>
                      <th className="p-1.5 text-center w-8">DOV.</th>
                      <th className="p-1.5 text-center w-8">NEM.</th>
                      <th className="p-1.5 text-center w-8">OST.</th>
                      <th className="p-1.5 text-right w-10">CELK.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 border-b border-slate-200 text-[9px]">
                    {monthStats.days.map(day => (
                      <tr key={day.dateStr} className={`${day.isWeekend ? 'bg-slate-50' : ''} ${day.holiday ? 'bg-amber-50' : ''}`}>
                        <td className="p-1.5 font-bold whitespace-nowrap align-top">
                          {new Date(day.dateStr).toLocaleDateString('cs-CZ', { day: '2-digit', weekday: 'short' })}
                        </td>
                        <td className="p-1.5 font-semibold text-slate-800 whitespace-nowrap align-top">
                          {day.timeRanges && day.timeRanges.length > 0 ? (
                            <div className="flex flex-col gap-0.5">
                              {day.timeRanges.map((tr, idx) => (
                                <span key={idx} className="font-mono text-[9px] bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-bold inline-block">
                                  {tr}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="p-1.5 whitespace-nowrap align-top">
                          {day.lunchText ? (
                            <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200 text-[8px] font-bold inline-flex items-center gap-0.5">
                              <span>🍽️</span>
                              <span>{day.lunchText}</span>
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="p-1.5 text-slate-600 align-top">
                          {day.holiday && <span className="text-amber-600 font-bold mr-2">[{day.holiday}]</span>}
                          {day.details || <span className="italic text-slate-400">Bez záznamu</span>}
                        </td>
                        <td className={`p-1.5 text-center align-top ${day.work > 0 ? 'font-bold' : 'text-slate-300'}`}>{day.work || '-'}</td>
                        <td className={`p-1.5 text-center align-top ${day.overtime > 0 ? 'font-bold text-orange-600' : 'text-slate-300'}`}>{day.overtime || '-'}</td>
                        <td className={`p-1.5 text-center align-top ${day.doctor > 0 ? 'font-bold text-indigo-600' : 'text-slate-300'}`}>{day.doctor || '-'}</td>
                        <td className={`p-1.5 text-center align-top ${day.vacation > 0 ? 'font-bold text-emerald-600' : 'text-slate-300'}`}>{day.vacation || '-'}</td>
                        <td className={`p-1.5 text-center align-top ${day.sick > 0 ? 'font-bold text-rose-600' : 'text-slate-300'}`}>{day.sick || '-'}</td>
                        <td className={`p-1.5 text-center align-top ${day.other > 0 ? 'font-bold text-slate-600' : 'text-slate-300'}`}>{day.other || '-'}</td>
                        <td className={`p-1.5 text-right font-black align-top ${day.total > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                          {day.total > 0 ? `${day.total.toFixed(1)}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Souhrnná patička */}
          <div className="bg-slate-100 p-2 mt-2 border-y-2 border-slate-300 font-black text-[9px] flex flex-wrap justify-between items-center gap-2">
            <span className="uppercase tracking-wider text-slate-600">Součty měsíce:</span>
            <div className="flex gap-4">
              <span>Běžná práce: <strong>{(typeSummary[WorkType.REGULAR] || 0).toFixed(1)} h</strong></span>
              <span className="text-orange-700">Přesčas: <strong>{(typeSummary[WorkType.OVERTIME] || 0).toFixed(1)} h</strong></span>
              <span className="text-indigo-700">Lékař: <strong>{(typeSummary[WorkType.DOCTOR] || 0).toFixed(1)} h</strong></span>
              <span className="text-emerald-700">Dovolená: <strong>{(typeSummary[WorkType.VACATION] || 0).toFixed(1)} h</strong></span>
              <span className="text-rose-700">Nemoc: <strong>{(typeSummary[WorkType.SICK_DAY] || 0).toFixed(1)} h</strong></span>
            </div>
            <div className="text-indigo-900 text-xs">
              CELKEM: <strong className="text-sm">{monthStats.totalHours.toFixed(1)} h</strong>
            </div>
          </div>
        </div>

        {/* Podpisy */}
        <div className="mt-8 flex justify-between gap-12 border-t border-slate-200 pt-4">
          <div className="flex-1 border-t border-slate-400 pt-1.5">
            <p className="text-[9px] font-bold text-slate-500 uppercase">Podpis zaměstnance (potvrzení správnosti)</p>
          </div>
          <div className="flex-1 border-t border-slate-400 pt-1.5 text-right">
            <p className="text-[9px] font-bold text-slate-500 uppercase">Schválil za firmu Kabel (Lucie Novotná)</p>
            {monthStatus?.status === TimesheetStatus.APPROVED && (
              <p className="text-[10px] font-black text-emerald-700 mt-1">✓ ELEKTRONICKY SCHVÁLENO V SYSTÉMU</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ReportingModule;
