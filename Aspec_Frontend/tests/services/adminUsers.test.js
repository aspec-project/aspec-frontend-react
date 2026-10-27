import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../src/services/api'
import {
  anonymizeUser,
  approveUser,
  blockUser,
  demoteUser,
  getAdminUser,
  getAdminUsers,
  promoteUser,
  rejectUser,
  sendPaymentLink,
  unblockUser,
} from '../../src/services/adminUsers'

const payload = {
  items: [{ id: 'u1', email: 'ana@techbless.pt' }],
  pagination: { current_page: 1, per_page: 12, total: 1, last_page: 1 },
  counts: { all: 1, active: 1, pending: 0, approved: 0, blocked: 0, inactive: 0 },
  subscription_state_counts: {
    pending: 0, awaiting_activation: 0, blocked: 0, lapsed: 0, inactive: 0, exempt: 0, grace: 0, trial: 0, active: 1,
  },
  admins_count: 2,
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

  it('envia o estado da subscrição, a pesquisa sem espaços e os admins', async () => {
    const get = mockGet()

    await getAdminUsers({ subscriptionState: 'grace', search: '  ana ', includeAdmins: true, page: 2 })

    expect(get.mock.calls[0][1].params).toEqual({ page: 2, subscription_state: 'grace', search: 'ana', include_admins: 1 })
  })

  it('não envia o estado da conta nem filtros vazios', async () => {
    const get = mockGet()

    await getAdminUsers({ status: 'Inactive', blocked: true })
    await getAdminUsers({ subscriptionState: '' })
    await getAdminUsers({ search: '   ', includeAdmins: false })

    expect(get.mock.calls.map((call) => call[1].params)).toEqual([{ page: 1 }, { page: 1 }, { page: 1 }])
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

describe('recusar e bloquear com justificação', () => {
  afterEach(() => vi.restoreAllMocks())

  it('recusa com a justificação sem espaços nas pontas no corpo e aceita data nulo', async () => {
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: { success: true, message: 'Utilizador rejeitado com sucesso.', data: null } })

    const result = await rejectUser('u1', '  Não cumpre os critérios.  ')

    expect(patch.mock.calls).toEqual([['/admin/users/u1/reject', { reason: 'Não cumpre os critérios.' }]])
    expect(result).toEqual({ message: 'Utilizador rejeitado com sucesso.', user: null })
  })

  it('bloqueia com a justificação no corpo mantendo as quebras de linha interiores', async () => {
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: { success: true, message: 'M', data: { id: 'u1' } } })

    await blockUser('u1', 'Linha 1\nLinha 2')

    expect(patch.mock.calls).toEqual([['/admin/users/u1/block', { reason: 'Linha 1\nLinha 2' }]])
  })

  it('sem justificação válida faz o PATCH sem corpo', async () => {
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: { success: true, message: 'M', data: null } })
    const pairs = [[rejectUser, 'reject'], [blockUser, 'block']]

    for (const [action, path] of pairs) {
      for (const reason of [undefined, '', '   ', null, { type: 'click' }]) {
        patch.mockClear()

        await action('u1', reason)

        expect(patch.mock.calls).toEqual([[`/admin/users/u1/${path}`]])
      }
    }
  })

  it('propaga o erro do pedido com justificação', async () => {
    const error = new Error('Falha de rede')
    vi.spyOn(api, 'patch').mockRejectedValue(error)

    await expect(rejectUser('u1', 'x')).rejects.toBe(error)
    await expect(blockUser('u1', 'x')).rejects.toBe(error)
  })
})

describe('promover e despromover administradores', () => {
  afterEach(() => vi.restoreAllMocks())

  it('faz um PATCH sem corpo à rota certa com o id codificado e devolve a mensagem e o utilizador', async () => {
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: { success: true, message: 'M', data: { id: 'u 1' } } })

    expect(await promoteUser('u 1')).toEqual({ message: 'M', user: { id: 'u 1' } })
    expect(await demoteUser('u 1')).toEqual({ message: 'M', user: { id: 'u 1' } })

    expect(patch.mock.calls).toEqual([['/admin/users/u%201/promote'], ['/admin/users/u%201/demote']])
  })

  it('propaga o erro do pedido', async () => {
    const error = new Error('Falha de rede')
    vi.spyOn(api, 'patch').mockRejectedValue(error)

    await expect(promoteUser('u1')).rejects.toBe(error)
    await expect(demoteUser('u1')).rejects.toBe(error)
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

describe('anonimizar e enviar email de pagamento', () => {
  afterEach(() => vi.restoreAllMocks())

  it('anonimiza com um POST sem corpo e devolve a mensagem e os dados', async () => {
    const data = { id: 'u3', anonymized_at: '2026-10-22T10:15:00+00:00' }
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { success: true, message: 'Membro anonimizado com sucesso.', data } })

    const result = await anonymizeUser('u3')

    expect(post.mock.calls).toEqual([['/admin/users/u3/anonymize']])
    expect(result).toEqual({ message: 'Membro anonimizado com sucesso.', data })
  })

  it('codifica o id no caminho da anonimização', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { success: true, message: 'M', data: {} } })

    await anonymizeUser('a/b')

    expect(post).toHaveBeenCalledWith('/admin/users/a%2Fb/anonymize')
  })

  it('envia o email de pagamento com um POST sem corpo e devolve a mensagem e o tipo', async () => {
    const data = { id: 'u3', type: 'reactivation' }
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { success: true, message: 'Foi enviado o email de reativação.', data } })

    const result = await sendPaymentLink('u3')

    expect(post.mock.calls).toEqual([['/admin/users/u3/payment-link']])
    expect(result).toEqual({ message: 'Foi enviado o email de reativação.', data })
  })

  it('propaga o erro do pedido', async () => {
    const error = new Error('Falha de rede')
    vi.spyOn(api, 'post').mockRejectedValue(error)

    await expect(anonymizeUser('u3')).rejects.toBe(error)
    await expect(sendPaymentLink('u3')).rejects.toBe(error)
  })
})
