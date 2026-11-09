import { afterEach, describe, expect, it, vi } from 'vitest'
import { AxiosError } from 'axios'
import { api } from '../../src/services/api'
import { getAdminDashboard, getDashboardPendingApplications } from '../../src/services/adminDashboard'

const FORMAT_ERROR = 'A resposta do painel tem um formato inesperado.'

const stats = {
  active_members: { total: 320, new_this_month: 12 },
  pending_applications: { total: 3 },
  events: { this_month: 8, this_week: 2 },
  reviews: { flagged: 2, new_this_week: 5 },
  overdue_payments: { total: 7, grace: 4, unpaid: 3 },
  event_registrations: { this_week: 23, events_with_registrations: 2 },
}

const application = {
  id: 'u1',
  email: 'filipa.rodrigues@example.pt',
  phone: '+351910000999',
  created_at: '2026-10-29T10:32:00+00:00',
  role: { id: 'r1', name: 'Member' },
  account_status: { id: 's1', name: 'Pending' },
  subscription_state: { value: 'pending', label: 'Pendente' },
  inactive_reason: null,
  member_profile: {
    name: 'Filipa Rodrigues',
    business_name: 'Design Studio FiR',
    sector: { id: 'sec1', name: 'Design' },
    location: { id: 'loc1', name: 'Lisboa' },
  },
}

const review = {
  id: 'rv1',
  rating: 1,
  status: 'Flagged',
  reviewed: { business_name: 'Padaria São João' },
  reviewer: { business_name: 'Casa Moderna Decorações' },
}

function body(data = {}) {
  return {
    success: true,
    message: 'Dados do painel obtidos com sucesso.',
    data: { stats, pending_applications: [application], recent_reviews: [review], ...data },
  }
}

function mockGet(data) {
  return vi.spyOn(api, 'get').mockResolvedValue({ data })
}

describe('getAdminDashboard', () => {
  afterEach(() => vi.restoreAllMocks())

  it('pede o painel com o signal, reconstrói os totais, mantém as candidaturas e deixa cair o comentário das avaliações', async () => {
    const get = mockGet(body({
      stats: { ...stats, extra: 1 },
      recent_reviews: [
        { ...review, comment: 'Texto', reviewed: { business_name: 'Padaria São João', id: 'p1' }, reviewer: { business_name: 'Casa Moderna Decorações', email: 'x@example.pt' } },
        { ...review, id: 'rv2', status: 'Visible', rating: 5, reviewed: null },
      ],
    }))
    const signal = new AbortController().signal

    const result = await getAdminDashboard(signal)

    expect(get).toHaveBeenCalledWith('/admin/dashboard', { signal })
    expect(Object.keys(result).sort()).toEqual(['pending_applications', 'recent_reviews', 'stats'])
    expect(result.stats).toEqual(stats)
    expect(result.pending_applications).toEqual([application])
    expect(result.pending_applications[0].email).toBe('filipa.rodrigues@example.pt')

    const [first, second] = result.recent_reviews
    expect(Object.keys(first).sort()).toEqual(['id', 'rating', 'reviewed', 'reviewer', 'status'])
    expect(first).not.toHaveProperty('comment')
    expect(first.reviewed).toEqual({ business_name: 'Padaria São João' })
    expect(first.reviewer).toEqual({ business_name: 'Casa Moderna Decorações' })
    expect(second.reviewed).toBeNull()
  })

  it.each([
    ['success falso', { ...body(), success: false }],
    ['data em falta', { success: true, message: 'ok' }],
    ['stats.events em falta', body({ stats: { ...stats, events: undefined } })],
    ['flagged negativo', body({ stats: { ...stats, reviews: { flagged: -1, new_this_week: 5 } } })],
    ['flagged decimal', body({ stats: { ...stats, reviews: { flagged: 1.5, new_this_week: 5 } } })],
    ['flagged em texto', body({ stats: { ...stats, reviews: { flagged: '2', new_this_week: 5 } } })],
    ['flagged nulo', body({ stats: { ...stats, reviews: { flagged: null, new_this_week: 5 } } })],
    ['candidaturas que não são lista', body({ pending_applications: {} })],
    ['candidatura sem id', body({ pending_applications: [{ ...application, id: undefined }] })],
    ['perfil em texto', body({ pending_applications: [{ ...application, member_profile: 'x' }] })],
    ['nota 0', body({ recent_reviews: [{ ...review, rating: 0 }] })],
    ['nota 6', body({ recent_reviews: [{ ...review, rating: 6 }] })],
    ['nota 4.5', body({ recent_reviews: [{ ...review, rating: 4.5 }] })],
    ['estado que não é texto', body({ recent_reviews: [{ ...review, status: 3 }] })],
    ['autor em texto', body({ recent_reviews: [{ ...review, reviewer: 'x' }] })],
  ])('recusa uma resposta com formato inesperado: %s', async (_, response) => {
    mockGet(response)

    const caught = await getAdminDashboard().catch((err) => err)

    expect(caught).toBeInstanceOf(Error)
    expect(caught).not.toBeInstanceOf(AxiosError)
    expect(caught.message).toBe(FORMAT_ERROR)
  })

  it('relança os erros do axios tal como estão', async () => {
    const error = new AxiosError('Request failed with status code 429', AxiosError.ERR_BAD_REQUEST, undefined, undefined, {
      status: 429,
      statusText: 'Too Many Requests',
      headers: {},
      config: {},
      data: { success: false, message: 'Demasiados pedidos. Tente novamente mais tarde.' },
    })
    vi.spyOn(api, 'get').mockRejectedValue(error)

    await expect(getAdminDashboard()).rejects.toBe(error)
  })

  it.each([
    ['overdue_payments em falta', body({ stats: { ...stats, overdue_payments: undefined } })],
    ['unpaid em texto', body({ stats: { ...stats, overdue_payments: { total: 7, grace: 4, unpaid: '3' } } })],
    ['grace negativo', body({ stats: { ...stats, overdue_payments: { total: 7, grace: -1, unpaid: 3 } } })],
    ['event_registrations em falta', body({ stats: { ...stats, event_registrations: undefined } })],
    ['events_with_registrations decimal', body({ stats: { ...stats, event_registrations: { this_week: 23, events_with_registrations: 1.5 } } })],
    ['this_week das inscrições nulo', body({ stats: { ...stats, event_registrations: { this_week: null, events_with_registrations: 2 } } })],
  ])('recusa um painel sem os números novos válidos: %s', async (_, response) => {
    mockGet(response)

    const caught = await getAdminDashboard().catch((err) => err)

    expect(caught).toBeInstanceOf(Error)
    expect(caught).not.toBeInstanceOf(AxiosError)
    expect(caught.message).toBe(FORMAT_ERROR)
  })
})

