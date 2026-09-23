import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getKabelCredentials, isSupabaseConfigured } from '../credentials';
import { Employee, Job, TimeEntry, MonthStatus, Notification, WorkType } from '../types';
import { ADMIN_EMPLOYEE } from './mockData';

let cachedClient: SupabaseClient | null = null;
let lastClientUrl = '';
let lastClientKey = '';

export const getSupabase = (): SupabaseClient | null => {
  const { url, key } = getKabelCredentials();
  if (!url || !key || url.length < 10 || key.length < 20) {
    cachedClient = null;
    return null;
  }

  if (cachedClient && lastClientUrl === url && lastClientKey === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    lastClientUrl = url;
    lastClientKey = key;
    return cachedClient;
  } catch (err) {
    console.error('Chyba při inicializaci Supabase pro firmu Kabel:', err);
    cachedClient = null;
    return null;
  }
};

// Pomocná transformace snake_case -> camelCase
export const toCamel = (obj: any): any => {
  if (obj === null || typeof obj !== 'object' || obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(toCamel);
  
  const n: any = {};
  Object.keys(obj).forEach(k => {
    const camel = k.replace(/([-_][a-z])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''));
    n[camel] = toCamel(obj[k]);
  });
  return n;
};

// Pomocná transformace camelCase -> snake_case
export const toSnake = (obj: any): any => {
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
  const client = getSupabase();
  const currentCreds = getKabelCredentials();
  
  if (!client) {
    return { 
      success: false, 
      message: 'Supabase pro firmu Kabel není nakonfigurováno. Zadejte URL a klíč v Nastavení.' 
    };
  }

  try {
    const { error } = await client.from('employees').select('id').limit(1);
    if (error) {
      // Pokud tabulka ještě neexistuje, je to specifická chyba
      if (error.code === '42P01' || error.message?.includes('relation "employees" does not exist')) {
        return {
          success: false,
          needsMigration: true,
          message: 'Databáze je dostupná, ale chybí v ní vytvořené tabulky pro firmu Kabel. Spusťte SQL skript v Supabase Editoru.'
        };
      }
      if (error.message?.includes('Invalid path') || (error as any).status === 404) {
        return {
          success: false,
          message: `Neplatná cesta v URL (Invalid path). URL musí končit přímo na .supabase.co (bez /rest/v1 nebo lomítka na konci). Aktuální URL: ${currentCreds.url}`
        };
      }
      throw error;
    }
    return { success: true, message: 'Úspěšně připojeno k Supabase pro firmu Kabel.' };
  } catch (err: any) {
    if (err.message?.includes('Invalid path')) {
      return {
        success: false,
        message: `Neplatná cesta v URL (Invalid path). URL musí končit přímo na .supabase.co (bez /rest/v1 nebo lomítka na konci). Aktuální URL: ${currentCreds.url}`
      };
    }
    return { 
      success: false, 
      message: err.message || 'Nepodařilo se navázat spojení se Supabase.' 
    };
  }
};

export const fetchEmployees = async (): Promise<Employee[]> => {
  const client = getSupabase();
  if (!client) return [ADMIN_EMPLOYEE];
  const { data, error } = await client.from('employees').select('*').order('name');
  if (error) throw new Error(`Zaměstnanci: ${error.message}`);
  const list: Employee[] = toCamel(data) || [];

  // Pokud je databáze prázdná nebo v ní ještě není Win3 Support, vložíme ho
  const hasAdmin = list.some(e => e.name.toLowerCase().includes('win3') || e.id === ADMIN_EMPLOYEE.id);
  if (!hasAdmin) {
    try {
      await client.from('employees').upsert([toSnake(ADMIN_EMPLOYEE)]);
      return [ADMIN_EMPLOYEE, ...list];
    } catch {
      return [ADMIN_EMPLOYEE, ...list];
    }
  }

  return list;
};

