
import { Employee, Job, TimeEntry, WorkType, TimesheetStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const MOCK_EMPLOYEES: Employee[] = [
    {
        id: 'demo-user-1',
        name: 'Jan Novák',
        email: 'jan.novak@demo.cz',
        role: 'Zaměstnanec',
        avatar: 'https://ui-avatars.com/api/?name=Jan+Novak&background=0D8ABC&color=fff',
        isActive: true
    },
    {
        id: 'demo-user-2',
        name: 'Petr Svoboda (Manažer)',
        email: 'petr.svoboda@demo.cz',
        role: 'Manager',
        avatar: 'https://ui-avatars.com/api/?name=Petr+Svoboda&background=EB4D4B&color=fff',
        isActive: true
    },
    {
        id: 'demo-user-3',
        name: 'Jana Dvořáková',
        email: 'jana.dvorakova@demo.cz',
        role: 'Zaměstnanec',
        avatar: 'https://ui-avatars.com/api/?name=Jana+Dvorakova&background=27AE60&color=fff',
        isActive: true
    }
];

export const MOCK_JOBS: Job[] = [
    { id: 'job-1', code: 'ZAK-2023-001', name: 'Rekonstrukce Kanceláří', isActive: true },
    { id: 'job-2', code: 'ZAK-2023-045', name: 'Výstavba Haly Brno', isActive: true },
    { id: 'job-3', code: 'ZAK-INT-01', name: 'Interní Porady', isActive: true },
    { id: 'job-4', code: 'ZAK-SRV-99', name: 'Servisní Výjezd', isActive: true }
];

// Generate some fake entries for the current month
const generateMockEntries = (): TimeEntry[] => {
    const entries: TimeEntry[] = [];
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    // Generate entries for Jan Novák (User 1)
    for (let i = 1; i <= 15; i++) {
        const d = new Date(year, month, i);
        if (d.getDay() !== 0 && d.getDay() !== 6) { // Skip weekends
            const dateStr = d.toISOString().split('T')[0];
            
            // Morning block
            entries.push({
                id: uuidv4(),
                employeeId: 'demo-user-1',
                date: dateStr,
                project: 'Rekonstrukce Kanceláří',
                description: 'Montáž sádrokartonu',
                hours: 4,
                type: WorkType.REGULAR
            });
            
            // Afternoon block
            entries.push({
                id: uuidv4(),
                employeeId: 'demo-user-1',
                date: dateStr,
                project: 'Rekonstrukce Kanceláří',
                description: 'Tmelení a broušení',
                hours: 4,
                type: WorkType.REGULAR
            });
        }
    }

    // One sick day
    const sickDate = new Date(year, month, 18).toISOString().split('T')[0];
    entries.push({
        id: uuidv4(),
        employeeId: 'demo-user-1',
        date: sickDate,
        project: '',
        description: 'Nevolnost',
        hours: 8,
        type: WorkType.SICK_DAY,
        attachmentUrl: 'https://via.placeholder.com/300x400.png?text=Neschopenka+Demo'
    });

    return entries;
};

export const MOCK_ENTRIES = generateMockEntries();
