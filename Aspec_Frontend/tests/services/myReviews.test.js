import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../src/services/api'
import { getMyReviews } from '../../src/services/members'

const FORMAT_ERROR = 'A resposta das suas avaliações tem um formato inesperado.'
const reviewId = '019512a1-9997-7123-8123-123456789abc'
const profileId = '019512a1-9998-7123-8123-123456789abc'

const review = {
  id: reviewId,
  direction: 'received',
  rating: 4,
  comment: 'Bom serviço.',
  status: 'Flagged',
  hidden_reason: null,
  flagging_reasons: ['language_filter', 'other'],
  reviewer: { id: profileId, business_name: 'Empresa Autora' },
  reviewed: { id: profileId, business_name: 'Empresa Avaliada' },
  created_at: '2026-10-01T12:00:00+00:00',
  updated_at: '2026-10-01T12:00:00+00:00',
}

function body(data = {}) {
  return {
    success: true,
    message: 'As suas avaliações foram obtidas com sucesso.',
    data: {
      items: [review],
      pagination: { current_page: 1, per_page: 5, total: 1, last_page: 1 },
      counts: { received: 3, written: 0 },
      ...data,
    },
  }
}

function mockGet(data) {
  return vi.spyOn(api, 'get').mockResolvedValue({ data })
}

const request = { direction: 'received', status: 'all', page: 1, perPage: 5 }

describe('getMyReviews', () => {
  afterEach(() => vi.restoreAllMocks())

  it('devolve as contagens e os motivos da sinalização', async () => {
    mockGet(body())

    const result = await getMyReviews(request)

    expect(result.counts).toEqual({ received: 3, written: 0 })
    expect(result.items[0].flagging_reasons).toEqual(['language_filter', 'other'])
  })

  it('não rejeita a página por causa de um código de motivo desconhecido', async () => {
    mockGet(body({ items: [{ ...review, flagging_reasons: ['codigo_novo'] }] }))

    const result = await getMyReviews(request)

    expect(result.items[0].flagging_reasons).toEqual(['codigo_novo'])
  })

  it.each([
    ['contagens em falta', body({ counts: undefined })],
    ['contagem negativa', body({ counts: { received: -1, written: 0 } })],
    ['contagem em texto', body({ counts: { received: '3', written: 0 } })],
    ['written em falta', body({ counts: { received: 3 } })],
    ['motivos em falta', body({ items: [{ ...review, flagging_reasons: undefined }] })],
    ['motivos que não são lista', body({ items: [{ ...review, flagging_reasons: 'other' }] })],
    ['motivo que não é texto', body({ items: [{ ...review, flagging_reasons: [1] }] })],
  ])('recusa uma resposta com formato inesperado: %s', async (_, response) => {
    mockGet(response)

    await expect(getMyReviews(request)).rejects.toThrow(FORMAT_ERROR)
  })
})
