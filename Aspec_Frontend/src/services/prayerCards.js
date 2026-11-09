import { api } from './api'
import { getSessionContext, isSessionCurrent } from './sessionContext'
import { CanceledError } from 'axios'
import { isEventId } from './events'

const REQUEST_FIELDS = ['personal_request', 'work_request', 'salvation_request']

function ownCardConfig(id, signal, context) {
  if (!isEventId(id)) throw new Error('O identificador do evento é inválido.')
  if (!isSessionCurrent(context) || signal?.aborted) throw new CanceledError('A sessão já não está ativa.')
  return {
    signal: signal ? AbortSignal.any([signal, context.signal]) : context.signal,
    sessionGeneration: context.generation,
  }
}

function ownCardResult(response, context, signal) {
  if (!isSessionCurrent(context) || signal?.aborted) throw new CanceledError('A sessão já não está ativa.')
  const data = response.data?.data
  if (response.data?.success !== true || !data ||
    !['not_open', 'open', 'closed'].includes(data.window?.status) ||
    !['pending', 'distributed', 'unpaired'].includes(data.distribution_status) ||
    typeof data.event_date !== 'string' ||
    (data.prayer_verse !== null && typeof data.prayer_verse !== 'string') ||
    (data.card !== null && (!data.card || REQUEST_FIELDS.some((key) => data.card[key] !== null && typeof data.card[key] !== 'string')))) {
    throw new Error('Não foi possível confirmar o cartão de oração.')
  }
  return data
}

export async function getOwnPrayerCard(id, signal, context = getSessionContext()) {
  const response = await api.get(`/events/${encodeURIComponent(id)}/prayer-card`, ownCardConfig(id, signal, context))
  return ownCardResult(response, context, signal)
}

export async function saveOwnPrayerCard(id, payload, signal, context = getSessionContext()) {
  const config = ownCardConfig(id, signal, context)
  if (!payload || payload.consent !== true ||
    REQUEST_FIELDS.some((key) => typeof payload[key] !== 'string' || [...payload[key]].length > 500) ||
    !REQUEST_FIELDS.some((key) => payload[key].trim())) {
    throw new Error('Preencha pelo menos um pedido até 500 caracteres e autorize a partilha.')
  }
  const body = Object.fromEntries(REQUEST_FIELDS.map((key) => [key, payload[key].trim() || null]))
  const response = await api.put(`/events/${encodeURIComponent(id)}/prayer-card`, { ...body, consent: true }, config)
  return ownCardResult(response, context, signal)
}

const VALID_PERIODS = new Set(['current', 'previous'])

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0
}

/*
 * Obtém os cartões de oração recebidos pelo membro autenticado. A validação
 * local impede pedidos desnecessários e mantém a resposta ligada à sessão que
 * iniciou o carregamento.
 */
export async function getReceivedPrayerCards(
  period,
  page = 1,
  perPage = 5,
  signal,
  context = getSessionContext(),
) {
  if (
    !VALID_PERIODS.has(period) ||
    !isPositiveInteger(page) ||
    !isPositiveInteger(perPage) ||
    !isSessionCurrent(context)
  ) {
    throw new Error('O pedido de cartões de oração é inválido.')
  }

  const config = {
    params: { period, page, per_page: perPage },
    signal: signal
      ? AbortSignal.any([signal, context.signal])
      : context.signal,
    sessionGeneration: context.generation,
  }
  const response = await api.get('/me/prayer-cards', config)
  const result = response.data?.data

  if (
    !isSessionCurrent(context) ||
    response.data?.success !== true ||
    !Array.isArray(result?.items) ||
    !result?.pagination ||
    !isPositiveInteger(result.pagination.current_page) ||
    !isPositiveInteger(result.pagination.per_page) ||
    !Number.isInteger(result.pagination.total) ||
    !isPositiveInteger(result.pagination.last_page)
  ) {
    throw new Error('Não foi possível confirmar os cartões de oração.')
  }

  return result
}
