import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../src/services/api'
import { getAdminUsers } from '../../src/services/adminUsers'

const payload = {
  items: [{ id: 'u1', email: 'ana@techbless.pt' }],
  pagination: { current_page: 1, per_page: 12, total: 1, last_page: 1 },
  counts: { all: 1, active: 1, pending: 0, approved: 0, blocked: 0, inactive: 0 },
}

function mockGet() {
  return vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, message: 'ok', data: payload } })
}

describe('getAdminUsers', () => {
  afterEach(() => vi.restoreAllMocks())

  it('pede a primeira página por omissão, passa o signal e devolve os dados da resposta', async () => {
    const get = mockGet()
    const signal = new AbortController().signal

    const result = await getAdminUsers({}, signal)

    expect(get).toHaveBeenCalledWith('/admin/users', { params: { page: 1 }, signal })
    expect(result).toEqual(payload)
  })

  it('traduz os filtros para a query string e omite os que não se aplicam', async () => {
    const get = mockGet()

    await getAdminUsers({ status: 'Inactive', blocked: true, search: '  ana ', includeAdmins: true, page: 2 })
    await getAdminUsers({ status: 'Inactive', blocked: false })
    await getAdminUsers({ search: '   ', includeAdmins: false })

    expect(get.mock.calls[0][1].params).toEqual({ page: 2, status: 'Inactive', blocked: 1, search: 'ana', include_admins: 1 })
    expect(get.mock.calls[1][1].params).toEqual({ page: 1, status: 'Inactive', blocked: 0 })
    expect(get.mock.calls[2][1].params).toEqual({ page: 1 })
  })

  it('propaga o erro do pedido', async () => {
    const error = new Error('Falha de rede')
    vi.spyOn(api, 'get').mockRejectedValue(error)

    await expect(getAdminUsers({})).rejects.toBe(error)
  })
})
