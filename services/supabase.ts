import { createClient } from '@supabase/supabase-js';
import { Employee, Job, TimeEntry, MonthStatus, TimesheetStatus, Notification } from '../types';
import { CREDENTIALS } from '../credentials';

const getSupabaseClient = () => {
    if (!CREDENTIALS.SUPABASE_URL || !CREDENTIALS.SUPABASE_KEY) return null;
    try {
        return createClient(CREDENTIALS.SUPABASE_URL, CREDENTIALS.SUPABASE_KEY);
    } catch (e) {
        console.error("Supabase client init error:", e);
        return null;
    }
};

const supabase = getSupabaseClient();

// --- MAPPERS (Snake case to Camel case and back) ---

const mapEmployee = (row: any): Employee => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatar: row.avatar,
    isActive: row.is_active ?? row.isActive ?? true,
    pinCode: row.pin_code ?? row.pinCode
});

const mapJob = (row: any): Job => ({
    id: row.id,
    code: row.code,
    name: row.name,
    isActive: row.is_active ?? row.isActive ?? true
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

const mapReport = (row: any): MonthStatus => ({
    employeeId: row.employee_id ?? row.employeeId,
    month: row.month,
    status: row.status,
    managerComment: row.manager_comment ?? row.managerComment,
    submittedAt: row.submitted_at ?? row.submittedAt,
    approvedAt: row.approved_at ?? row.approvedAt
});

// --- API FUNCTIONS ---

export const fetchEmployees = async (): Promise<Employee[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('employees').select('*').order('name');
    if (error) {
        console.error("Supabase error (employees):", error);
        throw error;
    }
    return (data || []).map(mapEmployee);
};

export const addEmployee = async (emp: Employee) => {
    if (!supabase) return;
    const { error } = await supabase.from('employees').insert([{
        id: emp.id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        avatar: emp.avatar,
        is_active: emp.isActive,
        pin_code: emp.pinCode
    }]);
    if (error) throw error;
};

export const updateEmployee = async (emp: Employee) => {
    if (!supabase) return;
    const { error } = await supabase.from('employees').update({
        name: emp.name,
        email: emp.email,
        role: emp.role,
        avatar: emp.avatar,
        is_active: emp.isActive,
        pin_code: emp.pinCode
    }).eq('id', emp.id);
    if (error) throw error;
};

export const updateEmployeeStatus = async (id: string, isActive: boolean) => {
    if (!supabase) return;
    const { error } = await supabase.from('employees').update({ is_active: isActive }).eq('id', id);
    if (error) throw error;
};

export const fetchJobs = async (): Promise<Job[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('jobs').select('*').order('code');
    if (error) throw error;
    return (data || []).map(mapJob);
};

export const addJob = async (job: Job) => {
    if (!supabase) return;
    const { error } = await supabase.from('jobs').insert([{
        id: job.id,
        code: job.code,
        name: job.name,
        is_active: job.isActive
    }]);
    if (error) throw error;
};

export const updateJobStatus = async (id: string, isActive: boolean) => {
    if (!supabase) return;
    const { error } = await supabase.from('jobs').update({ is_active: isActive }).eq('id', id);
    if (error) throw error;
};

export const fetchTimeEntries = async (): Promise<TimeEntry[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('time_entries').select('*');
    if (error) {
        console.error("Supabase error (entries):", error);
        throw error;
    }
    return (data || []).map(mapTimeEntry);
};

export const addTimeEntriesBulk = async (entries: TimeEntry[]) => {
    if (!supabase) return;
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
    if (error) throw error;
};

export const deleteTimeEntriesForDate = async (employeeId: string, date: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('time_entries').delete().match({ employee_id: employeeId, date: date });
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
    return (data || []).map(mapReport);
};

export const upsertMonthlyReport = async (report: MonthStatus) => {
    if (!supabase) return;
    const row = {
        employee_id: report.employeeId,
        month: report.month,
        status: report.status,
        manager_comment: report.managerComment,
        submitted_at: report.submittedAt,
        approved_at: report.approvedAt
    };
    const { error } = await supabase.from('monthly_reports').upsert(row, { onConflict: 'employee_id,month' });
    if (error) throw error;
};

export const fetchGlobalLock = async (month: string): Promise<boolean> => {
    if (!supabase) return false;
    try {
        const { data, error } = await supabase.from('global_locks').select('is_locked').eq('month', month).single();
        if (error && error.code !== 'PGRST116') return false;
        return data?.is_locked || data?.isLocked || false;
    } catch (e) { return false; }
};

export const toggleGlobalLock = async (month: string, isLocked: boolean, managerId: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('global_locks').upsert({ 
        month, 
        is_locked: isLocked, 
        updated_at: new Date().toISOString(), 
        updated_by: managerId 
    }, { onConflict: 'month' });
    if (error) throw error;
};

export const fetchNotifications = async (userId: string): Promise<Notification[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(n => ({
        id: n.id,
        userId: n.user_id,
        senderId: n.sender_id,
        type: n.type,
        message: n.message,
        isRead: n.is_read ?? n.isRead,
        createdAt: n.created_at ?? n.createdAt
    }));
};

export const createNotification = async (userId: string, message: string, type: string = 'info', senderId?: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('notifications').insert([{ 
        user_id: userId, 
        message, 
        type, 
        sender_id: senderId, 
        is_read: false, 
        created_at: new Date().toISOString() 
    }]);
    if (error) throw error;
};

export const createGlobalNotification = async (userIds: string[], message: string, type: string = 'info', senderId?: string) => {
    if (!supabase || userIds.length === 0) return;
    const rows = userIds.map(userId => ({
        user_id: userId,
        message,
        type,
        sender_id: senderId,
        is_read: false,
        created_at: new Date().toISOString()
    }));
    const { error } = await supabase.from('notifications').insert(rows);
    if (error) throw error;
};

export const markNotificationAsRead = async (id: string) => {
    if (!supabase) return;
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
};

export const markAllNotificationsAsRead = async (userId: string) => {
    if (!supabase) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
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
        .channel(`notifications-${userId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
            const n = payload.new as any;
            onNewNotification({
                id: n.id,
                userId: n.user_id,
                senderId: n.sender_id,
                type: n.type,
                message: n.message,
                isRead: n.is_read,
                createdAt: n.created_at
            });
        })
        .subscribe();
};

export const uploadAttachment = async (file: File): Promise<string | null> => {
    if (!supabase) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `attachments/${fileName}`;

    const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('documents').getPublicUrl(filePath);
    return data.publicUrl;
};

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}