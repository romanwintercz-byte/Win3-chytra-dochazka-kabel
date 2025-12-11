
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Employee, Job, TimeEntry, MonthStatus, TimesheetStatus, Notification } from '../types';
import { CREDENTIALS } from '../credentials';

// Helper: Prefer localStorage, then real file credentials, ignore placeholders
const getCredential = (fileValue: string | undefined, storageKey: string) => {
    // 1. Try LocalStorage (User manual override)
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(storageKey) : null;
    if (stored) return stored;

    // 2. Try File/Env (only if valid)
    if (fileValue && !fileValue.includes('ZDE_VLOZTE')) {
        return fileValue;
    }

    return null;
};

const supabaseUrl = getCredential(CREDENTIALS.SUPABASE_URL, 'smartwork_supabase_url');
const supabaseKey = getCredential(CREDENTIALS.SUPABASE_KEY, 'smartwork_supabase_key');

let client: SupabaseClient;

// Kontrola konfigurace
const isConfigured = !!supabaseUrl && !!supabaseKey;

if (isConfigured) {
  client = createClient(supabaseUrl!, supabaseKey!, {
      realtime: {
          params: {
              eventsPerSecond: 10,
          },
      },
  });
} else {
  // Dummy client pro případ chyby konfigurace
  const safeDummy: any = {
      select: () => safeDummy,
      insert: () => safeDummy,
      update: () => safeDummy,
      delete: () => safeDummy,
      upsert: () => safeDummy,
      eq: () => safeDummy,
      order: () => safeDummy,
      single: () => safeDummy,
      then: (resolve: any) => resolve({ 
          data: [], 
          error: { message: "Nebyly vyplněny klíče v souboru credentials.ts ani v nastavení aplikace." } 
      }),
      channel: () => ({
          on: () => ({ subscribe: () => {} }),
          subscribe: () => {},
          track: () => {},
          unsubscribe: () => {}
      }),
      storage: {
          from: () => ({
              upload: async () => ({ data: null, error: { message: 'Storage not configured' } }),
              getPublicUrl: () => ({ data: { publicUrl: '' } })
          })
      }
  };

  client = {
      from: () => safeDummy,
      auth: { getUser: async () => ({ data: { user: null } }) },
      channel: () => safeDummy.channel(),
      storage: safeDummy.storage
  } as unknown as SupabaseClient;
}

export const supabase = client;

// Helper to save credentials manually from UI
export const saveCredentialsManually = (url: string, key: string) => {
    localStorage.setItem('smartwork_supabase_url', url);
    localStorage.setItem('smartwork_supabase_key', key);
    window.location.reload();
};

// --- REALTIME FUNCTIONS ---

export const subscribeToPresence = (userId: string, onSync: (onlineUserIds: string[]) => void) => {
    if (!isConfigured) return { unsubscribe: () => {} };

    const channel = supabase.channel('online-users');

    channel
        .on('presence', { event: 'sync' }, () => {
            const newState = channel.presenceState();
            const onlineIds = Object.values(newState).flat().map((u: any) => u.user_id);
            onSync([...new Set(onlineIds)] as string[]);
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({ user_id: userId, online_at: new Date().toISOString() });
            }
        });

    return channel;
};

export const subscribeToNotifications = (userId: string, onNewNotification: (n: Notification) => void) => {
    if (!isConfigured) return { unsubscribe: () => {} };

    const channel = supabase
        .channel(`notifications:${userId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userId}`
            },
            (payload) => {
                const newNote = payload.new as any;
                onNewNotification({
                    id: newNote.id,
                    userId: newNote.user_id,
                    senderId: newNote.sender_id,
                    type: newNote.type,
                    message: newNote.message,
                    isRead: newNote.is_read,
                    createdAt: newNote.created_at
                });
            }
        )
        .subscribe();

    return channel;
};

// --- STORAGE FUNCTIONS ---

export const uploadAttachment = async (file: File): Promise<string | null> => {
    if (!isConfigured) return null;

    try {
        // Generate unique path: public/attachments/TIMESTAMP_RANDOM.ext
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `${fileName}`;

        // Upload to 'attachments' bucket
        // Note: The bucket 'attachments' must exist and be public in Supabase
        const { data, error } = await supabase.storage
            .from('attachments')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('Storage Upload Error:', error);
            alert('Chyba při nahrávání souboru: ' + error.message);
            return null;
        }

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('attachments')
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (e) {
        console.error('Upload exception:', e);
        return null;
    }
};


// --- API Functions ---

export const fetchEmployees = async (): Promise<Employee[]> => {
  const { data, error } = await supabase.from('employees').select('*').order('name'); 
  if (error) { 
      console.error("Fetch Emps Error:", error.message || error); 
      return []; 
  }
  return data.map((e: any) => ({ 
      ...e, 
      isActive: e.is_active !== false,
      pinCode: e.pin_code // Map PIN from DB
  })) as Employee[];
};

