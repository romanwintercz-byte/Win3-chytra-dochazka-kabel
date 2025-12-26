
import { createClient } from '@supabase/supabase-js';
import { Employee, Job, TimeEntry, MonthStatus, TimesheetStatus, Notification } from '../types';
import { CREDENTIALS } from '../credentials';

// Funkce pro bezpečné vytvoření klienta
const getSupabaseClient = () => {
    if (!CREDENTIALS.SUPABASE_URL || !CREDENTIALS.SUPABASE_KEY) {
        console.error("Supabase credentials are missing! Please set VITE_SUPABASE_URL and VITE_SUPABASE_KEY in environment variables.");
        // Vrátíme null, aby aplikace nespadla při startu
        return null;
    }
    return createClient(CREDENTIALS.SUPABASE_URL, CREDENTIALS.SUPABASE_KEY);
};

const supabase = getSupabaseClient();

export const fetchEmployees = async (): Promise<Employee[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('employees').select('*').order('name');
    if (error) throw error;
    return data || [];
};

export const addEmployee = async (employee: Employee) => {
    if (!supabase) return;
    const { error } = await supabase.from('employees').insert([employee]);
    if (error) throw error;
};

export const updateEmployee = async (employee: Employee) => {
    if (!supabase) return;
    const { error } = await supabase.from('employees').update(employee).eq('id', employee.id);
    if (error) throw error;
};

export const updateEmployeeStatus = async (id: string, isActive: boolean) => {
    if (!supabase) return;
    const { error } = await supabase.from('employees').update({ isActive }).eq('id', id);
    if (error) throw error;
};

export const fetchJobs = async (): Promise<Job[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('jobs').select('*').order('code');
    if (error) throw error;
    return data || [];
};

export const addJob = async (job: Job) => {
    if (!supabase) return;
    const { error } = await supabase.from('jobs').insert([job]);
    if (error) throw error;
};

export const updateJobStatus = async (id: string, isActive: boolean) => {
    if (!supabase) return;
    const { error } = await supabase.from('jobs').update({ isActive }).eq('id', id);
    if (error) throw error;
};

export const fetchTimeEntries = async (): Promise<TimeEntry[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('time_entries').select('*');
    if (error) throw error;
    return data || [];
};

export const addTimeEntriesBulk = async (newEntries: TimeEntry[]) => {
    if (!supabase) return;
    const { error } = await supabase.from('time_entries').insert(newEntries);
    if (error) throw error;
};

export const deleteTimeEntriesForDate = async (employeeId: string, date: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('time_entries').delete().eq('employeeId', employeeId).eq('date', date);
    if (error) throw error;
};

export const deleteTimeEntry = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('time_entries').delete().eq('id', id);
    if (error) throw error;
};

export const fetchMonthlyReports = async (month: string): Promise<MonthStatus[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('monthly_reports').select('*').eq('month', month);
    if (error) throw error;
    return data || [];
};

export const upsertMonthlyReport = async (report: MonthStatus) => {
    if (!supabase) return;
    const { error } = await supabase.from('monthly_reports').upsert(report, { onConflict: 'employeeId,month' });
    if (error) throw error;
};

export const fetchGlobalLock = async (month: string): Promise<boolean> => {
    if (!supabase) return false;
    const { data, error } = await supabase.from('global_locks').select('isLocked').eq('month', month).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data?.isLocked || false;
};

export const toggleGlobalLock = async (month: string, isLocked: boolean, managerId: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('global_locks').upsert({ month, isLocked, updatedAt: new Date().toISOString(), updatedBy: managerId });
    if (error) throw error;
};

export const fetchNotifications = async (userId: string): Promise<Notification[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('notifications').select('*').eq('userId', userId).order('createdAt', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const createNotification = async (userId: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', senderId?: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('notifications').insert([{ userId, message, type, senderId, isRead: false, createdAt: new Date().toISOString() }]);
    if (error) throw error;
};

export const createGlobalNotification = async (userIds: string[], message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    if (!supabase) return;
    const notifs = userIds.map(uid => ({ userId: uid, message, type, isRead: false, createdAt: new Date().toISOString() }));
    const { error } = await supabase.from('notifications').insert(notifs);
    if (error) throw error;
};

export const markNotificationAsRead = async (id: string) => {
    if (!supabase) return;
    await supabase.from('notifications').update({ isRead: true }).eq('id', id);
};

export const markAllNotificationsAsRead = async (userId: string) => {
    if (!supabase) return;
    await supabase.from('notifications').update({ isRead: true }).eq('userId', userId);
};

export const subscribeToPresence = (userId: string, onSync: (ids: string[]) => void) => {
    if (!supabase) return { unsubscribe: () => {} } as any;
    const channel = supabase.channel('online-users', { config: { presence: { key: userId } } });
    channel
        .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const ids = Object.keys(state);
            onSync(ids);
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({ online_at: new Date().toISOString() });
            }
        });
    return channel;
};

export const subscribeToNotifications = (userId: string, onNewNotification: (n: Notification) => void) => {
    if (!supabase) return { unsubscribe: () => {} } as any;
    return supabase
        .channel(`public:notifications:userId=eq.${userId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `userId=eq.${userId}` }, (payload) => {
            onNewNotification(payload.new as Notification);
        })
        .subscribe();
};

export const uploadAttachment = async (file: File): Promise<string | null> => {
    if (!supabase) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `attachments/${fileName}`;

    const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('documents').getPublicUrl(filePath);
    return data.publicUrl;
};

export const resetDemoData = () => {
    console.warn("Reset demo dat není v produkční verzi dostupný.");
};
