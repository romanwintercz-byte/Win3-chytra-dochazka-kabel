import { Employee, Job, TimeEntry } from '../types';

/**
 * VÝCHOZÍ STRUKTURA PRO FIRMU KABEL
 * 
 * Všechna původní fiktivní demo data byla odstraněna.
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
  customRoleId: 'role-vedeni',
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

// Pouze reálná střediska, žádné fiktivní vymyšlené zakázky
export const MOCK_JOBS: Job[] = [
  ...DEFAULT_DEPARTMENTS
];

// Žádné fiktivní docházkové záznamy - čistá databáze
export const MOCK_ENTRIES: TimeEntry[] = [];
