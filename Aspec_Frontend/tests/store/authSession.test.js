import axios, { AxiosError } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../src/services/api'
import { useAuthStore } from '../../src/store/authStore'
import { getSessionContext } from '../../src/services/sessionContext'
import { notifySessionChange } from '../../src/services/sessionSync'

vi.mock('../../src/services/sessionSync', () => ({ notifySessionChange: vi.fn() }))

const A = { id: 'A', role: { name: 'Member' }, account_status: { name: 'Active' } }
const B = { ...A, id: 'B' }
const response = (config, data = A) => ({ config, data: { data }, status: 200, headers: {}, statusText: 'OK' })
const failure = (config, status) => new AxiosError('Falha', undefined, config, undefined, status ? { status } : undefined)
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

describe('Isolamento da sessão', () => {
  let original
  beforeEach(() => {
    vi.clearAllMocks()
    original = api.defaults.adapter
    useAuthStore.getState().clearSession()
    useAuthStore.setState({ user: A, role: A.role, status: 'authenticated' })
  })
  afterEach(() => { api.defaults.adapter = original; vi.restoreAllMocks(); useAuthStore.getState().clearSession() })

  it.each(['logout', 'troca'])('ignora /auth/me anterior após %s', async (action) => {
    const waiting = deferred()
    let config
    api.defaults.adapter = (request) => { config = request; return waiting.promise }
    const pending = useAuthStore.getState().fetchUser()
    if (action === 'logout') useAuthStore.getState().clearSession()
    else useAuthStore.setState({ user: B, role: B.role, status: 'authenticated' })
    expect(config.signal.aborted).toBe(true)
    waiting.resolve(response(config, A))
    expect(await pending).toMatchObject({ success: false, cancelled: true })
    expect(useAuthStore.getState().user).toEqual(action === 'logout' ? null : B)
  })

  it('um 401 anterior não limpa B nem redireciona', async () => {
    const waiting = deferred()
    let config
    api.defaults.adapter = (request) => { config = request; return waiting.promise }
    const pending = api.get('/member-profile').catch((error) => error)
    useAuthStore.setState({ user: B, status: 'authenticated' })
    waiting.reject(failure(config, 401))
    await pending
    expect(useAuthStore.getState().user).toEqual(B)
  })

  it('recusa pedido com geração anterior antes do envio', async () => {
    const context = getSessionContext()
    useAuthStore.getState().clearSession()
    const adapter = vi.fn()
    api.defaults.adapter = adapter
    await expect(api.put('/member-profile', {}, { sessionGeneration: context.generation })).rejects.toMatchObject({ code: 'ERR_CANCELED' })
    expect(adapter).not.toHaveBeenCalled()
  })

  it('não publica login antigo nem notifica a sua conclusão após trocar identidade', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue({})
    const waiting = deferred()
    let config
    api.defaults.adapter = (request) => { config = request; return waiting.promise }
    const pending = useAuthStore.getState().login('a@example.test', 'synthetic-password')
    await vi.waitFor(() => expect(config).toBeDefined())
    useAuthStore.setState({ user: B, status: 'authenticated' })
    waiting.resolve(response(config, A))
    expect(await pending).toMatchObject({ cancelled: true })
    expect(useAuthStore.getState().user).toEqual(B)
    expect(notifySessionChange.mock.calls).toEqual([['changing']])
  })

  it('logout cancelado não limpa B nem notifica conclusão antiga a outras abas', async () => {
    const waiting = deferred()
    let config
    api.defaults.adapter = (request) => { config = request; return waiting.promise }
    const pending = useAuthStore.getState().logout()
    useAuthStore.setState({ user: B, status: 'authenticated' })
    waiting.resolve(response(config, null))
    expect(await pending).toMatchObject({ cancelled: true })
    expect(useAuthStore.getState().user).toEqual(B)
    expect(notifySessionChange.mock.calls).toEqual([['changing']])
  })

  it('mantém o cancelamento fornecido pelo consumidor', async () => {
    const controller = new AbortController()
    let config
    const waiting = deferred()
    api.defaults.adapter = (request) => { config = request; return waiting.promise }
    const pending = api.get('/members', { signal: controller.signal }).catch((error) => error)
    controller.abort()
    expect(config.signal.aborted).toBe(true)
    waiting.resolve(response(config))
    expect(await pending).toMatchObject({ code: 'ERR_CANCELED' })
  })

  it('login cancelado durante CSRF não envia credenciais', async () => {
    const waiting = deferred()
    vi.spyOn(axios, 'get').mockReturnValue(waiting.promise)
    const adapter = vi.fn()
    api.defaults.adapter = adapter
    const pending = useAuthStore.getState().login('a@example.test', 'synthetic-password')
    useAuthStore.getState().clearSession()
    waiting.resolve({})
    expect(await pending).toMatchObject({ cancelled: true })
    expect(adapter).not.toHaveBeenCalled()
    expect(notifySessionChange.mock.calls).toEqual([['changing']])
  })

  it('confirmar a sessão não interrompe listas públicas já em carregamento', async () => {
    const waiting = deferred()
    let publicConfig
    api.defaults.adapter = (config) => {
      if (config.url === '/members') { publicConfig = config; return waiting.promise }
      return Promise.resolve(response(config, B))
    }
    const controller = new AbortController()
    const list = api.get('/members', { signal: controller.signal })
    await useAuthStore.getState().fetchUser()
    expect(publicConfig.signal.aborted).toBe(false)
    waiting.resolve(response(publicConfig, []))
    expect((await list).data.data).toEqual([])
  })

  it.each([200, 401])('logout %s confirma saída', async (status) => {
    api.defaults.adapter = async (config) => {
      expect(config.skipAuthRedirect).toBe(true)
      if (status === 401) throw failure(config, status)
      return response(config, null)
    }
    expect(await useAuthStore.getState().logout()).toEqual({ success: true })
    expect(useAuthStore.getState()).toMatchObject({ user: null, status: 'idle', logoutError: null })
  })

  it.each([undefined, 419, 500])('logout falhado (%s) permite repetir sem declarar saída', async (status) => {
    api.defaults.adapter = async (config) => { throw failure(config, status) }
    expect(await useAuthStore.getState().logout()).toMatchObject({ success: false })
    expect(useAuthStore.getState()).toMatchObject({ user: A, status: 'authenticated', logoutError: expect.any(String) })
    const adapter = vi.fn(async (config) => response(config, null))
    api.defaults.adapter = adapter
    expect(await useAuthStore.getState().initialize()).toMatchObject({ cancelled: true })
    expect(adapter).not.toHaveBeenCalled()
    expect(await useAuthStore.getState().logout()).toEqual({ success: true })
    expect(useAuthStore.getState().user).toBeNull()
  })
})
