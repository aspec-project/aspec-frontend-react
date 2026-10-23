import { MONTHS } from './adminUsers'
import { formatTime } from './eventFormatting'

/** Número de eventos por página na lista do backoffice (enviado sempre ao backend). */
export const EVENTS_PER_PAGE = 6

/**
 * Separadores da lista de eventos do backoffice, por ordem. A `key` é o `period` da API e a chave em `counts`.
 *
 * @type {{key: 'upcoming'|'past', label: string, title: string, caption: string, capacityLabel: string, emptyMessage: string}[]}
 */
export const EVENT_PERIOD_TABS = [
  { key: 'upcoming', label: 'Agendados', title: 'Eventos Agendados', caption: 'Eventos agendados', capacityLabel: 'Lotação', emptyMessage: 'Não há eventos agendados.' },
  { key: 'past', label: 'Passados', title: 'Eventos Passados', caption: 'Eventos passados', capacityLabel: 'Participação', emptyMessage: 'Não há eventos passados.' },
]

export const NO_RESULTS_MESSAGE = 'Nenhum evento corresponde aos filtros.'

export const DATE_RANGE_ERROR = 'A data final tem de ser igual ou posterior à data inicial.'

const NEARLY_FULL_PERCENT = 90

const lisbonFormatter = new Intl.DateTimeFormat('pt-PT', {
  timeZone: 'Europe/Lisbon',
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/**
 * Converte um prazo ISO 8601 em milissegundos.
 *
 * @param {unknown} value Prazo recebido da API.
 * @returns {number|null} Milissegundos desde a época, ou null se for inválido.
 */
function parseDeadline(value) {
  if (typeof value !== 'string' || value === '') return null

  const time = Date.parse(value)

  return Number.isNaN(time) ? null : time
}

/**
 * Formata a data de um evento (`Y-m-d`) como "21 Jan 2026", a partir do texto (sem fuso horário).
 *
 * @param {unknown} value Data do evento.
 * @returns {string} Data formatada ou "—" se for inválida.
 */
export function formatEventDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '—'

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return '—'
  }

  return `${day} ${MONTHS[month - 1]} ${year}`
}

/**
 * Junta as horas de início e de fim como "08:00–10:00".
 *
 * @param {unknown} start Hora de início.
 * @param {unknown} end Hora de fim.
 * @returns {string} Intervalo, só o início se o fim for inválido, ou "" se o início for inválido.
 */
export function formatTimeRange(start, end) {
  const from = formatTime(start)
  const to = formatTime(end)

  if (from === '') return ''

  return to === '' ? from : `${from}–${to}`
}

/**
 * Formata o prazo de inscrição na hora de Lisboa como "14 Nov 2030, 23:59", seja qual for o fuso do computador.
 *
 * @param {unknown} value Prazo ISO 8601 com desvio.
 * @returns {string} Prazo formatado ou "—" se for inválido.
 */
export function formatDeadline(value) {
  const time = parseDeadline(value)

  if (time === null) return '—'

  const parts = Object.fromEntries(
    lisbonFormatter.formatToParts(new Date(time)).map((part) => [part.type, part.value])
  )

  return `${Number(parts.day)} ${MONTHS[Number(parts.month) - 1]} ${parts.year}, ${parts.hour}:${parts.minute}`
}

/**
 * Estado das inscrições calculado só pelo prazo: abertas até ao prazo (inclusive), encerradas depois.
 *
 * @param {unknown} deadline Prazo ISO 8601 com desvio.
 * @param {number} [now] Momento atual em milissegundos.
 * @returns {'open'|'closed'|null} Estado, ou null se o prazo for inválido.
 */
export function getRegistrationState(deadline, now = Date.now()) {
  const time = parseDeadline(deadline)

  if (time === null) return null

  return now <= time ? 'open' : 'closed'
}

/**
 * Percentagem de lotação (arredondada) e se o evento está quase esgotado (≥ 90%).
 *
 * @param {unknown} registrations Número de inscritos.
 * @param {unknown} max Lotação máxima.
 * @returns {{percent: number, nearlyFull: boolean}|null} Null sem lotação válida.
 */
export function getOccupancy(registrations, max) {
  if (!Number.isInteger(max) || max <= 0 || !Number.isInteger(registrations) || registrations < 0) {
    return null
  }

  const percent = Math.round((registrations / max) * 100)

  return { percent, nearlyFull: percent >= NEARLY_FULL_PERCENT }
}

/**
 * Conta os filtros preenchidos (datas, tipo e distrito).
 *
 * @param {{dateFrom?: string, dateTo?: string, categoryId?: string, locationId?: string}} filters
 * @returns {number}
 */
export function countActiveFilters({ dateFrom, dateTo, categoryId, locationId }) {
  return [dateFrom, dateTo, categoryId, locationId].filter((value) => typeof value === 'string' && value !== '').length
}

/**
 * Valida o intervalo de datas com a mesma regra e mensagem do backend.
 *
 * @param {string} dateFrom Data inicial (`Y-m-d`).
 * @param {string} dateTo Data final (`Y-m-d`).
 * @returns {string} Mensagem de erro, ou "" se o intervalo for válido ou incompleto.
 */
export function getDateRangeError(dateFrom, dateTo) {
  return dateFrom && dateTo && dateTo < dateFrom ? DATE_RANGE_ERROR : ''
}

/**
 * Posição do evento na sua série recorrente. É o único sítio que conhece a forma do campo, que ainda é um
 * pressuposto até o backend das séries existir: `series: { position, total }` no item da lista.
 *
 * @param {{series?: {position?: unknown, total?: unknown}|null}} event Evento da API.
 * @returns {{position: number, total: number}|null} Null se o evento não pertencer a uma série válida.
 */
export function getEventSeries(event) {
  const position = event?.series?.position
  const total = event?.series?.total

  if (!Number.isInteger(position) || !Number.isInteger(total) || position < 1 || position > total) {
    return null
  }

  return { position, total }
}

/**
 * Texto "Sessão X/Y" de um evento de uma série.
 *
 * @param {object} event Evento da API.
 * @returns {string|null} Texto, ou null se o evento não pertencer a uma série.
 */
export function formatSession(event) {
  const series = getEventSeries(event)

  return series ? `Sessão ${series.position}/${series.total}` : null
}

/**
 * Texto do rodapé com o intervalo de eventos da página, ex.: "1–6 de 13 eventos".
 *
 * @param {{current_page: number, per_page: number, total: number}} pagination Paginação da API.
 * @param {number} itemCount Número de eventos na página atual.
 * @returns {string} Texto, ou "" sem eventos.
 */
export function formatResultsRange(pagination, itemCount) {
  const total = pagination?.total ?? 0

  if (total === 0 || itemCount === 0) return ''

  const start = (pagination.current_page - 1) * pagination.per_page + 1
  const end = start + itemCount - 1
  const range = start === end ? `${end}` : `${start}–${end}`

  return `${range} de ${total} ${total === 1 ? 'evento' : 'eventos'}`
}
