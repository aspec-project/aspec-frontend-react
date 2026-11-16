import { api, normalizeError } from "./api";
import { isEventId } from "./events";
import { getSessionContext, isSessionCurrent } from "./sessionContext";

const conflicts = new Set([
  "O prazo de inscrição para este evento terminou.",
  "Já está inscrito neste evento.",
  "O evento atingiu a lotação máxima.",
  "O prazo para cancelar a inscrição terminou.",
]);

const seriesConflict = /^(?:Já está inscrito na sessão de \d{2}\/\d{2}\/\d{4}\.|A sessão de \d{2}\/\d{2}\/\d{4} atingiu a lotação máxima\.|O prazo de inscrição da sessão de \d{2}\/\d{2}\/\d{4} terminou\.)$/;

/**
 * Converte o erro de um pedido de inscrição numa mensagem para o membro. Nos 409 só mostra mensagens
 * do servidor conhecidas, incluindo as da série com a data da sessão que falhou.
 *
 * @param {unknown} error Erro do axios.
 * @returns {string} Mensagem em pt-PT.
 */
export function getRegistrationErrorMessage(error) {
  const status = error?.response?.status;
  const message = error?.response?.data?.message;
  if (status === 409 && typeof message === "string" && (conflicts.has(message) || seriesConflict.test(message))) return message;
  if (status === 404) return "O evento ou a sua inscrição já não está disponível.";
  if (status === 401) return "Inicie sessão para gerir a sua inscrição.";
  if (status === 403) return "Não tem permissão para gerir esta inscrição.";
  if (status === 419 || status === 429) return normalizeError({ response: { status } }).message;
  return "Não foi possível confirmar o resultado da operação. Consulte o estado atualizado da inscrição.";
}

/*
 * Devolve as inscrições do membro autenticado. O backend já ordena os
 * próximos eventos antes dos eventos passados.
 */
export async function getMyEventRegistrations(
  signal,
  context = getSessionContext(),
) {
  if (!isSessionCurrent(context)) {
    throw new Error('O contexto da sessão é inválido.')
  }

  const config = {
    signal: signal
      ? AbortSignal.any([signal, context.signal])
      : context.signal,
    sessionGeneration: context.generation,
  }

  const response = await api.get('/me/registrations', config)
  const registrations = response.data?.data

  if (
    !isSessionCurrent(context) ||
    response.data?.success !== true ||
    !Array.isArray(registrations)
  ) {
    throw new Error('Não foi possível confirmar a lista de inscrições.')
  }

  return registrations
}

export async function changeEventRegistration(id, action, signal, context = getSessionContext(), scope) {
  if (!isEventId(id) || !["register", "cancel"].includes(action) || !isSessionCurrent(context) ||
    (scope !== undefined && (action !== "register" || scope !== "this_and_following"))) {
    throw new Error("O contexto da inscrição é inválido.");
  }
  const url = `/events/${encodeURIComponent(id)}/registrations`;
  const config = { signal: signal ? AbortSignal.any([signal, context.signal]) : context.signal, sessionGeneration: context.generation };
  const response = action === "register" ? await api.post(url, scope ? { scope } : undefined, config) : await api.delete(url, config);
  const registrations = response.data?.data?.registrations;
  const validGroup = scope === "this_and_following" && Array.isArray(registrations) && registrations.length > 0 &&
    registrations.every((registration) => isEventId(registration?.id) && isEventId(registration.event_instance_id)) &&
    registrations.some((registration) => registration.event_instance_id === id) &&
    new Set(registrations.map((registration) => registration.id.toLowerCase())).size === registrations.length &&
    new Set(registrations.map((registration) => registration.event_instance_id.toLowerCase())).size === registrations.length;
  const valid = response.data?.success === true && (action === "register"
    ? response.status === 201 && (scope ? validGroup : isEventId(response.data?.data?.id) && response.data.data.event_instance_id === id)
    : response.status === 200 && response.data.data === null);
  if (!isSessionCurrent(context) || !valid) throw new Error("Não foi possível confirmar a resposta da inscrição.");
}
