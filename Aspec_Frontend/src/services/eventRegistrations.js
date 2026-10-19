import { api, normalizeError } from "./api";
import { isEventId } from "./events";
import { getSessionContext, isSessionCurrent } from "./sessionContext";

const conflicts = new Set([
  "O prazo de inscrição para este evento terminou.",
  "Já está inscrito neste evento.",
  "O evento atingiu a lotação máxima.",
  "O prazo para cancelar a inscrição terminou.",
]);

export function getRegistrationErrorMessage(error) {
  const status = error?.response?.status;
  const message = error?.response?.data?.message;
  if (status === 409 && conflicts.has(message)) return message;
  if (status === 404) return "O evento ou a sua inscrição já não está disponível.";
  if (status === 401) return "Inicie sessão para gerir a sua inscrição.";
  if (status === 403) return "Não tem permissão para gerir esta inscrição.";
  if (status === 419 || status === 429) return normalizeError({ response: { status } }).message;
  return "Não foi possível confirmar o resultado da operação. Consulte o estado atualizado da inscrição.";
}

export async function changeEventRegistration(id, action, signal, context = getSessionContext()) {
  if (!isEventId(id) || !["register", "cancel"].includes(action) || !isSessionCurrent(context)) {
    throw new Error("O contexto da inscrição é inválido.");
  }
  const url = `/events/${encodeURIComponent(id)}/registrations`;
  const config = { signal: signal ? AbortSignal.any([signal, context.signal]) : context.signal, sessionGeneration: context.generation };
  const response = action === "register" ? await api.post(url, undefined, config) : await api.delete(url, config);
  const valid = response.data?.success === true && (action === "register"
    ? response.status === 201 && isEventId(response.data?.data?.id) && response.data.data.event_instance_id === id
    : response.status === 200 && response.data.data === null);
  if (!isSessionCurrent(context) || !valid) throw new Error("Não foi possível confirmar a resposta da inscrição.");
}
