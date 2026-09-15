
import { Employee, Job, TimeEntry, WorkType } from '../types';

export const MOCK_EMPLOYEES: Employee[] = [
    {
        id: 'manager-1',
        name: 'Ing. Petr Ředitel',
        email: 'petr@stavby-design.cz',
        role: 'Manager',
        avatar: 'https://picsum.photos/seed/manager/128/128',
        isActive: true
    },
    {
        id: 'worker-1',
        name: 'Karel Dělník',
        email: 'karel@stavby-design.cz',
        role: 'Zaměstnanec',
        avatar: 'https://picsum.photos/seed/worker1/128/128',
        isActive: true,
        pinCode: '1234'
    },
    {
        id: 'worker-2',
        name: 'Jana Administrativa',
        email: 'jana@stavby-design.cz',
        role: 'Zaměstnanec',
        avatar: 'https://picsum.photos/seed/worker2/128/128',
        isActive: true
    }
];

export const MOCK_JOBS: Job[] = [
    { id: 'job-1', code: 'ZAK-2024-01', name: 'Rezidence Parková (Byty)', isActive: true },
    { id: 'job-2', code: 'ZAK-2024-05', name: 'Admin. budova Centrum', isActive: true },
    { id: 'job-3', code: 'INT-001', name: 'Interní / Porady / Dílna', isActive: true },
    { id: 'job-4', code: 'SRV-KLIENT', name: 'Servisní výjezdy', isActive: true }
];

export const MOCK_ENTRIES: TimeEntry[] = [
    {
        id: '1',
        employeeId: 'worker-1',
        date: new Date().toISOString().split('T')[0],
        project: 'Rezidence Parková (Byty)',
        description: 'Montáž SDK příček',
        hours: 8,
        type: WorkType.REGULAR
    }
];
