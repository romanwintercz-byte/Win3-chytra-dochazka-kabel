
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Employee, Job, TimeEntry, MonthStatus, TimesheetStatus, Notification } from '../types';
import { CREDENTIALS } from '../credentials';
import { MOCK_EMPLOYEES, MOCK_JOBS, MOCK_ENTRIES } from './mockData';

// --- DEMO MODE STATE ---
let demoState = {
    employees: [...MOCK_EMPLOYEES],
    jobs: [...MOCK_JOBS],
    entries: [...MOCK_ENTRIES],
    reports: [] as any[],
    locks: [] as any[],
    notifications: [] as any[]
};

// --- GLOBAL FALLBACK FLAG ---
let isFallbackMode = false;

// --- DUMMY CLIENT FACTORY ---
const createDummyClient = () => {
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
            data: null, 
            error: { message: "Dummy client used" } 
        }),
        channel: () => ({
            on: () => ({ subscribe: () => {} }),
            subscribe: () => {},
            track: () => {},
            unsubscribe: () => {}
        }),
        storage: {
            from: () => ({
                upload: async () => ({ data: null, error: { message: 'Storage disabled' } }),
                getPublicUrl: () => ({ data: { publicUrl: '' } })
            })
        }
    };

    return {
        from: () => safeDummy,
        auth: { getUser: async () => ({ data: { user: null } }) },
        channel: () => safeDummy.channel(),
        storage: safeDummy.storage
    } as unknown as SupabaseClient;
};

// --- SAFE INITIALIZATION LOGIC ---

const cleanString = (str: string | null | undefined): string | null => {
    if (!str) return null;
    let val = str.trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
    }
    if (val === 'undefined' || val === 'null' || val === '') return null;
    return val;
};

const getValidUrl = (urlStr: string | null): string | null => {
    if (!urlStr) return null;
    try {
        if (!urlStr.startsWith('http')) return null;
        const u = new URL(urlStr);
        if (u.hostname === 'localhost' || u.hostname.includes('supabase.co')) return u.toString();
        return null;
    } catch (e) {
        return null;
    }
};

const getCredentials = () => {
    let url: string | null = null;
    let key: string | null = null;

    try {
        if (typeof localStorage !== 'undefined') {
            url = cleanString(localStorage.getItem('smartwork_supabase_url'));
            key = cleanString(localStorage.getItem('smartwork_supabase_key'));
        }
    } catch (e) {}

    if (!getValidUrl(url)) {
        url = cleanString(CREDENTIALS.SUPABASE_URL);
    }
    
    if (!key || key.includes('ZDE_VLOZTE')) {
        const envKey = cleanString(CREDENTIALS.SUPABASE_KEY);
        if (envKey && !envKey.includes('ZDE_VLOZTE')) {
            key = envKey;
        }
    }

    return { url, key };
};

// --- INITIALIZE CLIENT ---
let client: SupabaseClient;

// Explicit Demo Flag
const isExplicitDemo = typeof window !== 'undefined' && window.location.search.includes('demo=true');

try {
    const { url, key } = getCredentials();
    const validatedUrl = getValidUrl(url);
    const isKeyPlausible = key && key.length > 20 && !key.includes('ZDE_VLOZTE');

    if (isExplicitDemo || !validatedUrl || !isKeyPlausible) {
        client = createDummyClient();
        isFallbackMode = true;
    } 
    else {
        client = createClient(validatedUrl!, key!, {
            auth: { persistSession: false }, 
            realtime: { params: { eventsPerSecond: 10 } }
        });
    } 
} catch (e) {
    client = createDummyClient();
    isFallbackMode = true;
}

export const supabase = client;

// --- EXPORTED HELPERS ---

const isDemo = () => isExplicitDemo || CREDENTIALS.IS_DEMO_MODE || isFallbackMode;

export const saveCredentialsManually = (url: string, key: string) => {
    const cleanUrl = cleanString(url) || '';
    const cleanKey = cleanString(key) || '';
    
    if (!getValidUrl(cleanUrl)) {
        alert("Neplatná URL adresa.");
        return;
    }

    localStorage.setItem('smartwork_supabase_url', cleanUrl);
    localStorage.setItem('smartwork_supabase_key', cleanKey);
    window.location.href = window.location.pathname; 
};

// --- API Functions ---

