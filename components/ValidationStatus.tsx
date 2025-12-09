
import React, { useState } from 'react';
import { ValidationIssue, getIssueColor } from '../services/validationService';

interface ValidationStatusProps {
  issues: ValidationIssue[];
}

const ValidationStatus: React.FC<ValidationStatusProps> = ({ issues }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');

  if (issues.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
        <div className="bg-green-100 p-2 rounded-full text-green-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h4 className="font-semibold text-green-800">Výkaz je v pořádku</h4>
          <p className="text-sm text-green-600">Nebyly nalezeny žádné chyby ani chybějící dny.</p>
        </div>
      </div>
    );
  }

  const mainColor = errors.length > 0 ? 'red' : 'orange';
  const mainTitle = errors.length > 0 ? 'Nalezeny chyby ve výkazu' : 'Upozornění k výkazu';

  return (
    <div className={`bg-${mainColor}-50 border border-${mainColor}-200 rounded-xl overflow-hidden mb-6 transition-all`}>
      <div 
        className="p-4 flex justify-between items-center cursor-pointer hover:bg-opacity-75"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`bg-${mainColor}-100 p-2 rounded-full text-${mainColor}-600`}>
            {errors.length > 0 ? (
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
               </svg>
            ) : (
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
            )}
          </div>
          <div>
            <h4 className={`font-semibold text-${mainColor}-800`}>{mainTitle}</h4>
            <p className={`text-sm text-${mainColor}-700`}>
              {errors.length > 0 && `${errors.length} chybějících dnů. `}
              {warnings.length > 0 && `${warnings.length} varování. `}
              <span className="underline ml-1">Zobrazit detaily</span>
            </p>
          </div>
        </div>
        <button className={`text-${mainColor}-500 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isExpanded && (
        <div className="bg-white border-t border-gray-100 p-4 max-h-60 overflow-y-auto">
          <ul className="space-y-2">
            {issues.map((issue, idx) => (
              <li key={idx} className={`flex items-start gap-3 p-2 rounded-lg border text-sm ${getIssueColor(issue.severity)}`}>
                <span className="font-mono font-bold whitespace-nowrap">
                   {new Date(issue.date).toLocaleDateString('cs-CZ', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                </span>
                <span>{issue.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ValidationStatus;
