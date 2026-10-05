export enum WorkType {
  REGULAR = 'Běžná práce',
  OVERTIME = 'Přesčas',
  DRIVE = 'Jízda',
  VACATION = 'Dovolená',
  SICK_DAY = 'Nemocenská',
  HOLIDAY = 'Svátek',
  OCR = 'OČR (Ošetřovné)',
  DOCTOR = 'Lékař',
  BUSINESS_TRIP = 'Služební cesta',
  UNPAID_LEAVE = 'Neplacené volno',
  COMPENSATORY_LEAVE = 'Náhradní volno',
  OTHER_OBSTACLE = 'Jiná překážka',
  SIXTY_PERCENT = '60%'
}

export const isWorkingTime = (type: WorkType | string): boolean => {
  return type !== WorkType.DRIVE && type !== 'Jízda';
};

export enum TimesheetStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface Employee {
  id: string;
  name: string;
  role: 'Manager' | 'Zaměstnanec';
  email: string;
  avatar: string;
  isActive: boolean;
  pinCode?: string;
  department?: '101' | '102' | '103' | string;
}

export const DEPARTMENT_OPTIONS = [
  { code: '101', name: '101 - správa' },
  { code: '102', name: '102 - výroba' },
  { code: '103', name: '103 - dělníci' }
] as const;

export const formatDepartment = (dept?: string): string => {
  if (!dept) return 'Bez střediska';
  if (dept === '101' || dept === '10000') return '101 - správa';
  if (dept === '102' || dept === '10001') return '102 - výroba';
  if (dept === '103') return '103 - dělníci';
  return dept;
};

export interface Job {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface TimeEntry {
  id: string;
  employeeId: string;
  date: string;
  project: string;
  description: string;
  hours: number;
  type: WorkType;
  attachmentUrl?: string;
  startTime?: string;
  endTime?: string;
  breakMinutes?: number;
  lunchTime?: string;
}

export interface MonthStatus {
  employeeId?: string;
  month: string;
  status: TimesheetStatus;
  managerComment?: string;
  submittedAt?: string;
  approvedAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  senderId?: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ValidationIssue {
  date: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  type: string;
}
