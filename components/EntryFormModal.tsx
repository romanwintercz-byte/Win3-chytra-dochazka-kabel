
import React, { useState, useEffect, useMemo } from 'react';
import { TimeEntry, Job, WorkType } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface EntryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (date: string, entries: TimeEntry[]) => void;
  currentUserId: string;
  jobs: Job[];
  initialEntries?: TimeEntry[];
}

interface EntryRow {
  id: string;
  project: string;
  type: WorkType;
  hours: string;
  description: string;
}

type EntryMode = 'single' | 'range';

const EntryFormModal: React.FC<EntryFormModalProps> = ({ isOpen, onClose, onSubmit, currentUserId, jobs, initialEntries }) => {
  const [mode, setMode] = useState<EntryMode>('single');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [skipWeekends, setSkipWeekends] = useState(true);
  
  const [rows, setRows] = useState<EntryRow[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (initialEntries && initialEntries.length > 0) {
        setMode('single');
        setDate(initialEntries[0].date.split('T')[0]);
        setRows(initialEntries.map(e => {
          // Auto-migrate old names to IDs for the dropdown
          const matchedJob = jobs.find(j => j.name === e.project);
          return {
            id: e.id,
            project: matchedJob ? matchedJob.id : e.project,
            type: e.type,
            hours: String(e.hours),
            description: e.description || ''
          };
        }));
      } else {
        setMode('single');
        setDate(new Date().toISOString().split('T')[0]);
        setRows([{
          id: uuidv4(),
          project: jobs[0]?.id || '',
          type: WorkType.REGULAR,
          hours: '8',
          description: ''
        }]);
      }
    }
  }, [isOpen, initialEntries, jobs]);

  const totalHours = useMemo(() => {
    return rows.reduce((sum, row) => sum + (parseFloat(row.hours) || 0), 0);
  }, [rows]);

  if (!isOpen) return null;

  const addRow = () => {
    setRows([...rows, {
      id: uuidv4(),
      project: jobs[0]?.id || '',
      type: WorkType.REGULAR,
      hours: '0',
      description: ''
    }]);
  };

  const updateRow = (id: string, field: keyof EntryRow, value: string) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter(r => r.id !== id));
    }
  };

  const isWeekend = (dateObj: Date) => {
    const day = dateObj.getDay();
    return day === 0 || day === 6; 
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validRows = rows.filter(r => (parseFloat(r.hours) || 0) > 0);
    if (validRows.length === 0) {
      alert("Zadejte alespoň jednu činnost s nenulovým počtem hodin.");
      return;
    }

    if (mode === 'single') {
      const finalEntries: TimeEntry[] = validRows.map(r => ({
        id: r.id,
        employeeId: currentUserId,
        date,
        project: r.project,
        description: r.description,
        hours: parseFloat(r.hours),
        type: r.type
      }));
      onSubmit(date, finalEntries);
    } else {
      const start = new Date(date);
      const end = new Date(dateTo);
      const bulkEntries: TimeEntry[] = [];
      
      let current = new Date(start);
      while (current <= end) {
        if (!skipWeekends || !isWeekend(current)) {
          const currentStr = current.toISOString().split('T')[0];
          validRows.forEach(r => {
            bulkEntries.push({
              id: uuidv4(), // V rozmezí vždy nové ID
              employeeId: currentUserId,
              date: currentStr,
              project: r.project,
              description: r.description,
              hours: parseFloat(r.hours),
              type: r.type
            });
          });
        }
        current.setDate(current.getDate() + 1);
      }
      
      if (bulkEntries.length > 0) {
        onSubmit('BULK_RANGE', bulkEntries);
      } else {
        alert("V zadaném rozmezí nebyly nalezeny žádné pracovní dny.");
        return;
      }
    }
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-slate-900">
            {initialEntries && initialEntries.length > 0 ? 'Upravit denní výkaz' : 'Zápis hodin'}
            </h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        
        {!initialEntries?.length && (
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6 shrink-0">
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
              Rozmezí (duplikace)
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="space-y-4 mb-6 shrink-0">
            <div className={`grid gap-4 ${mode === 'range' ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">
                  {mode === 'single' ? 'Datum' : 'Od data'}
                </label>
                <input 
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)} 
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
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
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                    required 
                  />
                </div>
              )}
            </div>

            {mode === 'range' && (
              <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                <input type="checkbox" id="skipWeekends" checked={skipWeekends} onChange={e => setSkipWeekends(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                <label htmlFor="skipWeekends" className="text-xs font-bold text-indigo-700 cursor-pointer">Vynechat víkendy</label>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Seznam činností</p>
            {rows.map((row, index) => (
              <div key={row.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 relative group animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div className="md:col-span-2">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Projekt / Zakázka</label>
                    <select 
                      value={row.project} 
                      onChange={e => updateRow(row.id, 'project', e.target.value)} 
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="">-- vybrat zakázku --</option>
                      {jobs.filter(j => j.isActive || String(j.id) === String(row.project) || j.name === row.project).map(j => <option key={j.id} value={j.id}>{j.code} - {j.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Hodin</label>
                    <input 
                      type="number" step="0.5" min="0" max="24"
                      value={row.hours} 
                      onChange={e => updateRow(row.id, 'hours', e.target.value)} 
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold" 
                      placeholder="0.0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Typ</label>
                    <select 
                      value={row.type} 
                      onChange={e => updateRow(row.id, 'type', e.target.value as WorkType)} 
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      {Object.values(WorkType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Poznámka</label>
                    <input 
                      type="text" 
                      value={row.description} 
                      onChange={e => updateRow(row.id, 'description', e.target.value)} 
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs" 
                      placeholder="Doplňte popis práce..."
                    />
                  </div>
                </div>
                {rows.length > 1 && (
                  <button 
                    type="button"
                    onClick={() => removeRow(row.id)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-red-200 text-red-500 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >✕</button>
                )}
              </div>
            ))}
            
            <button 
              type="button" 
              onClick={addRow}
              className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-all text-xs font-bold"
            >
              + PŘIDAT DALŠÍ ČINNOST
            </button>
          </div>

          <div className="pt-6 border-t border-slate-100 mt-4 bg-white shrink-0">
            <div className="flex justify-between items-center mb-4 px-2">
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Součet dne</p>
                  <p className={`text-xl font-black ${totalHours < 8 ? 'text-orange-500' : 'text-slate-900'}`}>{totalHours.toFixed(1)} h</p>
               </div>
               {totalHours < 8 && (
                 <p className="text-[10px] text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded">Méně než standard 8h</p>
               )}
            </div>
            
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-50 text-slate-600 font-bold rounded-xl border border-slate-200">Zrušit</button>
              <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 active:scale-95 transition-all">Uložit výkaz</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
export default EntryFormModal;
