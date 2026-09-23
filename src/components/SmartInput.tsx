import React from 'react';
import { TimeEntry, WorkType, Employee, Job } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface SmartInputProps {
  onEntriesAdded: (entries: TimeEntry[]) => void;
  currentUserId: string;
  onManualEntry: () => void;
  existingEntries?: TimeEntry[];
  targetUser?: Employee;
  jobs: Job[];
}

const SmartInput: React.FC<SmartInputProps> = ({ 
  onEntriesAdded, 
  currentUserId, 
  onManualEntry, 
  existingEntries = [], 
  targetUser, 
  jobs 
}) => {
  const quickLog = (type: WorkType) => {
    let defaultProject = '';
    if (targetUser?.department) {
      const match = jobs.find(j => j.code === targetUser?.department);
      if (match) defaultProject = match.id;
    }
    
    if (!defaultProject) {
      defaultProject = type === WorkType.REGULAR ? (jobs.find(j => j.isActive)?.id || '') : '';
    }

    const todayStr = new Date().toISOString().split('T')[0];
    
    onEntriesAdded([{
      id: uuidv4(),
      employeeId: currentUserId,
      date: todayStr,
      project: defaultProject,
      description: type,
      hours: 8,
      type,
      ...(type === WorkType.REGULAR ? {
        startTime: '06:30',
        endTime: '15:00',
        breakMinutes: 30,
        lunchTime: '11:00 – 11:30'
      } : {})
    }]);
  };

  const copyPreviousDay = () => {
    if (!existingEntries || existingEntries.length === 0) {
      alert('Nenalezeny žádné předchozí záznamy k zkopírování.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Nalezení posledního dne se záznamy před dneškem
    const pastDates = Array.from(new Set(
      existingEntries
        .map(e => e.date.split('T')[0])
        .filter(d => d < today)
    )).sort((a, b) => b.localeCompare(a));

    if (pastDates.length === 0) {
      alert('Nenalezeny žádné předchozí dny k zkopírování.');
      return;
    }

    const lastDate = pastDates[0];
    const entriesToCopy = existingEntries.filter(e => e.date.split('T')[0] === lastDate);

    const newEntries = entriesToCopy.map(e => ({
      ...e,
      id: uuidv4(),
      date: today
    }));

    onEntriesAdded(newEntries);
  };

  return (
    <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-xs mb-6">
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <span>⚡</span>
          <span>Rychlé akce na dnešní den</span>
        </h3>
        <span className="text-xs text-slate-400 font-medium">Kliknutím rovnou zapíšete 8h směnu</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button 
          type="button"
          onClick={onManualEntry} 
          className="p-3.5 rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:text-indigo-600 bg-slate-50/50 hover:bg-indigo-50/40 transition-all font-bold text-xs flex flex-col items-center justify-center gap-1.5 shadow-2xs group"
        >
          <span className="text-lg group-hover:scale-110 transition-transform">✏️</span>
          <span>Otevřít denní editor</span>
          <span className="text-[10px] text-slate-400 font-normal">Více zakázek / časy</span>
        </button>

        <button 
          type="button"
          onClick={copyPreviousDay} 
          className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/80 text-indigo-800 transition-all font-bold text-xs flex flex-col items-center justify-center gap-1.5 shadow-2xs group"
        >
          <span className="text-lg group-hover:scale-110 transition-transform">📋</span>
          <span>Zkopírovat minulý den</span>
          <span className="text-[10px] text-indigo-500 font-normal">Stejné zakázky i časy</span>
        </button>

        <button 
          type="button"
          onClick={() => quickLog(WorkType.VACATION)} 
          className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/80 text-emerald-800 transition-all font-bold text-xs flex flex-col items-center justify-center gap-1.5 shadow-2xs group"
        >
          <span className="text-lg group-hover:scale-110 transition-transform">🏖️</span>
          <span>Dovolená (8h)</span>
          <span className="text-[10px] text-emerald-600 font-normal">Celodenní nepřítomnost</span>
        </button>

        <button 
          type="button"
          onClick={() => quickLog(WorkType.SICK_DAY)} 
          className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100/80 text-rose-800 transition-all font-bold text-xs flex flex-col items-center justify-center gap-1.5 shadow-2xs group"
        >
          <span className="text-lg group-hover:scale-110 transition-transform">🤒</span>
          <span>Nemocenská (8h)</span>
          <span className="text-[10px] text-rose-600 font-normal">Celodenní nepřítomnost</span>
        </button>
      </div>
    </div>
  );
};

export default SmartInput;
