import { api } from './api'
import { EVENTS_PER_PAGE, getFilenameFromContentDisposition } from '../utils/adminEvents'
import { isIsoDateTime } from '../utils/dateFormat'

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
 * Atualiza um evento no backoffice (PUT com o corpo completo). O backend só envia email aos inscritos quando
 * mudam dados que lhes interessam, com a justificação, quando vem preenchida.
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
 * Localiza uma morada no mapa para o admin confirmar o sítio antes de guardar o evento. O distrito só é
 * enviado quando foi escolhido. Com a Google vem o `place_id` e as coordenadas a null; com o OpenStreetMap
 * (Nominatim) vêm as coordenadas e o `place_id` a null. `attribution` indica quem respondeu e `approximate` é
 * true quando o local encontrado pode não corresponder à morada.
 *
 * @param {string} address Morada a localizar.
 * @param {string} locationId Id do distrito (pode ser vazio).
 * @param {AbortSignal} [signal] Permite cancelar o pedido quando a morada ou o distrito mudam.
 * @returns {Promise<{latitude: number|null, longitude: number|null, display_name: string, attribution: string, approximate: boolean, place_id: string|null}>}
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

const EVENT_FORMAT_ERROR = 'A resposta do evento tem um formato inesperado.'
const PRAYER_CARDS_FORMAT_ERROR = 'A resposta dos cartões de oração tem um formato inesperado.'
const PRAYER_CARDS_WINDOW_STATUSES = ['not_open', 'open', 'closed']
const EVENT_TEXT_FIELDS = ['event_date', 'event_start_time', 'event_end_time', 'registration_deadline', 'venue_name']

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
 * Indica se um valor é texto ou null.
 *
 * @param {unknown} value Valor a verificar.
 * @returns {boolean}
 */
function isStringOrNull(value) {
  return value === null || typeof value === 'string'
}

/**
 * Indica se um valor é um objeto (não nulo e não lista).
 *
 * @param {unknown} value Valor a verificar.
 * @returns {boolean}
 */
function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Indica se um valor é um inteiro não negativo.
 *
 * @param {unknown} value Valor a verificar.
 * @returns {boolean}
 */
function isCount(value) {
  return Number.isSafeInteger(value) && value >= 0
}

/**
 * Lê uma referência `{id, name}` (tipo de evento ou distrito), só com esses dois campos.
 *
 * @param {unknown} value Referência vinda da API.
 * @returns {{id: string, name: string}|null|undefined} Referência, null se vier vazia, ou undefined se for inválida.
 */
function readReference(value) {
  if (value === null || value === undefined) return null
  if (!isObject(value) || !isFilledString(value.id) || !isFilledString(value.name)) return undefined

  return { id: value.id, name: value.name }
}

/**
 * Reconstrói o evento só com os campos que a página do evento mostra (sem morada, link online, notas,
 * versículo, place_id nem coordenadas). A série passa tal como vem (getEventSeries valida-a).
 *
 * @param {unknown} data Evento vindo da API.
 * @returns {object|null} Evento, ou null se não tiver o formato esperado.
 */
function readAdminEvent(data) {
  if (!isObject(data)) return null

  const category = readReference(data.category)
  const location = readReference(data.location)
  const valid = isFilledString(data.id)
    && isFilledString(data.name)
    && EVENT_TEXT_FIELDS.every((field) => isStringOrNull(data[field]))
    && typeof data.is_online === 'boolean'
    && isCount(data.max_attendees)
    && isCount(data.registrations_count)
    && typeof data.prayer_cards_enabled === 'boolean'
    && category !== undefined
    && location !== undefined

  if (!valid) return null

  return {
    id: data.id,
    name: data.name,
    category,
    location,
    event_date: data.event_date,
    event_start_time: data.event_start_time,
    event_end_time: data.event_end_time,
    venue_name: data.venue_name,
    is_online: data.is_online,
    max_attendees: data.max_attendees,
    registration_deadline: data.registration_deadline,
    registrations_count: data.registrations_count,
    prayer_cards_enabled: data.prayer_cards_enabled,
    series: data.series ?? null,
  }
}

