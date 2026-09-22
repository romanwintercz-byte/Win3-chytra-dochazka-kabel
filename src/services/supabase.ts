import { createClient } from '@supabase/supabase-js';
import { CREDENTIALS } from '../credentials';
import { Employee, Job, TimeEntry, MonthStatus, Notification } from '../types';

const supabaseUrl = CREDENTIALS.SUPABASE_URL;
const supabaseKey = CREDENTIALS.SUPABASE_KEY;

export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

// Local storage helpers for extra metadata (inspectorate fields) fallback
const LOCAL_TIME_META_KEY = 'kabel_dochazka_time_meta_v1';

export const getLocalTimeMeta = (): Record<string, Partial<TimeEntry>> => {
  try {
    const stored = localStorage.getItem(LOCAL_TIME_META_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

export const saveLocalTimeMeta = (entries: TimeEntry[]) => {
  try {
    const current = getLocalTimeMeta();
    entries.forEach(e => {
      if (e.id && (e.startTime || e.endTime || e.breakMinutes !== undefined || e.lunchTime)) {
        current[e.id] = {
          startTime: e.startTime,
          endTime: e.endTime,
          breakMinutes: e.breakMinutes,
          lunchTime: e.lunchTime
        };
      }
    });
    localStorage.setItem(LOCAL_TIME_META_KEY, JSON.stringify(current));
  } catch (err) {
    console.error('Failed to save local time meta', err);
  }
};

export const removeLocalTimeMeta = (id: string) => {
  try {
    const current = getLocalTimeMeta();
    delete current[id];
    localStorage.setItem(LOCAL_TIME_META_KEY, JSON.stringify(current));
  } catch {}
};

// Encode inspection meta into attachment_url as safe fallback: "META:{"s":"07:00","e":"15:30","b":30,"l":"11:00-11:30"}|real_url"
export const encodeTimeMetaToAttachment = (entry: TimeEntry): string | undefined => {
  const meta: any = {};
  if (entry.startTime) meta.s = entry.startTime;
  if (entry.endTime) meta.e = entry.endTime;
  if (entry.breakMinutes !== undefined) meta.b = entry.breakMinutes;
  if (entry.lunchTime) meta.l = entry.lunchTime;

  const hasMeta = Object.keys(meta).length > 0;
  const originalUrl = entry.attachmentUrl && !entry.attachmentUrl.startsWith('META:')
    ? entry.attachmentUrl
    : (entry.attachmentUrl?.includes('|') ? entry.attachmentUrl.split('|')[1] : '');

  if (!hasMeta) return originalUrl || undefined;
  return `META:${JSON.stringify(meta)}${originalUrl ? '|' + originalUrl : ''}`;
};

export const parseEntryTimeMeta = (entry: any): Partial<TimeEntry> => {
  const result: Partial<TimeEntry> = {};
  
  // 1. Direct columns if Supabase schema has them
  if (entry.start_time || entry.startTime) result.startTime = entry.start_time || entry.startTime;
  if (entry.end_time || entry.endTime) result.endTime = entry.end_time || entry.endTime;
  if (entry.break_minutes !== undefined || entry.breakMinutes !== undefined) {
    result.breakMinutes = Number(entry.break_minutes ?? entry.breakMinutes);
  }
  if (entry.lunch_time || entry.lunchTime) result.lunchTime = entry.lunch_time || entry.lunchTime;

  // 2. Fallback to attachment_url encoded meta
  const rawAttachment = entry.attachment_url || entry.attachmentUrl;
  if (rawAttachment && typeof rawAttachment === 'string' && rawAttachment.startsWith('META:')) {
    try {
      const parts = rawAttachment.split('|');
      const metaJson = parts[0].replace('META:', '');
      const parsed = JSON.parse(metaJson);
      if (!result.startTime && parsed.s) result.startTime = parsed.s;
      if (!result.endTime && parsed.e) result.endTime = parsed.e;
      if (result.breakMinutes === undefined && parsed.b !== undefined) result.breakMinutes = Number(parsed.b);
      if (!result.lunchTime && parsed.l) result.lunchTime = parsed.l;
    } catch {}
  }

  // 3. Fallback to local storage
  if (entry.id) {
    const local = getLocalTimeMeta()[entry.id];
    if (local) {
      if (!result.startTime && local.startTime) result.startTime = local.startTime;
      if (!result.endTime && local.endTime) result.endTime = local.endTime;
      if (result.breakMinutes === undefined && local.breakMinutes !== undefined) result.breakMinutes = local.breakMinutes;
      if (!result.lunchTime && local.lunchTime) result.lunchTime = local.lunchTime;
    }
  }

  return result;
};

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

export const deleteEmployee = async (id: string) => {
  if (!supabase) return;
  const { error } = await supabase.from('employees').delete().eq('id', id);
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

export const deleteJob = async (id: string) => {
  if (!supabase) return;
  const { error } = await supabase.from('jobs').delete().eq('id', id);
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
    const lastDay = new Date(year, monthNum, 0).getDate();
    const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;
    query = query.gte('date', startDate).lte('date', endDate);
  }
  
  const { data, error } = await query.order('date', { ascending: false });
  if (error) throw new Error(`Záznamy docházky: ${error.message}`);
  
  const entries: TimeEntry[] = (data || []).map((row: any) => {
    const camel = toCamel(row);
    const meta = parseEntryTimeMeta(row);
    
    // Clean attachmentUrl if it had META: prefix
    let cleanAttachmentUrl = camel.attachmentUrl;
    if (cleanAttachmentUrl && cleanAttachmentUrl.startsWith('META:')) {
      cleanAttachmentUrl = cleanAttachmentUrl.includes('|') ? cleanAttachmentUrl.split('|')[1] : undefined;
    }

    return {
      ...camel,
      attachmentUrl: cleanAttachmentUrl,
      startTime: meta.startTime,
      endTime: meta.endTime,
      breakMinutes: meta.breakMinutes,
      lunchTime: meta.lunchTime
    };
  });

  return entries;
};

export const saveTimeEntries = async (entries: TimeEntry[], employeeId?: string, date?: string | null) => {
  if (!supabase) return;
  
  if (date && employeeId) {
    const { error: delError } = await supabase
      .from('time_entries')
      .delete()
      .eq('employee_id', employeeId)
      .eq('date', date);
    if (delError) throw delError;
  }

  if (entries.length > 0) {
    saveLocalTimeMeta(entries);
    
    const fullPayload = entries.map(e => {
      const snake = toSnake(e);
      snake.attachment_url = encodeTimeMetaToAttachment(e);
      if (e.startTime) snake.start_time = e.startTime;
      if (e.endTime) snake.end_time = e.endTime;
      if (e.breakMinutes !== undefined) snake.break_minutes = e.breakMinutes;
      if (e.lunchTime) snake.lunch_time = e.lunchTime;
      return snake;
    });

    const { error: insertError } = await supabase.from('time_entries').insert(fullPayload);
    
    if (insertError) {
      console.warn('Direct column insert failed, falling back to attachment_url encoding:', insertError.message);
      const fallbackPayload = entries.map(e => {
        const snake = toSnake(e);
        delete snake.start_time;
        delete snake.end_time;
        delete snake.break_minutes;
        delete snake.lunch_time;
        snake.attachment_url = encodeTimeMetaToAttachment(e);
        return snake;
      });

      const { error: fallbackError } = await supabase.from('time_entries').insert(fallbackPayload);
      if (fallbackError) throw fallbackError;
    }
  }
};

export const addTimeEntriesBulk = async (entries: TimeEntry[]) => {
  return saveTimeEntries(entries);
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
  removeLocalTimeMeta(id);
};

export const deleteTimeEntries = async (ids: string[]) => {
  if (!supabase) return;
  const { error } = await supabase.from('time_entries').delete().in('id', ids);
  if (error) throw error;
  ids.forEach(id => removeLocalTimeMeta(id));
};

export const fetchMonthStatuses = async (month: string): Promise<MonthStatus[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from('month_status').select('*').eq('month', month);
  if (error) return [];
  return toCamel(data) || [];
};

export const fetchMonthlyReports = fetchMonthStatuses;

export const saveMonthStatus = async (status: MonthStatus) => {
  if (!supabase) return;
  const snakeReport = toSnake(status);
  const { error } = await supabase.from('month_status').upsert([snakeReport], {
    onConflict: 'employee_id,month'
  });
  if (error) throw error;
};

export const upsertMonthlyReport = saveMonthStatus;

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

export const markNotificationRead = markNotificationAsRead;

export const createNotification = async (
  userIdOrNotif: string | Partial<Notification>,
  message?: string,
  type: string = 'info',
  senderId?: string
) => {
  if (!supabase) return;
  let payload: any;
  if (typeof userIdOrNotif === 'object') {
    payload = toSnake(userIdOrNotif);
  } else {
    payload = toSnake({
      userId: userIdOrNotif,
      message,
      type,
      senderId,
      isRead: false,
      createdAt: new Date().toISOString()
    });
  }
  const { error } = await supabase.from('notifications').insert([payload]);
  if (error) throw error;
};
