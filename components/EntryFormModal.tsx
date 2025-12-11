
import React, { useState, useEffect, useMemo } from 'react';
import { TimeEntry, Job, WorkType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { isHoliday, getHolidayName } from '../services/holidayService';

interface EntryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (date: string, entries: TimeEntry[]) => void;
  initialDate?: string;
  existingEntries: TimeEntry[];
  currentUserId: string;
  jobs: Job[];
  allMonthEntries?: TimeEntry[]; // To check for conflicts in bulk mode
}

// Temporary interface for the form state
interface RowState {
  id: string; // Temp ID for React keys
  project: string;
  description: string;
  hours: string; // String for better input handling
  type: WorkType;
}

const EntryFormModal: React.FC<EntryFormModalProps> = ({ 
  isOpen, onClose, onSubmit, initialDate, existingEntries, currentUserId, jobs, allMonthEntries = []
}) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [rows, setRows] = useState<RowState[]>([]);
  const [isRangeMode, setIsRangeMode] = useState(false);
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    if (isOpen) {
      // RESET STATE ON OPEN
      setIsRangeMode(false);
      setDateTo('');

      const targetDate = initialDate || new Date().toISOString().split('T')[0];
      setDate(targetDate);
      
      // Always load existing entries or default row when opening (ignoring previous range mode state)
      if (existingEntries && existingEntries.length > 0) {
        setRows(existingEntries.map(e => ({
            id: e.id,
            project: e.project || '',
            description: e.description,
            hours: e.hours.toString(),
            type: e.type
        })));
      } else {
        setRows([{
            id: uuidv4(),
            project: jobs.length > 0 ? jobs[0].name : '',
            description: '',
            hours: '8', // Default to 8h for easier entry
            type: WorkType.REGULAR
        }]);
      }
    }
  }, [isOpen, initialDate, existingEntries, jobs]);

  const totalHours = useMemo(() => {
    return rows.reduce((acc, row) => acc + (parseFloat(row.hours) || 0), 0);
  }, [rows]);

  const isProjectRequired = (type: WorkType) => {
    return type === WorkType.REGULAR || type === WorkType.OVERTIME;
  };

  const addRow = () => {
    setRows(prev => [...prev, {
        id: uuidv4(),
        project: jobs.length > 0 ? jobs[0].name : '',
        description: '',
        hours: '0',
        type: WorkType.REGULAR
    }]);
  };

  const removeRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const updateRow = (id: string, field: keyof RowState, value: string) => {
    setRows(prev => prev.map(r => {
        if (r.id === id) {
            const updatedRow = { ...r, [field]: value };
            
            // Logic: If type changes to something that doesn't need a project, clear project
            if (field === 'type') {
                if (!isProjectRequired(value as WorkType)) {
                    updatedRow.project = ''; // Clear project
                } else if (updatedRow.project === '' && jobs.length > 0) {
                    updatedRow.project = jobs[0].name; // Restore default if switching back to work
                }
            }
            return updatedRow;
        }
        return r;
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isRangeMode && dateTo) {
         const startDate = new Date(date);
         const endDate = new Date(dateTo);
         const generatedEntries: TimeEntry[] = [];

         for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                const isoDate = d.toISOString().split('T')[0];
                rows.forEach(row => {
                    if (parseFloat(row.hours) > 0) {
                        generatedEntries.push({
                            id: uuidv4(),
                            employeeId: currentUserId,
                            date: isoDate,
                            project: isProjectRequired(row.type) ? row.project : '', // Ensure project is empty for non-work
                            description: row.description,
                            hours: parseFloat(row.hours),
                            type: row.type
                        });
                    }
                });
            }
         }
         onSubmit('BULK_RANGE', generatedEntries);

    } else {
        const finalEntries: TimeEntry[] = rows.map(r => ({
            id: uuidv4(),
            employeeId: currentUserId,
            date: date,
            project: isProjectRequired(r.type) ? r.project : '', // Ensure project is empty for non-work
            description: r.description,
            hours: parseFloat(r.hours) || 0,
            type: r.type
        })).filter(e => e.hours > 0);

        onSubmit(date, finalEntries);
    }
    onClose();
  };
  
  // Feature: Fill Remainder of Month
  const handleFillRemainder = () => {
      const startDate = new Date(date);
      const year = startDate.getFullYear();
      const month = startDate.getMonth();
      const lastDay = new Date(year, month + 1, 0);
      
      const generatedEntries: TimeEntry[] = [];
      const datesToSkip = new Set(allMonthEntries.map(e => e.date));

      // Loop from Start Date to End of Month
      for (let d = new Date(startDate); d <= lastDay; d.setDate(d.getDate() + 1)) {
          const isoDate = d.toISOString().split('T')[0];
          const dayOfWeek = d.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          
          // Skip Weekend and Existing Entries
          if (!isWeekend && !datesToSkip.has(isoDate)) {
               // Check if it's a Holiday
               if (isHoliday(isoDate)) {
                   generatedEntries.push({
                       id: uuidv4(),
                       employeeId: currentUserId,
                       date: isoDate,
                       project: '',
                       description: getHolidayName(isoDate) || 'Svátek',
                       hours: 8,
                       type: WorkType.HOLIDAY
                   });
               } else {
                   // Normal day - copy form rows
                   rows.forEach(row => {
                       if (parseFloat(row.hours) > 0) {
                           generatedEntries.push({
                               id: uuidv4(),
                               employeeId: currentUserId,
                               date: isoDate,
                               project: isProjectRequired(row.type) ? row.project : '',
                               description: row.description,
                               hours: parseFloat(row.hours),
                               type: row.type
                           });
                       }
                   });
               }
          }
      }
      
      if (generatedEntries.length === 0) {
          alert('Žádné volné pracovní dny k vyplnění.');
          return;
      }

      if (window.confirm(`Chystám se vygenerovat ${generatedEntries.length} záznamů do konce měsíce. Přeskočím víkendy a dny, kde už máte práci. Svátky se vyplní automaticky (8h). Pokračovat?`)) {
          onSubmit('BULK_RANGE', generatedEntries);
          onClose();
      }
  };

  if (!isOpen) return null;

  const getDayName = (d: string) => {
      try {
        const dateObj = new Date(d);
        return dateObj.toLocaleDateString('cs-CZ', { weekday: 'long' });
      } catch (e) { return ''; }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 overflow-y-auto backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-auto animate-fade-in flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <div>
              <h3 className="text-xl font-bold text-gray-900">
                {isRangeMode ? 'Hromadné zadání' : 'Editor dne'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                  {isRangeMode ? 'Vygeneruje záznamy pro více dní.' : `Zadejte veškerou činnost pro ${date}.`}
              </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 bg-white p-2 rounded-full border border-gray-300 hover:bg-gray-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          
          {/* Controls Bar */}
          <div className="p-5 border-b border-gray-200 flex flex-col sm:flex-row gap-5 items-end bg-white">
             <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    {isRangeMode ? 'Datum Od' : 'Datum'}
                </label>
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-semibold text-gray-900 bg-white"
                    />
                    <span className="text-sm font-medium text-gray-700 capitalize min-w-[80px]">
                        {getDayName(date)}
                    </span>
                </div>
             </div>

             {isRangeMode && (
                 <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Datum Do</label>
                    <input
                        type="date"
                        required
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                    />
                 </div>
             )}

             <div className="flex items-center pb-2.5">
                <label className="flex items-center cursor-pointer text-sm text-indigo-700 font-bold hover:text-indigo-900 transition-colors select-none">
                    <input 
                      type="checkbox" 
                      checked={isRangeMode} 
                      onChange={(e) => setIsRangeMode(e.target.checked)}
                      className="mr-2 rounded text-indigo-600 focus:ring-indigo-500 w-5 h-5 border-gray-300"
                    />
                    Více dní
                </label>
             </div>
          </div>

          {/* Rows Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-100">
             {rows.map((row, index) => {
                const projectEnabled = isProjectRequired(row.type);
                return (
                <div key={row.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center animate-fade-in hover:shadow-md transition-shadow">
                    <div className="flex-1 w-full md:w-auto">
                        <label className="block md:hidden text-xs font-bold text-gray-700 mb-1">Projekt</label>
                        <select
                            required={projectEnabled}
                            disabled={!projectEnabled}
                            value={row.project}
                            onChange={(e) => updateRow(row.id, 'project', e.target.value)}
                            className={`w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm font-semibold transition-colors ${
                                projectEnabled 
                                ? 'border-gray-300 text-gray-900 bg-white' 
                                : 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
                            }`}
                        >
                            <option value="" disabled={projectEnabled}>{projectEnabled ? 'Vyberte projekt...' : '--- Bez zakázky ---'}</option>
                            {projectEnabled && jobs.map(job => (
                                <option key={job.id} value={job.name}>{job.name} ({job.code})</option>
                            ))}
                            {projectEnabled && <option value="General">Obecné / Režie</option>}
                        </select>
                    </div>

                    <div className="flex-[2] w-full md:w-auto">
                        <label className="block md:hidden text-xs font-bold text-gray-700 mb-1">Popis</label>
                        <input
                            type="text"
                            value={row.description}
                            onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                            placeholder="Popis činnosti..."
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900 placeholder-gray-400 bg-white"
                        />
                    </div>

                    <div className="w-full md:w-36">
                        <label className="block md:hidden text-xs font-bold text-gray-700 mb-1">Typ</label>
                        <select
                            value={row.type}
                            onChange={(e) => updateRow(row.id, 'type', e.target.value as any)}
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-xs font-medium bg-gray-50 text-gray-900"
                        >
                            {Object.values(WorkType).map(t => (
                            <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    <div className="w-full md:w-28 flex items-center gap-2">
                        <div className="flex-1">
                            <label className="block md:hidden text-xs font-bold text-gray-700 mb-1">Hodiny</label>
                            <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="24"
                                value={row.hours}
                                onChange={(e) => updateRow(row.id, 'hours', e.target.value)}
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-center text-gray-900 bg-white"
                            />
                        </div>
                        <button 
                            type="button"
                            onClick={() => removeRow(row.id)}
                            className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg md:mt-0 mt-6 transition-colors"
                            title="Smazat řádek"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>
             )})}

             <button 
                type="button" 
                onClick={addRow}
                className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 transition-all font-semibold flex items-center justify-center gap-2 bg-white shadow-sm"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Přidat další činnost
             </button>
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-gray-200 bg-white flex flex-col md:flex-row items-center justify-between gap-4 rounded-b-xl">
             <div className="flex items-center gap-3">
                 <button
                    type="button"
                    onClick={handleFillRemainder}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 font-medium text-sm transition-colors border border-orange-200"
                    title="Vyplní zvolenou činností všechny prázdné pracovní dny do konce měsíce"
                 >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                     </svg>
                     Vyplnit zbytek měsíce
                 </button>
             </div>
             
             <div className="flex items-center gap-3">
                 <span className="text-gray-600 font-medium text-sm uppercase tracking-wide">Celkem:</span>
                 <span className={`text-3xl font-bold font-mono ${
                     totalHours === 8 ? 'text-green-600' : (totalHours > 8 ? 'text-orange-600' : 'text-gray-900')
                 }`}>
                     {totalHours.toFixed(1)} h
                 </span>
                 {totalHours !== 8 && totalHours > 0 && (
                     <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                         totalHours > 8 ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
                     }`}>
                         {totalHours > 8 ? `+${(totalHours - 8).toFixed(1)}h` : `-${(8 - totalHours).toFixed(1)}h`}
                     </span>
                 )}
             </div>

             <div className="flex gap-3 w-full md:w-auto">
                 <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 md:flex-none px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 font-semibold transition-colors"
                 >
                    Zrušit
                 </button>
                 <button
                    type="submit"
                    className="flex-1 md:flex-none px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold shadow-lg shadow-indigo-200 transition-all transform hover:scale-105"
                 >
                    Uložit den
                 </button>
             </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EntryFormModal;