export const addEmployee = async (emp: Employee) => {
  const client = getSupabase();
  if (!client) return;
  const { error } = await client.from('employees').insert([toSnake(emp)]);
  if (error) throw error;
};

export const updateEmployee = async (emp: Employee) => {
  const client = getSupabase();
  if (!client) return;
  const { error } = await client.from('employees').update(toSnake(emp)).eq('id', emp.id);
  if (error) throw error;
};

export const updateEmployeeStatus = async (id: string, isActive: boolean) => {
  const client = getSupabase();
  if (!client) return;
  const { error } = await client.from('employees').update({ is_active: isActive }).eq('id', id);
  if (error) throw error;
};

export const deleteEmployee = async (id: string) => {
  const client = getSupabase();
  if (!client) return;
  const { error } = await client.from('employees').delete().eq('id', id);
  if (error) throw error;
};

export const fetchJobs = async (): Promise<Job[]> => {
  const client = getSupabase();
  if (!client) return [];
  const { data, error } = await client.from('jobs').select('*').order('code');
  if (error) throw new Error(`Zakázky: ${error.message}`);
  return toCamel(data) || [];
};

export const addJob = async (job: Job) => {
  const client = getSupabase();
  if (!client) return;
  const { error } = await client.from('jobs').insert([toSnake(job)]);
  if (error) throw error;
};

export const updateJob = async (job: Job) => {
  const client = getSupabase();
  if (!client) return;
  const { error } = await client.from('jobs').update(toSnake(job)).eq('id', job.id);
  if (error) throw error;
};

export const updateJobStatus = async (id: string, isActive: boolean) => {
  const client = getSupabase();
  if (!client) return;
  const { error } = await client.from('jobs').update({ is_active: isActive }).eq('id', id);
  if (error) throw error;
};

// Local storage klíč pro uchování časových metadat v případě odpojení
const KABEL_LOCAL_TIME_META_KEY = 'kabel_dochazka_time_meta_v1';

export const encodeTimeMetaToAttachment = (entry: Partial<TimeEntry>): string | undefined => {
  const meta: { startTime?: string; endTime?: string; breakMinutes?: number; lunchTime?: string } = {};
  if (entry.startTime) meta.startTime = entry.startTime;
  if (entry.endTime) meta.endTime = entry.endTime;
  if (entry.breakMinutes !== undefined) meta.breakMinutes = entry.breakMinutes;
  if (entry.lunchTime) meta.lunchTime = entry.lunchTime;

  if (Object.keys(meta).length === 0) return entry.attachmentUrl || undefined;
  const json = JSON.stringify(meta);
  if (entry.attachmentUrl && !entry.attachmentUrl.startsWith('META:')) {
    return `${entry.attachmentUrl}#META:${json}`;
  }
  return `META:${json}`;
};

