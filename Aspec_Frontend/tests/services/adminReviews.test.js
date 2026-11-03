import { afterEach, describe, expect, it, vi } from 'vitest'
import { AxiosError } from 'axios'
import { api } from '../../src/services/api'
import { getAdminReviews, hideReview, showReview, unflagReview } from '../../src/services/adminReviews'

const FORMAT_ERROR = 'A resposta da moderação tem um formato inesperado.'

const review = {
  id: 'b8f9c1a0-8888-4e88-8888-888888888888',
  rating: 1,
  comment: 'Péssimo atendimento! Nunca mais volto.',
  status: 'Flagged',
  hidden_reason: null,
  reviewed: { business_name: 'Padaria São João' },
  reviewer: { business_name: 'Casa Moderna Decorações' },
  flagging_sources: ['automatic'],
  created_at: '2025-01-10T10:15:00+00:00',
  updated_at: '2025-01-10T10:15:00+00:00',
}

const pagination = { current_page: 1, per_page: 10, total: 31, last_page: 4 }
const counts = { all: 31, flagged: 4, visible: 23, hidden: 4 }

function body(data = {}) {
  return {
    success: true,
    message: 'Lista de avaliações obtida com sucesso.',
    data: { items: [review], pagination, counts, ...data },
  }
}

function mockGet(data) {
  return vi.spyOn(api, 'get').mockResolvedValue({ data })
}

function apiError(status, message) {
  return new AxiosError('x', AxiosError.ERR_BAD_REQUEST, undefined, undefined, {
    status,
    statusText: '',
    headers: {},
    config: {},
    data: { success: false, message },
  })
}

describe('getAdminReviews', () => {
  afterEach(() => vi.restoreAllMocks())

  it('pede a lista só com a página em Todas e com o estado nos outros filtros, nunca com per_page', async () => {
    const get = mockGet(body())
    const signal = new AbortController().signal

    await getAdminReviews({ status: 'all', page: 1 }, signal)
    await getAdminReviews({ status: 'flagged', page: 2 }, signal)

    expect(get.mock.calls).toEqual([
      ['/admin/reviews', { params: { page: 1 }, signal }],
      ['/admin/reviews', { params: { status: 'flagged', page: 2 }, signal }],
    ])
  })

  it('devolve cada avaliação só com os campos que a página mostra', async () => {
    mockGet(body({
      items: [{
        ...review,
        email: 'autor@example.pt',
        user_id: 'u1',
        reports: [{ id: 'rp1', reason: 'other' }],
        reviewer: { business_name: 'Casa Moderna Decorações', email: 'casa@example.pt' },
        reviewed: { business_name: 'Padaria São João', id: 'p1' },
      }],
    }))

    const result = await getAdminReviews({ status: 'all', page: 1 })

    expect(result.items).toEqual([{
      id: review.id,
      rating: 1,
      comment: 'Péssimo atendimento! Nunca mais volto.',
      status: 'Flagged',
      hidden_reason: null,
      reviewer: { business_name: 'Casa Moderna Decorações' },
      reviewed: { business_name: 'Padaria São João' },
      flagging_sources: ['automatic'],
      created_at: '2025-01-10T10:15:00+00:00',
    }])
  })

  it('mantém só as origens conhecidas da sinalização, sem repetidos e por ordem', async () => {
    mockGet(body({
      items: [
        { ...review, flagging_sources: ['member', 'x', 'automatic', 'member'] },
        { ...review, id: 'r2', flagging_sources: undefined },
      ],
    }))

    const result = await getAdminReviews({ status: 'all', page: 1 })

    expect(result.items[0].flagging_sources).toEqual(['automatic', 'member'])
    expect(result.items[1].flagging_sources).toEqual([])
  })

  it('devolve as contagens, calcula Todas quando falta e a paginação só com as quatro chaves', async () => {
    mockGet(body({ pagination: { ...pagination, from: 1, to: 10 } }))

    const result = await getAdminReviews({ status: 'all', page: 1 })

    expect(result.counts).toEqual(counts)
    expect(result.pagination).toEqual(pagination)

    vi.restoreAllMocks()
    mockGet(body({ counts: { flagged: 4, visible: 23, hidden: 4 } }))

    const withoutAll = await getAdminReviews({ status: 'all', page: 1 })

    expect(withoutAll.counts).toEqual({ all: 31, flagged: 4, visible: 23, hidden: 4 })
  })

  it.each([
    ['success falso', { ...body(), success: false }],
    ['items que não é lista', body({ items: {} })],
    ['nota 0', body({ items: [{ ...review, rating: 0 }] })],
    ['nota 6', body({ items: [{ ...review, rating: 6 }] })],
    ['nota em texto', body({ items: [{ ...review, rating: '5' }] })],
    ['estado desconhecido', body({ items: [{ ...review, status: 'Removed' }] })],
    ['id vazio', body({ items: [{ ...review, id: '' }] })],
    ['comentário numérico', body({ items: [{ ...review, comment: 3 }] })],
    ['justificação numérica', body({ items: [{ ...review, hidden_reason: 3 }] })],
    ['data que não é ISO', body({ items: [{ ...review, created_at: 'ontem' }] })],
    ['paginação em falta', body({ pagination: undefined })],
    ['contagem negativa', body({ counts: { ...counts, hidden: -1 } })],
  ])('recusa uma resposta com formato inesperado: %s', async (_, response) => {
    mockGet(response)

    const caught = await getAdminReviews({ status: 'all', page: 1 }).catch((err) => err)

    expect(caught).toBeInstanceOf(Error)
    expect(caught).not.toBeInstanceOf(AxiosError)
    expect(caught.message).toBe(FORMAT_ERROR)
  })

  it('aceita um autor nulo e um negócio avaliado sem nome', async () => {
    mockGet(body({ items: [{ ...review, reviewer: null, reviewed: { business_name: null } }] }))

    const result = await getAdminReviews({ status: 'all', page: 1 })

    expect(result.items[0].reviewer).toEqual({ business_name: null })
    expect(result.items[0].reviewed).toEqual({ business_name: null })
  })
})

