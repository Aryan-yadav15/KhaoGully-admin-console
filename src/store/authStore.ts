import { create } from 'zustand';
import api from '@/lib/api';

interface Admin {
  id: number;
  email: string;
  full_name: string;
}

interface AuthStore {
  admin: Admin | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  admin: null,
  token: localStorage.getItem('admin_token'),
  isAuthenticated: !!localStorage.getItem('admin_token'),

  login: async (email: string, password: string) => {
    const response = await api.post('/auth/admin/login', { email, password });
    const { access_token, admin } = response.data;
    
    localStorage.setItem('admin_token', access_token);
    set({ token: access_token, admin, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('admin_token');
    set({ admin: null, token: null, isAuthenticated: false });
  },

  checkAuth: () => {
    const token = localStorage.getItem('admin_token');
    set({ isAuthenticated: !!token, token });
  },
}));
