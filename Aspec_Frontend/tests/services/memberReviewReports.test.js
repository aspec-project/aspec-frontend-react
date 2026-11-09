import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../src/services/api'
import { MEMBER_REVIEW_REPORT_REASONS, reportMemberReview } from '../../src/services/members'

const reviewId = '019512a1-1234-7123-8123-123456789abc'
const reportId = '019512a1-1234-7123-8123-123456789abd'
const reason = 'offensive_or_disrespectful_content'
const body = () => ({ success: true, message: 'Avaliação sinalizada para moderação.', data: {
  id: reportId, review_id: reviewId, reason, comment: null,
  source: 'member', resolved_at: null, created_at: '2026-11-03T10:00:00.000000Z',
} })
const response = (data, config, status = 201) => ({ data, config, status, statusText: '', headers: {} })

describe('Sinalização de avaliações', () => {
  let original
  beforeEach(() => { original = api.defaults.adapter })
  afterEach(() => { api.defaults.adapter = original; vi.restoreAllMocks() })

  it('envia os valores contratados com sessão e devolve só a confirmação sanitizada', async () => {
    const data = body()
    data.data.comment = 'Detalhes'
    const adapter = vi.fn((config) => Promise.resolve(response({ ...data, private: 'ignorar', data: {
      ...data.data, reporter: { email: 'privado@example.test' },
    } }, config)))
    api.defaults.adapter = adapter
    const controller = new AbortController()
    await expect(reportMemberReview(reviewId, { reason, comment: ' Detalhes ', private: 'ignorar' }, controller.signal))
      .resolves.toEqual({ message: data.message, report: data.data })
    const config = adapter.mock.calls[0][0]
    expect(config).toMatchObject({ method: 'post', url: `/reviews/${reviewId}/reports`, skipAuthRedirect: true, withCredentials: true })
    expect(JSON.parse(config.data)).toEqual({ reason, comment: 'Detalhes' })
    expect(config.signal.aborted).toBe(false)
    controller.abort()
    expect(config.signal.aborted).toBe(true)
  })

  it.each([undefined, null, '', '   '])('omite comentário opcional vazio (%j)', async (comment) => {
    const adapter = vi.fn((config) => Promise.resolve(response(body(), config)))
    api.defaults.adapter = adapter
    await reportMemberReview(reviewId, { reason, comment })
    expect(JSON.parse(adapter.mock.calls[0][0].data)).toEqual({ reason })
  })

  it.each(MEMBER_REVIEW_REPORT_REASONS.map((option) => option.value))('aceita o motivo %s', async (value) => {
    api.defaults.adapter = (config) => Promise.resolve(response({ ...body(), data: { ...body().data, reason: value } }, config))
    await expect(reportMemberReview(reviewId, { reason: value })).resolves.toMatchObject({ report: { reason: value } })
  })

  it.each([
    ['inválido', { reason }], [reviewId, { reason: 'Outro motivo' }], [reviewId, { reason: '' }],
    [reviewId, null], [reviewId, { reason, comment: 12 }], [reviewId, { reason, comment: {} }],
    [reviewId, { reason, comment: 'a'.repeat(2001) }], [reviewId, { reason, comment: '😀'.repeat(2001) }],
  ])('rejeita parâmetros inválidos sem enviar pedidos', async (id, values) => {
    const adapter = vi.fn()
    api.defaults.adapter = adapter
    await expect(reportMemberReview(id, values)).rejects.toThrow()
    expect(adapter).not.toHaveBeenCalled()
  })

  it.each(['a', '😀'])('aceita precisamente 2000 caracteres Unicode (%s)', async (character) => {
    const adapter = vi.fn((config) => Promise.resolve(response(body(), config)))
    api.defaults.adapter = adapter
    await reportMemberReview(reviewId, { reason, comment: character.repeat(2000) })
    expect(JSON.parse(adapter.mock.calls[0][0].data).comment).toBe(character.repeat(2000))
  })

  it.each([401, 403, 404, 409, 419, 422, 429, 500])('preserva o erro HTTP %i para tratamento na interface', async (status) => {
    const error = { response: { status, data: { success: false, message: 'Pedido recusado.', errors: { reason: ['Motivo inválido.'] } } } }
    api.defaults.adapter = () => Promise.reject(error)
    await expect(reportMemberReview(reviewId, { reason })).rejects.toBe(error)
  })

  it('preserva erros de rede', async () => {
    const error = new Error('Network Error')
    api.defaults.adapter = () => Promise.reject(error)
    await expect(reportMemberReview(reviewId, { reason })).rejects.toBe(error)
  })

  it.each([
    null, { ...body(), success: false }, { ...body(), message: 123 }, { ...body(), message: '' },
    { ...body(), data: null }, { ...body(), data: { ...body().data, id: 'invalid' } },
    { ...body(), data: { ...body().data, review_id: reportId } },
    { ...body(), data: { ...body().data, reason: 'unknown' } },
    { ...body(), data: { ...body().data, comment: {} } },
    { ...body(), data: { ...body().data, comment: 'a'.repeat(2001) } },
    { ...body(), data: { ...body().data, source: 'admin' } },
    { ...body(), data: { ...body().data, resolved_at: '2026-11-03T10:00:00Z' } },
    { ...body(), data: { ...body().data, created_at: '2026-02-30T10:00:00Z' } },
  ])('não considera um 201 malformado como confirmação', async (data) => {
    api.defaults.adapter = (config) => Promise.resolve(response(data, config))
    await expect(reportMemberReview(reviewId, { reason })).rejects.toThrow('A resposta da sinalização tem um formato inesperado.')
  })

  it('exige o estado 201 previsto no contrato', async () => {
    api.defaults.adapter = (config) => Promise.resolve(response(body(), config, 200))
    await expect(reportMemberReview(reviewId, { reason })).rejects.toThrow()
  })
})
