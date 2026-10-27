import { api } from './api'
import { EVENTS_PER_PAGE, getFilenameFromContentDisposition } from '../utils/adminEvents'

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

/**
 * Com `responseType: 'blob'` o corpo JSON de um erro também chega como Blob: converte-o em objeto para o
 * normalizeError dar a mensagem do backend. Se não for JSON, o erro fica como estava.
 *
 * @param {unknown} error Erro do axios.
 * @returns {Promise<void>}
 */
async function parseBlobErrorBody(error) {
  const data = error?.response?.data

  if (typeof Blob === 'undefined' || !(data instanceof Blob)) return

  try {
    error.response.data = JSON.parse(await data.text())
  } catch {
    // Corpo não JSON (ex.: página HTML de erro): mantém-se o Blob.
  }
}

/**
 * Descarrega o CSV da lista de presenças de um evento (só depois do prazo de inscrição).
 *
 * @param {string} eventId Id do evento.
 * @returns {Promise<{blob: Blob, filename: string|null}>} Conteúdo do ficheiro e nome enviado pelo backend
 *   no Content-Disposition (null se não vier).
 * @throws {import('axios').AxiosError} Erro do axios, com `response.data` já convertido em objeto quando era JSON.
 */
export async function exportEventAttendees(eventId) {
  try {
    const response = await api.get(`/admin/events/${encodeURIComponent(eventId)}/attendees.csv`, { responseType: 'blob' })

    return {
      blob: response.data,
      filename: getFilenameFromContentDisposition(response.headers?.['content-disposition']),
    }
  } catch (error) {
    await parseBlobErrorBody(error)
    throw error
  }
}

/**
 * Cria um evento no backoffice. Se for presencial e não levar coordenadas, o servidor localiza a morada.
 *
 * @param {object} payload Corpo do pedido, já em snake_case (ver buildEventPayload).
 * @returns {Promise<{success: boolean, message: string, data: object}>} Resposta inteira da API.
 */
export async function createAdminEvent(payload) {
  const response = await api.post('/admin/events', payload)

  return response.data
}

/**
 * Atualiza um evento no backoffice (PUT com o corpo completo). Se houver inscritos, o backend envia-lhes um
 * email com a justificação, quando vem preenchida.
 *
 * @param {string} eventId Id do evento.
 * @param {object} payload Corpo completo do pedido, já em snake_case (ver buildEventUpdatePayload).
 * @returns {Promise<{success: boolean, message: string, data: object}>} Resposta inteira da API.
 */
export async function updateAdminEvent(eventId, payload) {
  const response = await api.put(`/admin/events/${encodeURIComponent(eventId)}`, payload)

  return response.data
}

/**
 * Localiza uma morada no mapa (OpenStreetMap) para o admin confirmar o sítio antes de criar o evento.
 * O distrito só é enviado quando foi escolhido. `approximate` é true quando o local encontrado pode não
 * corresponder à morada (rua ou distrito diferentes).
 *
 * @param {string} address Morada a localizar.
 * @param {string} locationId Id do distrito (pode ser vazio).
 * @param {AbortSignal} [signal] Permite cancelar o pedido quando a morada ou o distrito mudam.
 * @returns {Promise<{latitude: number, longitude: number, display_name: string, attribution: string, approximate: boolean}>}
 */
export async function geocodeAddress(address, locationId, signal) {
  const params = { address }

  if (typeof locationId === 'string' && locationId !== '') {
    params.location_id = locationId
  }

  const response = await api.get('/admin/geocode', { params, signal })

  return response.data.data
}

/**
 * Apaga um evento no backoffice, com as respetivas inscrições. Se houver inscritos, o backend exige a
 * justificação e envia-a no email de cancelamento; sem texto (ou só com espaços) o pedido vai sem corpo.
 *
 * @param {string} eventId Id do evento.
 * @param {string} [justification] Justificação escrita pelo admin (é limpa antes de ser enviada).
 * @returns {Promise<{success: boolean, message: string, data: null}>} Resposta inteira da API.
 */
export async function deleteAdminEvent(eventId, justification) {
  const url = `/admin/events/${encodeURIComponent(eventId)}`
  const text = typeof justification === 'string' ? justification.trim() : ''

  const response = text === ''
    ? await api.delete(url)
    : await api.delete(url, { data: { justification: text } })

  return response.data
}
