import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../src/services/api'
import { saveMemberReview } from '../../src/services/members'

const id = '019512a1-1234-7123-8123-123456789abc'
const review = (index, mine = false) => ({
  id: `019512a1-1234-7123-8123-${String(index).padStart(12, '0')}`,
  rating: mine ? 2 : 5, comment: 'Comentário de teste', created_at: '2026-01-01T10:00:00Z',
  reviewer: { id, business_name: 'Autor de teste' }, is_mine: mine,
})
const response = (data, config, status = 200) => ({ data, config, status, statusText: '', headers: {} })
const values = { rating: 2, comment: 'Comentário de teste' }

describe('Avaliações: estado de moderação devolvido ao guardar', () => {
  let original
  beforeEach(() => { original = api.defaults.adapter })
  afterEach(() => { api.defaults.adapter = original; vi.restoreAllMocks() })

  it('devolve o estado Flagged com os campos públicos e sem a mensagem nem campos extra', async () => {
    api.defaults.adapter = vi.fn((config) => Promise.resolve(response({
      success: true,
      message: 'A sua avaliação ficou a aguardar moderação.',
      data: { ...review(1, true), status: 'Flagged', hidden_reason: 'x', flagging_reasons: ['language_filter'] },
    }, config, 201)))
    const result = await saveMemberReview(id, values)
    expect(result).toEqual({ ...review(1, true), status: 'Flagged' })
    expect(result).not.toHaveProperty('message')
    expect(result).not.toHaveProperty('hidden_reason')
    expect(result).not.toHaveProperty('flagging_reasons')
  })

  it.each(['Visible', 'Hidden'])('devolve o estado %s quando a API o envia', async (status) => {
    api.defaults.adapter = vi.fn((config) => Promise.resolve(response({
      success: true, data: { ...review(1, true), status },
    }, config, 200)))
    await expect(saveMemberReview(id, values)).resolves.toEqual({ ...review(1, true), status })
  })

  it('sem estado na resposta devolve o mesmo que hoje, sem lançar erro', async () => {
    api.defaults.adapter = vi.fn((config) => Promise.resolve(response({ success: true, data: review(1, true) }, config, 201)))
    const result = await saveMemberReview(id, values)
    expect(result).toEqual(review(1, true))
    expect(result).not.toHaveProperty('status')
  })

  it.each(['Deleted', null, 1, 'flagged'])('rejeita um estado desconhecido: %j', async (status) => {
    api.defaults.adapter = vi.fn((config) => Promise.resolve(response({
      success: true, data: { ...review(1, true), status },
    }, config, 201)))
    await expect(saveMemberReview(id, values)).rejects.toThrow('A resposta da avaliação tem um formato inesperado.')
  })
})
