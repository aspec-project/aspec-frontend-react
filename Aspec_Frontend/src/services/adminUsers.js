import { api } from './api'

/**
 * Obtém uma página da lista de utilizadores do backoffice, com as contagens por separador.
 *
 * @param {{status?: string, blocked?: boolean, search?: string, includeAdmins?: boolean, page?: number}} filters
 * @param {AbortSignal} [signal] Permite cancelar o pedido quando os filtros mudam.
 * @returns {Promise<{items: object[], pagination: object, counts: object}>}
 */
export async function getAdminUsers(filters = {}, signal) {
  const params = { page: filters.page ?? 1 }

  if (filters.status) {
    params.status = filters.status
  }

  if (typeof filters.blocked === 'boolean') {
    params.blocked = filters.blocked ? 1 : 0
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
 * Aplica uma ação de administração a um utilizador do backoffice (PATCH sem corpo).
 *
 * @param {string} id Id do utilizador.
 * @param {'approve'|'reject'|'block'|'unblock'|'promote'|'demote'} action Ação da API.
 * @returns {Promise<{message: string, user: object}>} Mensagem da API e utilizador atualizado.
 */
async function changeUserStatus(id, action) {
  const response = await api.patch(`/admin/users/${encodeURIComponent(id)}/${action}`)

  return { message: response.data.message, user: response.data.data }
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
 * Recusa uma candidatura pendente (a API desativa a conta sem enviar email).
 *
 * @param {string} id Id do utilizador.
 * @returns {Promise<{message: string, user: object}>}
 */
export function rejectUser(id) {
  return changeUserStatus(id, 'reject')
}

/**
 * Bloqueia um membro (a API desativa a conta, termina as sessões e cancela a subscrição).
 *
 * @param {string} id Id do utilizador.
 * @returns {Promise<{message: string, user: object}>}
 */
export function blockUser(id) {
  return changeUserStatus(id, 'block')
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