export const parseEntryTimeMeta = (entry: any): TimeEntry => {
  let startTime = entry.startTime;
  let endTime = entry.endTime;
  let breakMinutes = entry.breakMinutes;
  let lunchTime = entry.lunchTime;
  let attachmentUrl = entry.attachmentUrl;

  if (attachmentUrl && typeof attachmentUrl === 'string') {
    if (attachmentUrl.startsWith('META:')) {
      try {
        const meta = JSON.parse(attachmentUrl.substring(5));
        if (meta.startTime && !startTime) startTime = meta.startTime;
        if (meta.endTime && !endTime) endTime = meta.endTime;
        if (meta.breakMinutes !== undefined && breakMinutes === undefined) breakMinutes = meta.breakMinutes;
        if (meta.lunchTime && !lunchTime) lunchTime = meta.lunchTime;
        attachmentUrl = undefined;
      } catch {}
    } else if (attachmentUrl.includes('#META:')) {
      const parts = attachmentUrl.split('#META:');
      attachmentUrl = parts[0] || undefined;
      try {
        const meta = JSON.parse(parts[1]);
        if (meta.startTime && !startTime) startTime = meta.startTime;
        if (meta.endTime && !endTime) endTime = meta.endTime;
        if (meta.breakMinutes !== undefined && breakMinutes === undefined) breakMinutes = meta.breakMinutes;
        if (meta.lunchTime && !lunchTime) lunchTime = meta.lunchTime;
      } catch {}
    }
  }

  // Načtení z localStorage mezipaměti
  if (!startTime && typeof window !== 'undefined' && window.localStorage) {
    try {
      const localStr = localStorage.getItem(KABEL_LOCAL_TIME_META_KEY);
      if (localStr) {
        const localMap = JSON.parse(localStr);
        const dateOnly = entry.date ? entry.date.split('T')[0] : '';
        const meta = localMap[entry.id] || 
                     localMap[`${entry.employeeId}_${dateOnly}_${entry.hours}_${entry.type}`] ||
                     localMap[`${entry.employeeId}_${dateOnly}`];
        if (meta) {
          if (meta.startTime && !startTime) startTime = meta.startTime;
          if (meta.endTime && !endTime) endTime = meta.endTime;
          if (meta.breakMinutes !== undefined && breakMinutes === undefined) breakMinutes = meta.breakMinutes;
          if (meta.lunchTime && !lunchTime) lunchTime = meta.lunchTime;
        }
      }
    } catch {}
  }

  // Výchozí fallback pro standardní 8h směnu
  if (!startTime && entry.hours === 8 && entry.type === WorkType.REGULAR) {
    const dateObj = entry.date ? new Date(entry.date.split('T')[0]) : null;
    const isWk = dateObj ? (dateObj.getDay() === 0 || dateObj.getDay() === 6) : false;
    if (!isWk) {
      startTime = '06:30';
      endTime = '15:00';
      breakMinutes = 30;
      lunchTime = '11:00 – 11:30';
    }
  }

  return {
    ...entry,
    startTime,
    endTime,
    breakMinutes,
    lunchTime,
    attachmentUrl
  };
};

export const saveLocalTimeMeta = (entries: TimeEntry[]) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const raw = localStorage.getItem(KABEL_LOCAL_TIME_META_KEY);
    const map = raw ? JSON.parse(raw) : {};
    entries.forEach(e => {
      if (e.startTime || e.endTime || e.lunchTime || e.breakMinutes !== undefined) {
        const meta = {
          startTime: e.startTime,
          endTime: e.endTime,
          breakMinutes: e.breakMinutes,
          lunchTime: e.lunchTime
        };
        if (e.id) map[e.id] = meta;
        const dateOnly = e.date ? e.date.split('T')[0] : '';
        if (e.employeeId && dateOnly) {
          map[`${e.employeeId}_${dateOnly}_${e.hours}_${e.type}`] = meta;
          map[`${e.employeeId}_${dateOnly}`] = meta;
        }
      }
    });
    localStorage.setItem(KABEL_LOCAL_TIME_META_KEY, JSON.stringify(map));
  } catch {}
};

export const removeLocalTimeMeta = (predicate: (key: string) => boolean) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const raw = localStorage.getItem(KABEL_LOCAL_TIME_META_KEY);
    if (!raw) return;
    const map = JSON.parse(raw);
    let changed = false;
    Object.keys(map).forEach(k => {
      if (predicate(k)) {
        delete map[k];
        changed = true;
      }
    });
    if (changed) {
      localStorage.setItem(KABEL_LOCAL_TIME_META_KEY, JSON.stringify(map));
    }
  } catch {}
};

export const fetchTimeEntries = async (employeeId?: string, month?: string): Promise<TimeEntry[]> => {
  const client = getSupabase();
  if (!client) return [];
  let query = client.from('time_entries').select('*');
  
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
  if (error) throw new Error(`Záznamy: ${error.message}`);
  const camelData = toCamel(data) || [];
  return camelData.map(parseEntryTimeMeta);
};

