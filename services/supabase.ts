
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Employee, Job, TimeEntry, MonthStatus, TimesheetStatus, Notification } from '../types';
import { CREDENTIALS } from '../credentials';

// --- STANDARD PRODUCTION CLIENT ---

let client: SupabaseClient;

if (!CREDENTIALS.SUPABASE_URL || !CREDENTIALS.SUPABASE_KEY) {
    console.error("CRITICAL ERROR: Supabase URL or Key is missing in Environment Variables!");
    // Fallback to prevent immediate crash, but calls will fail
    client = createClient('https://placeholder.supabase.co', 'placeholder');
} else {
    client = createClient(CREDENTIALS.SUPABASE_URL, CREDENTIALS.SUPABASE_KEY, {
        auth: { persistSession: false }, 
        realtime: { params: { eventsPerSecond: 10 } }
    });
}

export const supabase = client;

// --- API Functions (Pure Supabase) ---

export const fetchEmployees = async (): Promise<Employee[]> => {
  const { data, error } = await supabase.from('employees').select('*').order('name'); 
  if (error) throw error;
  return data.map((e: any) => ({ ...e, isActive: e.is_active !== false, pinCode: e.pin_code })) as Employee[];
};

export const addEmployee = async (employee: Employee) => {
  const { error } = await supabase.from('employees').insert({ id: employee.id, name: employee.name, email: employee.email, role: employee.role, avatar: employee.avatar, is_active: true });
  if (error) throw error;
};

export const updateEmployee = async (employee: Employee) => {
  const { error } = await supabase.from('employees').update({ name: employee.name, email: employee.email, role: employee.role }).eq('id', employee.id);
  if (error) throw error;
};

export const updateEmployeeStatus = async (id: string, isActive: boolean) => {
  const { error } = await supabase.from('employees').update({ is_active: isActive }).eq('id', id);
  if (error) throw error;
};

export const updateEmployeePin = async (id: string, pin: string | null) => {
    const { error } = await supabase.from('employees').update({ pin_code: pin }).eq('id', id);
    if (error) throw error;
};

export const fetchJobs = async (): Promise<Job[]> => {
  const { data, error } = await supabase.from('jobs').select('*').order('code');
  if (error) throw error;
  return data.map((j: any) => ({ id: j.id, code: j.code, name: j.name, isActive: j.is_active })) as Job[];
};

export const addJob = async (job: Job) => {
  const { error } = await supabase.from('jobs').insert({ id: job.id, code: job.code, name: job.name, is_active: job.isActive });
  if (error) throw error;
};

export const updateJobStatus = async (id: string, isActive: boolean) => {
    const { error } = await supabase.from('jobs').update({ is_active: isActive }).eq('id', id);
    if (error) throw error;
};

export const fetchTimeEntries = async (): Promise<TimeEntry[]> => {
  const { data, error } = await supabase.from('time_entries').select('*').order('date', { ascending: false });
  if (error) throw error;
  return data.map((e: any) => ({ id: e.id, employeeId: e.employee_id, date: e.date, project: e.project, description: e.description, hours: e.hours, type: e.type, attachmentUrl: e.attachment_url })) as TimeEntry[];
};

export const addTimeEntriesBulk = async (entries: TimeEntry[]) => {
    const dbEntries = entries.map(entry => ({ id: entry.id, employee_id: entry.employeeId, date: entry.date, project: entry.project, description: entry.description, hours: entry.hours, type: entry.type, attachment_url: entry.attachmentUrl }));
    const { error } = await supabase.from('time_entries').insert(dbEntries);
    if (error) throw error;
};

export const deleteTimeEntriesForDate = async (employeeId: string, date: string) => {
    const { error } = await supabase.from('time_entries').delete().eq('employee_id', employeeId).eq('date', date);
    if (error) throw error;
};

export const deleteTimeEntry = async (id: string) => {
    const { error } = await supabase.from('time_entries').delete().eq('id', id);
    if (error) throw error;
};

export const fetchMonthlyReports = async (month: string): Promise<MonthStatus[]> => {
    const { data, error } = await supabase.from('monthly_reports').select('*').eq('month', month);
    if (error) return [];
    return (data || []).map((r: any) => ({ employeeId: r.employee_id, month: r.month, status: r.status as TimesheetStatus, managerComment: r.manager_comment, updatedAt: r.updated_at }));
};

export const upsertMonthlyReport = async (report: MonthStatus) => {
    const { error } = await supabase.from('monthly_reports').upsert({ employee_id: report.employeeId, month: report.month, status: report.status, manager_comment: report.managerComment, updated_at: new Date().toISOString() }, { onConflict: 'employee_id, month' });
    if (error) throw error;
};

export const fetchGlobalLock = async (month: string): Promise<boolean> => {
    const { data, error } = await supabase.from('global_locks').select('is_locked').eq('month', month).single();
    if (error || !data) return false;
    return data.is_locked;
};

export const toggleGlobalLock = async (month: string, isLocked: boolean, managerId: string) => {
    const { error } = await supabase.from('global_locks').upsert({ month: month, is_locked: isLocked, locked_by: managerId, locked_at: new Date().toISOString() });
    if (error) throw error;
};

export const fetchNotifications = async (userId: string): Promise<Notification[]> => {
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map((n: any) => ({ id: n.id, userId: n.user_id, senderId: n.sender_id, type: n.type, message: n.message, isRead: n.is_read, createdAt: n.created_at }));
};

export const createNotification = async (userId: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', senderId?: string) => {
    const payload: any = { user_id: userId, message: message, type: type, is_read: false };
    if (senderId) payload.sender_id = senderId;
    const { error } = await supabase.from('notifications').insert(payload);
    if (error) console.error("Create Notification Error:", error.message);
};

export const createGlobalNotification = async (userIds: string[], message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const notifications = userIds.map(id => ({ user_id: id, message: message, type: type, is_read: false }));
    const { error } = await supabase.from('notifications').insert(notifications);
    if (error) console.error("Global Notification Error:", error.message);
};

export const markNotificationAsRead = async (id: string) => {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) console.error("Mark Read Error:", error.message);
};

export const markAllNotificationsAsRead = async (userId: string) => {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
    if (error) console.error("Mark All Read Error:", error.message);
};

export const subscribeToPresence = (userId: string, onSync: (onlineUserIds: string[]) => void) => {
    const channel = supabase.channel('online-users');
    channel
        .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const ids = Object.keys(state);
            onSync(ids);
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({ user: userId, online_at: new Date().toISOString() });
            }
        });
        
    return { 
        unsubscribe: () => {
            supabase.removeChannel(channel);
        }
    };
};

export const subscribeToNotifications = (userId: string, onNewNotification: (n: Notification) => void) => {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
            const n = payload.new as any;
            onNewNotification({ id: n.id, userId: n.user_id, senderId: n.sender_id, type: n.type, message: n.message, isRead: n.is_read, createdAt: n.created_at });
        }
      )
      .subscribe();

    return { 
        unsubscribe: () => {
            supabase.removeChannel(channel);
        }
    };
};

export const uploadAttachment = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, file);

    if (uploadError) {
        console.error('Error uploading file:', uploadError);
        return null;
    }

    const { data } = supabase.storage.from('attachments').getPublicUrl(filePath);
    return data.publicUrl;
};
