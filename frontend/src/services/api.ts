import axios from 'axios';
import type { User, Group, Expense } from '../types';
import { config } from '../config/runtime';

const API_URL = config.apiUrl;

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
export type { User, Group, Expense };

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
  create: (data: { name: string; description?: string }) => 
    api.post<Group>('/groups', data),
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
  uploadInvoice: (formData: FormData) => 
    api.post('/expenses/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  delete: (id: string) => api.delete(`/expenses/${id}`),
};
