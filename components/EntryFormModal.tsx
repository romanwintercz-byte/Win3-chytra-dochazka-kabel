
import React, { useState } from 'react';
import { TimeEntry, Job, WorkType } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface EntryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (date: string, entries: TimeEntry[]) => void;
  currentUserId: string;
  jobs: Job[];
}

const EntryFormModal: React.FC<EntryFormModalProps> = ({ isOpen, onClose, onSubmit, currentUserId, jobs }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [project, setProject] = useState(jobs[0]?.name || '');
  const [hours, setHours] = useState('8');
  const [type, setType] = useState(WorkType.REGULAR);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(date, [{
      id: uuidv4(),
      employeeId: currentUserId,
      date,
      project,
      description: '',
      hours: parseFloat(hours),
      type
    }]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6">
        <h3 className="text-xl font-bold mb-6">Editor dne</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Datum</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full p-2 border rounded-lg" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Projekt</label>
            <select value={project} onChange={e=>setProject(e.target.value)} className="w-full p-2 border rounded-lg">
              {jobs.map(j => <option key={j.id} value={j.name}>{j.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Typ</label>
              <select value={type} onChange={e=>setType(e.target.value as any)} className="w-full p-2 border rounded-lg">
                {Object.values(WorkType).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Hodiny</label>
              <input type="number" step="0.5" value={hours} onChange={e=>setHours(e.target.value)} className="w-full p-2 border rounded-lg" required />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-gray-100 font-bold rounded-xl">Zrušit</button>
            <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl">Uložit</button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default EntryFormModal;