// CRITICAL FIX: Ensure we NEVER return an empty array if likely in demo/unconfigured state
export const fetchEmployees = async (): Promise<Employee[]> => {
  if (isDemo()) return demoState.employees;

  const { data, error } = await supabase.from('employees').select('*').order('name'); 
  
  // If error or empty data, fallback to mocks immediately
  if (error || !data || data.length === 0) { 
      console.warn("Database empty or connection failed. Using Mock Data.");
      isFallbackMode = true; // Switch to fallback mode for session
      return demoState.employees; 
  }

  return data.map((e: any) => ({ ...e, isActive: e.is_active !== false, pinCode: e.pin_code })) as Employee[];
};

export const addEmployee = async (employee: Employee) => {
  if (isDemo()) { demoState.employees.push(employee); return; }
  const { error } = await supabase.from('employees').insert({ id: employee.id, name: employee.name, email: employee.email, role: employee.role, avatar: employee.avatar, is_active: true });
  if (error) throw error;
};

export const updateEmployee = async (employee: Employee) => {
  if (isDemo()) { const idx = demoState.employees.findIndex(e => e.id === employee.id); if (idx !== -1) demoState.employees[idx] = employee; return; }
  const { error } = await supabase.from('employees').update({ name: employee.name, email: employee.email, role: employee.role }).eq('id', employee.id);
  if (error) throw error;
};

export const updateEmployeeStatus = async (id: string, isActive: boolean) => {
  if (isDemo()) { const emp = demoState.employees.find(e => e.id === id); if (emp) emp.isActive = isActive; return; }
  const { error } = await supabase.from('employees').update({ is_active: isActive }).eq('id', id);
  if (error) throw error;
};

export const updateEmployeePin = async (id: string, pin: string | null) => {
    if (isDemo()) return;
    const { error } = await supabase.from('employees').update({ pin_code: pin }).eq('id', id);
    if (error) throw error;
};

export const fetchJobs = async (): Promise<Job[]> => {
  if (isDemo()) return demoState.jobs;
  const { data, error } = await supabase.from('jobs').select('*').order('code');
  if (error || !data || data.length === 0) return demoState.jobs; // Fallback
  return data.map((j: any) => ({ id: j.id, code: j.code, name: j.name, isActive: j.is_active })) as Job[];
};

export const addJob = async (job: Job) => {
  if (isDemo()) { demoState.jobs.push(job); return; }
  const { error } = await supabase.from('jobs').insert({ id: job.id, code: job.code, name: job.name, is_active: job.isActive });
  if (error) throw error;
};

export const updateJobStatus = async (id: string, isActive: boolean) => {
    if (isDemo()) { const job = demoState.jobs.find(j => j.id === id); if (job) job.isActive = isActive; return; }
    const { error } = await supabase.from('jobs').update({ is_active: isActive }).eq('id', id);
    if (error) throw error;
};

export const fetchTimeEntries = async (): Promise<TimeEntry[]> => {
  if (isDemo()) return demoState.entries;
  const { data, error } = await supabase.from('time_entries').select('*').order('date', { ascending: false });
  if (error || !data || data.length === 0) return demoState.entries; // Fallback
  return data.map((e: any) => ({ id: e.id, employeeId: e.employee_id, date: e.date, project: e.project, description: e.description, hours: e.hours, type: e.type, attachmentUrl: e.attachment_url })) as TimeEntry[];
};

export const addTimeEntriesBulk = async (entries: TimeEntry[]) => {
    if (isDemo()) { demoState.entries = [...demoState.entries, ...entries]; return; }
    const dbEntries = entries.map(entry => ({ id: entry.id, employee_id: entry.employeeId, date: entry.date, project: entry.project, description: entry.description, hours: entry.hours, type: entry.type, attachment_url: entry.attachmentUrl }));
    const { error } = await supabase.from('time_entries').insert(dbEntries);
    if (error) throw error;
};

export const deleteTimeEntriesForDate = async (employeeId: string, date: string) => {
    if (isDemo()) { demoState.entries = demoState.entries.filter(e => !(e.employeeId === employeeId && e.date === date)); return; }
    const { error } = await supabase.from('time_entries').delete().eq('employee_id', employeeId).eq('date', date);
    if (error) throw error;
};

export const deleteTimeEntry = async (id: string) => {
    if (isDemo()) { demoState.entries = demoState.entries.filter(e => e.id !== id); return; }
    const { error } = await supabase.from('time_entries').delete().eq('id', id);
    if (error) throw error;
};

