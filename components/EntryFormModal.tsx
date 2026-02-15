
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TimeEntry, Job, WorkType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { isHoliday, getHolidayName } from '../services/holidayService';
import { uploadAttachment } from '../services/supabase';

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
  attachmentUrl?: string; // Local state for attachment
  isUploading?: boolean;
}

const EntryFormModal: React.FC<EntryFormModalProps> = ({ 
  isOpen, onClose, onSubmit, initialDate, existingEntries, currentUserId, jobs, allMonthEntries = []
}) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [rows, setRows] = useState<RowState[]>([]);
  const [isRangeMode, setIsRangeMode] = useState(false);
  const [dateTo, setDateTo] = useState('');
  
  // Ref to trigger hidden file inputs
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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
            type: e.type,
            attachmentUrl: e.attachmentUrl
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

  const isAttachmentAllowed = (type: WorkType) => {
      return [
          WorkType.DOCTOR, 
          WorkType.SICK_DAY, 
          WorkType.OCR, 
          WorkType.OTHER_OBSTACLE,
          WorkType.COMPENSATORY_LEAVE
      ].includes(type);
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

  const handleFileUpload = async (rowId: string, file: File) => {
      // Set uploading state
      setRows(prev => prev.map(r => r.id === rowId ? { ...r, isUploading: true } : r));

      const url = await uploadAttachment(file);

      // Set Result
      setRows(prev => prev.map(r => r.id === rowId ? { 
          ...r, 
          isUploading: false,
          attachmentUrl: url || undefined 
      } : r));
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
                            type: row.type,
                            attachmentUrl: row.attachmentUrl // Keep attachment if copied
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
            type: r.type,
            attachmentUrl: r.attachmentUrl
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
                               type: row.type,
                               // Do NOT copy attachments to future days automatically
                               // attachmentUrl: row.attachmentUrl 
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
    // Outer Wrapper: Full screen white on mobile, Centered Modal on Desktop
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-white sm:bg-black sm:bg-opacity-60 sm:p-4 sm:backdrop-blur-sm">
      <div className="bg-white w-full h-full sm:h-auto sm:rounded-xl shadow-2xl sm:max-w-3xl mx-auto animate-fade-in flex flex-col sm:max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-200 bg-gray-50 sm:rounded-t-xl shrink-0">
          <div>
              <h3 className="text-xl font-bold text-gray-900">
                {isRangeMode ? 'Hromadný zápis' : 'Editor dne'}
              </h3>
              <p className="text-xs text-gray-500 hidden sm:block mt-1">
                  {isRangeMode ? 'Vygeneruje záznamy pro více dní.' : `Zadejte veškerou činnost pro ${date}.`}
              </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 bg-white p-2 rounded-full border border-gray-300 hover:bg-gray-100 transition-colors shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          
          {/* Controls Bar - Compact Mobile */}
          <div className="p-4 border-b border-gray-200 bg-white shrink-0">
             <div className="flex flex-col gap-3">
                 {/* Date Row - Fixed for iPhone 13 (Flex-nowrap, min-w-0) */}
                 <div className="flex flex-row items-end gap-2">
                    <div className="flex-1 min-w-0">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 tracking-wider whitespace-nowrap">Datum {isRangeMode && 'OD'}</label>
                        <div className="relative">
                            <input 
                                type="date" 
                                required
                                value={date} 
                                onChange={(e) => setDate(e.target.value)} 
                                className="w-full h-11 sm:h-auto p-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base" 
                            />
                            <span className="absolute right-10 top-3 text-xs text-gray-400 hidden sm:inline">{getDayName(date)}</span>
                        </div>
                    </div>
                    
                    {isRangeMode && (
                         <div className="flex-1 min-w-0 animate-fade-in">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 tracking-wider whitespace-nowrap">Datum DO</label>
                            <input 
                                type="date" 
                                required
                                value={dateTo} 
                                onChange={(e) => setDateTo(e.target.value)} 
                                className="w-full h-11 sm:h-auto p-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base" 
                            />
                         </div>
                    )}
                 </div>

                 {/* Mode Switcher */}
                 <div className="flex items-center justify-between pt-1">
                     <span className="text-xs sm:text-sm font-semibold text-gray-600">
                         {isRangeMode ? 'Vytvářím záznamy pro období' : 'Edituji jeden den'}
                     </span>
                     <label className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-lg cursor-pointer border border-indigo-100 hover:bg-indigo-100 transition-colors">
                        <input 
                            type="checkbox" 
                            checked={isRangeMode} 
                            onChange={(e) => setIsRangeMode(e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 border-gray-300"
                        />
                        <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Více dní</span>
                     </label>
                 </div>
             </div>
          </div>

          {/* Rows Area - Mobile Cards */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 bg-gray-100 scrollbar-thin">
             {rows.map((row, index) => {
                const projectEnabled = isProjectRequired(row.type);
                const canAttach = isAttachmentAllowed(row.type);

                return (
                <div key={row.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4 relative animate-fade-in hover:shadow-md transition-shadow">
                    
                    {/* Delete Button Mobile - Absolute Top Right */}
                    <button type="button" onClick={() => removeRow(row.id)} className="absolute top-2 right-2 p-2 text-gray-300 hover:text-red-500 sm:hidden">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Project - Full width mobile */}
                    <div className="w-full sm:flex-1 pr-8 sm:pr-0">
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block sm:hidden">Projekt</label>
                        <select
                            required={projectEnabled}
                            disabled={!projectEnabled}
                            value={row.project}
                            onChange={(e) => updateRow(row.id, 'project', e.target.value)}
                            className={`w-full h-11 p-2 border rounded-lg text-base font-medium text-gray-900 shadow-sm focus:ring-2 focus:ring-indigo-500 ${
                                projectEnabled ? 'bg-white border-gray-300' : 'bg-gray-50 text-gray-400 border-gray-200'
                            }`}
                        >
                            <option value="" disabled={projectEnabled}>{projectEnabled ? 'Vyberte projekt...' : '--- Bez zakázky ---'}</option>
                            {projectEnabled && jobs.map(job => (
                                <option key={job.id} value={job.name}>{job.name} ({job.code})</option>
                            ))}
                            {projectEnabled && <option value="General">Obecné / Režie</option>}
                        </select>
                    </div>

                    {/* Wrapper for Type + Hours on mobile */}
                    <div className="flex gap-3 w-full sm:w-auto">
                        {/* Type */}
                        <div className="flex-[2] sm:w-36">
                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block sm:hidden">Činnost</label>
                            <select
                                value={row.type}
                                onChange={(e) => updateRow(row.id, 'type', e.target.value as any)}
                                className="w-full h-11 p-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-900 font-medium focus:ring-2 focus:ring-indigo-500"
                            >
                                {Object.values(WorkType).map(t => (
                                <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        {/* Hours */}
                        <div className="flex-1 sm:w-24">
                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block sm:hidden">Hodiny</label>
                            <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="24"
                                value={row.hours}
                                onChange={(e) => updateRow(row.id, 'hours', e.target.value)}
                                className="w-full h-11 p-2 border border-indigo-200 rounded-lg text-lg font-bold text-center bg-white text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Description + Attachment Row */}
                    <div className="w-full sm:flex-[2]">
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block sm:hidden">Popis & Přílohy</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={row.description}
                                onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                                placeholder="Poznámka..."
                                className="flex-1 h-11 p-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 bg-white focus:ring-2 focus:ring-indigo-500"
                            />
                            
                            {/* Attachment Button */}
                            {canAttach && (
                                <>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        capture="environment"
                                        className="hidden"
                                        ref={(el) => { fileInputRefs.current[row.id] = el; }}
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                handleFileUpload(row.id, e.target.files[0]);
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRefs.current[row.id]?.click()}
                                        disabled={row.isUploading || !!row.attachmentUrl}
                                        className={`h-11 w-11 flex items-center justify-center rounded-lg border transition-colors ${
                                            row.attachmentUrl 
                                                ? 'bg-green-100 border-green-300 text-green-700' 
                                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                        }`}
                                        title="Vyfotit doklad"
                                    >
                                        {row.isUploading ? (
                                            <svg className="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        ) : row.attachmentUrl ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Desktop Delete */}
                    <div className="hidden sm:flex items-center">
                        <button 
                            type="button"
                            onClick={() => removeRow(row.id)}
                            className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
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
                className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 transition-all font-semibold flex items-center justify-center gap-2 bg-white shadow-sm hover:shadow"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Přidat další činnost
             </button>
             
             {/* Spacer for bottom safe area/footer mobile */}
             <div className="h-4 sm:hidden"></div>
          </div>

          {/* Footer - Sticky Bottom on Mobile */}
          <div className="p-4 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 pb-[env(safe-area-inset-bottom,20px)] sm:pb-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] sm:shadow-none z-10">
             {/* Total & Fill Button */}
             <div className="flex w-full sm:w-auto justify-between items-center sm:gap-6">
                 <button 
                    type="button" 
                    onClick={handleFillRemainder} 
                    className="text-xs sm:text-sm text-orange-600 font-bold bg-orange-50 px-3 py-2.5 rounded-lg border border-orange-100 whitespace-nowrap hover:bg-orange-100 transition-colors flex items-center gap-1"
                    title="Vyplnit prázdné dny"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Vyplnit zbytek
                 </button>
                 
                 <div className="text-right sm:text-left flex items-baseline gap-2">
                     <span className="text-xs text-gray-400 uppercase font-bold">Celkem:</span>
                     <span className={`text-2xl font-bold font-mono ${
                        totalHours === 8 ? 'text-green-600' : (totalHours > 8 ? 'text-orange-600' : 'text-gray-900')
                     }`}>
                         {totalHours}h
                     </span>
                 </div>
             </div>

             {/* Action Buttons */}
             <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
                 <button 
                    type="button" 
                    onClick={onClose} 
                    className="py-3.5 sm:py-3 sm:px-6 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                 >
                    Zrušit
                 </button>
                 <button 
                    type="submit" 
                    className="py-3.5 sm:py-3 sm:px-8 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all"
                 >
                    Uložit
                 </button>
             </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EntryFormModal;
