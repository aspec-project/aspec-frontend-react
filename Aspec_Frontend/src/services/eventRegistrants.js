import { api, normalizeError } from "./api";
import { isEventId } from "./events";

export async function getEventRegistrants(id, signal) {
  if (!isEventId(id)) throw new Error("O identificador do evento é inválido.");
  const response = await api.get(`/events/${encodeURIComponent(id)}/registrants`, { signal });
  const registrants = response.data?.data;
  if (response.data?.success !== true || !Array.isArray(registrants) || registrants.some(
    (item) => !item || (item.business_name !== null && typeof item.business_name !== "string")
  )) {
    throw new Error("A resposta das empresas inscritas tem um formato inesperado.");
  }

  /*
   * O contrato identifica apenas nomes de empresas. Descarta quaisquer outros
   * campos e preserva entradas com nomes iguais ou indisponíveis.
   */
  return registrants.map((item) => ({ business_name: item.business_name?.trim() || null }));
}

export function getEventRegistrantsErrorMessage(error) {
  const status = error?.response?.status;
  if (status === 403) return "Não tem permissão para consultar as empresas inscritas.";
  if (status === 404) return "A lista de empresas inscritas não está disponível.";
  if (status === 419 || status === 429) return normalizeError({ response: { status } }).message;
  return "Não foi possível carregar as empresas inscritas. Tente novamente.";
}