/**
 * Obtém um evento do backoffice para a página do evento, só com os campos que ela mostra.
 *
 * @param {string} id Id do evento.
 * @param {AbortSignal} [signal] Permite cancelar o pedido quando a página é desmontada.
 * @returns {Promise<object>} Evento reconstruído (ver readAdminEvent).
 * @throws {Error} Se a resposta não tiver o formato esperado; os erros do axios passam tal como estão.
 */
export async function getAdminEvent(id, signal) {
  const response = await api.get(`/admin/events/${encodeURIComponent(id)}`, { signal })
  const event = readAdminEvent(response.data?.data)

  if (!event) throw new Error(EVENT_FORMAT_ERROR)

  return event
}

/**
 * Reconstrói um participante só com o nome, a empresa e a hora de entrega (nunca o conteúdo nem o destinatário).
 *
 * @param {unknown} item Participante vindo da API.
 * @returns {{name: string|null, business_name: string|null, submitted_at: string}|null} Participante, ou null se for inválido.
 */
function readParticipant(item) {
  if (!isObject(item) || !isStringOrNull(item.name) || !isStringOrNull(item.business_name) || !isIsoDateTime(item.submitted_at)) {
    return null
  }

  return { name: item.name, business_name: item.business_name, submitted_at: item.submitted_at }
}

/**
 * Reconstrói o estado dos cartões de oração com a lista branca da página: janela, contagens de inscritos e de
 * cartões, data de distribuição e participantes. O versículo e as contagens de distribuídos e sem par ficam de fora.
 *
 * @param {unknown} data Estado vindo da API.
 * @returns {{
 *   window: {status: 'not_open'|'open'|'closed', opens_at: string, closes_at: string},
 *   registrations_count: number,
 *   cards_count: number,
 *   distributed_at: string|null,
 *   participants: {name: string|null, business_name: string|null, submitted_at: string}[],
 * }|null} Estado, ou null se não tiver o formato esperado.
 */
function readPrayerCardsStatus(data) {
  if (!isObject(data) || !isObject(data.window) || !Array.isArray(data.participants)) return null

  const { window: cardsWindow } = data
  const participants = data.participants.map(readParticipant)
  const valid = PRAYER_CARDS_WINDOW_STATUSES.includes(cardsWindow.status)
    && isIsoDateTime(cardsWindow.opens_at)
    && isIsoDateTime(cardsWindow.closes_at)
    && isCount(data.registrations_count)
    && isCount(data.cards_count)
    && (data.distributed_at === null || isIsoDateTime(data.distributed_at))
    && participants.every((participant) => participant !== null)

  if (!valid) return null

  return {
    window: { status: cardsWindow.status, opens_at: cardsWindow.opens_at, closes_at: cardsWindow.closes_at },
    registrations_count: data.registrations_count,
    cards_count: data.cards_count,
    distributed_at: data.distributed_at,
    participants,
  }
}

/**
 * Obtém o estado dos cartões de oração de um evento (só existe com os cartões ativos; senão o backend responde 404).
 *
 * @param {string} id Id do evento.
 * @param {AbortSignal} [signal] Permite cancelar o pedido quando a página é desmontada.
 * @returns {Promise<object>} Estado reconstruído (ver readPrayerCardsStatus).
 * @throws {Error} Se a resposta não tiver o formato esperado; os erros do axios passam tal como estão.
 */
export async function getPrayerCardsStatus(id, signal) {
  const response = await api.get(`/admin/events/${encodeURIComponent(id)}/prayer-cards`, { signal })
  const status = readPrayerCardsStatus(response.data?.data)

  if (!status) throw new Error(PRAYER_CARDS_FORMAT_ERROR)

  return status
}

/**
 * Distribui já os cartões de oração de um evento (POST sem corpo). A distribuição já aconteceu quando chega o
 * 200, por isso um estado fora do formato não é erro: vem a null e a página volta a pedi-lo.
 *
 * @param {string} id Id do evento.
 * @returns {Promise<{message: string, status: object|null}>} Mensagem da API e o novo estado (ou null).
 * @throws {import('axios').AxiosError} Erro do axios tal como está (409, 404, 429…).
 */
export async function distributePrayerCards(id) {
  const response = await api.post(`/admin/events/${encodeURIComponent(id)}/prayer-cards/distribute`)

  return { message: response.data?.message, status: readPrayerCardsStatus(response.data?.data) }
}
