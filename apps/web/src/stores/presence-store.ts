import { create } from 'zustand';

export interface RemoteUser {
  id: string;
  name: string;
  color: string;
  sceneX?: number;
  sceneY?: number;
  lastSeen: number;
}

interface PresenceStoreState {
  localUser: { name: string; color: string };
  remoteUsers: Map<string, RemoteUser>;
  
  setLocalUser: (user: { name: string; color: string }) => void;
  updateRemoteUser: (user: RemoteUser) => void;
  removeRemoteUser: (id: string) => void;
  initRemoteUsers: (users: RemoteUser[]) => void;
}

export const usePresenceStore = create<PresenceStoreState>((set) => ({
  localUser: { 
    name:
      typeof window !== 'undefined'
        ? localStorage.getItem('buildev-user-name') ||
          localStorage.getItem('openpencil-user-name') ||
          'Anonymous'
        : 'Anonymous',
    color: '#0D99FF' 
  },
  remoteUsers: new Map(),

  setLocalUser: (localUser) => {
    localStorage.setItem('buildev-user-name', localUser.name);
    set({ localUser });
  },

  updateRemoteUser: (user) => set((state) => {
    const next = new Map(state.remoteUsers);
    next.set(user.id, user);
    return { remoteUsers: next };
  }),

  removeRemoteUser: (id) => set((state) => {
    const next = new Map(state.remoteUsers);
    next.delete(id);
    return { remoteUsers: next };
  }),

  initRemoteUsers: (users) => set(() => {
    const next = new Map();
    users.forEach(u => next.set(u.id, u));
    return { remoteUsers: next };
  }),
}));
