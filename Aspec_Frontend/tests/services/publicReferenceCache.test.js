import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../src/services/api'
import { clearPublicReferenceCache } from '../../src/services/publicReferenceCache'
import { getEventCategories, getLocations, getSectors } from '../../src/services/referenceLists'

const list = [{ id: 'reference-id', name: 'Lisboa' }]
const response = (config, data = { success: true, data: list }) => ({ config, data, status: 200, headers: {} })
const canceled = (promise) => expect(promise).rejects.toMatchObject({ code: 'ERR_CANCELED' })

describe('Cache de referências públicas', () => {
  let original
  beforeEach(() => { original = api.defaults.adapter })
  afterEach(() => { clearPublicReferenceCache(); api.defaults.adapter = original; vi.restoreAllMocks() })

  function pending() {
    let complete
    const adapter = vi.fn((config) => new Promise((resolve) => { complete = (data) => resolve(response(config, data)) }))
    api.defaults.adapter = adapter
    return { adapter, complete: (data) => complete(data) }
  }

  it.each([getLocations, getSectors, getEventCategories])('reutiliza sucesso com campos públicos e cópias independentes: %s', async (load) => {
    const adapter = vi.fn((config) => Promise.resolve(response(config, { success: true, data: [{ ...list[0], secret: 'extra' }] })))
    api.defaults.adapter = adapter
    const first = await load()
    first[0].name = 'Alterado'
    expect(await load()).toEqual(list)
    expect(adapter).toHaveBeenCalledTimes(1)
  })

  it('deduplica consumidores simultâneos', async () => {
    const request = pending()
    const first = getLocations()
    const second = getLocations()
    expect(request.adapter).toHaveBeenCalledTimes(1)
    request.complete()
    expect(await first).toEqual(list)
    expect(await second).toEqual(list)
  })

  it('cancelar um consumidor não cancela o transporte dos restantes', async () => {
    const request = pending()
    const controller = new AbortController()
    const first = getLocations(controller.signal)
    const rejected = canceled(first)
    const second = getLocations()
    controller.abort()
    await rejected
    expect(request.adapter.mock.calls[0][0].signal.aborted).toBe(false)
    request.complete()
    expect(await second).toEqual(list)
  })

  it('cancela o transporte sem consumidores e permite um novo pedido', async () => {
    const request = pending()
    const controller = new AbortController()
    const rejected = canceled(getLocations(controller.signal))
    controller.abort()
    await rejected
    expect(request.adapter.mock.calls[0][0].signal.aborted).toBe(true)
    const next = getLocations()
    expect(request.adapter).toHaveBeenCalledTimes(2)
    request.complete()
    expect(await next).toEqual(list)
  })

  it('reutiliza o pedido no remount síncrono do StrictMode', async () => {
    const request = pending()
    const controller = new AbortController()
    const rejected = canceled(getLocations(controller.signal))
    controller.abort()
    const next = getLocations()
    await rejected
    expect(request.adapter).toHaveBeenCalledTimes(1)
    expect(request.adapter.mock.calls[0][0].signal.aborted).toBe(false)
    request.complete()
    expect(await next).toEqual(list)
  })

  it.each(['network', 'malformed'])('não conserva falhas e permite repetir: %s', async (kind) => {
    const adapter = vi.fn((config) => kind === 'network'
      ? Promise.reject(new Error('offline'))
      : Promise.resolve(response(config, { success: true, data: [{ id: 1, name: 'Inválido' }] })))
    api.defaults.adapter = adapter
    await expect(getLocations()).rejects.toThrow()
    adapter.mockImplementation((config) => Promise.resolve(response(config)))
    expect(await getLocations()).toEqual(list)
    expect(adapter).toHaveBeenCalledTimes(2)
  })

  it('volta a pedir referências após cinco minutos', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000)
    const adapter = vi.fn((config) => Promise.resolve(response(config)))
    api.defaults.adapter = adapter
    await getLocations()
    now.mockReturnValue(301001)
    await getLocations()
    expect(adapter).toHaveBeenCalledTimes(2)
  })

  it('o reset rejeita consumidores e impede respostas antigas de repovoarem a cache', async () => {
    const request = pending()
    const rejected = canceled(getLocations())
    const completeOld = request.complete
    const oldConfig = request.adapter.mock.calls[0][0]
    clearPublicReferenceCache()
    await rejected
    expect(oldConfig.signal.aborted).toBe(true)
    completeOld()
    const next = getLocations()
    request.complete({ success: true, data: [{ id: 'new', name: 'Novo' }] })
    expect(await next).toEqual([{ id: 'new', name: 'Novo' }])
    expect(await getLocations()).toEqual([{ id: 'new', name: 'Novo' }])
    expect(request.adapter).toHaveBeenCalledTimes(2)
  })

  it('rejeita um consumidor já cancelado mesmo com cache preenchida', async () => {
    api.defaults.adapter = (config) => Promise.resolve(response(config))
    await getLocations()
    const controller = new AbortController()
    controller.abort()
    await canceled(getLocations(controller.signal))
  })
})
