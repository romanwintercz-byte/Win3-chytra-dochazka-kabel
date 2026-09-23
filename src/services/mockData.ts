import { Employee, Job, TimeEntry, WorkType } from '../types';

export const MOCK_EMPLOYEES: Employee[] = [
  {
    id: 'kabel-mgr-1',
    name: 'Lucie Novotná',
    email: 'lucie@kabel.cz',
    role: 'Manager',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LucieNovotna',
    isActive: true,
    department: '10000'
  },
  {
    id: 'kabel-emp-1',
    name: 'Jan Procházka',
    email: 'jan@kabel.cz',
    role: 'Zaměstnanec',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=JanProchazka',
    isActive: true,
    pinCode: '1234',
    department: '10001'
  },
  {
    id: 'kabel-emp-2',
    name: 'Martin Dvořák',
    email: 'martin@kabel.cz',
    role: 'Zaměstnanec',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MartinDvorak',
    isActive: true,
    pinCode: '2468',
    department: '10001'
  },
  {
    id: 'kabel-emp-3',
    name: 'Eva Svobodová',
    email: 'eva@kabel.cz',
    role: 'Zaměstnanec',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=EvaSvobodova',
    isActive: true,
    department: '10000'
  }
];

export const MOCK_JOBS: Job[] = [
  { id: 'job-10000', code: '10000', name: '10000 - Kancelář & administrativa', isActive: true },
  { id: 'job-10001', code: '10001', name: '10001 - Výroba & montáž kabelů', isActive: true },
  { id: 'job-kab-01', code: 'KAB-2026-01', name: 'Kabelové svazky pro automotive', isActive: true },
  { id: 'job-kab-02', code: 'KAB-2026-02', name: 'Průmyslová kabeláž výrobní haly B', isActive: true },
  { id: 'job-kab-03', code: 'KAB-2026-03', name: 'Zkoušky a kompletace optických kabelů', isActive: true },
  { id: 'job-kab-04', code: 'KAB-SRV', name: 'Servisní a revizní výjezdy', isActive: true }
];

const generateKabelSampleEntries = (): TimeEntry[] => {
  const entries: TimeEntry[] = [];
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const currentDay = Math.min(now.getDate(), 20);

  // Vzorková data pro Jana Procházku v aktuálním měsíci
  for (let d = 1; d <= currentDay; d++) {
    const dObj = new Date(year, month, d);
    const dayOfWeek = dObj.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // vynechat víkendy

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    if (d === 3) {
      // Den s kombinací práce a lékaře
      entries.push({
        id: `mock-${d}-1`,
        employeeId: 'kabel-emp-1',
        date: dateStr,
        project: 'job-kab-01',
        description: 'Montáž kabelových svazků',
        hours: 6,
        type: WorkType.REGULAR,
        startTime: '06:30',
        endTime: '13:00',
        breakMinutes: 30,
        lunchTime: '11:00 – 11:30'
      });
      entries.push({
        id: `mock-${d}-2`,
        employeeId: 'kabel-emp-1',
        date: dateStr,
        project: '',
        description: 'Pravidelná lékařská prohlídka',
        hours: 2,
        type: WorkType.DOCTOR,
        startTime: '13:00',
        endTime: '15:00',
        breakMinutes: 0
      });
    } else if (d === 8) {
      // Den s přesčasem na druhé zakázce
      entries.push({
        id: `mock-${d}-1`,
        employeeId: 'kabel-emp-1',
        date: dateStr,
        project: 'job-kab-01',
        description: 'Standardní výrobní směna',
        hours: 8,
        type: WorkType.REGULAR,
        startTime: '06:30',
        endTime: '15:00',
        breakMinutes: 30,
        lunchTime: '11:00 – 11:30'
      });
      entries.push({
        id: `mock-${d}-2`,
        employeeId: 'kabel-emp-1',
        date: dateStr,
        project: 'job-kab-02',
        description: 'Naléhavé dopojení kabelových tras - přesčas',
        hours: 2,
        type: WorkType.OVERTIME,
        startTime: '15:00',
        endTime: '17:00',
        breakMinutes: 0
      });
    } else {
      // Standardní 8h směna
      entries.push({
        id: `mock-${d}`,
        employeeId: 'kabel-emp-1',
        date: dateStr,
        project: d % 2 === 0 ? 'job-kab-01' : 'job-10001',
        description: 'Příprava vodičů a krimpování konektorů',
        hours: 8,
        type: WorkType.REGULAR,
        startTime: '06:30',
        endTime: '15:00',
        breakMinutes: 30,
        lunchTime: '11:00 – 11:30'
      });
    }
  }

  // Několik záznamů i pro Martina Dvořáka
  for (let d = 1; d <= Math.min(currentDay, 10); d++) {
    const dObj = new Date(year, month, d);
    if (dObj.getDay() === 0 || dObj.getDay() === 6) continue;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    entries.push({
      id: `mock-martin-${d}`,
      employeeId: 'kabel-emp-2',
      date: dateStr,
      project: 'job-kab-02',
      description: 'Zatahování silových kabelů do žlabů',
      hours: 8,
      type: WorkType.REGULAR,
      startTime: '06:30',
      endTime: '15:00',
      breakMinutes: 30,
      lunchTime: '11:00 – 11:30'
    });
  }

  return entries;
};

export const MOCK_ENTRIES: TimeEntry[] = generateKabelSampleEntries();