export const addTimeEntriesBulk = async (entries: TimeEntry[]) => {
  saveLocalTimeMeta(entries);
  const client = getSupabase();
  if (!client) return;

  const snakeEntries = entries.map(e => {
    const encodedAttachment = encodeTimeMetaToAttachment(e);
    return toSnake({
      ...e,
      attachmentUrl: encodedAttachment
    });
  });

  const { error } = await client.from('time_entries').insert(snakeEntries);
  if (error) {
    // Pokud sloupce start_time/end_time ještě v databázi neexistují, zkusit bez nich
    if (error.message?.includes('start_time') || error.message?.includes('lunch_time') || error.message?.includes('column') || error.code === 'PGRST204' || (error as any).code === '42703') {
      const fallbackEntries = snakeEntries.map((item: any) => {
        const { start_time, end_time, break_minutes, lunch_time, ...rest } = item;
        return rest;
      });
      const { error: fallbackErr } = await client.from('time_entries').insert(fallbackEntries);
      if (fallbackErr) throw fallbackErr;
      return;
    }
    throw error;
  }
};

export const deleteTimeEntriesForDate = async (employeeId: string, date: string) => {
  const dateOnly = date.split('T')[0];
  removeLocalTimeMeta(key => key.includes(employeeId) && key.includes(dateOnly));
  const client = getSupabase();
  if (!client) return;
  const { error } = await client.from('time_entries').delete().eq('employee_id', employeeId).eq('date', date);
  if (error) throw error;
};

export const deleteTimeEntry = async (id: string) => {
  removeLocalTimeMeta(key => key === id);
  const client = getSupabase();
  if (!client) return;
  const { error } = await client.from('time_entries').delete().eq('id', id);
  if (error) throw error;
};

export const fetchMonthlyReports = async (month: string): Promise<MonthStatus[]> => {
  const client = getSupabase();
  if (!client) return [];
  const { data, error } = await client.from('month_status').select('*').eq('month', month);
  if (error) return [];
  return toCamel(data) || [];
};

export const upsertMonthlyReport = async (report: MonthStatus) => {
  const client = getSupabase();
  if (!client) return;
  const snakeReport = toSnake(report);
  const { error } = await client.from('month_status').upsert(snakeReport, {
    onConflict: 'employee_id,month'
  });
  if (error) throw error;
};

export const fetchNotifications = async (userId: string): Promise<Notification[]> => {
  const client = getSupabase();
  if (!client) return [];
  const { data, error } = await client.from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) return [];
  return toCamel(data) || [];
};

export const markNotificationAsRead = async (id: string) => {
  const client = getSupabase();
  if (!client) return;
  const { error } = await client.from('notifications').update({ is_read: true }).eq('id', id);
  if (error) throw error;
};

export const createNotification = async (userId: string, message: string, type: string = 'info', senderId?: string) => {
  const client = getSupabase();
  if (!client) return;
  const { error } = await client.from('notifications').insert([toSnake({
    userId,
    message,
    type,
    senderId,
    isRead: false,
    createdAt: new Date().toISOString()
  })]);
  if (error) throw error;
};

export const getFullBackup = async () => {
  const client = getSupabase();
  if (!client) throw new Error('Supabase klient není připojen.');
  const [emp, job, time, status, notifs] = await Promise.all([
    client.from('employees').select('*'),
    client.from('jobs').select('*'),
    client.from('time_entries').select('*'),
    client.from('month_status').select('*'),
    client.from('notifications').select('*')
  ]);
  
  return toCamel({
    company: 'Kabel',
    exportedAt: new Date().toISOString(),
    employees: emp.data || [],
    jobs: job.data || [],
    time_entries: time.data || [],
    month_status: status.data || [],
    notifications: notifs.data || []
  });
};

