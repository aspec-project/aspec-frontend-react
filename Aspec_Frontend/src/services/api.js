import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    "Content-Type": "application/json",
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