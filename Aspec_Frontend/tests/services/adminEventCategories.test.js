import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError } from 'axios'
import { api } from '../../src/services/api'
import { clearPublicReferenceCache } from '../../src/services/publicReferenceCache'
import { getEventCategories } from '../../src/services/referenceLists'
import {
  createEventCategory,
  deleteEventCategory,
  getAdminEventCategories,
  updateEventCategory,
} from '../../src/services/adminEventCategories'

const FORMAT_ERROR = 'A resposta dos tipos de evento tem um formato inesperado.'

const item = { id: 'c1', name: 'Almoço', color: '#2E7D32', events_count: 1 }

function mockGet(data) {
  return vi.spyOn(api, 'get').mockResolvedValue({ data })
}

function axiosError(status) {
  return new AxiosError(`Request failed with status code ${status}`, AxiosError.ERR_BAD_RESPONSE, undefined, undefined, {
    status,
    statusText: 'Error',
    headers: {},
    config: {},
    data: { success: false, message: 'Erro.' },
  })
}

describe('getAdminEventCategories', () => {
  afterEach(() => vi.restoreAllMocks())

  it('pede a lista com o signal e devolve só id, nome, cor e número de eventos', async () => {
    const get = mockGet({ success: true, message: 'ok', data: [{ ...item, created_at: '2026-10-01T10:00:00+00:00' }] })
    const signal = new AbortController().signal

    const result = await getAdminEventCategories(signal)

    expect(get).toHaveBeenCalledWith('/admin/event-categories', { signal })
    expect(result).toEqual([item])
    expect(Object.keys(result[0])).toEqual(['id', 'name', 'color', 'events_count'])
  })

  it('um número de eventos ou uma cor inválidos passam a null', async () => {
    mockGet({
      success: true,
      data: [
        { ...item, events_count: '3' },
        { ...item, id: 'c2', events_count: -1 },
        { ...item, id: 'c3', color: 5 },
      ],
    })

    const result = await getAdminEventCategories()

    expect(result[0].events_count).toBeNull()
    expect(result[1].events_count).toBeNull()
    expect(result[2].color).toBeNull()
    expect(result[2].events_count).toBe(1)
  })

  it.each([
    ['success falso', { success: false }],
    ['data que não é lista', { success: true, data: {} }],
    ['item nulo', { success: true, data: [null] }],
    ['item sem id', { success: true, data: [{ name: 'Almoço', color: '#2E7D32', events_count: 1 }] }],
    ['item com nome vazio', { success: true, data: [{ ...item, name: '' }] }],
  ])('recusa uma resposta com formato inesperado: %s', async (_, body) => {
    mockGet(body)

    const caught = await getAdminEventCategories().catch((err) => err)

    expect(caught).toBeInstanceOf(Error)
    expect(caught.message).toBe(FORMAT_ERROR)
    expect(caught).not.toBeInstanceOf(AxiosError)
  })

  it('relança os erros do axios tal como estão', async () => {
    const error = axiosError(500)
    vi.spyOn(api, 'get').mockRejectedValue(error)

    await expect(getAdminEventCategories()).rejects.toBe(error)
  })
})

