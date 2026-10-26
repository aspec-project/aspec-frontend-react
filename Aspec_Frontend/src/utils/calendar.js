/** Cabeçalhos da semana do calendário, de segunda a domingo (abreviatura e nome completo). */
export const WEEKDAY_HEADERS = [
  { short: 'SEG', long: 'segunda-feira' },
  { short: 'TER', long: 'terça-feira' },
  { short: 'QUA', long: 'quarta-feira' },
  { short: 'QUI', long: 'quinta-feira' },
  { short: 'SEX', long: 'sexta-feira' },
  { short: 'SÁB', long: 'sábado' },
  { short: 'DOM', long: 'domingo' },
]

const MONTH_NAMES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

const MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Número de dias de um mês.
 *
 * @param {number} year Ano.
 * @param {number} month Mês de 1 a 12.
 * @returns {number}
 */
function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/**
 * Lê uma data AAAA-MM-DD, recusando datas que não existem (ex.: 2025-02-30).
 *
 * @param {unknown} value Data AAAA-MM-DD.
 * @returns {{year: number, month: number, day: number}|null} Partes da data (mês de 1 a 12), ou null se for inválida.
 */
export function parseIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null

  const [year, month, day] = value.split('-').map(Number)

  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null

  return { year, month, day }
}

/**
 * Monta uma data AAAA-MM-DD.
 *
 * @param {number} year Ano.
 * @param {number} month Mês de 1 a 12.
 * @param {number} day Dia do mês.
 * @returns {string}
 */
export function toIsoDate(year, month, day) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Converte uma data AAAA-MM-DD em milissegundos UTC (meia-noite), para as contas não dependerem da mudança de hora.
 *
 * @param {string} iso Data AAAA-MM-DD válida.
 * @returns {number}
 */
function toUtc(iso) {
  const { year, month, day } = parseIsoDate(iso)

  return Date.UTC(year, month - 1, day)
}

/**
 * Converte milissegundos UTC numa data AAAA-MM-DD.
 *
 * @param {number} time Milissegundos UTC.
 * @returns {string}
 */
function fromUtc(time) {
  const date = new Date(time)

  return toIsoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

/**
 * Soma dias a uma data.
 *
 * @param {string} iso Data AAAA-MM-DD válida.
 * @param {number} days Dias a somar (negativo para recuar).
 * @returns {string}
 */
export function addDays(iso, days) {
  return fromUtc(toUtc(iso) + days * DAY_MS)
}

/**
 * Soma meses a uma data, limitando o dia ao fim do mês (31 jan + 1 mês = 28 fev).
 *
 * @param {string} iso Data AAAA-MM-DD válida.
 * @param {number} months Meses a somar (negativo para recuar).
 * @returns {string}
 */
export function addMonths(iso, months) {
  const { year, month, day } = parseIsoDate(iso)
  const total = year * 12 + (month - 1) + months
  const nextYear = Math.floor(total / 12)
  const nextMonth = total - nextYear * 12 + 1

  return toIsoDate(nextYear, nextMonth, Math.min(day, daysInMonth(nextYear, nextMonth)))
}

/**
 * Posição de uma data na semana, de 0 (segunda) a 6 (domingo).
 *
 * @param {string} iso Data AAAA-MM-DD válida.
 * @returns {number}
 */
function weekdayIndex(iso) {
  return (new Date(toUtc(iso)).getUTCDay() + 6) % 7
}

/**
 * @param {string} iso Data AAAA-MM-DD válida.
 * @returns {string} Segunda-feira da semana dessa data.
 */
export function startOfWeek(iso) {
  return addDays(iso, -weekdayIndex(iso))
}

/**
 * @param {string} iso Data AAAA-MM-DD válida.
 * @returns {string} Domingo da semana dessa data.
 */
export function endOfWeek(iso) {
  return addDays(iso, 6 - weekdayIndex(iso))
}

/**
 * Grelha de um mês em semanas de segunda a domingo; os dias de fora do mês ficam a null.
 *
 * @param {number} year Ano.
 * @param {number} month Mês de 1 a 12.
 * @returns {(string|null)[][]} 4 a 6 semanas com 7 entradas cada.
 */
export function getMonthGrid(year, month) {
  const first = toIsoDate(year, month, 1)
  const cells = Array(weekdayIndex(first)).fill(null)

  for (let day = 1; day <= daysInMonth(year, month); day += 1) {
    cells.push(toIsoDate(year, month, day))
  }

  while (cells.length % 7 !== 0) cells.push(null)

  const weeks = []
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7))
  }

  return weeks
}

/**
 * @param {number} year Ano.
 * @param {number} month Mês de 1 a 12.
 * @returns {string} Título do mês, ex.: "Janeiro 2025".
 */
export function formatMonthTitle(year, month) {
  const name = MONTH_NAMES[month - 1]

  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`
}

/**
 * @param {string} iso Data AAAA-MM-DD válida.
 * @returns {string} Nome completo do dia, ex.: "20 de janeiro de 2025".
 */
export function formatDayLabel(iso) {
  const { year, month, day } = parseIsoDate(iso)

  return `${day} de ${MONTH_NAMES[month - 1]} de ${year}`
}

/**
 * @param {unknown} iso Data AAAA-MM-DD.
 * @returns {string} Data curta, ex.: "21 Jan 2025", ou '' se for inválida.
 */
export function formatShortDate(iso) {
  const parts = parseIsoDate(iso)

  return parts ? `${parts.day} ${MONTH_SHORT[parts.month - 1]} ${parts.year}` : ''
}

/**
 * Data de hoje no fuso do browser (os filtros são datas de calendário).
 *
 * @param {Date} [now=new Date()] Momento atual.
 * @returns {string} Data AAAA-MM-DD.
 */
export function todayIso(now = new Date()) {
  return toIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

/**
 * Indica se uma data está dentro dos limites (inclusive); limites vazios são ignorados.
 *
 * @param {string} iso Data AAAA-MM-DD.
 * @param {string} [min] Data mínima.
 * @param {string} [max] Data máxima.
 * @returns {boolean}
 */
export function isWithinRange(iso, min, max) {
  return (!min || iso >= min) && (!max || iso <= max)
}
