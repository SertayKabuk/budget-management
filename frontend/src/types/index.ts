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
