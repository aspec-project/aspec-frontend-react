import { api } from './api'

/**
 * Obtém uma página da lista de utilizadores do backoffice, com as contagens por estado da subscrição.
 *
 * @param {{subscriptionState?: string, search?: string, includeAdmins?: boolean, page?: number}} filters
 * @param {AbortSignal} [signal] Permite cancelar o pedido quando os filtros mudam.
 * @returns {Promise<{items: object[], pagination: object, counts: object, subscription_state_counts: object, admins_count: number}>}
 */
export async function getAdminUsers(filters = {}, signal) {
  const params = { page: filters.page ?? 1 }

  if (filters.subscriptionState) {
    params.subscription_state = filters.subscriptionState
  }

  const search = (filters.search ?? '').trim()

  if (search !== '') {
    params.search = search
  }

  if (filters.includeAdmins === true) {
    params.include_admins = 1
  }

  const response = await api.get('/admin/users', { params, signal })

  return response.data.data
}

/**
 * Obtém o detalhe de um utilizador do backoffice (conta e perfil de membro).
 *
 * @param {string} id Id do utilizador.
 * @param {AbortSignal} [signal] Permite cancelar o pedido ao sair da página.
 * @returns {Promise<object>} O utilizador devolvido pela API.
 */
export async function getAdminUser(id, signal) {
  const response = await api.get(`/admin/users/${encodeURIComponent(id)}`, { signal })

  return response.data.data
}

/**
 * Aplica uma ação de administração a um utilizador do backoffice (PATCH com corpo opcional;
 * sem `body`, o pedido vai sem corpo).
 *
 * @param {string} id Id do utilizador.
 * @param {'approve'|'reject'|'block'|'unblock'|'promote'|'demote'} action Ação da API.
 * @param {{reason: string}} [body] Corpo do pedido, quando a ação o aceita.
 * @returns {Promise<{message: string, user: object|null}>} Mensagem da API e utilizador atualizado (null ao recusar).
 */
async function changeUserStatus(id, action, body) {
  const url = `/admin/users/${encodeURIComponent(id)}/${action}`
  const response = body === undefined ? await api.patch(url) : await api.patch(url, body)

  return { message: response.data.message, user: response.data.data }
}

/**
 * Corpo do pedido com a justificação sem espaços nas pontas, ou nada quando não há justificação.
 *
 * @param {unknown} reason Texto escrito pelo admin.
 * @returns {{reason: string}|undefined}
 */
function reasonBody(reason) {
  if (typeof reason !== 'string' || reason.trim() === '') {
    return undefined
  }

  return { reason: reason.trim() }
}

/**
 * Aprova uma candidatura pendente (a API envia o email de ativação).
 *
 * @param {string} id Id do utilizador.
 * @returns {Promise<{message: string, user: object}>}
 */
export function approveUser(id) {
  return changeUserStatus(id, 'approve')
}

/**
 * Recusa uma candidatura pendente: a API apaga a conta (anonimiza e faz soft delete) e envia um
 * email ao email pessoal, com a justificação quando existe.
 *
 * @param {string} id Id do utilizador.
 * @param {string} [reason] Justificação opcional; vazia ou só com espaços não é enviada.
 * @returns {Promise<{message: string, user: null}>}
 */
export function rejectUser(id, reason) {
  return changeUserStatus(id, 'reject', reasonBody(reason))
}

/**
 * Bloqueia um membro: a API desativa a conta, termina as sessões, cancela a subscrição e envia um
 * email ao email pessoal, com a justificação quando existe.
 *
 * @param {string} id Id do utilizador.
 * @param {string} [reason] Justificação opcional; vazia ou só com espaços não é enviada.
 * @returns {Promise<{message: string, user: object}>}
 */
export function blockUser(id, reason) {
  return changeUserStatus(id, 'block', reasonBody(reason))
}

/**
 * Desbloqueia um membro bloqueado (a API envia o email de ativação ou de reativação).
 *
 * @param {string} id Id do utilizador.
 * @returns {Promise<{message: string, user: object}>}
 */
export function unblockUser(id) {
  return changeUserStatus(id, 'unblock')
}

/**
 * Promove um membro ativo a administrador.
 *
 * @param {string} id Id do utilizador.
 * @returns {Promise<{message: string, user: object}>}
 */
export function promoteUser(id) {
  return changeUserStatus(id, 'promote')
}

/**
 * Despromove um administrador a membro (a API garante que fica pelo menos um administrador).
 *
 * @param {string} id Id do utilizador.
 * @returns {Promise<{message: string, user: object}>}
 */
export function demoteUser(id) {
  return changeUserStatus(id, 'demote')
}

/**
 * Anonimiza um membro (POST sem corpo): a API apaga os dados pessoais, fecha a conta e envia
 * um email de confirmação ao titular. A confirmação escrita é só do frontend.
 *
 * @param {string} id Id do utilizador.
 * @returns {Promise<{message: string, data: {id: string, anonymized_at: string}}>} Mensagem da API e dados da anonimização.
 */
export async function anonymizeUser(id) {
  const response = await api.post(`/admin/users/${encodeURIComponent(id)}/anonymize`)

  return { message: response.data.message, data: response.data.data }
}

/**
 * Envia ao email pessoal do membro o email de pagamento adequado ao estado da conta (POST sem corpo):
 * ativação, reativação ou lembrete. Não altera a conta.
 *
 * @param {string} id Id do utilizador.
 * @returns {Promise<{message: string, data: {id: string, type: 'activation'|'reactivation'|'payment_reminder'}}>} Mensagem da API e tipo de email enviado.
 */
export async function sendPaymentLink(id) {
  const response = await api.post(`/admin/users/${encodeURIComponent(id)}/payment-link`)

  return { message: response.data.message, data: response.data.data }
}
