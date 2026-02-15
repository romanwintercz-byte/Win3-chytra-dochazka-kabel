
// This file acts as a simplified facade. In demo mode it returns empty/mock, 
// in real mode it would call Supabase.
import { Employee, Job, TimeEntry, MonthStatus, Notification } from '../types';

export const fetchEmployees = async (): Promise<Employee[]> => [];
export const addEmployee = async (emp: Employee) => {};
export const updateEmployee = async (emp: Employee) => {};
export const updateEmployeeStatus = async (id: string, isActive: boolean) => {};

export const fetchJobs = async (): Promise<Job[]> => [];
export const addJob = async (job: Job) => {};
export const updateJobStatus = async (id: string, isActive: boolean) => {};

export const fetchTimeEntries = async (): Promise<TimeEntry[]> => [];
export const addTimeEntriesBulk = async (entries: TimeEntry[]) => {};
export const deleteTimeEntriesForDate = async (employeeId: string, date: string) => {};
export const deleteTimeEntry = async (id: string) => {};

export const fetchMonthlyReports = async (month: string): Promise<MonthStatus[]> => [];
export const upsertMonthlyReport = async (report: MonthStatus) => {};

export const fetchGlobalLock = async (month: string): Promise<boolean> => false;
export const fetchNotifications = async (userId: string): Promise<Notification[]> => [];
export const markNotificationAsRead = async (id: string) => {};
export const markAllNotificationsAsRead = async (userId: string) => {};
export const createNotification = async (userId: string, message: string, type: string = 'info', senderId?: string) => {};

export const subscribeToPresence = (userId: string, onSync: (ids: string[]) => void) => ({ unsubscribe: () => {} });
export const subscribeToNotifications = (userId: string, onNewNotification: (n: Notification) => void) => ({ unsubscribe: () => {} });
