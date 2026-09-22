
import { Employee, Job, TimeEntry, WorkType } from '../types';

export const MOCK_EMPLOYEES: Employee[] = [
    {
        id: 'manager-1',
        name: 'Ing. Petr Ředitel',
        email: 'petr@kabel.cz',
        role: 'Manager',
        department: '10000',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150',
        isActive: true
    },
    {
        id: 'worker-1',
        name: 'Karel Dělník',
        email: 'karel@kabel.cz',
        role: 'Zaměstnanec',
        department: '10000',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150',
        isActive: true,
        pinCode: '1234'
    },
    {
        id: 'worker-2',
        name: 'Jana Administrativa',
        email: 'jana@kabel.cz',
        role: 'Zaměstnanec',
        department: '10001',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150',
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
        type: WorkType.REGULAR,
        startTime: '07:00',
        endTime: '15:30',
        breakMinutes: 30,
        lunchTime: '11:00-11:30'
    }
];
