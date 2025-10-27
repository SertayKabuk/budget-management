import axios from 'axios';
import type { User, Group, Expense, AuditLog, GroupMember, Payment, PaymentStatus, RecurringReminder, ReminderFrequency } from '../types';
import { config } from '../config/runtime';

const API_URL = config.apiUrl;


// Fetch image with authentication and return blob URL
export const fetchAuthenticatedImage = async (imageUrl: string | null | undefined): Promise<string | null> => {
  if (!imageUrl) return null;
  
  const filename = imageUrl.split('/').pop();
  if (!filename) return null;
  
  try {
    const response = await api.get(`/expenses/image/${filename}`, {
      responseType: 'blob'
    });
    
    // Create a blob URL that can be used in img tags
    const blobUrl = URL.createObjectURL(response.data);
    return blobUrl;
  } catch (error) {
    console.error('Error fetching authenticated image:', error);
    return null;
  }
};

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors (redirect to login)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Re-export types
export type { User, Group, Expense, AuditLog, GroupMember, Payment, PaymentStatus, RecurringReminder, ReminderFrequency };

export const userApi = {
  getAll: () => api.get<User[]>('/users'),
  getById: (id: string) => api.get<User>(`/users/${id}`),
  updateRole: (id: string, role: string) => 
    api.patch<User>(`/users/${id}/role`, { role }),
  // Manual user creation is disabled - users are created automatically via Google OAuth
};

export const groupApi = {
  getAll: () => api.get<Group[]>('/groups'),
  getById: (id: string) => api.get<Group>(`/groups/${id}`),
  getSummary: (id: string) => api.get(`/groups/${id}/summary`),
  getMembers: (groupId: string) => api.get<GroupMember[]>(`/groups/${groupId}/members`),
  create: (data: { name: string; description?: string }) => 
    api.post<Group>('/groups', data),
  update: (id: string, data: { name: string; description?: string }) =>
    api.put<Group>(`/groups/${id}`, data),
  addMember: (groupId: string, userId: string, role?: string) =>
    api.post(`/groups/${groupId}/members`, { userId, role }),
};

export const expenseApi = {
  getAll: (groupId?: string) => 
    api.get<Expense[]>('/expenses', { params: { groupId } }),
  getById: (id: string) => api.get<Expense>(`/expenses/${id}`),
  create: (data: {
    amount: number;
    description: string;
    category?: string;
    date?: string;
    userId: string;
    groupId: string;
  }) => api.post<Expense>('/expenses', data),
  update: (id: string, data: {
    amount: number;
    description: string;
    category?: string;
    date?: string;
    userId: string;
    groupId: string;
  }) => api.put<Expense>(`/expenses/${id}`, data),
  delete: (id: string) => api.delete(`/expenses/${id}`),
};

export const auditApi = {
  getAll: (params?: {
    limit?: number;
    entityType?: string;
    entityId?: string;
    userId?: string;
    action?: string;
  }) => api.get<AuditLog[]>('/audit', { params }),
  getForEntity: (entityType: string, entityId: string, limit?: number) =>
    api.get<AuditLog[]>(`/audit/entity/${entityType}/${entityId}`, { params: { limit } }),
  getByUser: (userId: string, limit?: number) =>
    api.get<AuditLog[]>(`/audit/user/${userId}`, { params: { limit } }),
  getStats: () => api.get('/audit/stats'),
  getChanges: (entityType: string, entityId: string) =>
    api.get(`/audit/changes/${entityType}/${entityId}`),
};

export const paymentApi = {
  getAll: (groupId?: string) =>
    api.get<Payment[]>('/payments', { params: { groupId } }),
  getById: (id: string) => api.get<Payment>(`/payments/${id}`),
  create: (data: {
    fromUserId: string;
    toUserId: string;
    groupId: string;
    amount: number;
    description?: string;
  }) => api.post<Payment>('/payments', data),
  update: (id: string, data: {
    fromUserId?: string;
    toUserId?: string;
    amount?: number;
    description?: string;
    status?: PaymentStatus;
  }) => api.put<Payment>(`/payments/${id}`, data),
  updateStatus: (id: string, status: PaymentStatus, description?: string) =>
    api.put<Payment>(`/payments/${id}`, { status, description }),
  delete: (id: string) => api.delete(`/payments/${id}`),
};

export const reminderApi = {
  getAll: (groupId?: string) =>
    api.get<RecurringReminder[]>('/reminders', { params: { groupId } }),
  getById: (id: string) => api.get<RecurringReminder>(`/reminders/${id}`),
  create: (data: {
    title: string;
    description?: string;
    amount: number;
    frequency: ReminderFrequency;
    groupId: string;
    nextDueDate: string;
  }) => api.post<RecurringReminder>('/reminders', data),
  update: (id: string, data: {
    title?: string;
    description?: string;
    amount?: number;
    frequency?: ReminderFrequency;
    nextDueDate?: string;
  }) => api.put<RecurringReminder>(`/reminders/${id}`, data),
  toggleActive: (id: string) =>
    api.patch<RecurringReminder>(`/reminders/${id}/toggle`),
  delete: (id: string) => api.delete(`/reminders/${id}`),
};