describe('ações de moderação', () => {
  afterEach(() => vi.restoreAllMocks())

  it('ocultar envia a justificação sem espaços nas pontas e com o id codificado', async () => {
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({
      data: { success: true, message: 'Avaliação ocultada com sucesso.', data: { ...review, status: 'Hidden' } },
    })

    const result = await hideReview('id/1', '  Viola o código  ')

    expect(patch.mock.calls).toEqual([['/admin/reviews/id%2F1/hide', { justification: 'Viola o código' }]])
    expect(result).toEqual({ message: 'Avaliação ocultada com sucesso.' })
  })

  it('ocultar sem justificação ou só com espaços não envia corpo', async () => {
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({
      data: { success: true, message: 'Avaliação ocultada com sucesso.', data: { ...review, status: 'Hidden' } },
    })

    await hideReview('r1', '   ')
    await hideReview('r1')

    expect(patch.mock.calls).toEqual([['/admin/reviews/r1/hide'], ['/admin/reviews/r1/hide']])
  })

  it('mostrar e retirar a sinalização não enviam corpo, devolvem a mensagem e relançam os erros do axios', async () => {
    const patch = vi.spyOn(api, 'patch')
      .mockResolvedValueOnce({ data: { success: true, message: 'Avaliação mostrada com sucesso.', data: {} } })
      .mockResolvedValueOnce({ data: { success: true, message: 'Sinalização removida com sucesso.', data: {} } })

    await expect(showReview('r 1')).resolves.toEqual({ message: 'Avaliação mostrada com sucesso.' })
    await expect(unflagReview('r 1')).resolves.toEqual({ message: 'Sinalização removida com sucesso.' })
    expect(patch.mock.calls).toEqual([['/admin/reviews/r%201/show'], ['/admin/reviews/r%201/unflag']])

    const error = apiError(409, 'Apenas avaliações ocultas podem ser mostradas.')
    patch.mockRejectedValue(error)

    await expect(showReview('r1')).rejects.toBe(error)
    await expect(unflagReview('r1')).rejects.toBe(error)
  })
})
