import { parseIsoDate } from './calendar'

/** Meses abreviados em português, de janeiro a dezembro (ex.: "Jan", "Fev"). */
export const MONTH_ABBREVIATIONS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/

/**
 * Formatador da hora de Lisboa, criado uma vez: dia, mês, ano, hora e minutos com 2 dígitos (24 horas).
 *
 * @type {Intl.DateTimeFormat}
 */
const lisbonFormatter = new Intl.DateTimeFormat('pt-PT', {
  timeZone: 'Europe/Lisbon',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/**
 * Valida uma data e hora ISO 8601 com desvio e devolve as suas partes na hora de Lisboa.
 *
 * @param {unknown} value Data e hora ISO 8601 com desvio.
 * @returns {{day: string, month: string, year: string, hour: string, minute: string}|null} Partes com 2 dígitos (o ano com 4), ou null se for inválida.
 */
function getLisbonParts(value) {
  if (typeof value !== 'string' || !DATE_TIME_PATTERN.test(value) || parseIsoDate(value.slice(0, 10)) === null) {
    return null
  }

  const time = Date.parse(value)

  if (Number.isNaN(time)) return null

  const parts = Object.fromEntries(
    lisbonFormatter.formatToParts(new Date(time)).map((part) => [part.type, part.value])
  )

  return { day: parts.day, month: parts.month, year: parts.year, hour: parts.hour, minute: parts.minute }
}

/**
 * Dia, mês e ano de uma data de calendário (AAAA-MM-DD, lida do texto, sem fuso) ou de uma data e hora
 * ISO 8601 com desvio (na hora de Lisboa).
 *
 * @param {unknown} value Data AAAA-MM-DD ou data e hora ISO 8601 com desvio.
 * @returns {{day: number, month: number, year: number}|null} Partes da data (mês de 1 a 12), ou null se for inválida.
 */
function getDateParts(value) {
  const date = parseIsoDate(value)

  if (date !== null) return date

  const parts = getLisbonParts(value)

  return parts ? { day: Number(parts.day), month: Number(parts.month), year: Number(parts.year) } : null
}

/**
 * Formata uma data como "dd/mm/aaaa". Datas de calendário (AAAA-MM-DD) são lidas do texto, sem fuso;
 * datas e horas ISO 8601 com desvio são convertidas para a hora de Lisboa.
 *
 * @param {unknown} value Data AAAA-MM-DD ou data e hora ISO 8601 com desvio.
 * @returns {string} Data formatada, ou '' se for inválida.
 */
export function formatDate(value) {
  const date = getDateParts(value)

  if (date === null) return ''

  return `${String(date.day).padStart(2, '0')}/${String(date.month).padStart(2, '0')}/${String(date.year).padStart(4, '0')}`
}

/**
 * Formata uma data com o mês abreviado, como "21 Jan 2025". Datas de calendário (AAAA-MM-DD) são lidas
 * do texto, sem fuso; datas e horas ISO 8601 com desvio são convertidas para a hora de Lisboa.
 *
 * @param {unknown} value Data AAAA-MM-DD ou data e hora ISO 8601 com desvio.
 * @returns {string} Data formatada, ou '' se for inválida.
 */
export function formatShortDate(value) {
  const date = getDateParts(value)

  return date ? `${date.day} ${MONTH_ABBREVIATIONS[date.month - 1]} ${date.year}` : ''
}

/**
 * Formata uma data e hora ISO 8601 com desvio como "19 Jan 2025, 23:59", na hora de Lisboa,
 * seja qual for o fuso do computador.
 *
 * @param {unknown} value Data e hora ISO 8601 com desvio.
 * @returns {string} Data e hora formatadas, ou '' se for inválida.
 */
export function formatShortDateTime(value) {
  const parts = getLisbonParts(value)

  if (parts === null) return ''

  return `${Number(parts.day)} ${MONTH_ABBREVIATIONS[Number(parts.month) - 1]} ${parts.year}, ${parts.hour}:${parts.minute}`
}

/**
 * Dia, mês e ano de um instante no calendário de Lisboa.
 *
 * @param {Date} date Instante a converter.
 * @returns {{day: number, month: number, year: number}} Partes da data (mês de 1 a 12).
 */
function getLisbonDay(date) {
  const parts = Object.fromEntries(lisbonFormatter.formatToParts(date).map((part) => [part.type, part.value]))

  return { day: Number(parts.day), month: Number(parts.month), year: Number(parts.year) }
}

/**
 * Formata uma data e hora ISO 8601 com desvio em relação a "agora", no calendário de Lisboa:
 * "Hoje, 10:32" no mesmo dia, "Ontem, 14:15" no dia anterior e "27 Out 2026, 09:40" nos outros dias
 * (incluindo o futuro). O dia anterior conta-se por datas de calendário e não por 24 horas, porque nos dias
 * da mudança de hora há 23 ou 25 horas.
 *
 * @param {unknown} value Data e hora ISO 8601 com desvio.
 * @param {Date} [now] Instante de referência (por omissão, o atual).
 * @returns {string} Data e hora formatadas, ou '' se for inválida.
 */
export function formatRelativeDateTime(value, now = new Date()) {
  const parts = getLisbonParts(value)

  if (parts === null) return ''

  const day = { day: Number(parts.day), month: Number(parts.month), year: Number(parts.year) }
  const today = getLisbonDay(now)
  const yesterday = new Date(Date.UTC(today.year, today.month - 1, today.day - 1))
  const time = `${parts.hour}:${parts.minute}`

  if (day.year === today.year && day.month === today.month && day.day === today.day) {
    return `Hoje, ${time}`
  }

  if (
    day.year === yesterday.getUTCFullYear() &&
    day.month === yesterday.getUTCMonth() + 1 &&
    day.day === yesterday.getUTCDate()
  ) {
    return `Ontem, ${time}`
  }

  return formatShortDateTime(value)
}
