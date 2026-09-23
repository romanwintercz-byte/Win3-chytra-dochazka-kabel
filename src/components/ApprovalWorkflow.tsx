import React, { useState } from 'react';
import { MonthStatus, TimesheetStatus } from '../types';

interface ApprovalWorkflowProps {
  status: MonthStatus;
  onUpdateStatus: (newStatus: TimesheetStatus, comment?: string) => void;
  isManagerMode: boolean;
  isReviewing: boolean;
}

const ApprovalWorkflow: React.FC<ApprovalWorkflowProps> = ({ 
  status, 
  onUpdateStatus, 
  isManagerMode, 
  isReviewing 
}) => {
  const [rejectComment, setRejectComment] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);

  const getStatusConfig = (s: TimesheetStatus) => {
    switch (s) {
      case TimesheetStatus.SUBMITTED:
        return { 
          label: 'ČEKÁ NA SCHVÁLENÍ LUCIÍ', 
          color: 'bg-amber-100 text-amber-900 border-amber-300', 
          icon: '⏳',
          desc: 'Výkaz byl odeslán ke schválení. Záznamy jsou pro zaměstnance uzamčeny.'
        };
      case TimesheetStatus.APPROVED:
        return { 
          label: 'SCHVÁLENO A UZAVŘENO', 
          color: 'bg-emerald-100 text-emerald-900 border-emerald-300', 
          icon: '✅',
          desc: 'Výkaz byl schválen vedením firmy Kabel a slouží jako oficiální podklad pro mzdy.'
        };
      case TimesheetStatus.REJECTED:
        return { 
          label: 'VRÁCENO K DOPLNĚNÍ', 
          color: 'bg-rose-100 text-rose-900 border-rose-300', 
          icon: '↩️',
          desc: 'Výkaz byl vrácen k opravě nebo doplnění chybějících údajů.'
        };
      default:
        return { 
          label: 'ROZPRACOVÁNO', 
          color: 'bg-slate-100 text-slate-700 border-slate-300', 
          icon: '✏️',
          desc: 'Výkaz je otevřen pro zápis a úpravy hodin.'
        };
    }
  };

  const config = getStatusConfig(status.status);

  const handleConfirmReject = () => {
    onUpdateStatus(TimesheetStatus.REJECTED, rejectComment.trim() || 'Prosím o kontrolu a doplnění hodin.');
    setShowRejectBox(false);
    setRejectComment('');
  };

  return (
    <div className="bg-white border border-slate-200 p-5 md:p-6 rounded-2xl mb-6 shadow-xs flex flex-col gap-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 border ${config.color.split(' ')[0]}`}>
            {config.icon}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Stav měsíčního výkazu:
              </span>
              <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${config.color}`}>
                {config.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{config.desc}</p>
            {status.managerComment && (
              <p className="text-xs text-rose-700 mt-1 font-semibold bg-rose-50 px-2.5 py-1 rounded-md border border-rose-100">
                💬 Poznámka Lucie: „{status.managerComment}“
              </p>
            )}
            {status.approvedAt && (
              <p className="text-[10px] text-emerald-600 font-bold mt-1">
                ✓ Schváleno: {new Date(status.approvedAt).toLocaleString('cs-CZ')}
              </p>
            )}
          </div>
        </div>

        {/* Tlačítka schvalovacích akcí */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Akce pro zaměstnance (když není v kontrole jiného uživatele) */}
          {!isReviewing && status.status !== TimesheetStatus.SUBMITTED && status.status !== TimesheetStatus.APPROVED && (
            <button 
              type="button"
              onClick={() => onUpdateStatus(TimesheetStatus.SUBMITTED)}
              className="flex-1 md:flex-none h-11 px-6 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2"
            >
              <span>📨</span>
              <span>{isManagerMode ? "Uzavřít měsíc" : "Odeslat Lucii ke schválení"}</span>
            </button>
          )}

          {/* Možnost zrušit odeslání pro zaměstnance před schválením */}
          {!isReviewing && status.status === TimesheetStatus.SUBMITTED && (
            <button 
              type="button"
              onClick={() => onUpdateStatus(TimesheetStatus.DRAFT)}
              className="flex-1 md:flex-none h-10 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
            >
              Vrátit zpět do rozpracování
            </button>
          )}

          {/* Akce pro Lucii (manažera) během kontroly konkrétního zaměstnance */}
          {isReviewing && status.status === TimesheetStatus.SUBMITTED && (
            <>
              <button 
                type="button"
                onClick={() => setShowRejectBox(true)}
                className="flex-1 md:flex-none h-11 px-5 bg-white border border-rose-300 hover:bg-rose-50 text-rose-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors"
              >
                Vrátit k opravě
              </button>
              <button 
                type="button"
                onClick={() => onUpdateStatus(TimesheetStatus.APPROVED)}
                className="flex-1 md:flex-none h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-1.5"
              >
                <span>✓</span>
                <span>Schválit a uzavřít</span>
              </button>
            </>
          )}

          {isReviewing && status.status === TimesheetStatus.APPROVED && (
            <button 
              type="button"
              onClick={() => onUpdateStatus(TimesheetStatus.SUBMITTED)}
              className="flex-1 md:flex-none h-10 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition-colors"
            >
              Zrušit schválení (odemknout)
            </button>
          )}
        </div>
      </div>

      {/* Dialog pro zadání důvodu vrácení k opravě */}
      {showRejectBox && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2.5 animate-fade-in">
          <label className="text-xs font-bold text-rose-900 block">
            Důvod vrácení výkazu zaměstnanci (co má opravit):
          </label>
          <input 
            type="text" 
            value={rejectComment} 
            onChange={e => setRejectComment(e.target.value)}
            placeholder="Např. doplňte prosím chybějící směnu z pátku 12.5."
            className="w-full h-10 px-3 bg-white border border-rose-300 rounded-lg text-xs text-slate-900 outline-none focus:ring-2 focus:ring-rose-500"
          />
          <div className="flex justify-end gap-2">
            <button 
              type="button"
              onClick={() => setShowRejectBox(false)}
              className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-rose-100 rounded-lg"
            >
              Zrušit
            </button>
            <button 
              type="button"
              onClick={handleConfirmReject}
              className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs"
            >
              Odeslat zpět zaměstnanci
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalWorkflow;
