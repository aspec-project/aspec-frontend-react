import { api } from './api'
import { clearPublicReferenceCache } from './publicReferenceCache'

const FORMAT_ERROR = 'A resposta dos tipos de evento tem um formato inesperado.'

/**
 * Indica se um valor é texto não vazio.
 *
 * @param {unknown} value Valor a verificar.
 * @returns {boolean}
 */
function isFilledString(value) {
  return typeof value === 'string' && value !== ''
}

/**
 * Obtém a lista de tipos de evento do backoffice, pela ordem do backend (por nome), com o número de eventos
 * de cada um. Só devolve o id, o nome, a cor e o número de eventos.
 *
 * @param {AbortSignal} [signal] Permite cancelar o pedido quando a página é desmontada.
 * @returns {Promise<{id: string, name: string, color: string|null, events_count: number|null}[]>}
 * @throws {Error} Se a resposta tiver um formato inesperado; os erros do axios são relançados tal como estão.
 */
export async function getAdminEventCategories(signal) {
  const response = await api.get('/admin/event-categories', { signal })
  const body = response.data
  const items = body?.data

  if (
    body?.success !== true ||
    !Array.isArray(items) ||
    items.some((item) => typeof item !== 'object' || item === null || !isFilledString(item.id) || !isFilledString(item.name))
  ) {
    throw new Error(FORMAT_ERROR)
  }

  return items.map((item) => ({
    id: item.id,
    name: item.name,
    color: typeof item.color === 'string' ? item.color : null,
    events_count: Number.isInteger(item.events_count) && item.events_count >= 0 ? item.events_count : null,
  }))
}

/**
 * Cria um tipo de evento (só o nome e a cor). Depois de gravar, limpa a cache das listas públicas para os
 * filtros e formulários da página de eventos verem o tipo novo.
 *
 * @param {{name: string, color: string}} values Nome e cor #RRGGBB.
 * @returns {Promise<{success: boolean, message: string, data: object}>} Resposta inteira da API.
 */
export async function createEventCategory({ name, color }) {
  const response = await api.post('/admin/event-categories', { name, color })
  clearPublicReferenceCache()

  return response.data
}

/**
 * Atualiza o nome e a cor de um tipo de evento. Depois de gravar, limpa a cache das listas públicas.
 *
 * @param {string} id Id do tipo.
 * @param {{name: string, color: string}} values Nome e cor #RRGGBB.
 * @returns {Promise<{success: boolean, message: string, data: object}>} Resposta inteira da API.
 */
export async function updateEventCategory(id, { name, color }) {
  const response = await api.put(`/admin/event-categories/${encodeURIComponent(id)}`, { name, color })
  clearPublicReferenceCache()

  return response.data
}

/**
 * Apaga um tipo de evento sem eventos (com eventos o backend responde 409). Depois de apagar, limpa a cache
 * das listas públicas.
 *
 * @param {string} id Id do tipo.
 * @returns {Promise<{success: boolean, message: string, data: null}>} Resposta inteira da API.
 */
export async function deleteEventCategory(id) {
  const response = await api.delete(`/admin/event-categories/${encodeURIComponent(id)}`)
  clearPublicReferenceCache()

  return response.data
}