export const restoreBackup = async (backup: any) => {
  const client = getSupabase();
  if (!client) throw new Error('Supabase klient není připojen.');
  
  // Smazání stávajících dat
  await client.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await client.from('month_status').delete().neq('month', '0000-00');
  await client.from('time_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await client.from('employees').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await client.from('jobs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // Vložení ze zálohy
  if (backup.employees?.length) await client.from('employees').insert(toSnake(backup.employees));
  if (backup.jobs?.length) await client.from('jobs').insert(toSnake(backup.jobs));
  if (backup.time_entries?.length) {
    const timeEntriesSnake = toSnake(backup.time_entries);
    const { error: timeErr } = await client.from('time_entries').insert(timeEntriesSnake);
    if (timeErr) {
      const fallback = timeEntriesSnake.map((item: any) => {
        const { start_time, end_time, break_minutes, lunch_time, ...rest } = item;
        return rest;
      });
      await client.from('time_entries').insert(fallback);
    }
  }
  if (backup.month_status?.length) await client.from('month_status').insert(toSnake(backup.month_status));
  if (backup.notifications?.length) await client.from('notifications').insert(toSnake(backup.notifications));
};

// SQL skript pro inicializaci nového projektu Kabel v Supabase
export const KABEL_SUPABASE_SETUP_SQL = `-- ============================================================
-- SQL SKRIPT PRO VYTVOŘENÍ DATABÁZE V SUPABASE PRO FIRMU KABEL
-- Spusťte tento skript v Supabase SQL Editoru projektu Kabel
-- ============================================================

-- 0. Odstranění starých tabulek s nekompatibilními typy (pokud existují z dřívějška)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS month_status CASCADE;
DROP TABLE IF EXISTS time_entries CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS employees CASCADE;

-- 1. Tabulka zaměstnanců firmy Kabel
CREATE TABLE employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Zaměstnanec',
    email TEXT,
    avatar TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    pin_code TEXT,
    department TEXT
);

-- 2. Tabulka zakázek / projektů
CREATE TABLE jobs (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- 3. Tabulka docházkových záznamů
CREATE TABLE time_entries (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    project TEXT,
    description TEXT,
    hours NUMERIC(5,2) NOT NULL DEFAULT 0,
    type TEXT NOT NULL DEFAULT 'Běžná práce',
    attachment_url TEXT,
    start_time VARCHAR(10),
    end_time VARCHAR(10),
    break_minutes INTEGER DEFAULT 30,
    lunch_time VARCHAR(30)
);

-- Index pro rychlé vyhledávání podle zaměstnance a měsíce
CREATE INDEX idx_time_entries_emp_date ON time_entries(employee_id, date);

-- 4. Tabulka měsíčních statusů schválení
CREATE TABLE month_status (
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    month VARCHAR(7) NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    manager_comment TEXT,
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    PRIMARY KEY (employee_id, month)
);

-- 5. Tabulka notifikací
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    sender_id TEXT,
    type TEXT NOT NULL DEFAULT 'info',
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vypnutí RLS pro jednoduchý provoz v interní firemní aplikaci
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE month_status DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Vložení výchozích středisek a zakázek firmy Kabel
INSERT INTO jobs (id, code, name, is_active) VALUES
('job-10000', '10000', '10000 - Kancelář & administrativa', true),
('job-10001', '10001', '10001 - Výroba & montáž kabelů', true),
('job-kab-01', 'KAB-2026-01', 'Kabelové svazky pro automotive', true),
('job-kab-02', 'KAB-2026-02', 'Průmyslová kabeláž výrobní haly B', true),
('job-kab-03', 'KAB-2026-03', 'Zkoušky a kompletace optických kabelů', true),
('job-kab-04', 'KAB-SRV', 'Servisní a revizní výjezdy', true)
ON CONFLICT (id) DO NOTHING;

-- Vložení administrátora Win3 Support se všemi právy (Manager)
INSERT INTO employees (id, name, role, email, avatar, is_active, department) VALUES
('emp-win3-admin', 'Win3 Support', 'Manager', 'Roman.Winter.cz@gmail.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Win3Support', true, '10000')
ON CONFLICT (id) DO UPDATE SET role = 'Manager', is_active = true, email = 'Roman.Winter.cz@gmail.com';
`;
