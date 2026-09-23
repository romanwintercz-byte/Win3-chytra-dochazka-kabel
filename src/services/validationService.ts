import { TimeEntry, ValidationIssue } from '../types';
import { getHolidayName } from './holidayService';

export const validateMonth = (entries: TimeEntry[], yearStr: string, monthStr: string): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const daysInMonth = new Date(year, month, 0).getDate();
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month - 1, d);
    const dateStr = `${yearStr}-${monthStr}-${String(d).padStart(2, '0')}`;
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
    const holiday = getHolidayName(dateStr);
    
    // Sčítáme všechny hodiny za daný den (robustní matching)
    const dayEntries = entries.filter(e => e.date && e.date.split('T')[0] === dateStr);
    const totalHours = dayEntries.reduce((sum, e) => sum + e.hours, 0);

    // Chyba: Pracovní den v minulosti bez jakéhokoliv záznamu
    if (!isWeekend && !holiday && totalHours === 0) {
      if (dateObj < now) {
        issues.push({ 
          date: dateStr, 
          severity: 'error', 
          message: 'Chybí jakýkoliv výkaz dne.', 
          type: 'MISSING_DAY' 
        });
      }
      continue;
    }

    // Varování: Málo hodin celkem (práce + lékař atd.)
    if (!isWeekend && !holiday && totalHours > 0 && totalHours < 8) {
      issues.push({ 
        date: dateStr, 
        severity: 'warning', 
        message: `Nízký součet dne: ${totalHours}h (standard 8h).`, 
        type: 'LOW_HOURS' 
      });
    }

    // Varování: Příliš mnoho hodin
    if (totalHours > 12) {
      issues.push({ 
        date: dateStr, 
        severity: 'warning', 
        message: `Vysoký denní součet: ${totalHours}h. Prověřte limity ZP.`, 
        type: 'HIGH_HOURS' 
      });
    }
  }
  return issues;
};

export const getIssueColor = (severity: 'error' | 'warning' | 'info') => {
  switch (severity) {
    case 'error': return 'text-red-700 bg-red-50 border-red-200';
    case 'warning': return 'text-amber-700 bg-amber-50 border-amber-200';
    case 'info': return 'text-blue-700 bg-blue-50 border-blue-200';
    default: return '';
  }
};
