
export enum WorkType {
  REGULAR = 'Běžná práce',
  OVERTIME = 'Přesčas',
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
}

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
