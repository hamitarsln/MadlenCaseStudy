"use client";
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';

interface User {
  id: string;
  name: string;
  email: string;
  level: string;
  role?: string;
  progress?: any;
}

interface SessionState {
  token: string | null;
  user: User | null;
  hydrated: boolean;
  setSession: (token: string, user: User) => void;
  clear: () => void;
  setHydrated: () => void;
}

function tokenExpired(token: string) {
  try {
    const decoded: any = jwtDecode(token);
    if (!decoded.exp) return false;
    return decoded.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      hydrated: false,
      setSession: (token, user) => {
        if (tokenExpired(token)) {
          return set({ token: null, user: null });
        }
        set({ token, user });
      },
      clear: () => set({ token: null, user: null }),
      setHydrated: () => set({ hydrated: true })
    }),
    {
      name: 'madlen-session',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.token && tokenExpired(state.token)) {
          state.token = null;
          state.user = null;
        }
        state?.setHydrated();
      }
    }
  )
);

export function authHeader() {
  const { token } = useSessionStore.getState();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
