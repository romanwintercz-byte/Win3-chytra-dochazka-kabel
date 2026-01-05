// Czech Holidays Service

// Fixed holidays in format MM-DD
const FIXED_HOLIDAYS: Record<string, string> = {
  '01-01': 'Nový rok / Den obnovy samostatného českého státu',
  '05-01': 'Svátek práce',
  '05-08': 'Den vítězství',
  '07-05': 'Den slovanských věrozvěstů Cyrila a Metoděje',
  '07-06': 'Den upálení mistra Jana Husa',
  '09-28': 'Den české státnosti',
  '10-28': 'Den vzniku samostatného československého státu',
  '11-17': 'Den boje za svobodu a demokracii',
  '12-24': 'Štědrý den',
  '12-25': '1. svátek vánoční',
  '12-26': '2. svátek vánoční',
};

// Calculate Easter Sunday date for a given year (Meeus/Jones/Butcher's algorithm)
const getEasterSunday = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  
  return new Date(year, month, day);
};

export const getHolidayName = (dateStr: string): string | null => {
  // FIX: Parsování bez rizika Timezone shiftu
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  
  const year = parseInt(parts[0], 10);
  const monthStr = parts[1]; // "MM"
  const dayStr = parts[2];   // "DD"
  const mmdd = `${monthStr}-${dayStr}`;

  // 1. Check Fixed Holidays (státní svátky)
  if (FIXED_HOLIDAYS[mmdd]) {
    return FIXED_HOLIDAYS[mmdd];
  }

  // 2. Check Easter Holidays
  const easterSunday = getEasterSunday(year);
  
  // Good Friday (Velký pátek) - 2 days before Easter Sunday
  const goodFriday = new Date(easterSunday);
  goodFriday.setDate(easterSunday.getDate() - 2);
  
  // Easter Monday (Velikonoční pondělí) - 1 day after Easter Sunday
  const easterMonday = new Date(easterSunday);
  easterMonday.setDate(easterSunday.getDate() + 1);

  const checkDateMatch = (d: Date, y: number, m: string, day: string) => {
    return d.getFullYear() === y && 
           String(d.getMonth() + 1).padStart(2, '0') === m && 
           String(d.getDate()).padStart(2, '0') === day;
  };

  if (checkDateMatch(goodFriday, year, monthStr, dayStr)) return 'Velký pátek';
  if (checkDateMatch(easterMonday, year, monthStr, dayStr)) return 'Velikonoční pondělí';

  return null;
};

export const isHoliday = (dateStr: string): boolean => {
  return getHolidayName(dateStr) !== null;
};