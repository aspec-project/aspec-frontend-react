import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../src/services/api.js'
import { getOwnPrayerCard, saveOwnPrayerCard, getReceivedPrayerCards } from '../../src/services/prayerCards.js'
import { advanceSession, getSessionContext } from '../../src/services/sessionContext.js'

const id = '019512a1-9999-7123-8123-123456789abc'
const payload = { personal_request: 'Pela família.', work_request: '', salvation_request: '', consent: true }
const data = {
  prayer_verse: 'Orai uns pelos outros.', event_date: '2030-10-15',
  window: { status: 'open', opens_at: '2030-10-15T10:00:00+01:00', closes_at: '2030-10-15T23:59:59+01:00' },
  distribution_status: 'pending', card: null,
}
const saved = { ...data, card: { personal_request: payload.personal_request, work_request: null, salvation_request: null, submitted_at: '2030-10-15T10:00:00+01:00', updated_at: '2030-10-15T10:00:00+01:00' } }

describe('Cartão próprio por instância do evento — ASPEC-434', () => {
  beforeEach(() => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data } })
    vi.spyOn(api, 'put').mockResolvedValue({ data: { success: true, data: saved } })
  })
  afterEach(() => vi.restoreAllMocks())

  it('consulta o UUID da instância e mantém a janela definida pelo backend', async () => {
    const controller = new AbortController()
    expect(await getOwnPrayerCard(id, controller.signal)).toEqual(data)
    expect(api.get).toHaveBeenCalledWith(`/events/${id}/prayer-card`, expect.objectContaining({
      sessionGeneration: getSessionContext().generation,
      signal: expect.any(AbortSignal),
    }))
    api.get.mockResolvedValueOnce({ data: { success: true, data: { ...saved, window: { ...data.window, status: 'closed' } } } })
    expect(await getOwnPrayerCard(id)).toMatchObject({ card: saved.card, window: { status: 'closed' } })
  })

  it('envia PUT, conserva a resposta e aceita exatamente 500 caracteres', async () => {
    const request = { ...payload, personal_request: 'a'.repeat(500) }
    expect(await saveOwnPrayerCard(id, request)).toEqual(saved)
    expect(api.put).toHaveBeenCalledWith(`/events/${id}/prayer-card`, expect.objectContaining({ ...request, work_request: null, salvation_request: null }), expect.objectContaining({
      sessionGeneration: getSessionContext().generation,
    }))
    expect(api.put).toHaveBeenCalledTimes(1)
  })

  it.each(['', '../auth/me', undefined, 'evento-sem-uuid'])('rejeita identificadores inválidos sem consultar nem escrever: %s', async (value) => {
    await expect(getOwnPrayerCard(value)).rejects.toThrow()
    await expect(saveOwnPrayerCard(value, payload)).rejects.toThrow()
    expect(api.get).not.toHaveBeenCalled()
    expect(api.put).not.toHaveBeenCalled()
  })

  it.each([
    { ...payload, consent: false }, { ...payload, consent: 'true' },
    { ...payload, personal_request: '   ' }, { ...payload, personal_request: 'a'.repeat(501) },
    { ...payload, work_request: 'a'.repeat(501) }, { ...payload, salvation_request: 'a'.repeat(501) },
    { ...payload, personal_request: {} }, null,
  ])('valida consentimento, limites e pelo menos um pedido sem enviar: %j', async (request) => {
    await expect(saveOwnPrayerCard(id, request)).rejects.toThrow()
    expect(api.put).not.toHaveBeenCalled()
  })

  it.each([
    null, { success: false, data }, { success: true, data: null },
    { success: true, data: { ...data, window: { ...data.window, status: 'inventado' } } },
    { success: true, data: { ...data, distribution_status: 'inventado' } },
    { success: true, data: { ...saved, card: { ...saved.card, personal_request: {} } } },
  ])('rejeita respostas fora do contrato em consulta e gravação', async (response) => {
    api.get.mockResolvedValue({ data: response })
    api.put.mockResolvedValue({ data: response })
    await expect(getOwnPrayerCard(id)).rejects.toThrow()
    await expect(saveOwnPrayerCard(id, payload)).rejects.toThrow()
  })

  it.each(['get', 'put'])('descarta dados privados de uma sessão substituída durante %s', async (method) => {
    api[method].mockImplementationOnce(async () => {
      advanceSession()
      return { data: { success: true, data: saved } }
    })
    const request = method === 'get' ? getOwnPrayerCard(id) : saveOwnPrayerCard(id, payload)
    await expect(request).rejects.toThrow()
  })

  it('não inicia pedidos de sessão anterior ou com sinal cancelado', async () => {
    const context = getSessionContext()
    advanceSession()
    await expect(getOwnPrayerCard(id, undefined, context)).rejects.toThrow()
    await expect(saveOwnPrayerCard(id, payload, undefined, context)).rejects.toThrow()
    const controller = new AbortController()
    controller.abort()
    await expect(getOwnPrayerCard(id, controller.signal)).rejects.toThrow()
    await expect(saveOwnPrayerCard(id, payload, controller.signal)).rejects.toThrow()
    expect(api.get).not.toHaveBeenCalled()
    expect(api.put).not.toHaveBeenCalled()
  })

  it.each([401, 403, 422])('preserva o erro HTTP %s e os detalhes de validação do servidor', async (status) => {
    const error = { response: { status, data: { errors: { consent: ['Confirme o consentimento.'] } } } }
    api.put.mockRejectedValueOnce(error)
    await expect(saveOwnPrayerCard(id, payload)).rejects.toBe(error)
  })

  it('preserva a consulta de cartões recebidos já existente', async () => {
    const received = { items: [], pagination: { current_page: 1, per_page: 5, total: 0, last_page: 1 } }
    api.get.mockResolvedValueOnce({ data: { success: true, data: received } })
    expect(await getReceivedPrayerCards('current')).toEqual(received)
    expect(api.get).toHaveBeenCalledWith('/me/prayer-cards', expect.objectContaining({ params: { period: 'current', page: 1, per_page: 5 } }))
  })
})
