import { api } from './api'
import { isIsoDateTime } from '../utils/dateFormat'

const FORMAT_ERROR = 'A resposta da moderação tem um formato inesperado.'
const STATUSES = ['Visible', 'Hidden', 'Flagged']
const FLAGGING_SOURCES = ['automatic', 'member']

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
 * Indica se um valor é texto ou null.
 *
 * @param {unknown} value Valor a verificar.
 * @returns {boolean}
 */
function isStringOrNull(value) {
  return value === null || typeof value === 'string'
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
 * Guarda só o nome do negócio de um lado da avaliação (autor ou avaliado).
 *
 * @param {unknown} business Negócio vindo da API (objeto ou null).
 * @returns {{business_name: string|null}|undefined} Negócio, ou undefined se a forma for inválida.
 */
function readBusiness(business) {
  if (business === null || business === undefined) return { business_name: null }
  if (!isObject(business)) return undefined

  const name = business.business_name ?? null

  return isStringOrNull(name) ? { business_name: name } : undefined
}

/**
 * Filtra as origens da sinalização: só as conhecidas, sem repetidos e pela ordem automatic, member.
 *
 * @param {unknown} sources Origens vindas da API.
 * @returns {string[]|undefined} Origens, ou undefined se não for uma lista.
 */
function readFlaggingSources(sources) {
  if (sources === undefined || sources === null) return []
  if (!Array.isArray(sources)) return undefined

  return FLAGGING_SOURCES.filter((source) => sources.includes(source))
}

/**
 * Reconstrói uma avaliação só com os campos que a página mostra (lista branca).
 *
 * @param {unknown} item Avaliação vinda da API.
 * @returns {{
 *   id: string,
 *   rating: number,
 *   comment: string|null,
 *   status: 'Visible'|'Hidden'|'Flagged',
 *   hidden_reason: string|null,
 *   reviewer: {business_name: string|null},
 *   reviewed: {business_name: string|null},
 *   flagging_sources: string[],
 *   created_at: string,
 * }|null} Avaliação, ou null se a forma for inválida.
 */
function readReview(item) {
  if (!isObject(item)) return null

  const reviewer = readBusiness(item.reviewer)
  const reviewed = readBusiness(item.reviewed)
  const flaggingSources = readFlaggingSources(item.flagging_sources)
  const hiddenReason = item.hidden_reason ?? null
  const comment = item.comment ?? null

  const valid =
    typeof item.id === 'string' &&
    item.id !== '' &&
    Number.isInteger(item.rating) &&
    item.rating >= 1 &&
    item.rating <= 5 &&
    isStringOrNull(comment) &&
    STATUSES.includes(item.status) &&
    isStringOrNull(hiddenReason) &&
    reviewer !== undefined &&
    reviewed !== undefined &&
    flaggingSources !== undefined &&
    isIsoDateTime(item.created_at)

  if (!valid) return null

  return {
    id: item.id,
    rating: item.rating,
    comment,
    status: item.status,
    hidden_reason: hiddenReason,
    reviewer,
    reviewed,
    flagging_sources: flaggingSources,
    created_at: item.created_at,
  }
}

/**
 * Reconstrói a paginação só com as quatro chaves usadas.
 *
 * @param {unknown} pagination Paginação vinda da API.
 * @returns {{current_page: number, per_page: number, total: number, last_page: number}|null}
 */
function readPagination(pagination) {
  if (!isObject(pagination)) return null

  const result = {
    current_page: pagination.current_page,
    per_page: pagination.per_page,
    total: pagination.total,
    last_page: pagination.last_page,
  }

  return Object.values(result).every(isCount) ? result : null
}

/**
 * Reconstrói as contagens por estado. Se `all` faltar, é a soma das outras três.
 *
 * @param {unknown} counts Contagens vindas da API.
 * @returns {{all: number, flagged: number, visible: number, hidden: number}|null}
 */
function readCounts(counts) {
  if (!isObject(counts)) return null

  const { flagged, visible, hidden } = counts

  if (![flagged, visible, hidden].every(isCount)) return null

  const all = counts.all ?? flagged + visible + hidden

  return isCount(all) ? { all, flagged, visible, hidden } : null
}

/**
 * Obtém uma página das avaliações para moderar (10 por página, valor por omissão da API) e valida a forma
 * da resposta. Cada avaliação chega aos componentes só com os campos que a página mostra (minimização).
 *
 * @param {{status: 'all'|'flagged'|'visible'|'hidden', page: number}} filters Filtro ativo e página.
 * @param {AbortSignal} [signal] Permite cancelar o pedido ao mudar de filtro ou desmontar a página.
 * @returns {Promise<{
 *   items: object[],
 *   pagination: {current_page: number, per_page: number, total: number, last_page: number},
 *   counts: {all: number, flagged: number, visible: number, hidden: number},
 * }>}
 * @throws {Error} Se a resposta tiver um formato inesperado; os erros do axios são relançados tal como estão.
 */
export async function getAdminReviews({ status, page }, signal) {
  const params = status === 'all' ? { page } : { status, page }
  const response = await api.get('/admin/reviews', { params, signal })
  const body = response.data
  const data = body?.data

  if (body?.success !== true || !isObject(data) || !Array.isArray(data.items)) {
    throw new Error(FORMAT_ERROR)
  }

  const items = data.items.map(readReview)
  const pagination = readPagination(data.pagination)
  const counts = readCounts(data.counts)

  if (items.includes(null) || pagination === null || counts === null) {
    throw new Error(FORMAT_ERROR)
  }

  return { items, pagination, counts }
}

/**
 * Oculta uma avaliação. A justificação vai sem espaços nas pontas e é omitida quando fica vazia.
 *
 * @param {string} id Id da avaliação.
 * @param {string} [justification] Justificação escrita pelo admin (opcional).
 * @returns {Promise<{message: string}>} Mensagem da API.
 * @throws {import('axios').AxiosError} Erros do pedido, tal como chegam.
 */
export async function hideReview(id, justification) {
  const url = `/admin/reviews/${encodeURIComponent(id)}/hide`
  const text = typeof justification === 'string' ? justification.trim() : ''
  const response = text === '' ? await api.patch(url) : await api.patch(url, { justification: text })

  return { message: response.data?.message }
}

/**
 * Volta a mostrar uma avaliação oculta (a API apaga a justificação de ocultação).
 *
 * @param {string} id Id da avaliação.
 * @returns {Promise<{message: string}>} Mensagem da API.
 * @throws {import('axios').AxiosError} Erros do pedido, tal como chegam.
 */
export async function showReview(id) {
  const response = await api.patch(`/admin/reviews/${encodeURIComponent(id)}/show`)

  return { message: response.data?.message }
}

/**
 * Retira a sinalização de uma avaliação, que volta a ficar visível.
 *
 * @param {string} id Id da avaliação.
 * @returns {Promise<{message: string}>} Mensagem da API.
 * @throws {import('axios').AxiosError} Erros do pedido, tal como chegam.
 */
export async function unflagReview(id) {
  const response = await api.patch(`/admin/reviews/${encodeURIComponent(id)}/unflag`)

  return { message: response.data?.message }
}
