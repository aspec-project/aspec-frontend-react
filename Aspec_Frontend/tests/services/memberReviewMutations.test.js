import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../src/services/api'
import { deleteMemberReview, getMemberReviewPage, getMemberReviews, saveMemberReview } from '../../src/services/members'
import { advanceSession } from '../../src/services/sessionContext'

const id = '019512a1-1234-7123-8123-123456789abc'
const review = (index, mine = false) => ({
  id: `019512a1-1234-7123-8123-${String(index).padStart(12, '0')}`,
  rating: mine ? 2 : 5, comment: 'Comentário de teste', created_at: '2026-01-01T10:00:00Z',
  reviewer: { id, business_name: 'Autor de teste' }, is_mine: mine,
})
const response = (data, config, status = 200) => ({ data, config, status, statusText: '', headers: {} })
const listBody = (all, page) => ({ success: true, data: {
  average_rating: 4.5, reviews_count: all.length,
  items: all.slice((page - 1) * 5, page * 5),
  pagination: { current_page: page, per_page: 5, total: all.length, last_page: Math.max(1, Math.ceil(all.length / 5)) },
} })

describe('Avaliações: escrita e paginação das restantes avaliações', () => {
  let original
  beforeEach(() => { original = api.defaults.adapter })
  afterEach(() => { api.defaults.adapter = original; vi.restoreAllMocks() })

  it.each([201, 200])('aceita criar ou atualizar (%i), enviando só os campos contratados', async (status) => {
    const adapter = vi.fn((config) => Promise.resolve(response({ success: true, data: {
      ...review(1, true), email: 'privado@example.test', reviewer: { ...review(1).reviewer, phone: 'privado' },
    } }, config, status)))
    api.defaults.adapter = adapter
    const result = await saveMemberReview(id, { rating: 2, comment: ' Texto ', private: 'ignorar' })
    expect(result).toEqual(review(1, true))
    const config = adapter.mock.calls[0][0]
    expect(config).toMatchObject({ method: 'post', url: `/members/${id}/reviews`, skipAuthRedirect: true, withCredentials: true })
    expect(JSON.parse(config.data)).toEqual({ rating: 2, comment: 'Texto' })
  })

  it.each([{ rating: 0, comment: 'Texto' }, { rating: 6, comment: 'Texto' }, { rating: 2.5, comment: 'Texto' },
    { rating: 5, comment: ' ' }, { rating: 5, comment: 'a'.repeat(2001) }, null])('rejeita dados inválidos antes do pedido: %j', async (values) => {
    const adapter = vi.fn()
    api.defaults.adapter = adapter
    await expect(saveMemberReview(id, values)).rejects.toThrow()
    expect(adapter).not.toHaveBeenCalled()
  })

  it('remove através do endpoint confirmado e valida a resposta', async () => {
    const adapter = vi.fn((config) => Promise.resolve(response({ success: true, data: null }, config)))
    api.defaults.adapter = adapter
    await expect(deleteMemberReview(id)).resolves.toBeUndefined()
    expect(adapter.mock.calls[0][0]).toMatchObject({ method: 'delete', url: `/members/${id}/reviews`, skipAuthRedirect: true })
    api.defaults.adapter = (config) => Promise.resolve(response({ success: false, data: null }, config))
    await expect(deleteMemberReview(id)).rejects.toThrow()
  })

  it.each([401, 403, 409, 422])('preserva o erro HTTP %i para tratamento no formulário', async (status) => {
    const failure = { response: { status, data: { errors: { comment: ['Comentário inválido.'] } } } }
    api.defaults.adapter = () => Promise.reject(failure)
    await expect(saveMemberReview(id, { rating: 5, comment: 'Texto' })).rejects.toBe(failure)
  })

  it('lê duas páginas da API para apresentar cinco outras avaliações e a própria separada', async () => {
    const all = [review(1, true), ...Array.from({ length: 10 }, (_, index) => review(index + 2))]
    const adapter = vi.fn((config) => Promise.resolve(response(listBody(all, config.params.page), config)))
    api.defaults.adapter = adapter
    const result = await getMemberReviewPage(id)
    expect(result.mine).toEqual(all[0])
    expect(result.items).toEqual(all.slice(1, 6))
    expect(result.pagination).toEqual({ current_page: 1, per_page: 5, total: 10, last_page: 2 })
    expect(adapter.mock.calls.map(([config]) => config.params.page)).toEqual([1, 2])
  })

  it('fixa a própria na página 2 mesmo com filtro incompatível, sem a duplicar', async () => {
    const all = [review(1, true), ...Array.from({ length: 10 }, (_, index) => review(index + 2))]
    const adapter = vi.fn((config) => Promise.resolve(response(listBody(all, config.params.page), config)))
    api.defaults.adapter = adapter
    const result = await getMemberReviewPage(id, 2, undefined, { sort: 'highest', rating: 5 })
    expect(result.mine.rating).toBe(2)
    expect(result.items).toEqual(all.slice(6, 11))
    expect(result.pagination.total).toBe(10)
    expect(adapter.mock.calls.map(([config]) => config.params)).toEqual([
      { page: 1, sort: 'highest', rating: 5 }, { page: 2, sort: 'highest', rating: 5 }, { page: 3, sort: 'highest', rating: 5 },
    ])
  })

  it('mantém cinco itens sem avaliação própria e ajusta páginas que deixaram de existir', async () => {
    const all = Array.from({ length: 3 }, (_, index) => review(index + 1))
    api.defaults.adapter = (config) => Promise.resolve(response(listBody(all, config.params.page), config))
    const result = await getMemberReviewPage(id, 2)
    expect(result).toMatchObject({ mine: null, items: all, pagination: { current_page: 1, total: 3 } })
  })

  it('não mistura páginas de duas sessões mesmo sem sinal do chamador', async () => {
    const all = [review(1, true), ...Array.from({ length: 5 }, (_, index) => review(index + 2))]
    const adapter = vi.fn((config) => Promise.resolve(response(listBody(all, config.params.page), config)))
    api.defaults.adapter = adapter
    const operation = getMemberReviewPage(id)
    // O primeiro pedido iniciou-se na geração anterior; nenhum pedido seguinte a pode substituir.
    advanceSession()
    await expect(operation).rejects.toMatchObject({ code: 'ERR_CANCELED' })
    expect(adapter).toHaveBeenCalledTimes(1)
  })

  it('valida filtros e a flag is_mine sem exigir esta em respostas antigas', async () => {
    const adapter = vi.fn((config) => Promise.resolve(response(listBody([{ ...review(1), is_mine: undefined }], 1), config)))
    api.defaults.adapter = adapter
    await expect(getMemberReviews(id)).resolves.toMatchObject({ items: [{ id: review(1).id }] })
    await expect(getMemberReviews(id, 1, undefined, { rating: 1.5 })).rejects.toThrow()
    await expect(getMemberReviews(id, 1, undefined, { sort: 'invalid' })).rejects.toThrow()
    expect(adapter).toHaveBeenCalledTimes(1)
    api.defaults.adapter = (config) => Promise.resolve(response(listBody([{ ...review(1), is_mine: 'true' }], 1), config))
    await expect(getMemberReviews(id)).rejects.toThrow()
  })
})
