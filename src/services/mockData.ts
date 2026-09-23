import { Employee, Job, TimeEntry } from '../types';

/**
 * VÝCHOZÍ STRUKTURA PRO FIRMU KABEL
 * 
 * Všechna původní fiktivní demo data (Lucie, Jan, Martin, Eva) byla odstraněna.
 * Jako hlavní administrátor se všemi právy je nastaven:
 * Win3 Support (Role: Manager / Administrátor)
 */

export const ADMIN_USER_ID = 'emp-win3-admin';

export const ADMIN_EMPLOYEE: Employee = {
  id: ADMIN_USER_ID,
  name: 'Win3 Support',
  email: 'Roman.Winter.cz@gmail.com',
  role: 'Manager',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Win3Support',
  isActive: true,
  department: '10000'
};

export const MOCK_EMPLOYEES: Employee[] = [
  ADMIN_EMPLOYEE
];

export const MOCK_JOBS: Job[] = [
  { id: 'job-10000', code: '10000', name: '10000 - Kancelář & administrativa', isActive: true },
  { id: 'job-10001', code: '10001', name: '10001 - Výroba & montáž kabelů', isActive: true },
  { id: 'job-kab-01', code: 'KAB-2026-01', name: 'Kabelové svazky pro automotive', isActive: true },
  { id: 'job-kab-02', code: 'KAB-2026-02', name: 'Průmyslová kabeláž výrobní haly B', isActive: true },
  { id: 'job-kab-03', code: 'KAB-2026-03', name: 'Zkoušky a kompletace optických kabelů', isActive: true },
  { id: 'job-kab-04', code: 'KAB-SRV', name: 'Servisní a revizní výjezdy', isActive: true }
];

// Žádné fiktivní docházkové záznamy - čistá databáze
export const MOCK_ENTRIES: TimeEntry[] = [];