describe('createEventCategory, updateEventCategory e deleteEventCategory', () => {
  afterEach(() => vi.restoreAllMocks())

  it('cria com só o nome e a cor e devolve o corpo da resposta', async () => {
    const body = { success: true, message: 'Categoria criada com sucesso.', data: { id: 'n1', name: 'Retiro', color: '#00838F', events_count: 0 } }
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: body })

    const result = await createEventCategory({ name: 'Retiro', color: '#00838F', events_count: 3, id: 'x' })

    expect(post).toHaveBeenCalledTimes(1)
    expect(post.mock.calls[0]).toEqual(['/admin/event-categories', { name: 'Retiro', color: '#00838F' }])
    expect(result).toBe(body)
  })

  it('atualiza com o id codificado e só o nome e a cor', async () => {
    const body = { success: true, message: 'Categoria atualizada com sucesso.', data: { id: 'a/b', name: 'Retiro', color: '#00838F', events_count: 2 } }
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: body })

    const result = await updateEventCategory('a/b', { name: 'Retiro', color: '#00838F', events_count: 2 })

    expect(put.mock.calls[0]).toEqual(['/admin/event-categories/a%2Fb', { name: 'Retiro', color: '#00838F' }])
    expect(result).toBe(body)
  })

  it('apaga pelo id e devolve o corpo da resposta', async () => {
    const body = { success: true, message: 'Categoria eliminada com sucesso.', data: null }
    const remove = vi.spyOn(api, 'delete').mockResolvedValue({ data: body })

    const result = await deleteEventCategory('c5')

    expect(remove.mock.calls[0]).toEqual(['/admin/event-categories/c5'])
    expect(result).toBe(body)
  })

  it('relança os erros do axios', async () => {
    const error = axiosError(422)
    vi.spyOn(api, 'post').mockRejectedValue(error)
    vi.spyOn(api, 'put').mockRejectedValue(error)
    vi.spyOn(api, 'delete').mockRejectedValue(error)

    await expect(createEventCategory({ name: 'Retiro', color: '#00838F' })).rejects.toBe(error)
    await expect(updateEventCategory('c5', { name: 'Retiro', color: '#00838F' })).rejects.toBe(error)
    await expect(deleteEventCategory('c5')).rejects.toBe(error)
  })
})

describe('cache pública das categorias', () => {
  const publicList = { success: true, data: [{ id: 'c1', name: 'Almoço', color: '#2E7D32' }] }
  let original
  let writeStatus
  let adapter

  function publicRequests() {
    return adapter.mock.calls.filter(([config]) => config.method === 'get' && config.url === '/event-categories').length
  }

  beforeEach(() => {
    original = api.defaults.adapter
    writeStatus = 200
    adapter = vi.fn((config) => {
      if (config.method === 'get') {
        return Promise.resolve({ config, status: 200, statusText: 'OK', headers: {}, data: publicList })
      }
      if (writeStatus >= 400) {
        return Promise.reject(new AxiosError('Falhou', AxiosError.ERR_BAD_RESPONSE, config, null, {
          config,
          status: writeStatus,
          statusText: 'Error',
          headers: {},
          data: { success: false, message: 'Erro.' },
        }))
      }

      return Promise.resolve({ config, status: 200, statusText: 'OK', headers: {}, data: { success: true, message: 'ok', data: null } })
    })
    api.defaults.adapter = adapter
  })
  afterEach(() => {
    clearPublicReferenceCache()
    api.defaults.adapter = original
    vi.restoreAllMocks()
  })

  it('a lista pública fica em cache entre pedidos', async () => {
    await getEventCategories()
    await getEventCategories()

    expect(publicRequests()).toBe(1)
  })

  it.each([
    ['criar', () => createEventCategory({ name: 'Retiro', color: '#00838F' })],
    ['editar', () => updateEventCategory('c1', { name: 'Almoço', color: '#2E7D33' })],
    ['apagar', () => deleteEventCategory('c1')],
  ])('depois de %s com sucesso a lista pública é pedida de novo', async (_, write) => {
    await getEventCategories()

    await write()
    await getEventCategories()

    expect(publicRequests()).toBe(2)
  })

  it.each([
    ['criar', 422, () => createEventCategory({ name: 'Retiro', color: '#00838F' })],
    ['editar', 500, () => updateEventCategory('c1', { name: 'Almoço', color: '#2E7D33' })],
    ['apagar', 422, () => deleteEventCategory('c1')],
  ])('se %s falhar a cache fica intacta', async (_, status, write) => {
    await getEventCategories()
    writeStatus = status

    await expect(write()).rejects.toBeInstanceOf(AxiosError)
    await getEventCategories()

    expect(publicRequests()).toBe(1)
  })
})
