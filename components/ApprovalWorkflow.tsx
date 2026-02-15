
import React from 'react';
import { MonthStatus, TimesheetStatus } from '../types';

const ApprovalWorkflow: React.FC<{status: MonthStatus, onUpdateStatus: any, isManagerMode: boolean}> = ({ status, onUpdateStatus, isManagerMode }) => {
  return (
    <div className="bg-white border border-gray-200 p-4 rounded-xl mb-6 shadow-sm flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-slate-400 uppercase">Stav:</span>
        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">Rozpracováno</span>
      </div>
      {!isManagerMode && (
          <button className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-bold text-sm shadow-lg shadow-indigo-900/20">Odeslat ke schválení</button>
      )}
    </div>
  );
};
export default ApprovalWorkflow;
