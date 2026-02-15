
import React, { useState } from 'react';
import { TimeEntry, Job, WorkType } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface EntryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (date: string, entries: TimeEntry[]) => void;
  currentUserId: string;
  jobs: Job[];
  existingEntries?: TimeEntry[];
}

type EntryMode = 'single' | 'range';

const EntryFormModal: React.FC<EntryFormModalProps> = ({ isOpen, onClose, onSubmit, currentUserId, jobs }) => {
  const [mode, setMode] = useState<EntryMode>('single');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [skipWeekends, setSkipWeekends] = useState(true);
  
  const [project, setProject] = useState(jobs[0]?.name || '');
  const [hours, setHours] = useState('8');
  const [type, setType] = useState(WorkType.REGULAR);

  if (!isOpen) return null;

  const isWeekend = (dateObj: Date) => {
    const day = dateObj.getDay();
    return day === 0 || day === 6; // 0 = Neděle, 6 = Sobota
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'single') {
      onSubmit(date, [{
        id: uuidv4(),
        employeeId: currentUserId,
        date,
        project,
        description: '',
        hours: parseFloat(hours),
        type
      }]);
    } else {
      // Logika pro rozmezí
      const start = new Date(date);
      const end = new Date(dateTo);
      const newEntries: TimeEntry[] = [];
      
      let current = new Date(start);
      while (current <= end) {
        if (!skipWeekends || !isWeekend(current)) {
          newEntries.push({
            id: uuidv4(),
            employeeId: currentUserId,
            date: current.toISOString().split('T')[0],
            project,
            description: '',
            hours: parseFloat(hours),
            type
          });
        }
        current.setDate(current.getDate() + 1);
      }
      
      if (newEntries.length > 0) {
        onSubmit('BULK_RANGE', newEntries);
      } else {
        alert("V zadaném rozmezí nebyly nalezeny žádné pracovní dny (zkuste vypnout vynechání víkendů).");
        return;
      }
    }
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 overflow-hidden">
        <h3 className="text-xl font-bold mb-6 text-slate-900">Zápis hodin</h3>
        
        {/* Přepínač režimů */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
          <button 
            type="button"
            onClick={() => setMode('single')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'single' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Jeden den
          </button>
          <button 
            type="button"
            onClick={() => setMode('range')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'range' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Rozmezí
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className={`grid gap-4 ${mode === 'range' ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">
                {mode === 'single' ? 'Datum' : 'Od data'}
              </label>
              <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
                required 
              />
            </div>
            {mode === 'range' && (
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">Do data</label>
                <input 
                  type="date" 
                  value={dateTo} 
                  onChange={e => setDateTo(e.target.value)} 
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
                  required 
                />
              </div>
            )}
          </div>

          {mode === 'range' && (
            <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
              <input 
                type="checkbox" 
                id="skipWeekends" 
                checked={skipWeekends} 
                onChange={e => setSkipWeekends(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <label htmlFor="skipWeekends" className="text-xs font-bold text-indigo-700 cursor-pointer">Vynechat víkendy</label>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">Projekt</label>
            <select 
              value={project} 
              onChange={e => setProject(e.target.value)} 
              className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            >
              {jobs.map(j => <option key={j.id} value={j.name}>{j.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">Typ práce</label>
              <select 
                value={type} 
                onChange={e => setType(e.target.value as any)} 
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              >
                {Object.values(WorkType).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">Hodin / den</label>
              <input 
                type="number" 
                step="0.5" 
                min="0.5"
                max="24"
                value={hours} 
                onChange={e => setHours(e.target.value)} 
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
                required 
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100 mt-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-xl transition-colors border border-slate-200"
            >
              Zrušit
            </button>
            <button 
              type="submit" 
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95"
            >
              Uložit {mode === 'range' ? 'hromadně' : ''}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default EntryFormModal;
