import { createClient } from '@supabase/supabase-js';
import { Employee, Job, TimeEntry, MonthStatus, TimesheetStatus, Notification } from '../types';
import { CREDENTIALS } from '../credentials';

const supabase = CREDENTIALS.SUPABASE_URL && CREDENTIALS.SUPABASE_KEY 
    ? createClient(CREDENTIALS.SUPABASE_URL, CREDENTIALS.SUPABASE_KEY)
    : null;

// --- MAPPERS (Zajišťují, že frontend vidí camelCase a DB vidí snake_case) ---
const mapToDbEntry = (e: TimeEntry) => ({
    id: e.id,
    employee_id: e.employeeId,
    date: e.date,
    project: e.project,
    description: e.description,
    hours: e.hours,
    type: e.type,
    attachment_url: e.attachmentUrl
});

const mapFromDbEntry = (row: any): TimeEntry => ({
    id: row.id,
    employeeId: row.employee_id || row.employeeId,
    date: row.date,
    project: row.project,
    description: row.description,
    hours: parseFloat(row.hours),
    type: row.type,
    attachmentUrl: row.attachment_url || row.attachmentUrl
});

// --- EXPORTY FUNKCÍ ---

export const fetchEmployees = async (): Promise<Employee[]> => {
    if (!supabase) throw new Error("Supabase není připojen.");
    const { data, error } = await supabase.from('employees').select('*').order('name');
    if (error) throw error;
    return (data || []).map(row => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        avatar: row.avatar,
        isActive: row.is_active ?? true,
        pinCode: row.pin_code
    }));
};

export const fetchTimeEntries = async (): Promise<TimeEntry[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('time_entries').select('*');
    if (error) throw error;
    return (data || []).map(mapFromDbEntry);
};

export const addTimeEntriesBulk = async (entries: TimeEntry[]) => {
    if (!supabase) throw new Error("DB není připojena");
    const { error } = await supabase.from('time_entries').insert(entries.map(mapToDbEntry));
    if (error) throw error;
};

export const deleteTimeEntriesForDate = async (employeeId: string, date: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('time_entries').delete().match({ employee_id: employeeId, date: date });
    if (error) throw error;
};

export const fetchJobs = async (): Promise<Job[]> => {
    if (!supabase) return [];
    const { data } = await supabase.from('jobs').select('*').eq('is_active', true);
    return data || [];
};

export const fetchMonthlyReports = async (month: string): Promise<MonthStatus[]> => {
    if (!supabase) return [];
    const { data } = await supabase.from('monthly_reports').select('*').eq('month', month);
    return (data || []).map(row => ({
        employeeId: row.employee_id,
        month: row.month,
        status: row.status as TimesheetStatus,
        managerComment: row.manager_comment
    }));
};

export const upsertMonthlyReport = async (report: MonthStatus) => {
    if (!supabase) return;
    const { error } = await supabase.from('monthly_reports').upsert({
        employee_id: report.employeeId,
        month: report.month,
        status: report.status,
        manager_comment: report.managerComment
    });
    if (error) throw error;
};

export const fetchGlobalLock = async (month: string): Promise<boolean> => {
    if (!supabase) return false;
    const { data } = await supabase.from('global_locks').select('is_locked').eq('month', month).single();
    return data?.is_locked || false;
};

// --- CHYBĚJÍCÍ FUNKCE PRO ADMIN PANEL ---

export const toggleGlobalLock = async (month: string, isLocked: boolean, userId: string) => {
    if (!supabase) return;
    await supabase.from('global_locks').upsert({ month, is_locked: isLocked, locked_by: userId });
};

export const createGlobalNotification = async (userIds: string[], message: string, type: string) => {
    if (!supabase) return;
    const notes = userIds.map(id => ({ user_id: id, message, type, is_read: false }));
    await supabase.from('notifications').insert(notes);
};

export const createNotification = async (userId: string, message: string, type: string, senderId?: string) => {
    if (!supabase) return;
    await supabase.from('notifications').insert({ user_id: userId, message, type, sender_id: senderId, is_read: false });
};

export const fetchNotifications = async (userId: string): Promise<Notification[]> => {
    if (!supabase) return [];
    const { data } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    return (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        type: row.type,
        message: row.message,
        isRead: row.is_read,
        createdAt: row.created_at
    }));
};

export const markNotificationAsRead = async (id: string) => {
    if (supabase) await supabase.from('notifications').update({ is_read: true }).eq('id', id);
};

export const markAllNotificationsAsRead = async (userId: string) => {
    if (supabase) await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
};

export const subscribeToPresence = (userId: string, onSync: (ids: string[]) => void) => {
    if (!supabase) return { unsubscribe: () => {} };
    const channel = supabase.channel('online-users', { config: { presence: { key: userId } } });
    channel.on('presence', { event: 'sync' }, () => {
        onSync(Object.keys(channel.presenceState()));
    }).subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await channel.track({ online_at: new Date().toISOString() });
    });
    return channel;
};

export const subscribeToNotifications = (userId: string, onNew: (n: Notification) => void) => {
    if (!supabase) return { unsubscribe: () => {} };
    return supabase.channel(`notif-${userId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, 
        payload => onNew(payload.new as any))
        .subscribe();
};

export const uploadAttachment = async (file: File): Promise<string | null> => {
    if (!supabase) return null;
    const path = `attachments/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('documents').upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from('documents').getPublicUrl(path);
    return data.publicUrl;
};
