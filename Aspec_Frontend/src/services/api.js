import axios from "axios";
import { getSessionContext, isSessionCurrent } from './sessionContext';

export const API_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:8000";

/*
 * Remove dados da autenticação antiga por token.
 * A sessão passa a ser mantida apenas nos cookies HttpOnly do Laravel.
 */
if (typeof window !== "undefined") {
  localStorage.removeItem("aspec_token");
  localStorage.removeItem("aspec_user");
}

/*
 * Cliente para todos os pedidos da API.
 * withCredentials envia os cookies de sessão e withXSRFToken envia
 * automaticamente o token CSRF recebido do Sanctum.
 */
export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: "application/json",
  },
});

// Estas listas não variam por identidade. Não interromper o seu carregamento
// público quando a confirmação inicial de /auth/me termina.
const publicLists = new Set([
  '/members', '/events', '/sectors', '/locations',
  '/social-platforms', '/week-days', '/event-categories',
]);

api.interceptors.request.use((config) => {
  const context = getSessionContext();
  config.sessionIndependent = config.sessionGeneration === undefined &&
    config.method === 'get' && publicLists.has(config.url);
  if (config.sessionGeneration !== undefined && config.sessionGeneration !== context.generation) {
    throw new axios.CanceledError('Pedido de uma sessão anterior.', config);
  }
  config.sessionGeneration = context.generation;
  if (!config.sessionIndependent) {
    config.signal = config.signal
      ? AbortSignal.any([config.signal, context.signal])
      : context.signal;
  }
  return config;
}, (error) => { throw error; }, { synchronous: true });

function belongsToCurrentSession(config) {
  const context = getSessionContext();
  return config?.sessionGeneration === context.generation && isSessionCurrent(context);
}

/*
 * Pede ao Laravel o cookie XSRF-TOKEN antes de login ou registo.
 * Este endpoint fica fora do prefixo /api.
 */
export async function ensureCsrfCookie() {
  await axios.get(`${API_URL}/sanctum/csrf-cookie`, {
    withCredentials: true,
    withXSRFToken: true,
    headers: {
      Accept: "application/json",
    },
  });
}

/*
 * Mensagens de reserva para erros sem mensagem enviada pela API.
 */
const CLIENT_FALLBACK_MESSAGES = {
  419: "A sessão expirou. Atualize a página e tente novamente.",
  429: "Demasiados pedidos. Tente novamente mais tarde.",
};

/*
 * Evita vários redirecionamentos quando mais do que um pedido
 * recebe 401 ao mesmo tempo, por exemplo numa sessão expirada.
 */
let isRedirectingToLogin = false;

/*
 * O serviço Axios não pode usar useNavigate. Por isso usa a
 * localização do browser para encaminhar para o login.
 */
function redirectToLogin() {
  if (typeof window === "undefined") {
    return;
  }

  if (window.location.pathname === "/login" || isRedirectingToLogin) {
    return;
  }

  isRedirectingToLogin = true;
  window.location.replace("/login");
}

api.interceptors.response.use(
  (response) => {
    if (!response.config.sessionIndependent && !belongsToCurrentSession(response.config)) {
      throw new axios.CanceledError('Resposta de uma sessão anterior.', response.config);
    }
    return response;
  },
  async (error) => {
    /*
     * fetchUser usa skipAuthRedirect porque um visitante sem sessão
     * não deve ser redirecionado para login só por abrir a página inicial.
     */
    if (
      error.response?.status === 401 &&
      !error.config?.skipAuthRedirect &&
      belongsToCurrentSession(error.config)
    ) {
      const { useAuthStore } = await import("../store/authStore");
      if (belongsToCurrentSession(error.config)) {
        useAuthStore.getState().clearSession();
        redirectToLogin();
      }
    }

    return Promise.reject(error);
  }
);

export function normalizeError(error) {
  const status = error.response?.status;
  const body = error.response?.data;

  const fieldErrors = {};

  if (body?.errors) {
    Object.entries(body.errors).forEach(([field, messages]) => {
      fieldErrors[field] = Array.isArray(messages)
        ? messages[0]
        : messages;
    });
  }

  return {
    status,
    message:
      body?.message ??
      CLIENT_FALLBACK_MESSAGES[status] ??
      (status
        ? `Erro do servidor (${status}).`
        : "Não foi possível contactar o servidor."),
    fieldErrors,
  };
}

export function extractList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;

  return [];
}
