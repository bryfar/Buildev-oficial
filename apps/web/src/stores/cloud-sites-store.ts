import { create } from 'zustand';
import { useAuthStore } from './auth-store';
import { getEffectiveApiBase } from '../utils/api-base';

interface CloudSite {
  id: string;
  name: string;
  projectType: string;
  createdAt: string;
  updatedAt: string;
}

interface CloudSitesState {
  sites: CloudSite[];
  isLoading: boolean;
  fetchSites: () => Promise<void>;
}

export const useCloudSitesStore = create<CloudSitesState>((set) => ({
  sites: [],
  isLoading: false,

  fetchSites: async () => {
    const { token, isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated || !token) return;
    const base = getEffectiveApiBase();
    if (!base) return;

    set({ isLoading: true });
    try {
      const res = await fetch(`${base}/api/sites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.ok) {
          // Filter only 'pencil' (design) projects
          const pencilSites = json.data.filter((s: any) => s.projectType === 'pencil');
          set({ sites: pencilSites });
        }
      }
    } catch (err) {
      console.error('Failed to fetch cloud sites', err);
    } finally {
      set({ isLoading: false });
    }
  },
}));
