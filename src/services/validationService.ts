import { TimeEntry, WorkType } from '../types';
import { getHolidayName } from './holidayService';

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  date: string;
  severity: IssueSeverity;
  type: string;
  message: string;
  details?: string;
}

export const validateMonth = (entries: TimeEntry[], monthOrYear: string, maybeMonth?: string): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  if (!monthOrYear) return issues;

  let year: number;
  let month: number;

  if (maybeMonth) {
    year = parseInt(monthOrYear, 10);
    month = parseInt(maybeMonth, 10);
  } else {
    const parts = monthOrYear.split('-');
    if (parts.length < 2) return issues;
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const yearStr = String(year);
  const monthStr = String(month).padStart(2, '0');

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month - 1, d);
    const dayStr = String(d).padStart(2, '0');
    const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
    const holiday = getHolidayName(dateStr);
    
    // Match entries for this day
    const dayEntries = entries.filter(e => e.date.split('T')[0] === dateStr);
    const totalHours = dayEntries.reduce((sum, e) => sum + e.hours, 0);

    // Chyba: Pracovní den v minulosti bez jakéhokoliv záznamu
    if (!isWeekend && !holiday && totalHours === 0) {
      if (dateObj < now) {
        issues.push({ 
          date: dateStr, 
          severity: 'error', 
          type: 'MISSING_DAY', 
          message: 'Chybí jakýkoliv výkaz dne.',
          details: 'Nebyl vykázán žádný čas ani nepřítomnost.'
        });
      }
      continue;
    }

    // Varování: Málo hodin celkem (práce + lékař atd.)
    if (!isWeekend && !holiday && totalHours > 0 && totalHours < 8) {
      const hasAbsence = dayEntries.some(e => e.type !== WorkType.REGULAR && e.type !== WorkType.OVERTIME);
      if (!hasAbsence) {
        issues.push({ 
          date: dateStr, 
          severity: 'warning', 
          type: 'LOW_HOURS', 
          message: `Nízký součet dne: ${totalHours}h (standard 8h).`,
          details: 'Standardní denní fond je 8 hodin.'
        });
      }
    }

    // Varování: Překročen zákonný limit směny (12h)
    if (totalHours > 12) {
      issues.push({ 
        date: dateStr, 
        severity: 'error', 
        type: 'HIGH_HOURS', 
        message: `Překročen denní limit směny (${totalHours}h).`,
        details: 'Délka směny nesmí dle zákoníku práce přesáhnout 12 hodin.'
      });
    }

    // Víkendová práce
    if (isWeekend && dayEntries.length > 0) {
      const hasRegular = dayEntries.some(e => e.type === WorkType.REGULAR);
      if (hasRegular) {
        issues.push({
          date: dateStr,
          severity: 'info',
          type: 'WEEKEND_REGULAR',
          message: `Práce o víkendu (${d}.${month}.) evidována jako běžná práce.`,
          details: 'Doporučeno evidovat jako přesčas.'
        });
      }
    }
  }

  return issues;
};

export const getIssueColor = (severity: string | IssueSeverity) => {
  switch (severity) {
    case 'error': return 'text-red-600 bg-red-50 border-red-200';
    case 'warning': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
    default: return '';
  }
};
