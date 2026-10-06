import { create } from "zustand";
import { api, setAuthToken, clearAuthToken, getStoredToken, normalizeError } from "../services/api";

const LOGIN_ENDPOINT = "/auth/login";
const LOGOUT_ENDPOINT = "/auth/logout";
const USER_KEY = "aspec_user";

function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistUser(user) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}


const initialUser = getStoredToken() ? getStoredUser() : null;

export const useAuthStore = create((set, get) => ({
  user: initialUser,
  role: initialUser?.role ?? null, 
  status: initialUser ? "authenticated" : "idle", 
  error: null,

  isAuthenticated: () => !!get().user,

  login: async (email, password) => {
    set({ status: "loading", error: null });
    try {
      const res = await api.post(LOGIN_ENDPOINT, { email, password });
      const { token, user } = res.data.data;

      setAuthToken(token);
      persistUser(user);
      set({ user, role: user.role, status: "authenticated", error: null });
      return { success: true };
    } catch (err) {
      const normalized = normalizeError(err);
      set({ status: "error", error: normalized.message });
      return { success: false, error: normalized };
    }
  },

  logout: async () => {
    try {
      await api.post(LOGOUT_ENDPOINT);
    } catch {

    } finally {
      get().clearSession();
    }
  },

  clearSession: () => {
    clearAuthToken();
    persistUser(null);
    set({ user: null, role: null, status: "idle", error: null });
  },
}));