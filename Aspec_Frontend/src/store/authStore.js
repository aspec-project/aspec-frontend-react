import { create } from "zustand";
import {
  api,
  ensureCsrfCookie,
  normalizeError,
} from "../services/api";

const LOGIN_ENDPOINT = "/auth/login";
const LOGOUT_ENDPOINT = "/auth/logout";
const CURRENT_USER_ENDPOINT = "/auth/me";

function setAuthenticatedUser(set, user) {
  set({
    user,
    role: user.role ?? null,
    status: "authenticated",
    error: null,
  });
}

export const useAuthStore = create((set, get) => ({
  /*
   * A aplicação começa a confirmar a sessão guardada no cookie.
   * Enquanto isso, as rotas protegidas mantêm-se em loading.
   */
  user: null,
  role: null,
  status: "loading",
  error: null,

  isAuthenticated: () => !!get().user,

  /*
   * Obtém o utilizador da sessão atual através do cookie Sanctum.
   * Um visitante sem sessão é normal e não deve ser redirecionado.
   */
  fetchUser: async () => {
    try {
      const response = await api.get(CURRENT_USER_ENDPOINT, {
        skipAuthRedirect: true,
      });

      const user = response.data.data;
      setAuthenticatedUser(set, user);

      return { success: true, user };
    } catch (error) {
      set({
        user: null,
        role: null,
        status: "idle",
        error: null,
      });

      return {
        success: false,
        error: normalizeError(error),
      };
    }
  },

  /*
   * É chamado quando a aplicação arranca para restaurar uma sessão
   * que continue válida no browser.
   */
  initialize: async () => get().fetchUser(),

  login: async (email, password) => {
    set({ status: "loading", error: null });

    try {
      /*
       * O cookie CSRF tem de ser pedido antes do POST de login.
       */
      await ensureCsrfCookie();

      const response = await api.post(
        LOGIN_ENDPOINT,
        { email, password },
        { skipAuthRedirect: true }
      );

      const user = response.data.data;
      setAuthenticatedUser(set, user);

      return { success: true };
    } catch (error) {
      const normalized = normalizeError(error);

      set({
        user: null,
        role: null,
        status: "error",
        error: normalized.message,
      });

      return { success: false, error: normalized };
    }
  },

  logout: async () => {
    try {
      await api.post(LOGOUT_ENDPOINT);
    } catch {
      /*
       * Mesmo que a sessão já tenha expirado no servidor,
       * a aplicação termina sempre a sessão localmente.
       */
    } finally {
      get().clearSession();
    }
  },

  clearSession: () => {
    set({
      user: null,
      role: null,
      status: "idle",
      error: null,
    });
  },
}));