
import { TimeEntry, WorkType } from '../types';
import { getHolidayName } from './holidayService';

export type IssueSeverity = 'error' | 'warning' | 'info';
export interface ValidationIssue {
  date: string;
  severity: IssueSeverity;
  message: string;
  type: string;
}

export const validateMonth = (entries: TimeEntry[], yearStr: string, monthStr: string): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month - 1, d);
    const dateStr = `${yearStr}-${monthStr}-${String(d).padStart(2, '0')}`;
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
    const holiday = getHolidayName(dateStr);
    
    const dayEntries = entries.filter(e => e.date === dateStr);
    const totalHours = dayEntries.reduce((sum, e) => sum + e.hours, 0);

    if (!isWeekend && !holiday && dayEntries.length === 0) {
      if (dateObj <= new Date()) {
        issues.push({ date: dateStr, severity: 'error', message: 'Chybí výkaz.', type: 'MISSING_DAY' });
      }
      continue;
    }

    if (!isWeekend && !holiday && totalHours > 0 && totalHours < 8) {
      issues.push({ date: dateStr, severity: 'warning', message: `Pouze ${totalHours}h (standard 8h).`, type: 'LOW_HOURS' });
    }

    if (totalHours > 12) {
      issues.push({ date: dateStr, severity: 'warning', message: `Vysoký počet hodin: ${totalHours}h.`, type: 'HIGH_HOURS' });
    }
  }
  return issues;
};

export const getIssueColor = (severity: IssueSeverity) => {
  switch (severity) {
    case 'error': return 'text-red-600 bg-red-50 border-red-200';
    case 'warning': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
    default: return '';
  }
};
