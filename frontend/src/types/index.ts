export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  members?: any[];
  expenses?: any[];
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  category?: string;
  date: string;
  imageUrl?: string;
  user: User;
  group: Group;
}

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId?: string;
  userName?: string;
  oldValues?: any;
  newValues?: any;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface GroupMember {
  id: string;
  userId: string;
  groupId: string;
  role: string;
  joinedAt: string;
  user?: User;
  group?: Group;
}

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

export interface Payment {
  id: string;
  amount: number;
  fromUserId: string;
  toUserId: string;
  groupId: string;
  status: PaymentStatus;
  description?: string;
  createdAt: string;
  completedAt?: string;
  updatedAt: string;
  fromUser?: User;
  toUser?: User;
  group?: Group;
}

export type ReminderFrequency = 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'EVERY_6_MONTHS';

export interface RecurringReminder {
  id: string;
  title: string;
  description?: string;
  amount: number;
  frequency: ReminderFrequency;
  groupId: string;
  nextDueDate: string;
  isActive: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: User;
  group?: Group;
}
