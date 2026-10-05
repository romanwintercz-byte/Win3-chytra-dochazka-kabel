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

export interface ResponsibilityRole {
  id: string;
  name: string;
  level: number; // 1 = Dělník, 2 = Předák, 3 = Mistr, 4 = Vedoucí, 5 = Vedení
  description?: string;
  badgeColor?: string;
  canApproveWeekly?: boolean;
  canManageAll?: boolean;
}

export const DEFAULT_RESPONSIBILITY_ROLES: ResponsibilityRole[] = [
  {
    id: 'role-delnik',
    name: 'Dělník',
    level: 1,
    description: 'Zapisuje svou denní docházku a jízdu na zakázky.',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
    canApproveWeekly: false,
    canManageAll: false
  },
  {
    id: 'role-predak',
    name: 'Předák',
    level: 2,
    description: 'Denní kontrola své party a pomoc s řešením chyb.',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    canApproveWeekly: false,
    canManageAll: false
  },
  {
    id: 'role-mistr',
    name: 'Mistr',
    level: 3,
    description: 'Týdenní schvalovatel docházky každý pátek za své středisko / dílnu.',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    canApproveWeekly: true,
    canManageAll: false
  },
  {
    id: 'role-vedouci',
    name: 'Vedoucí výroby',
    level: 4,
    description: 'Dohled nad mistry, řešení přesčasů a provozu výrobních linek.',
    badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
    canApproveWeekly: true,
    canManageAll: false
  },
  {
    id: 'role-vedeni',
    name: 'Vedení / Mzdy / Admin',
    level: 5,
    description: 'Měsíční uzávěrka pro mzdy, exporty a kompletní správa systému.',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    canApproveWeekly: true,
    canManageAll: true
  }
];

export interface Employee {
  id: string;
  name: string;
  role: 'Manager' | 'Zaměstnanec';
  customRoleId?: string;
  supervisorId?: string;
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
