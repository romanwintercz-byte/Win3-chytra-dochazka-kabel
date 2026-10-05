import { Employee, Job, TimeEntry } from '../types';

/**
 * VÝCHOZÍ STRUKTURA PRO FIRMU KABEL
 * 
 * Všechna původní fiktivní demo data (Lucie, Jan, Martin, Eva) byla odstraněna.
 * Jako hlavní administrátor se všemi právy je nastaven:
 * Win3 Support (Role: Manager / Administrátor)
 */

export const ADMIN_USER_ID = 'emp-win3-admin';

export const isRootAdmin = (emp?: { id?: string; email?: string; name?: string } | null): boolean => {
  if (!emp) return false;
  if (emp.id === ADMIN_USER_ID) return true;
  if (emp.email && emp.email.toLowerCase() === 'roman.winter.cz@gmail.com') return true;
  if (emp.name && emp.name.toLowerCase().includes('win3')) return true;
  return false;
};

export const ADMIN_EMPLOYEE: Employee = {
  id: ADMIN_USER_ID,
  name: 'Win3 Support',
  email: 'Roman.Winter.cz@gmail.com',
  role: 'Manager',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Win3Support',
  isActive: true,
  department: '101'
};

export const MOCK_EMPLOYEES: Employee[] = [
  ADMIN_EMPLOYEE
];

export const DEFAULT_DEPARTMENTS: Job[] = [
  { id: 'job-101', code: '101', name: '101 - správa', isActive: true },
  { id: 'job-102', code: '102', name: '102 - výroba', isActive: true },
  { id: 'job-103', code: '103', name: '103 - dělníci', isActive: true }
];

export const MOCK_JOBS: Job[] = [
  ...DEFAULT_DEPARTMENTS,
  { id: 'job-kab-01', code: 'KAB-2026-01', name: 'Kabelové svazky pro automotive', isActive: true },
  { id: 'job-kab-02', code: 'KAB-2026-02', name: 'Průmyslová kabeláž výrobní haly B', isActive: true },
  { id: 'job-kab-03', code: 'KAB-2026-03', name: 'Zkoušky a kompletace optických kabelů', isActive: true },
  { id: 'job-kab-04', code: 'KAB-SRV', name: 'Servisní a revizní výjezdy', isActive: true }
];

// Žádné fiktivní docházkové záznamy - čistá databáze
export const MOCK_ENTRIES: TimeEntry[] = [];
