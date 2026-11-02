import { api } from './api'
import { getSessionContext, isSessionCurrent } from './sessionContext'

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
