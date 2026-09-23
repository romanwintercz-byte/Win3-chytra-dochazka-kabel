import React, { useMemo } from 'react';
import { TimeEntry, WorkType } from '../types';
import { getHolidayName } from '../services/holidayService';

interface DashboardProps {
  entries: TimeEntry[];
  selectedMonth: string; // YYYY-MM
}

const Dashboard: React.FC<DashboardProps> = ({ entries, selectedMonth }) => {
  const [year, month] = selectedMonth.split('-').map(Number);

  const stats = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    let workingDays = 0;
    let holidaysOnWorkdays = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dateObj = new Date(year, month - 1, d);
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      const holiday = getHolidayName(dateStr);

      if (!isWeekend) {
        if (holiday) holidaysOnWorkdays++;
        else workingDays++;
      }
    }

    const fundHours = workingDays * 8;
    const totalHours = entries.reduce((acc, curr) => acc + (curr.hours || 0), 0);
    const regularHours = entries.filter(e => e.type === WorkType.REGULAR).reduce((acc, curr) => acc + curr.hours, 0);
    const overtimeHours = entries.filter(e => e.type === WorkType.OVERTIME).reduce((acc, curr) => acc + curr.hours, 0);
    const doctorHours = entries.filter(e => e.type === WorkType.DOCTOR).reduce((acc, curr) => acc + curr.hours, 0);
    const vacationHours = entries.filter(e => e.type === WorkType.VACATION).reduce((acc, curr) => acc + curr.hours, 0);
    const sickHours = entries.filter(e => e.type === WorkType.SICK_DAY).reduce((acc, curr) => acc + curr.hours, 0);

    const uniqueProjects = new Set(entries.filter(e => e.project).map(e => e.project)).size;
    const uniqueDays = new Set(entries.map(e => e.date.split('T')[0])).size;
    const avgPerDay = uniqueDays > 0 ? (totalHours / uniqueDays).toFixed(1) : '0.0';

    const progress = fundHours > 0 ? Math.min(100, Math.round((totalHours / fundHours) * 100)) : 0;
    const diff = Math.round((totalHours - fundHours) * 10) / 10;

    return {
      fundHours,
      totalHours: Math.round(totalHours * 10) / 10,
      regularHours: Math.round(regularHours * 10) / 10,
      overtimeHours: Math.round(overtimeHours * 10) / 10,
      doctorHours: Math.round(doctorHours * 10) / 10,
      vacationHours: Math.round(vacationHours * 10) / 10,
      sickHours: Math.round(sickHours * 10) / 10,
      uniqueProjects,
      uniqueDays,
      avgPerDay,
      progress,
      diff,
      workingDays,
      holidaysOnWorkdays
    };
  }, [entries, year, month]);

  return (
    <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
        <div>
          <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <span>📈</span>
            <span>Měsíční fond a plnění ({selectedMonth})</span>
          </h3>
          <p className="text-xs text-slate-500">
            {stats.workingDays} pracovních dnů ({stats.fundHours}h) • {stats.uniqueDays} dnů s vykázanou činností
          </p>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-slate-900">{stats.totalHours.toFixed(1)}</span>
          <span className="text-xs text-slate-500 font-semibold">/ {stats.fundHours} h</span>
          <span className={`text-xs font-black px-2 py-0.5 rounded-md ${stats.progress >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'}`}>
            {stats.progress}%
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-200">
          <div 
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              stats.diff > 0 
                ? 'bg-gradient-to-r from-indigo-600 to-amber-500' 
                : stats.progress >= 90 
                  ? 'bg-emerald-500' 
                  : 'bg-indigo-600'
            }`} 
            style={{ width: `${Math.min(100, stats.progress)}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[11px] font-semibold text-slate-500 mt-1.5 px-1">
          <span>0h</span>
          <span>
            {stats.diff >= 0 ? (
              <strong className="text-emerald-700">+{stats.diff.toFixed(1)} h nad fond</strong>
            ) : (
              <span className="text-slate-600">Zbývá: <strong className="text-amber-700">{Math.abs(stats.diff).toFixed(1)} h</strong></span>
            )}
          </span>
          <span>{stats.fundHours}h</span>
        </div>
      </div>

      {/* Statistické karty */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Běžná práce</p>
          <p className="text-lg font-black text-slate-900 mt-0.5">{stats.regularHours.toFixed(1)} h</p>
        </div>

        <div className="bg-orange-50/70 p-3 rounded-xl border border-orange-200">
          <p className="text-[10px] font-black uppercase tracking-wider text-orange-700">Přesčasy</p>
          <p className="text-lg font-black text-orange-800 mt-0.5">{stats.overtimeHours.toFixed(1)} h</p>
        </div>

        <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200">
          <p className="text-[10px] font-black uppercase tracking-wider text-indigo-700">Lékař / OČR</p>
          <p className="text-lg font-black text-indigo-800 mt-0.5">{stats.doctorHours.toFixed(1)} h</p>
        </div>

        <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Dovolená</p>
          <p className="text-lg font-black text-emerald-800 mt-0.5">{stats.vacationHours.toFixed(1)} h</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
