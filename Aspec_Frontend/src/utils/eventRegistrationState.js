import { isIsoDateTime } from './dateFormat'

/** Textos da linha de estado das inscrições, por estado. */
export const REGISTRATION_STATE_LABELS = {
  open: 'Inscrições abertas',
  full: 'Lotação esgotada',
  closed: 'Inscrições encerradas',
}

/** Texto da linha das vagas quando o prazo de inscrição já terminou. */
export const CLOSED_SPOTS_LABEL = 'Prazo de inscrição terminado'

/**
 * Estado das inscrições de um evento para mostrar ao público.
 * O prazo vem primeiro: depois dele as inscrições estão encerradas, haja ou não vagas.
 *
 * @param {{registration_open?: unknown, registration_deadline?: unknown, available_spots?: unknown}} event Evento ou sessão da API.
 * @param {number} [now] Instante de referência em milissegundos (por omissão, o atual).
 * @returns {'open'|'full'|'closed'|null} null quando a API não indicou o estado.
 */
export function getRegistrationState(event, now = Date.now()) {
  if (typeof event?.registration_open !== 'boolean') return null
  if (isIsoDateTime(event.registration_deadline) && now > Date.parse(event.registration_deadline)) return 'closed'
  if (event.registration_open) return 'open'
  return event.available_spots === 0 ? 'full' : 'closed'
}
