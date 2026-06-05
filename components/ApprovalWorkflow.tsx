
import React from 'react';
import { MonthStatus, TimesheetStatus } from '../types';

interface ApprovalWorkflowProps {
  status: MonthStatus;
  onUpdateStatus: (newStatus: TimesheetStatus, comment?: string) => void;
  isManagerMode: boolean;
  isReviewing: boolean;
}

const ApprovalWorkflow: React.FC<ApprovalWorkflowProps> = ({ status, onUpdateStatus, isManagerMode, isReviewing }) => {
  const getStatusConfig = (s: TimesheetStatus) => {
    switch (s) {
      case TimesheetStatus.SUBMITTED:
        return { label: 'KE SCHVÁLENÍ', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: '⏳' };
      case TimesheetStatus.APPROVED:
        return { label: 'SCHVÁLENO', color: 'bg-green-100 text-green-700 border-green-200', icon: '✅' };
      case TimesheetStatus.REJECTED:
        return { label: 'VRÁCENO K OPRAVĚ', color: 'bg-red-100 text-red-700 border-red-200', icon: '❌' };
      default:
        return { label: 'ROZPRACOVÁNO', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: '✏️' };
    }
  };

  const config = getStatusConfig(status.status);
  const isLocked = status.status === TimesheetStatus.SUBMITTED || status.status === TimesheetStatus.APPROVED;

  return (
    <div className="bg-white border border-gray-200 p-5 rounded-2xl mb-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${config.color.split(' ')[0]}`}>
          {config.icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Stav výkazu</span>
            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${config.color}`}>
              {config.label}
            </span>
          </div>
          {status.managerComment && (
            <p className="text-xs text-red-600 mt-1 font-medium italic">" {status.managerComment} "</p>
          )}
          {status.approvedAt && (
            <p className="text-[9px] text-slate-400 mt-0.5">Schváleno: {new Date(status.approvedAt).toLocaleString('cs-CZ')}</p>
          )}
        </div>
      </div>

      <div className="flex gap-2 w-full md:w-auto">
        {/* Akce pro zaměstnance */}
        {!isReviewing && status.status !== TimesheetStatus.SUBMITTED && status.status !== TimesheetStatus.APPROVED && (
          <button 
            onClick={() => onUpdateStatus(TimesheetStatus.SUBMITTED)}
            className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 transition-all active:scale-95"
          >
            {isManagerMode ? "Uzavřít měsíc" : "Odeslat Lucii ke schválení"}
          </button>
        )}

        {/* Akce pro manažera (když si to omylem poslal sám na sebe nebo uzavřel) */}
        {!isReviewing && isManagerMode && (status.status === TimesheetStatus.SUBMITTED || status.status === TimesheetStatus.APPROVED) && (
          <button 
            onClick={() => onUpdateStatus(TimesheetStatus.DRAFT)}
            className="flex-1 md:flex-none bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-6 py-2.5 rounded-xl font-bold text-sm transition-all"
          >
            Zrušit uzavření / odeslání
          </button>
        )}

        {/* Akce pro Lucii (manažera) během kontroly */}
        {isReviewing && status.status === TimesheetStatus.SUBMITTED && (
          <>
            <button 
              onClick={() => {
                const msg = prompt("Důvod vrácení:");
                if (msg !== null) onUpdateStatus(TimesheetStatus.REJECTED, msg);
              }}
              className="flex-1 md:flex-none bg-white border border-red-200 text-red-600 hover:bg-red-50 px-6 py-2.5 rounded-xl font-bold text-sm transition-all"
            >
              Vrátit k opravě
            </button>
            <button 
              onClick={() => onUpdateStatus(TimesheetStatus.APPROVED)}
              className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-green-100 transition-all"
            >
              Schválit a uzavřít
            </button>
          </>
        )}

        {isReviewing && status.status === TimesheetStatus.APPROVED && (
          <button 
            onClick={() => onUpdateStatus(TimesheetStatus.SUBMITTED)}
            className="flex-1 md:flex-none bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-6 py-2.5 rounded-xl font-bold text-sm transition-all"
          >
            Zrušit schválení
          </button>
        )}
      </div>
    </div>
  );
};

export default ApprovalWorkflow;
