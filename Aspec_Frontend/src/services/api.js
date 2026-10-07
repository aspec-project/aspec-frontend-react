import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    Accept: "application/json",
  },
});

const TOKEN_KEY = "aspec_token";

export function setAuthToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
  delete api.defaults.headers.common.Authorization;
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

const existingToken = getStoredToken();
if (existingToken) {
  api.defaults.headers.common.Authorization = `Bearer ${existingToken}`;
}

/*
 * Evita vários redirecionamentos quando mais do que um pedido
 * recebe 401 ao mesmo tempo, por exemplo numa sessão expirada.
 */
let isRedirectingToLogin = false

/*
 * O serviço Axios não pode usar useNavigate. Por isso usa a
 * localização do browser para encaminhar para o login.
 */
function redirectToLogin() {
  if (typeof window === 'undefined') {
    return
  }

  /*
   * Um 401 no próprio login representa credenciais inválidas.
   * Nesse caso, mantemos a página para o formulário mostrar o erro.
   */
  if (window.location.pathname === '/login' || isRedirectingToLogin) {
    return
  }

  isRedirectingToLogin = true
  window.location.replace('/login')
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const { useAuthStore } = await import("../store/authStore");
      useAuthStore.getState().clearSession();
      redirectToLogin()
    }
    return Promise.reject(error);
  }
);

export function normalizeError(error) {
  const status = error.response?.status;
  const body = error.response?.data;

  const fieldErrors = {};
  if (body?.errors) {
    Object.entries(body.errors).forEach(([field, msgs]) => {
      fieldErrors[field] = Array.isArray(msgs) ? msgs[0] : msgs;
    });
  }

  return {
    status,
    message:
      body?.message ??
      (status ? `Erro do servidor (${status}).` : "Não foi possível contactar o servidor."),
    fieldErrors,
  };
}

export function extractList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}