export const addEmployee = async (employee: Employee) => {
  const { error } = await supabase.from('employees').insert({
      id: employee.id, name: employee.name, email: employee.email, role: employee.role, avatar: employee.avatar, is_active: true
  });
  if (error) throw error;
};

export const updateEmployee = async (employee: Employee) => {
  const { error } = await supabase.from('employees').update({
      name: employee.name, 
      email: employee.email, 
      role: employee.role
  }).eq('id', employee.id);
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
  if (error) {
      console.error("Fetch Jobs Error:", error.message || error);
      return [];
  }
  return data.map((j: any) => ({ id: j.id, code: j.code, name: j.name, isActive: j.is_active })) as Job[];
};

export const addJob = async (job: Job) => {
  const { error } = await supabase.from('jobs').insert({
      id: job.id, code: job.code, name: job.name, is_active: job.isActive
  });
  if (error) throw error;
};

export const updateJobStatus = async (id: string, isActive: boolean) => {
    const { error } = await supabase.from('jobs').update({ is_active: isActive }).eq('id', id);
    if (error) throw error;
};

export const fetchTimeEntries = async (): Promise<TimeEntry[]> => {
  // ORDER BY DATE DESCENDING from DB to ensure consistent state
  const { data, error } = await supabase.from('time_entries').select('*').order('date', { ascending: false });
  if (error) {
      console.error("Fetch Entries Error:", error.message || error);
      return [];
  }
  return data.map((e: any) => ({
    id: e.id, 
    employeeId: e.employee_id, 
    date: e.date, 
    project: e.project, 
    description: e.description, 
    hours: e.hours, 
    type: e.type,
    attachmentUrl: e.attachment_url // Map attachment URL
  })) as TimeEntry[];
};

export const addTimeEntriesBulk = async (entries: TimeEntry[]) => {
    const dbEntries = entries.map(entry => ({
        id: entry.id, 
        employee_id: entry.employeeId, 
        date: entry.date, 
        project: entry.project, 
        description: entry.description, 
        hours: entry.hours, 
        type: entry.type,
        attachment_url: entry.attachmentUrl // Save attachment URL
    }));
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

// --- Report Status Functions ---

export const fetchMonthlyReports = async (month: string): Promise<MonthStatus[]> => {
    const { data, error } = await supabase
        .from('monthly_reports')
        .select('*')
        .eq('month', month);

    if (error) {
        console.error("Fetch Reports Error:", error.message);
        return [];
    }
    
    return data.map((r: any) => ({
        employeeId: r.employee_id,
        month: r.month,
        status: r.status as TimesheetStatus,
        managerComment: r.manager_comment,
        updatedAt: r.updated_at
    }));
};

export const upsertMonthlyReport = async (report: MonthStatus) => {
    const { error } = await supabase.from('monthly_reports').upsert({
        employee_id: report.employeeId,
        month: report.month,
        status: report.status,
        manager_comment: report.managerComment,
        updated_at: new Date().toISOString()
    }, { onConflict: 'employee_id, month' });
    
    if (error) throw error;
};

// --- Global Lock Functions ---

export const fetchGlobalLock = async (month: string): Promise<boolean> => {
    const { data, error } = await supabase
        .from('global_locks')
        .select('is_locked')
        .eq('month', month)
        .single();
    
    if (error || !data) return false;
    return data.is_locked;
};

export const toggleGlobalLock = async (month: string, isLocked: boolean, managerId: string) => {
    const { error } = await supabase.from('global_locks').upsert({
        month: month,
        is_locked: isLocked,
        locked_by: managerId,
        locked_at: new Date().toISOString()
    });
    if (error) throw error;
};

// --- Notification Functions ---

export const fetchNotifications = async (userId: string): Promise<Notification[]> => {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error("Fetch Notifications Error:", error.message);
        return [];
    }

    return data.map((n: any) => ({
        id: n.id,
        userId: n.user_id,
        senderId: n.sender_id, // Map sender ID
        type: n.type,
        message: n.message,
        isRead: n.is_read,
        createdAt: n.created_at
    }));
};

export const createNotification = async (userId: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', senderId?: string) => {
    const payload: any = {
        user_id: userId,
        message: message,
        type: type,
        is_read: false
    };
    
    if (senderId) {
        payload.sender_id = senderId;
    }

    const { error } = await supabase.from('notifications').insert(payload);
    if (error) console.error("Create Notification Error:", error.message);
};

export const createGlobalNotification = async (userIds: string[], message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const notifications = userIds.map(id => ({
        user_id: id,
        message: message,
        type: type,
        is_read: false
    }));
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
