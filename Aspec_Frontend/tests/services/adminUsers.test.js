import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../src/services/api'
import { approveUser, blockUser, getAdminUser, getAdminUsers, rejectUser, unblockUser } from '../../src/services/adminUsers'

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

describe('ações sobre utilizadores', () => {
  afterEach(() => vi.restoreAllMocks())

  it('cada ação faz um PATCH sem corpo à rota certa e devolve a mensagem e o utilizador', async () => {
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: { success: true, message: 'M', data: { id: 'u1' } } })
    const pairs = [[approveUser, 'approve'], [rejectUser, 'reject'], [blockUser, 'block'], [unblockUser, 'unblock']]

    for (const [action, path] of pairs) {
      patch.mockClear()

      const result = await action('u1')

      expect(patch.mock.calls).toEqual([[`/admin/users/u1/${path}`]])
      expect(result).toEqual({ message: 'M', user: { id: 'u1' } })
    }
  })

  it('codifica o id no caminho e propaga o erro do pedido', async () => {
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: { success: true, message: 'M', data: {} } })

    await approveUser('a/b?c')

    expect(patch).toHaveBeenCalledWith('/admin/users/a%2Fb%3Fc/approve')

    const error = new Error('Falha de rede')
    patch.mockRejectedValue(error)

    await expect(blockUser('u1')).rejects.toBe(error)
  })
})

describe('getAdminUser', () => {
  afterEach(() => vi.restoreAllMocks())

  it('pede o detalhe com o id codificado e o signal, devolve os dados e propaga o erro', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, message: 'ok', data: { id: 'u1' } } })
    const signal = new AbortController().signal

    const result = await getAdminUser('u1', signal)

    expect(get).toHaveBeenCalledWith('/admin/users/u1', { signal })
    expect(result).toEqual({ id: 'u1' })

    await getAdminUser('a/b?c')

    expect(get.mock.calls[1][0]).toBe('/admin/users/a%2Fb%3Fc')

    const error = new Error('Falha de rede')
    get.mockRejectedValue(error)

    await expect(getAdminUser('u1')).rejects.toBe(error)
  })
})