function pageBody({ items = [application, { ...application, id: 'u2' }], pagination = { current_page: 2, per_page: 3, total: 5, last_page: 2 }, ...rest } = {}) {
  return {
    success: true,
    message: 'Candidaturas pendentes obtidas com sucesso.',
    data: { items, pagination },
    ...rest,
  }
}

describe('getDashboardPendingApplications', () => {
  afterEach(() => vi.restoreAllMocks())

  it('pede a página com o signal, mantém os itens, devolve só as quatro chaves da paginação e aceita uma página para lá da última', async () => {
    const items = [application, { ...application, id: 'u2', email: 'tiago.mendes@example.pt' }]
    const get = mockGet(pageBody({ items, pagination: { current_page: 2, per_page: 3, total: 5, last_page: 2, extra: 1 } }))
    const signal = new AbortController().signal

    const result = await getDashboardPendingApplications(2, signal)

    expect(get).toHaveBeenCalledWith('/admin/dashboard/pending-applications', { params: { page: 2 }, signal })
    expect(result.items).toEqual(items)
    expect(result.items[0].email).toBe('filipa.rodrigues@example.pt')
    expect(result.items[0].phone).toBe('+351910000999')
    expect(result.pagination).toEqual({ current_page: 2, per_page: 3, total: 5, last_page: 2 })
    expect(Object.keys(result.pagination).sort()).toEqual(['current_page', 'last_page', 'per_page', 'total'])

    vi.restoreAllMocks()
    mockGet(pageBody({ items: [], pagination: { current_page: 4, per_page: 3, total: 7, last_page: 3 } }))

    const beyond = await getDashboardPendingApplications(4)

    expect(beyond.items).toEqual([])
    expect(beyond.pagination).toEqual({ current_page: 4, per_page: 3, total: 7, last_page: 3 })
  })

  it.each([
    ['success falso', { ...pageBody(), success: false }],
    ['items que não são lista', pageBody({ items: {} })],
    ['item sem id', pageBody({ items: [{ ...application, id: undefined }] })],
    ['perfil em texto', pageBody({ items: [{ ...application, member_profile: 'x' }] })],
    ['pagination em falta', { success: true, message: 'ok', data: { items: [application] } }],
    ['current_page diferente da pedida', pageBody({ pagination: { current_page: 3, per_page: 3, total: 9, last_page: 3 } })],
    ['per_page 15', pageBody({ pagination: { current_page: 2, per_page: 15, total: 20, last_page: 2 } })],
    ['total negativo', pageBody({ pagination: { current_page: 2, per_page: 3, total: -1, last_page: 1 } })],
    ['last_page incoerente', pageBody({ pagination: { current_page: 2, per_page: 3, total: 7, last_page: 2 } })],
    ['quatro itens', pageBody({
      items: ['a', 'b', 'c', 'd'].map((id) => ({ ...application, id })),
      pagination: { current_page: 2, per_page: 3, total: 7, last_page: 3 },
    })],
    ['current_page em texto', pageBody({ pagination: { current_page: 'x', per_page: 3, total: 5, last_page: 2 } })],
  ])('recusa uma página com formato inesperado: %s', async (_, response) => {
    mockGet(response)

    const caught = await getDashboardPendingApplications(2).catch((err) => err)

    expect(caught).toBeInstanceOf(Error)
    expect(caught).not.toBeInstanceOf(AxiosError)
    expect(caught.message).toBe(FORMAT_ERROR)
  })

  it('relança os erros do axios da página tal como estão', async () => {
    const error = new AxiosError('Request failed with status code 429', AxiosError.ERR_BAD_REQUEST, undefined, undefined, {
      status: 429,
      statusText: 'Too Many Requests',
      headers: {},
      config: {},
      data: { success: false, message: 'Demasiados pedidos. Tente novamente mais tarde.' },
    })
    vi.spyOn(api, 'get').mockRejectedValue(error)

    await expect(getDashboardPendingApplications(2)).rejects.toBe(error)
  })
})