export const fetchMonthlyReports = async (month: string): Promise<MonthStatus[]> => {
    if (isDemo()) return demoState.reports.filter(r => r.month === month);
    const { data, error } = await supabase.from('monthly_reports').select('*').eq('month', month);
    if (error) return [];
    return (data || []).map((r: any) => ({ employeeId: r.employee_id, month: r.month, status: r.status as TimesheetStatus, managerComment: r.manager_comment, updatedAt: r.updated_at }));
};

export const upsertMonthlyReport = async (report: MonthStatus) => {
    if (isDemo()) {
        const idx = demoState.reports.findIndex(r => r.employeeId === report.employeeId && r.month === report.month);
        if (idx !== -1) demoState.reports[idx] = { ...demoState.reports[idx], ...report };
        else demoState.reports.push(report);
        return;
    }
    const { error } = await supabase.from('monthly_reports').upsert({ employee_id: report.employeeId, month: report.month, status: report.status, manager_comment: report.managerComment, updated_at: new Date().toISOString() }, { onConflict: 'employee_id, month' });
    if (error) throw error;
};

export const fetchGlobalLock = async (month: string): Promise<boolean> => {
    if (isDemo()) { const lock = demoState.locks.find(l => l.month === month); return lock ? lock.isLocked : false; }
    const { data, error } = await supabase.from('global_locks').select('is_locked').eq('month', month).single();
    if (error || !data) return false;
    return data.is_locked;
};

export const toggleGlobalLock = async (month: string, isLocked: boolean, managerId: string) => {
    if (isDemo()) { const idx = demoState.locks.findIndex(l => l.month === month); if (idx !== -1) demoState.locks[idx].isLocked = isLocked; else demoState.locks.push({ month, isLocked }); return; }
    const { error } = await supabase.from('global_locks').upsert({ month: month, is_locked: isLocked, locked_by: managerId, locked_at: new Date().toISOString() });
    if (error) throw error;
};

export const fetchNotifications = async (userId: string): Promise<Notification[]> => {
    if (isDemo()) return demoState.notifications.filter(n => n.userId === userId);
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map((n: any) => ({ id: n.id, userId: n.user_id, senderId: n.sender_id, type: n.type, message: n.message, isRead: n.is_read, createdAt: n.created_at }));
};

export const createNotification = async (userId: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', senderId?: string) => {
    if (isDemo()) { demoState.notifications.push({ id: uuidv4(), userId, senderId, message, type, isRead: false, createdAt: new Date().toISOString() }); return; }
    const payload: any = { user_id: userId, message: message, type: type, is_read: false };
    if (senderId) payload.sender_id = senderId;
    const { error } = await supabase.from('notifications').insert(payload);
    if (error) console.error("Create Notification Error:", error.message);
};

export const createGlobalNotification = async (userIds: string[], message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    if (isDemo()) { userIds.forEach(uid => { demoState.notifications.push({ id: uuidv4(), userId: uid, message, type, isRead: false, createdAt: new Date().toISOString() }); }); return; }
    const notifications = userIds.map(id => ({ user_id: id, message: message, type: type, is_read: false }));
    const { error } = await supabase.from('notifications').insert(notifications);
    if (error) console.error("Global Notification Error:", error.message);
};

export const markNotificationAsRead = async (id: string) => {
    if (isDemo()) { const n = demoState.notifications.find(n => n.id === id); if (n) n.isRead = true; return; }
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) console.error("Mark Read Error:", error.message);
};

export const markAllNotificationsAsRead = async (userId: string) => {
    if (isDemo()) { demoState.notifications.forEach(n => { if (n.userId === userId) n.isRead = true; }); return; }
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
    if (error) console.error("Mark All Read Error:", error.message);
};

export const subscribeToPresence = (userId: string, onSync: (onlineUserIds: string[]) => void) => {
    if (isDemo()) {
        setTimeout(() => onSync(['demo-user-1', 'demo-user-2']), 1000);
        return { unsubscribe: () => {} };
    }
    // Simple mock if Supabase is offline
    return { unsubscribe: () => {} };
};

export const subscribeToNotifications = (userId: string, onNewNotification: (n: Notification) => void) => {
    return { unsubscribe: () => {} };
};

export const uploadAttachment = async (file: File): Promise<string | null> => {
    if (isDemo()) {
        return URL.createObjectURL(file);
    }
    return null;
};

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
