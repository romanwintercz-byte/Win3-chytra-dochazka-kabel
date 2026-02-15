
import React from 'react';
import { ValidationIssue, getIssueColor } from '../services/validationService';

const ValidationStatus: React.FC<{issues: ValidationIssue[]}> = ({ issues }) => {
  if (issues.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex items-center gap-3">
        <span className="text-xl">✅</span>
        <div>
          <h4 className="font-bold text-green-800 text-sm">Výkaz v pořádku</h4>
          <p className="text-xs text-green-600">Žádné chybějící dny.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-3">
      <h4 className="font-bold text-amber-800 text-sm">Upozornění ({issues.length})</h4>
      <div className="space-y-1">
        {issues.map((i, idx) => (
          <div key={idx} className={`p-2 rounded border text-[10px] font-medium ${getIssueColor(i.severity)}`}>
            {i.date}: {i.message}
          </div>
        ))}
      </div>
    </div>
  );
};
export default ValidationStatus;
