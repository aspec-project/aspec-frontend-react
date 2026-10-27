import { formatShortDate } from './dateFormat'
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

/** Textos do botão e do diálogo de exportação da lista de presenças (com o aviso do art. 9.º do RGPD). */
export const ATTENDEES_EXPORT_TEXTS = {
  buttonLabel: 'Exportar lista de presenças',
  unavailableHint: 'Disponível depois do prazo de inscrição',
  title: 'Exportar lista de presenças',
  note: 'Dados sensíveis (art. 9.º do RGPD): numa associação cristã, estar inscrito num evento pode revelar convicções religiosas. Use a lista só dentro da ASPEC, não a envie a terceiros (ao local do evento indique só o número de inscritos) e apague o ficheiro depois de usado.',
  confirmLabel: 'Descarregar CSV',
  notFound: 'O evento já não existe. A lista foi atualizada.',
}

/**
 * Descrição do diálogo de exportação: evento, data, colunas do ficheiro e número de inscritos.
 *
 * @param {{name?: string, event_date?: string, registrations_count?: unknown}} event Evento da lista.
 * @returns {string}
 */
export function getAttendeesExportDescription(event) {
  const intro = `Vai descarregar a lista de presenças de «${event.name}» (${formatShortDate(event.event_date) || '—'})`
  const count = event.registrations_count
  const columns = 'com o nome, a empresa e o email e telefone pessoais'

  if (count === 0) return `${intro}. O evento não tem inscritos: o ficheiro terá só os cabeçalhos.`
  if (count === 1) return `${intro} ${columns} do 1 inscrito.`
  if (Number.isInteger(count) && count > 1) return `${intro} ${columns} dos ${count} inscritos.`

  return `${intro} ${columns} dos inscritos.`
}

/**
 * Limpa um nome de ficheiro: fica só com o nome-base, sem caracteres de controlo nem espaços nas pontas.
 *
 * @param {string} value Nome recebido.
 * @returns {string|null} Nome limpo, ou null se ficar vazio ou for "." / "..".
 */
function cleanFilename(value) {
  const name = value.split(/[/\\]/).pop().replace(/\p{Cc}/gu, '').trim()

  return name === '' || name === '.' || name === '..' ? null : name
}

/**
 * Lê o nome do ficheiro do cabeçalho Content-Disposition. O `filename*` (UTF-8) tem prioridade sobre o `filename`.
 *
 * @param {unknown} header Valor do cabeçalho.
 * @returns {string|null} Nome-base do ficheiro, ou null se não existir ou for inválido.
 */
export function getFilenameFromContentDisposition(header) {
  if (typeof header !== 'string' || header === '') return null

  const extended = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header)

  if (extended) {
    try {
      const name = cleanFilename(decodeURIComponent(extended[1].trim()))
      if (name) return name
    } catch {
      // Codificação inválida: usa o filename simples, se existir.
    }
  }

  const plain = /(?:^|;)\s*filename\s*=\s*(?:"([^"]*)"|([^;]*))/i.exec(header)

  return plain ? cleanFilename(plain[1] ?? plain[2]) : null
}

/**
 * Nome de reserva do CSV quando a resposta não traz o Content-Disposition.
 *
 * @param {{event_date?: unknown}} event Evento da lista.
 * @returns {string} "presencas_AAAA-MM-DD.csv" com uma data válida, senão "presencas.csv".
 */
export function getAttendeesFallbackFilename(event) {
  const date = event?.event_date

  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? `presencas_${date}.csv` : 'presencas.csv'
}

/** Textos do botão e dos diálogos de apagar um evento. */
export const DELETE_EVENT_TEXTS = {
  buttonTitle: 'Apagar evento',
  title: 'Apagar evento?',
  label: 'Justificação',
  placeholder: 'Explique aos inscritos o motivo do cancelamento.',
  hint: 'A justificação é obrigatória para apagar o evento.',
  confirmLabel: 'Apagar e notificar',
  confirmLabelNoRegistrants: 'Apagar evento',
  cancelLabel: 'Voltar',
  notFound: 'O evento já não existe. A lista foi atualizada.',
  registrantsChanged: 'Entretanto houve inscrições neste evento e a justificação passou a ser obrigatória. A lista foi atualizada: carregue de novo em Apagar para a escrever.',
}

/** Máximo de caracteres da justificação (igual ao max:2000 do backend). */
export const DELETE_JUSTIFICATION_MAX_LENGTH = 2000

/**
 * Indica se apagar o evento exige justificação. Só não exige quando a lista diz que não há inscritos;
 * com a contagem inválida ou em falta pede-a, porque o backend pode exigi-la.
 *
 * @param {{registrations_count?: unknown}} event Evento da lista.
 * @returns {boolean}
 */
export function needsDeleteJustification(event) {
  return event?.registrations_count !== 0
}

/**
 * Descrição do diálogo de apagar: evento, data e o que acontece aos inscritos.
 *
 * @param {{name?: string, event_date?: string, registrations_count?: unknown}} event Evento da lista.
 * @returns {string}
 */
export function getDeleteEventDescription(event) {
  const intro = `Vai apagar «${event.name}» (${formatShortDate(event.event_date) || '—'}).`
  const count = event.registrations_count

  if (count === 0) return `${intro} O evento não tem inscritos, por isso ninguém é notificado. O evento é apagado definitivamente.`
  if (count === 1) return `${intro} Será enviado um email ao inscrito a informar que o evento foi cancelado, com a justificação abaixo. O evento e a inscrição são apagados definitivamente.`
  if (Number.isInteger(count) && count > 1) return `${intro} Será enviado um email aos ${count} inscritos a informar que o evento foi cancelado, com a justificação abaixo. O evento e as inscrições são apagados definitivamente.`

  return `${intro} Será enviado um email aos inscritos a informar que o evento foi cancelado, com a justificação abaixo. O evento e as inscrições são apagados definitivamente.`
}
