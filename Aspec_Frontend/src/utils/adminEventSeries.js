import { addDays, addMonths, parseIsoDate } from './calendar'
import { formatShortDate } from './dateFormat'

/** Frequências de uma série, com os valores aceites pelo backend (`in:weekly,biweekly,monthly`). */
export const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quinzenal' },
  { value: 'monthly', label: 'Mensal' },
]

/** Número máximo de sessões de uma série (igual ao `EventSeriesSchedule::MAX_OCCURRENCES` do backend). */
export const SERIES_MAX_SESSIONS = 52

/** Textos dos campos, da pré-visualização e da confirmação de uma série. */
export const EVENT_SERIES_TEXTS = {
  repetitionLabel: 'Repetição',
  boxTitle: 'Recorrência',
  firstDateLabel: 'Início',
  frequencyLabel: 'Frequência',
  frequencyPlaceholder: 'Selecione a frequência',
  endsOnLabel: 'Fim',
  inclusiveSuffix: '(inclusive)',
  deadlineDaysLabel: 'Fechar inscrições antes de cada sessão',
  deadlineDaysUnit: 'dias antes',
  monthlyHint: 'Repete no mesmo dia de cada mês; nos meses mais curtos, no último dia do mês.',
  endsOnHint: 'Máximo de 52 sessões.',
  deadlineDaysHint: 'Cada sessão fecha às 23:59 (hora de Lisboa) do dia limite.',
  notAnnounced: 'As sessões de uma série não são anunciadas por email aos membros.',
  submit: 'Criar série',
  sessionsList: 'Lista das sessões',
  previewPlaceholder: 'Indique a frequência e as datas para ver as sessões que vão ser criadas.',
  confirmTitle: 'Criar série de eventos?',
  confirmCancel: 'Voltar',
}

/** Hora a que o backend fecha as inscrições de cada sessão (hora de Lisboa). */
const DEADLINE_TIME = '23:59'

/**
 * Data da ocorrência `index` de uma série, contada sempre a partir da 1.ª data (como o backend): assim o
 * mensal volta ao dia original depois de um mês mais curto (31 jan → 28 fev → 31 mar).
 *
 * @param {string} start Data de início (1.ª sessão) (AAAA-MM-DD válida).
 * @param {string} frequency 'weekly', 'biweekly' ou 'monthly'.
 * @param {number} index Posição a partir de 0.
 * @returns {string} Data AAAA-MM-DD.
 */
function occurrence(start, frequency, index) {
  if (frequency === 'weekly') return addDays(start, 7 * index)
  if (frequency === 'biweekly') return addDays(start, 14 * index)

  return addMonths(start, index)
}

/**
 * Indica se a frequência é uma das aceites pelo backend.
 *
 * @param {unknown} frequency Frequência escolhida.
 * @returns {boolean}
 */
function isKnownFrequency(frequency) {
  return FREQUENCY_OPTIONS.some((option) => option.value === frequency)
}

/**
 * Datas das sessões de uma série, com o mesmo algoritmo do `EventSeriesSchedule::generate` do backend:
 * inclui a data final e para nas 52 sessões.
 *
 * @param {string} eventDate Data de início (1.ª sessão) (AAAA-MM-DD).
 * @param {string} endsOn Data de fim (última sessão) (AAAA-MM-DD).
 * @param {string} frequency 'weekly', 'biweekly' ou 'monthly'.
 * @returns {{dates: string[], tooMany: boolean}} Datas por ordem; `tooMany` quando a série passaria de 52
 *   sessões (com as primeiras 52). Sem datas com entradas inválidas ou com o fim antes do início.
 */
export function getSeriesSessions(eventDate, endsOn, frequency) {
  if (!parseIsoDate(eventDate) || !parseIsoDate(endsOn) || !isKnownFrequency(frequency) || endsOn < eventDate) {
    return { dates: [], tooMany: false }
  }

  const dates = []

  for (let index = 0; ; index += 1) {
    const date = occurrence(eventDate, frequency, index)

    if (date > endsOn) return { dates, tooMany: false }
    if (dates.length === SERIES_MAX_SESSIONS) return { dates, tooMany: true }

    dates.push(date)
  }
}

/**
 * Limites do calendário do "Fim": a partir da 1.ª sessão (uma série pode ter uma só
 * sessão) até à 52.ª ocorrência da frequência escolhida.
 *
 * @param {string} eventDate Data de início (1.ª sessão) (AAAA-MM-DD ou '').
 * @param {string} frequency Frequência escolhida (ou '').
 * @returns {{min: string|undefined, max: string|undefined}}
 */
export function getSeriesEndLimits(eventDate, frequency) {
  if (!parseIsoDate(eventDate)) return { min: undefined, max: undefined }

  return {
    min: eventDate,
    max: isKnownFrequency(frequency) ? occurrence(eventDate, frequency, SERIES_MAX_SESSIONS - 1) : undefined,
  }
}

/**
 * Resumo da pré-visualização, ex.: "Semanal, de 20 Mar 2099 a 3 Abr 2099.".
 *
 * @param {string} frequency Frequência da série.
 * @param {string[]} dates Datas das sessões.
 * @returns {string}
 */
export function getSeriesSummary(frequency, dates) {
  const label = FREQUENCY_OPTIONS.find((option) => option.value === frequency)?.label ?? ''

  if (dates.length === 1) return `${label}, com uma só sessão a ${formatShortDate(dates[0])}.`

  return `${label}, de ${formatShortDate(dates[0])} a ${formatShortDate(dates.at(-1))}.`
}

/**
 * Descrição do diálogo "Criar série de eventos?": quantas sessões, de que evento e entre que datas.
 *
 * @param {string} name Título do evento.
 * @param {string[]} dates Datas das sessões.
 * @returns {string}
 */
export function getSeriesConfirmDescription(name, dates) {
  if (dates.length === 1) {
    return `Vai ser criada 1 sessão de «${name}», a ${formatShortDate(dates[0])}. Depois de criada, edita-se e apaga-se como um evento.`
  }

  return `Vão ser criadas ${dates.length} sessões de «${name}», de ${formatShortDate(dates[0])} a ${formatShortDate(dates.at(-1))}. Depois de criadas, cada sessão edita-se e apaga-se à parte.`
}

/**
 * Texto do botão que confirma a série, ex.: "Criar 3 sessões".
 *
 * @param {number} count Número de sessões.
 * @returns {string}
 */
export function getSeriesConfirmLabel(count) {
  return count === 1 ? 'Criar 1 sessão' : `Criar ${count} sessões`
}

/**
 * Linha de uma sessão na pré-visualização, com o prazo calculado ("N dias antes", às 23:59).
 *
 * @param {string} date Data da sessão (AAAA-MM-DD).
 * @param {string} daysBefore Número de dias escrito pelo admin.
 * @returns {string} "20 Mar 2099 · inscrições até 17 Mar 2099, 23:59", ou só a data sem um número válido.
 */
export function formatSeriesSessionLine(date, daysBefore) {
  const text = typeof daysBefore === 'string' ? daysBefore.trim() : ''
  const days = Number(text)

  if (!/^\d+$/.test(text) || days < 1) return formatShortDate(date)

  return `${formatShortDate(date)} · inscrições até ${formatShortDate(addDays(date, -days))}, ${DEADLINE_TIME}`
}
