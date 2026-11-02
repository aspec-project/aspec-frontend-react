import { afterEach, describe, expect, it, vi } from 'vitest'
import { AxiosError } from 'axios'
import { api } from '../../src/services/api'
import { getAdminDashboard } from '../../src/services/adminDashboard'

const FORMAT_ERROR = 'A resposta do painel tem um formato inesperado.'

const stats = {
  active_members: { total: 320, new_this_month: 12 },
  pending_applications: { total: 3 },
  events: { this_month: 8, this_week: 2 },
  reviews: { flagged: 2, new_this_week: 5 },
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
})
