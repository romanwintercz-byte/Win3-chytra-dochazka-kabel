import React from 'react';
import { TimeEntry, Job, WorkType } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface SmartInputProps {
  onEntriesAdded: (entries: TimeEntry[]) => void;
  currentUserId: string;
  onManualEntry: () => void;
  onCopyLastDay: () => void;
  lastActiveDay?: string; // Date string of last entry
}

const SmartInput: React.FC<SmartInputProps> = ({ 
  onEntriesAdded, 
  currentUserId, 
  onManualEntry, 
  onCopyLastDay,
  lastActiveDay 
}) => {

  const addTemplate = (type: WorkType, hours: number, project: string = '', description: string = '') => {
    const today = new Date().toISOString().split('T')[0];
    const entry: TimeEntry = {
        id: uuidv4(),
        employeeId: currentUserId,
        date: today,
        project: project,
        description: description || (type === WorkType.REGULAR ? 'Administrativa / Režie' : type),
        hours: hours,
        type: type
    };
    onEntriesAdded([entry]);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
          </svg>
          Rychlé akce
        </h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. COPY LAST DAY */}
        <button
          onClick={onCopyLastDay}
          disabled={!lastActiveDay}
          className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed transition-all group ${
            lastActiveDay 
                ? 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 text-indigo-700' 
                : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
          }`}
        >
            <div className={`p-2 rounded-full mb-2 ${lastActiveDay ? 'bg-white text-indigo-600 shadow-sm' : 'bg-gray-200'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                </svg>
            </div>
            <span className="font-bold text-sm">Zkopírovat minulý den</span>
            <span className="text-xs mt-1 opacity-70">
                {lastActiveDay ? new Date(lastActiveDay).toLocaleDateString('cs-CZ') : 'Žádná historie'}
            </span>
        </button>

        {/* 2. MANUAL ENTRY */}
        <button
          onClick={onManualEntry}
          className="flex flex-col items-center justify-center p-4 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md transition-all text-gray-700 hover:text-indigo-600 group"
        >
            <div className="p-2 rounded-full bg-gray-100 text-gray-600 mb-2 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
            </div>
            <span className="font-bold text-sm">Otevřít Editor</span>
            <span className="text-xs mt-1 text-gray-400">Ruční zadání dne</span>
        </button>

        {/* 3. TEMPLATES - VACATION */}
        <button
          onClick={() => addTemplate(WorkType.VACATION, 8)}
          className="flex flex-col items-center justify-center p-4 rounded-xl border border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-300 transition-all text-green-700"
        >
             <div className="p-2 rounded-full bg-white text-green-600 shadow-sm mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
            </div>
            <span className="font-bold text-sm">Dovolená (8h)</span>
            <span className="text-xs mt-1 opacity-70">Jeden klik</span>
        </button>

        {/* 4. TEMPLATES - SICK */}
        <button
          onClick={() => addTemplate(WorkType.SICK_DAY, 8)}
          className="flex flex-col items-center justify-center p-4 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-300 transition-all text-red-700"
        >
             <div className="p-2 rounded-full bg-white text-red-600 shadow-sm mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
            </div>
            <span className="font-bold text-sm">Nemoc (8h)</span>
            <span className="text-xs mt-1 opacity-70">Jeden klik</span>
        </button>
      </div>
    </div>
  );
};

export default SmartInput;