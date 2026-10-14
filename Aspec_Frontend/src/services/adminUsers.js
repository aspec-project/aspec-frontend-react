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
