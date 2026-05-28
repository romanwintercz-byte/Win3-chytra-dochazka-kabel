
import React from 'react';
import { TimeEntry, WorkType, Employee } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface SmartInputProps {
  onEntriesAdded: (entries: TimeEntry[]) => void;
  currentUserId: string;
  onManualEntry: () => void;
  onCopyLastDay?: () => void;
  selectedMonth?: string;
  existingEntries?: TimeEntry[];
  targetUser?: Employee;
}

const SmartInput: React.FC<SmartInputProps> = ({ onEntriesAdded, currentUserId, onManualEntry, existingEntries, targetUser }) => {
  const quickLog = (type: WorkType) => {
    // Attempt to use employee's department job ID if configured
    const defaultProject = targetUser?.department ? String(targetUser.department) : (type === WorkType.REGULAR ? 'Režie' : '');
    
    onEntriesAdded([{
        id: uuidv4(),
        employeeId: currentUserId,
        date: new Date().toISOString().split('T')[0],
        project: defaultProject,
        description: type,
        hours: 8,
        type
    }]);
  };

  const copyPreviousDay = () => {
    if (!existingEntries || existingEntries.length === 0) {
      alert('Nenalezeny žádné předchozí záznamy k zkopírování.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Find all unique dates before today
    const pastDates = Array.from(new Set(
      existingEntries
        .map(e => e.date.split('T')[0])
        .filter(d => d < today)
    )).sort((a, b) => b.localeCompare(a)); // sort descending

    if (pastDates.length === 0) {
      alert('Nenalezeny žádné předchozí záznamy k zkopírování.');
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
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
      <h3 className="font-bold text-slate-800 mb-4">Rychlé akce</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button onClick={onManualEntry} className="p-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-500 hover:text-indigo-600 transition font-bold text-sm">Editor</button>
        <button onClick={copyPreviousDay} className="p-4 rounded-xl border border-indigo-100 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-sm">Zkopírovat předchozí den</button>
        <button onClick={() => quickLog(WorkType.VACATION)} className="p-4 rounded-xl border border-green-100 bg-green-50 hover:bg-green-100 text-green-700 font-bold text-sm">Dovolená (8h)</button>
        <button onClick={() => quickLog(WorkType.SICK_DAY)} className="p-4 rounded-xl border border-red-100 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-sm">Nemocenská (8h)</button>
      </div>
    </div>
  );
};
export default SmartInput;
