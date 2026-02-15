
import { Employee, Job, TimeEntry, WorkType } from '../types';
import { v4 as uuidv4 } from 'uuid';

// 1. ZAMĚSTNANCI PRO DEMO
export const MOCK_EMPLOYEES: Employee[] = [
    {
        id: 'win3-support-id',
        name: 'Win3 Podpora (Vývojář)',
        email: 'vyvoj@win3.cz',
        role: 'Manager',
        avatar: 'https://ui-avatars.com/api/?name=Win3+Support&background=1E1B4B&color=fff&size=128',
        isActive: true,
        pinCode: '0000'
    },
    {
        id: 'manager-1',
        name: 'Ing. Petr Ředitel',
        email: 'petr@stavby-design.cz',
        role: 'Manager',
        avatar: 'https://ui-avatars.com/api/?name=Petr+Reditel&background=0F172A&color=fff&size=128',
        isActive: true
    },
    {
        id: 'worker-1',
        name: 'Karel Dělník',
        email: 'karel@stavby-design.cz',
        role: 'Zaměstnanec',
        avatar: 'https://ui-avatars.com/api/?name=Karel+Delnik&background=EA580C&color=fff&size=128',
        isActive: true,
        pinCode: '1234'
    },
    {
        id: 'worker-2',
        name: 'Jana Administrativa',
        email: 'jana@stavby-design.cz',
        role: 'Zaměstnanec',
        avatar: 'https://ui-avatars.com/api/?name=Jana+Admin&background=4F46E5&color=fff&size=128',
        isActive: true
    }
];

// 2. ZAKÁZKY PRO DEMO
export const MOCK_JOBS: Job[] = [
    { id: 'job-1', code: 'ZAK-2024-01', name: 'Rezidence Parková (Byty)', isActive: true },
    { id: 'job-2', code: 'ZAK-2024-05', name: 'Admin. budova Centrum', isActive: true },
    { id: 'job-3', code: 'INT-001', name: 'Interní / Porady / Dílna', isActive: true },
    { id: 'job-4', code: 'SRV-KLIENT', name: 'Servisní výjezdy', isActive: true }
];

// 3. GENERÁTOR VZOROVÝCH ZÁZNAMŮ
const generateEntries = (): TimeEntry[] => {
    const entries: TimeEntry[] = [];
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    for (let d = 1; d <= 14; d++) {
        const dateObj = new Date(year, month, d);
        if (dateObj.getDay() === 0 || dateObj.getDay() === 6) continue;
        const dateIso = dateObj.toISOString().split('T')[0];

        entries.push({
            id: uuidv4(),
            employeeId: 'worker-1',
            date: dateIso,
            project: 'Rezidence Parková (Byty)',
            description: 'Montáž sádrokartonových příček',
            hours: 8,
            type: WorkType.REGULAR
        });
    }
    return entries;
};

export const MOCK_ENTRIES = generateEntries();
