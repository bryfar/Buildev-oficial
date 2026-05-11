import { create } from 'zustand';
import { appStorage } from '../utils/app-storage';
import { getEffectiveApiBase } from '../utils/api-base';

interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

interface AuthState {
  token: string | null;
  userId: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (token: string, userId: string, user?: User) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
  startGitHubLogin: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: appStorage.getItem('bs_token'),
  userId: appStorage.getItem('bs_userId'),
  user: null,
  isAuthenticated: !!appStorage.getItem('bs_token'),
  isLoading: false,

  login: (token, userId, user) => {
    appStorage.setItem('bs_token', token);
    appStorage.setItem('bs_userId', userId);
    set({ token, userId, user, isAuthenticated: true });
  },

  logout: () => {
    appStorage.removeItem('bs_token');
    appStorage.removeItem('bs_userId');
    set({ token: null, userId: null, user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    const { token } = get();
    const base = getEffectiveApiBase();
    if (!token || !base) return;

    set({ isLoading: true });
    try {
      const res = await fetch(`${base}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        set({ user: json.data, isAuthenticated: true });
      } else {
        get().logout();
      }
    } catch {
      // Offline or error
    } finally {
      set({ isLoading: false });
    }
  },

  startGitHubLogin: async () => {
    const base = getEffectiveApiBase();
    if (!base) return;
    const redirect = encodeURIComponent(
      `${window.location.origin}${window.location.pathname}${window.location.search}`,
    );
    window.location.href = `${base}/api/auth/github?redirect=${redirect}`;
  },
}));
