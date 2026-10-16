import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../src/services/api'
import { getMembers } from '../../src/services/members'
import { getLocations, getSectors } from '../../src/services/referenceLists'

const id = '019512a1-1234-7123-8123-123456789abc'
const member = { id, name: 'Ana', business_name: 'Negócio', description: 'Descrição real do resumo', sector: { id, name: 'Serviços' }, location: { id, name: 'Lisboa' }, logo_url: null, average_rating: 4.8, reviews_count: 12 }
const references = { sectors: [{ id, name: 'Serviços' }], locations: [{ id, name: 'Lisboa' }] }
const body = (items = [member], total = 25) => ({ success: true, data: { items, pagination: { current_page: 1, per_page: 12, total, last_page: Math.max(1, Math.ceil(total / 12)) } } })
const response = (data, config) => ({ data, config, status: 200, statusText: '', headers: {} })

describe('Serviço do diretório', () => {
  let original
  beforeEach(() => { original = api.defaults.adapter })
  afterEach(() => { api.defaults.adapter = original; vi.restoreAllMocks() })

  it('pede apenas a página solicitada, preservando UUIDs e usando o cliente público', async () => {
    const adapter = vi.fn((config) => Promise.resolve(response(body(), config)))
    api.defaults.adapter = adapter
    const controller = new AbortController()
    const result = await getMembers({ search: ' Ana ', sector_id: id, location_id: id, min_rating: '4' }, references, controller.signal)
    expect(result.pagination.total).toBe(25)
    expect(result.items).toHaveLength(1)
    expect(adapter).toHaveBeenCalledTimes(1)
    expect(adapter.mock.calls[0][0]).toMatchObject({ url: '/members', params: { search: 'Ana', sector_id: id, location_id: id, min_rating: 4, page: 1, per_page: 12 }, skipAuthRedirect: true, withCredentials: true, signal: controller.signal })
  })

  it.each([{ page: 0 }, { page: 1.5 }, { per_page: 51 }, { per_page: 0 }, { min_rating: NaN }, { min_rating: Infinity }, { min_rating: 0 }, { min_rating: '6' }, { sector_id: 'desconhecido' }, { location_id: 'desconhecido' }])('rejeita parâmetros inválidos antes de enviar: %j', async (filters) => {
    const adapter = vi.fn()
    api.defaults.adapter = adapter
    await expect(getMembers(filters, references)).rejects.toThrow()
    expect(adapter).not.toHaveBeenCalled()
  })

  it('envia a avaliação média mínima decimal como número para o servidor', async () => {
    const adapter = vi.fn((config) => Promise.resolve(response(body(), config)))
    api.defaults.adapter = adapter
    await getMembers({ min_rating: '4.5' }, references)
    expect(adapter).toHaveBeenCalledTimes(1)
    expect(adapter.mock.calls[0][0].params).toEqual({ page: 1, per_page: 12, min_rating: 4.5 })
  })

  it('omite filtros vazios e aceita total zero com paginação válida', async () => {
    const adapter = vi.fn((config) => Promise.resolve(response(body([], 0), config)))
    api.defaults.adapter = adapter
    await expect(getMembers({}, references)).resolves.toMatchObject({ items: [], pagination: { total: 0 } })
    expect(adapter.mock.calls[0][0].params).toEqual({ page: 1, per_page: 12 })
  })

  it('conserva exclusivamente os campos do resumo, descartando contactos e extras também nas referências', async () => {
    const injected = {
      ...member, email: 'privado@example.test', phone: '912345678',
      tags: ['Tag não contratada'],
      contacts: { phone: '912345678' }, members_only: { commercial_contacts: 'Privado' },
      sector: { ...member.sector, private_field: 'Privado' },
      location: { ...member.location, address: 'Morada privada' },
    }
    api.defaults.adapter = (config) => Promise.resolve(response(body([injected]), config))
    const result = await getMembers({}, references)
    expect(result.items).toEqual([member])
  })

  it.each([null, undefined, '', 'Descrição enviada pela API <script>texto</script>'])('preserva description sem inventar texto quando recebe %j', async (description) => {
    api.defaults.adapter = (config) => Promise.resolve(response(body([{ ...member, description }]), config))
    const result = await getMembers({}, references)
    expect(result.items[0].description).toBe(description)
  })

  it.each([42, {}, []])('rejeita description com tipo inválido: %j', async (description) => {
    api.defaults.adapter = (config) => Promise.resolve(response(body([{ ...member, description }]), config))
    await expect(getMembers({}, references)).rejects.toThrow('A resposta do diretório tem um formato inesperado.')
  })

  it.each([null, { success: false, data: body().data }, body([{}]), { ...body(), data: { ...body().data, pagination: { ...body().data.pagination, total: -1 } } }, { ...body(), data: { ...body().data, pagination: { ...body().data.pagination, current_page: 2 } } }])('não transforma contrato inválido em vazio', async (data) => {
    api.defaults.adapter = (config) => Promise.resolve(response(data, config))
    await expect(getMembers({}, references)).rejects.toThrow('A resposta do diretório tem um formato inesperado.')
  })

  it.each([getLocations, getSectors])('valida referências públicas com IDs UUID', async (load) => {
    const adapter = vi.fn((config) => Promise.resolve(response({ success: true, data: references.sectors }, config)))
    api.defaults.adapter = adapter
    await expect(load()).resolves.toEqual(references.sectors)
    expect(adapter.mock.calls[0][0].skipAuthRedirect).toBe(true)
    api.defaults.adapter = (config) => Promise.resolve(response({ success: true, data: [{ id: 1, name: 'Inválido' }] }, config))
    await expect(load()).rejects.toThrow('A lista de filtros tem um formato inesperado.')
  })
})
