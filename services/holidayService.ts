
const FIXED_HOLIDAYS: Record<string, string> = {
  '01-01': 'Nový rok',
  '05-01': 'Svátek práce',
  '05-08': 'Den vítězství',
  '07-05': 'Den slovanských věrozvěstů',
  '07-06': 'Den mistra Jana Husa',
  '09-28': 'Den české státnosti',
  '10-28': 'Den vzniku ČSR',
  '11-17': 'Den boje za svobodu',
  '12-24': 'Štědrý den',
  '12-25': '1. svátek vánoční',
  '12-26': '2. svátek vánoční',
};

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
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
};

export const getHolidayName = (dateStr: string): string | null => {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const monthStr = parts[1];
  const dayStr = parts[2];
  const mmdd = `${monthStr}-${dayStr}`;

  if (FIXED_HOLIDAYS[mmdd]) return FIXED_HOLIDAYS[mmdd];

  const easterSunday = getEasterSunday(year);
  const goodFriday = new Date(easterSunday);
  goodFriday.setDate(easterSunday.getDate() - 2);
  const easterMonday = new Date(easterSunday);
  easterMonday.setDate(easterSunday.getDate() + 1);

  const check = (d: Date) => 
    d.getFullYear() === year && 
    String(d.getMonth() + 1).padStart(2, '0') === monthStr && 
    String(d.getDate()).padStart(2, '0') === dayStr;

  if (check(goodFriday)) return 'Velký pátek';
  if (check(easterMonday)) return 'Velikonoční pondělí';
  return null;
};

export const isHoliday = (dateStr: string): boolean => getHolidayName(dateStr) !== null;
