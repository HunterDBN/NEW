import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { fetchSessionProfile } from '@/services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionUser {
  id:         string;
  email:      string;
  username:   string | null;
  avatar_url: string | null;
  bio:        string | null;
}

interface SessionState {
  user:    SessionUser | null;
  loading: boolean;
  init:    () => Promise<void>;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: SessionUser | null) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSessionStore = create<SessionState>((set, get) => ({
  user:    null,
  loading: true,

  init: async () => {
    set({ loading: true });

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) { set({ user: null, loading: false }); return; }
      await get()._load(session.user.id, session.user.email ?? '');
    });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { set({ user: null, loading: false }); return; }
    await get()._load(session.user.id, session.user.email ?? '');
  },

  refresh: async () => {
    const { user } = get();
    if (!user) return;
    await get()._load(user.id, user.email);
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },

  setUser: (user) => set({ user }),

  _load: async (id: string, email: string) => {
    const { data } = await fetchSessionProfile(id, email);
    set({ loading: false, user: data ?? { id, email, username: null, avatar_url: null, bio: null } });
  },
} as SessionState & { _load: (id: string, email: string) => Promise<void> }));
