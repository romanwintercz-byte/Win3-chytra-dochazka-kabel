import React, { useState } from 'react';
import { ValidationIssue } from '../types';
import { getIssueColor } from '../services/validationService';

interface ValidationStatusProps {
  issues: ValidationIssue[];
}

const ValidationStatus: React.FC<ValidationStatusProps> = ({ issues }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');

  if (issues.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl shadow-xs flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl shrink-0">
          ✅
        </div>
        <div>
          <h4 className="font-extrabold text-sm text-emerald-900">Výkaz je v pořádku</h4>
          <p className="text-xs text-emerald-700 mt-0.5">Všechny pracovní dny v měsíci mají platný záznam.</p>
        </div>
      </div>
    );
  }

  const isError = errors.length > 0;

  return (
    <div className={`p-5 rounded-2xl border shadow-xs transition-all ${isError ? 'bg-rose-50/70 border-rose-200' : 'bg-amber-50/70 border-amber-200'}`}>
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${isError ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
            {isError ? '⚠️' : 'ℹ️'}
          </div>
          <div>
            <h4 className={`font-extrabold text-sm ${isError ? 'text-rose-900' : 'text-amber-900'}`}>
              Upozornění k docházce ({issues.length})
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              {errors.length > 0 && <span>{errors.length} chybějících dnů • </span>}
              {warnings.length > 0 && <span>{warnings.length} nízkých/vysokých součtů</span>}
            </p>
          </div>
        </div>
        <button 
          type="button"
          className="text-xs font-bold text-slate-500 hover:text-slate-800 p-1"
        >
          {isExpanded ? 'Skrýt ▲' : 'Zobrazit ▼'}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-3.5 pt-3 border-t border-slate-200/70 space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {issues.map((i, idx) => (
            <div 
              key={idx} 
              className={`p-2 rounded-lg border text-xs font-medium flex items-center justify-between gap-2 ${getIssueColor(i.severity)}`}
            >
              <span className="font-bold">{new Date(i.date).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', weekday: 'short' })}:</span>
              <span className="flex-1 text-right">{i.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ValidationStatus;
