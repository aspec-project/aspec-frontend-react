import { api } from './api'

const FORMAT_ERROR = 'A resposta do painel tem um formato inesperado.'
const APPLICATIONS_PER_PAGE = 3

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
 * Indica se um valor é um objeto (não nulo e não lista).
 *
 * @param {unknown} value Valor a verificar.
 * @returns {boolean}
 */
function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Indica se um valor é um objeto ou null.
 *
 * @param {unknown} value Valor a verificar.
 * @returns {boolean}
 */
function isObjectOrNull(value) {
  return value === null || isObject(value)
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
 * Reconstrói os totais só com os 15 números esperados (6 grupos).
 *
 * @param {unknown} stats Totais vindos da API.
 * @returns {{
 *   active_members: {total: number, new_this_month: number, trial: number, active: number, admins: number},
 *   pending_applications: {total: number},
 *   events: {this_month: number, this_week: number},
 *   reviews: {flagged: number, new_this_week: number},
 *   overdue_payments: {total: number, grace: number, unpaid: number},
 *   event_registrations: {this_week: number, events_with_registrations: number},
 * }|null} Totais, ou null se faltar algum número ou não for um inteiro não negativo.
 */
function readStats(stats) {
  if (!isObject(stats)) return null

  const result = {
    active_members: {
      total: stats.active_members?.total,
      new_this_month: stats.active_members?.new_this_month,
      trial: stats.active_members?.trial,
      active: stats.active_members?.active,
      admins: stats.active_members?.admins,
    },
    pending_applications: { total: stats.pending_applications?.total },
    events: { this_month: stats.events?.this_month, this_week: stats.events?.this_week },
    reviews: { flagged: stats.reviews?.flagged, new_this_week: stats.reviews?.new_this_week },
    overdue_payments: {
      total: stats.overdue_payments?.total,
      grace: stats.overdue_payments?.grace,
      unpaid: stats.overdue_payments?.unpaid,
    },
    event_registrations: {
      this_week: stats.event_registrations?.this_week,
      events_with_registrations: stats.event_registrations?.events_with_registrations,
    },
  }

  const valid = Object.values(result).every((group) => Object.values(group).every(isCount))

  return valid ? result : null
}

/**
 * Indica se uma candidatura tem a forma esperada (id e perfil objeto ou null).
 *
 * @param {unknown} item Candidatura vinda da API.
 * @returns {boolean}
 */
function isValidApplication(item) {
  return isObject(item) && isFilledString(item.id) && isObjectOrNull(item.member_profile)
}

/**
 * Indica se uma avaliação tem a forma esperada (id, nota de 1 a 5, estado e negócios objeto ou null).
 *
 * @param {unknown} item Avaliação vinda da API.
 * @returns {boolean}
 */
function isValidReview(item) {
  return (
    isObject(item) &&
    isFilledString(item.id) &&
    Number.isInteger(item.rating) &&
    item.rating >= 1 &&
    item.rating <= 5 &&
    typeof item.status === 'string' &&
    isObjectOrNull(item.reviewed) &&
    isObjectOrNull(item.reviewer)
  )
}

/**
 * Guarda só o nome do negócio de um lado da avaliação.
 *
 * @param {object|null} business Negócio avaliado ou autor.
 * @returns {{business_name: unknown}|null}
 */
function pickBusiness(business) {
  return business === null ? null : { business_name: business.business_name }
}

/**
 * Obtém os totais e as listas do painel do backoffice num só pedido e valida a forma da resposta.
 * As candidaturas vêm como na lista de utilizadores (com o email, para as ações de aprovar e recusar);
 * as avaliações só com o id, a nota, o estado e os nomes dos negócios.
 *
 * @param {AbortSignal} [signal] Permite cancelar o pedido quando a página é desmontada.
 * @returns {Promise<{stats: object, pending_applications: object[], recent_reviews: object[]}>}
 * @throws {Error} Se a resposta tiver um formato inesperado; os erros do axios são relançados tal como estão.
 */
export async function getAdminDashboard(signal) {
  const response = await api.get('/admin/dashboard', { signal })
  const body = response.data
  const data = body?.data

  if (body?.success !== true || !isObject(data)) {
    throw new Error(FORMAT_ERROR)
  }

  const stats = readStats(data.stats)
  const applications = data.pending_applications
  const reviews = data.recent_reviews

  if (
    stats === null ||
    !Array.isArray(applications) ||
    !Array.isArray(reviews) ||
    !applications.every(isValidApplication) ||
    !reviews.every(isValidReview)
  ) {
    throw new Error(FORMAT_ERROR)
  }

  return {
    stats,
    pending_applications: applications,
    recent_reviews: reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      status: review.status,
      reviewed: pickBusiness(review.reviewed),
      reviewer: pickBusiness(review.reviewer),
    })),
  }
}

/**
 * Reconstrói a paginação de uma página de candidaturas e verifica se é coerente com a página pedida
 * (3 por página, última página calculada a partir do total).
 *
 * @param {unknown} pagination Paginação vinda da API.
 * @param {number} page Página pedida.
 * @returns {{current_page: number, per_page: number, total: number, last_page: number}|null} Paginação, ou
 *   null se faltar algum número ou não for coerente.
 */
function readApplicationsPagination(pagination, page) {
  if (!isObject(pagination)) return null

  const result = {
    current_page: pagination.current_page,
    per_page: pagination.per_page,
    total: pagination.total,
    last_page: pagination.last_page,
  }

  const valid =
    Object.values(result).every(isCount) &&
    result.current_page === page &&
    result.per_page === APPLICATIONS_PER_PAGE &&
    result.last_page === Math.max(1, Math.ceil(result.total / APPLICATIONS_PER_PAGE))

  return valid ? result : null
}

/**
 * Obtém uma página das candidaturas pendentes do painel (3 por página) e valida a forma da resposta.
 * Os itens vêm como recebidos (com o email, só para os diálogos de aprovar e recusar). Uma página para lá da
 * última é aceite com a lista vazia e a paginação verdadeira.
 *
 * @param {number} page Página pedida (inteiro maior ou igual a 1).
 * @param {AbortSignal} [signal] Permite cancelar o pedido ao mudar de página ou desmontar a página.
 * @returns {Promise<{items: object[], pagination: {current_page: number, per_page: number, total: number, last_page: number}}>}
 * @throws {Error} Se a resposta tiver um formato inesperado; os erros do axios são relançados tal como estão.
 */
export async function getDashboardPendingApplications(page, signal) {
  const response = await api.get('/admin/dashboard/pending-applications', { params: { page }, signal })
  const body = response.data
  const data = body?.data

  if (body?.success !== true || !isObject(data)) {
    throw new Error(FORMAT_ERROR)
  }

  const items = data.items
  const pagination = readApplicationsPagination(data.pagination, page)

  if (
    pagination === null ||
    !Array.isArray(items) ||
    items.length > APPLICATIONS_PER_PAGE ||
    !items.every(isValidApplication)
  ) {
    throw new Error(FORMAT_ERROR)
  }

  return { items, pagination }
}
