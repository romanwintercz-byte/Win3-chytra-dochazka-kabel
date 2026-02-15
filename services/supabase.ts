
import { createClient } from '@supabase/supabase-js';
import { Employee, Job, TimeEntry, MonthStatus, TimesheetStatus, Notification } from '../types';
import { CREDENTIALS } from '../credentials';

const getSupabaseClient = () => {
    if (!CREDENTIALS.SUPABASE_URL || !CREDENTIALS.SUPABASE_KEY) return null;
    try {
        return createClient(CREDENTIALS.SUPABASE_URL, CREDENTIALS.SUPABASE_KEY, {
            auth: { persistSession: false }
        });
    } catch (e) {
        console.error("Supabase init error:", e);
        return null;
    }
};

const supabase = getSupabaseClient();

// Helper pro formátování chyb
const formatError = (error: any, context: string) => {
    return `${context}: [${error.code || 'NO_CODE'}] ${error.message || 'Unknown error'}`;
};

// --- MAPPERS ---
const mapEmployee = (row: any): Employee => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatar: row.avatar,
    isActive: row.is_active ?? row.isActive ?? true,
    pinCode: row.pin_code ?? row.pinCode
});

const mapTimeEntry = (row: any): TimeEntry => ({
    id: row.id,
    employeeId: row.employee_id ?? row.employeeId,
    date: row.date,
    project: row.project,
    description: row.description,
    hours: parseFloat(row.hours),
    type: row.type,
    attachmentUrl: row.attachment_url ?? row.attachmentUrl
});

// --- API FUNCTIONS ---

export const fetchEmployees = async (): Promise<Employee[]> => {
    if (!supabase) throw new Error("Supabase není nakonfigurován.");
    const { data, error } = await supabase.from('employees').select('*').order('name');
    if (error) throw new Error(formatError(error, "Načítání zaměstnanců"));
    return (data || []).map(mapEmployee);
};

export const fetchTimeEntries = async (): Promise<TimeEntry[]> => {
    if (!supabase) throw new Error("Supabase není nakonfigurován.");
    const { data, error } = await supabase.from('time_entries').select('*');
    if (error) throw new Error(formatError(error, "Načítání docházky"));
    return (data || []).map(mapTimeEntry);
};

export const addTimeEntriesBulk = async (entries: TimeEntry[]) => {
    if (!supabase) throw new Error("Supabase není nakonfigurován.");
    const rows = entries.map(e => ({
        id: e.id,
        employee_id: e.employeeId,
        date: e.date,
        project: e.project,
        description: e.description,
        hours: e.hours,
        type: e.type,
        attachment_url: e.attachmentUrl
    }));
    const { error } = await supabase.from('time_entries').insert(rows);
    if (error) throw new Error(formatError(error, "Zápis docházky"));
};

export const deleteTimeEntriesForDate = async (employeeId: string, date: string) => {
    if (!supabase) throw new Error("Supabase není nakonfigurován.");
    const { error } = await supabase.from('time_entries').delete().match({ employee_id: employeeId, date: date });
    if (error) throw new Error(formatError(error, "Mazání dne"));
};

export const fetchJobs = async (): Promise<Job[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('jobs').select('*').order('code');
    if (error) return [];
    return (data || []).map(row => ({
        id: row.id,
        code: row.code,
        name: row.name,
        isActive: row.is_active ?? row.isActive ?? true
    }));
};

export const fetchMonthlyReports = async (month: string): Promise<MonthStatus[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('monthly_reports').select('*').eq('month', month);
    if (error) return [];
    return (data || []).map(row => ({
        employeeId: row.employee_id,
        month: row.month,
        status: row.status as TimesheetStatus
    }));
};

export const upsertMonthlyReport = async (report: MonthStatus) => {
    if (!supabase) throw new Error("Supabase není nakonfigurován.");
    const { error } = await supabase.from('monthly_reports').upsert({
        employee_id: report.employeeId,
        month: report.month,
        status: report.status
    });
    if (error) throw new Error(formatError(error, "Změna stavu měsíce"));
};

export const fetchGlobalLock = async (month: string): Promise<boolean> => {
    if (!supabase) return false;
    const { data, error } = await supabase.from('global_locks').select('is_locked').eq('month', month).single();
    if (error) return false;
    return data?.is_locked || false;
};

// Fix: Implementation of toggleGlobalLock
export const toggleGlobalLock = async (month: string, isLocked: boolean, userId: string) => {
    if (!supabase) throw new Error("Supabase není nakonfigurován.");
    const { error } = await supabase.from('global_locks').upsert({
        month,
        is_locked: isLocked,
        locked_by: userId,
        updated_at: new Date().toISOString()
    }, { onConflict: 'month' });
    if (error) throw new Error(formatError(error, "Změna globálního zámku"));
};

export const fetchNotifications = async (userId: string): Promise<Notification[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map(n => ({
        id: n.id,
        userId: n.user_id,
        senderId: n.sender_id,
        type: n.type,
        message: n.message,
        isRead: n.is_read,
        createdAt: n.created_at
    }));
};

// Fix: Implementation of createNotification
export const createNotification = async (userId: string, message: string, type: string, senderId?: string) => {
    if (!supabase) throw new Error("Supabase není nakonfigurován.");
    const { error } = await supabase.from('notifications').insert({
        user_id: userId,
        sender_id: senderId,
        message,
        type,
        is_read: false,
        created_at: new Date().toISOString()
    });
    if (error) throw new Error(formatError(error, "Vytvoření oznámení"));
};

// Fix: Implementation of createGlobalNotification
export const createGlobalNotification = async (userIds: string[], message: string, type: string) => {
    if (!supabase) throw new Error("Supabase není nakonfigurován.");
    const rows = userIds.map(uid => ({
        user_id: uid,
        message,
        type,
        is_read: false,
        created_at: new Date().toISOString()
    }));
    const { error } = await supabase.from('notifications').insert(rows);
    if (error) throw new Error(formatError(error, "Vytvoření hromadného oznámení"));
};

export const markNotificationAsRead = async (id: string) => {
    if (supabase) await supabase.from('notifications').update({ is_read: true }).eq('id', id);
};

export const markAllNotificationsAsRead = async (userId: string) => {
    if (supabase) await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
};

export const subscribeToPresence = (userId: string, onSync: (ids: string[]) => void) => {
    if (!supabase) return { unsubscribe: () => {} } as any;
    const channel = supabase.channel('online-users', { config: { presence: { key: userId } } });
    channel
        .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            onSync(Object.keys(state));
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') await channel.track({ online_at: new Date().toISOString() });
        });
    return channel;
};

export const subscribeToNotifications = (userId: string, onNew: (n: Notification) => void) => {
    if (!supabase) return { unsubscribe: () => {} } as any;
    return supabase
        .channel(`notifications-${userId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
            const n = payload.new as any;
            onNew({ id: n.id, userId: n.user_id, type: n.type, message: n.message, isRead: n.is_read, createdAt: n.created_at });
        })
        .subscribe();
};

export const uploadAttachment = async (file: File): Promise<string | null> => {
    if (!supabase) return null;
    const fileName = `${Math.random().toString(36).substring(2)}.${file.name.split('.').pop()}`;
    const { error: uploadError } = await supabase.storage.from('documents').upload(`attachments/${fileName}`, file);
    if (uploadError) throw new Error(formatError(uploadError, "Nahrávání souboru"));
    const { data } = supabase.storage.from('documents').getPublicUrl(`attachments/${fileName}`);
    return data.publicUrl;
};
