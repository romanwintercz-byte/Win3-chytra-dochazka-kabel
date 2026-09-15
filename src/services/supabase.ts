
import { createClient } from '@supabase/supabase-js';
import { CREDENTIALS } from '../credentials';
import { Employee, Job, TimeEntry, MonthStatus, Notification } from '../types';

const supabaseUrl = CREDENTIALS.SUPABASE_URL;
const supabaseKey = CREDENTIALS.SUPABASE_KEY;

export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

// Robustní transformace snake_case -> camelCase
const toCamel = (obj: any): any => {
  if (obj === null || typeof obj !== 'object' || obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(toCamel);
  
  const n: any = {};
  Object.keys(obj).forEach(k => {
    const camel = k.replace(/([-_][a-z])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''));
    n[camel] = toCamel(obj[k]);
  });
  return n;
};

// Robustní transformace camelCase -> snake_case
const toSnake = (obj: any): any => {
  if (obj === null || typeof obj !== 'object' || obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(toSnake);
  
  const n: any = {};
  Object.keys(obj).forEach(k => {
    const snake = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    n[snake] = toSnake(obj[k]);
  });
  return n;
};

export const checkConnection = async () => {
  if (!supabase) return { success: false, message: 'Klient nebyl vytvořen (chybí klíče).' };
  try {
    const { error } = await supabase.from('employees').select('id').limit(1);
    if (error) throw error;
    return { success: true, message: 'Připojeno k Supabase.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Nepodařilo se navázat spojení.' };
  }
};

export const fetchEmployees = async (): Promise<Employee[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from('employees').select('*').order('name');
  if (error) throw new Error(`Zaměstnanci: ${error.message}`);
  return toCamel(data) || [];
};

export const addEmployee = async (emp: Employee) => {
  if (!supabase) return;
  const { error } = await supabase.from('employees').insert([toSnake(emp)]);
  if (error) throw error;
};

export const updateEmployee = async (emp: Employee) => {
  if (!supabase) return;
  const { error } = await supabase.from('employees').update(toSnake(emp)).eq('id', emp.id);
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
  if (error) throw new Error(`Zakázky: ${error.message}`);
  return toCamel(data) || [];
};

export const addJob = async (job: Job) => {
  if (!supabase) return;
  const { error } = await supabase.from('jobs').insert([toSnake(job)]);
  if (error) throw error;
};

export const updateJob = async (job: Job) => {
  if (!supabase) return;
  const { error } = await supabase.from('jobs').update(toSnake(job)).eq('id', job.id);
  if (error) throw error;
};

export const updateJobStatus = async (id: string, isActive: boolean) => {
  if (!supabase) return;
  const { error } = await supabase.from('jobs').update({ is_active: isActive }).eq('id', id);
  if (error) throw error;
};

export const fetchTimeEntries = async (employeeId?: string, month?: string): Promise<TimeEntry[]> => {
  if (!supabase) return [];
  let query = supabase.from('time_entries').select('*');
  
  if (employeeId) {
    query = query.eq('employee_id', employeeId);
  }
  
  if (month) {
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = `${month}-01`;
    // Získání posledního dne měsíce (0. den následujícího měsíce)
    const lastDay = new Date(year, monthNum, 0).getDate();
    const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;
    query = query.gte('date', startDate).lte('date', endDate);
  }
  
  const { data, error } = await query.order('date', { ascending: false });
  if (error) throw new Error(`Záznamy: ${error.message}`);
  return toCamel(data) || [];
};

export const addTimeEntriesBulk = async (entries: TimeEntry[]) => {
  if (!supabase) return;
  const snakeEntries = entries.map(e => toSnake(e));
  const { error } = await supabase.from('time_entries').insert(snakeEntries);
  if (error) throw error;
};

export const deleteTimeEntriesForDate = async (employeeId: string, date: string) => {
  if (!supabase) return;
  const { error } = await supabase.from('time_entries').delete().eq('employee_id', employeeId).eq('date', date);
  if (error) throw error;
};

export const deleteTimeEntry = async (id: string) => {
  if (!supabase) return;
  const { error } = await supabase.from('time_entries').delete().eq('id', id);
  if (error) throw error;
};

export const fetchMonthlyReports = async (month: string): Promise<MonthStatus[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from('month_status').select('*').eq('month', month);
  if (error) return [];
  return toCamel(data) || [];
};

export const upsertMonthlyReport = async (report: MonthStatus) => {
  if (!supabase) return;
  // Pro upsert v Supabase musíme mít buď ID nebo unikátní constraint (employee_id, month)
  const snakeReport = toSnake(report);
  const { error } = await supabase.from('month_status').upsert(snakeReport, {
    onConflict: 'employee_id,month'
  });
  if (error) throw error;
};

export const fetchNotifications = async (userId: string): Promise<Notification[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) return [];
  return toCamel(data) || [];
};

export const markNotificationAsRead = async (id: string) => {
  if (!supabase) return;
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  if (error) throw error;
};

export const createNotification = async (userId: string, message: string, type: string = 'info', senderId?: string) => {
  if (!supabase) return;
  const { error } = await supabase.from('notifications').insert([toSnake({
    userId,
    message,
    type,
    senderId,
    isRead: false,
    createdAt: new Date().toISOString()
  })]);
  if (error) throw error;
};
