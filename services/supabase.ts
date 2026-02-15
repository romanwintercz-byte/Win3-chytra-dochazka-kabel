import { createClient } from '@supabase/supabase-js';
import { CREDENTIALS, isSupabaseConfigured } from '../credentials';
import { Employee, Job, TimeEntry, MonthStatus, Notification } from '../types';

// Inicializace klienta pouze pokud jsou klíče dostupné
const supabaseUrl = CREDENTIALS.SUPABASE_URL;
const supabaseKey = CREDENTIALS.SUPABASE_KEY;

export const supabase = isSupabaseConfigured() 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

// --- POMOCNÉ FUNKCE PRO DIAGNOSTIKU ---
export const checkConnection = async () => {
  if (!supabase) return { success: false, message: 'Klíče nejsou nakonfigurovány.' };
  try {
    const { data, error } = await supabase.from('employees').select('count', { count: 'exact', head: true });
    if (error) throw error;
    return { success: true, message: 'Připojeno k Supabase.' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
};

// --- ZAMĚSTNANCI ---
export const fetchEmployees = async (): Promise<Employee[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from('employees').select('*').order('name');
  if (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
  return data || [];
};

export const addEmployee = async (emp: Employee) => {
  if (!supabase) return;
  await supabase.from('employees').insert([emp]);
};

export const updateEmployee = async (emp: Employee) => {
  if (!supabase) return;
  await supabase.from('employees').update(emp).eq('id', emp.id);
};

export const updateEmployeeStatus = async (id: string, isActive: boolean) => {
  if (!supabase) return;
  await supabase.from('employees').update({ isActive }).eq('id', id);
};

// --- PROJEKTY / ZAKÁZKY ---
export const fetchJobs = async (): Promise<Job[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from('jobs').select('*').order('code');
  if (error) {
    console.error('Error fetching jobs:', error);
    return [];
  }
  return data || [];
};

export const addJob = async (job: Job) => {
  if (!supabase) return;
  await supabase.from('jobs').insert([job]);
};

export const updateJobStatus = async (id: string, isActive: boolean) => {
  if (!supabase) return;
  await supabase.from('jobs').update({ isActive }).eq('id', id);
};

// --- DOCHÁZKOVÉ ZÁZNAMY ---
export const fetchTimeEntries = async (employeeId?: string, month?: string): Promise<TimeEntry[]> => {
  if (!supabase) return [];
  let query = supabase.from('time_entries').select('*');
  
  if (employeeId) query = query.eq('employeeId', employeeId);
  if (month) query = query.like('date', `${month}%`);
  
  const { data, error } = await query.order('date', { ascending: false });
  if (error) {
    console.error('Error fetching entries:', error);
    return [];
  }
  return data || [];
};

export const addTimeEntriesBulk = async (entries: TimeEntry[]) => {
  if (!supabase) return;
  const { error } = await supabase.from('time_entries').insert(entries);
  if (error) throw error;
};

export const deleteTimeEntriesForDate = async (employeeId: string, date: string) => {
  if (!supabase) return;
  await supabase.from('time_entries').delete().eq('employeeId', employeeId).eq('date', date);
};

export const deleteTimeEntry = async (id: string) => {
  if (!supabase) return;
  await supabase.from('time_entries').delete().eq('id', id);
};

// --- MĚSÍČNÍ STATUSY ---
export const fetchMonthlyReports = async (month: string): Promise<MonthStatus[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from('month_status').select('*').eq('month', month);
  if (error) return [];
  return data || [];
};

export const upsertMonthlyReport = async (report: MonthStatus) => {
  if (!supabase) return;
  await supabase.from('month_status').upsert(report);
};

// --- NOTIFIKACE ---
export const fetchNotifications = async (userId: string): Promise<Notification[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from('notifications')
    .select('*')
    .eq('userId', userId)
    .order('createdAt', { ascending: false })
    .limit(20);
  if (error) return [];
  return data || [];
};

export const markNotificationAsRead = async (id: string) => {
  if (!supabase) return;
  await supabase.from('notifications').update({ isRead: true }).eq('id', id);
};

export const createNotification = async (userId: string, message: string, type: string = 'info', senderId?: string) => {
  if (!supabase) return;
  await supabase.from('notifications').insert([{
    userId,
    message,
    type,
    senderId,
    isRead: false,
    createdAt: new Date().toISOString()
  }]);
};

// --- REALTIME ---
export const subscribeToNotifications = (userId: string, onNewNotification: (n: Notification) => void) => {
  if (!supabase) return { unsubscribe: () => {} };
  
  const channel = supabase.channel(`notifications:${userId}`)
    .on('postgres_changes', { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'notifications',
      filter: `userId=eq.${userId}`
    }, (payload) => {
      onNewNotification(payload.new as Notification);
    })
    .subscribe();

  return { unsubscribe: () => supabase.removeChannel(channel) };
};