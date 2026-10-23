import { api } from './api'
import { EVENTS_PER_PAGE } from '../utils/adminEvents'

const OPTIONAL_PARAMS = {
  dateFrom: 'date_from',
  dateTo: 'date_to',
  categoryId: 'category_id',
  locationId: 'location_id',
}

/**
 * Obtém uma página da lista de eventos do backoffice, com as contagens de agendados e passados.
 * Os filtros vazios não são enviados.
 *
 * @param {{period?: 'upcoming'|'past', page?: number, dateFrom?: string, dateTo?: string, categoryId?: string, locationId?: string}} filters
 * @param {AbortSignal} [signal] Permite cancelar o pedido quando os filtros mudam.
 * @returns {Promise<{items: object[], pagination: object, counts: {upcoming: number, past: number}}>}
 */
export async function getAdminEvents(filters = {}, signal) {
  const params = { period: filters.period ?? 'upcoming', page: filters.page ?? 1, per_page: EVENTS_PER_PAGE }

  for (const [key, param] of Object.entries(OPTIONAL_PARAMS)) {
    if (typeof filters[key] === 'string' && filters[key] !== '') {
      params[param] = filters[key]
    }
  }

  const response = await api.get('/admin/events', { params, signal })

  return response.data.data
}
