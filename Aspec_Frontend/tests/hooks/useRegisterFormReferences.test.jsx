import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { api } from '../../src/services/api'
import { getLocations, getSectors } from '../../src/services/referenceLists'
import { useRegisterForm } from '../../src/hooks/useRegisterForm'

const sectors = [{ id: 'sector-id', name: 'Serviços' }]
const locations = [{ id: 'location-id', name: 'Lisboa' }]
const response = (config) => ({
  config, status: 200, headers: {},
  data: { success: true, data: config.url === '/sectors' ? sectors : locations },
})
const wrapper = ({ children }) => <MemoryRouter>{children}</MemoryRouter>

describe('Referências partilhadas da candidatura', () => {
  let original
  beforeEach(() => { original = api.defaults.adapter })
  afterEach(() => { api.defaults.adapter = original; vi.restoreAllMocks() })

  it('reutiliza referências previamente carregadas nas páginas públicas', async () => {
    const adapter = vi.fn((config) => Promise.resolve(response(config)))
    api.defaults.adapter = adapter
    await Promise.all([getSectors(), getLocations()])
    const { result } = renderHook(() => useRegisterForm(), { wrapper })
    await waitFor(() => expect(result.current.listsLoading).toBe(false))
    expect(result.current.sectors).toEqual(sectors)
    expect(result.current.locations).toEqual(locations)
    expect(adapter).toHaveBeenCalledTimes(2)
  })

  it('desmontar a candidatura não cancela consumidores ativos nem aplica estado antigo', async () => {
    const requests = []
    const adapter = vi.fn((config) => new Promise((resolve) => {
      requests.push({ config, complete: () => resolve(response(config)) })
    }))
    api.defaults.adapter = adapter
    const shared = Promise.all([getSectors(), getLocations()])
    const { result, unmount } = renderHook(() => useRegisterForm(), { wrapper })
    const stateBeforeUnmount = result.current
    unmount()
    await act(async () => {
      await Promise.resolve()
      expect(requests.every(({ config }) => !config.signal.aborted)).toBe(true)
      requests.forEach(({ complete }) => complete())
      await shared
    })
    expect(result.current).toBe(stateBeforeUnmount)
    expect(result.current.sectors).toEqual([])
    expect(result.current.locations).toEqual([])
    expect(adapter).toHaveBeenCalledTimes(2)
    const remounted = renderHook(() => useRegisterForm(), { wrapper })
    await waitFor(() => expect(remounted.result.current.listsLoading).toBe(false))
    expect(remounted.result.current.locations).toEqual(locations)
    expect(adapter).toHaveBeenCalledTimes(2)
  })

  it('não conserva erros e volta a carregar referências ao montar novamente', async () => {
    const adapter = vi.fn(() => Promise.reject(new Error('offline')))
    api.defaults.adapter = adapter
    const first = renderHook(() => useRegisterForm(), { wrapper })
    await waitFor(() => expect(first.result.current.listsLoading).toBe(false))
    expect(first.result.current.listsError).toBe('Não foi possível carregar os dados.')
    first.unmount()
    adapter.mockImplementation((config) => Promise.resolve(response(config)))
    const second = renderHook(() => useRegisterForm(), { wrapper })
    await waitFor(() => expect(second.result.current.listsLoading).toBe(false))
    expect(second.result.current.listsError).toBe('')
    expect(second.result.current.sectors).toEqual(sectors)
    expect(second.result.current.locations).toEqual(locations)
    expect(adapter).toHaveBeenCalledTimes(4)
  })
})
