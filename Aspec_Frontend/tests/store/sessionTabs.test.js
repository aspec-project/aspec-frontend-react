import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const A = { id: 'A', role: { name: 'Member' }, account_status: { name: 'Active' } }
const B = { ...A, id: 'B' }
const response = (config, user) => ({ config, status: 200, statusText: 'OK', headers: {}, data: { data: user } })
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
let channels, messages, tabs, identity

beforeEach(() => {
  channels = new Set()
  messages = []
  tabs = []
  identity = A
  class Channel {
    constructor() { channels.add(this) }
    postMessage(data) {
      messages.push(data)
      // Inclui intencionalmente o emissor para provar a proteção sourceTabId.
      for (const channel of channels) channel.onmessage?.({ data })
    }
    close() { channels.delete(this) }
  }
  vi.stubGlobal('BroadcastChannel', Channel)
})
afterEach(() => {
  for (const tab of tabs) { tab.stop(); tab.store.getState().clearSession() }
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function openTab() {
  // Módulos independentes representam contextos JavaScript de dois separadores.
  vi.resetModules()
  const { default: axios } = await import('axios')
  vi.spyOn(axios, 'get').mockResolvedValue({})
  const { api } = await import('../../src/services/api')
  const { useAuthStore: store } = await import('../../src/store/authStore')
  const sync = await import('../../src/services/sessionSync')
  const adapter = vi.fn(async (config) => {
    if (config.url === '/auth/login') identity = JSON.parse(config.data).email === 'b@example.test' ? B : A
    if (config.url === '/auth/logout') identity = null
    return response(config, identity)
  })
  api.defaults.adapter = adapter
  const pending = []
  const stop = sync.listenSessionChanges((type) => {
    const result = store.getState().receiveSessionChange(type)
    if (result) pending.push(result)
  })
  const tab = { store, api, adapter, sync, stop, pending }
  tabs.push(tab)
  await store.getState().initialize()
  return tab
}

it('login não se cancela, propaga B, remove A e logout limpa todos sem loops', async () => {
  const first = await openTab()
  const second = await openTab()
  const old = deferred()
  let oldConfig
  second.api.defaults.adapter = (config) => { oldConfig = config; return old.promise }
  const oldMe = second.store.getState().fetchUser()
  second.api.defaults.adapter = second.adapter
  const login = first.store.getState().login('b@example.test', 'synthetic-password')
  expect(first.store.getState().user).toBeNull()
  expect(second.store.getState().user).toBeNull()
  expect(oldConfig.signal.aborted).toBe(true)
  expect(await second.store.getState().initialize()).toMatchObject({ cancelled: true })
  expect(await login).toEqual({ success: true })
  await Promise.all(second.pending)
  old.resolve(response(oldConfig, A))
  expect(await oldMe).toMatchObject({ cancelled: true })
  for (const tab of tabs) expect(tab.store.getState().user).toEqual(B)
  expect(messages.map((message) => message.type)).toEqual(['changing', 'changed'])
  expect(await first.store.getState().logout()).toEqual({ success: true })
  for (const tab of tabs) expect(tab.store.getState().user).toBeNull()
  expect(messages.map((message) => message.type)).toEqual(['changing', 'changed', 'changing', 'logged-out'])
  expect(new Set(messages.map((message) => message.sourceTabId)).size).toBe(1)
  await second.store.getState().login('a@example.test', 'synthetic-password')
  await Promise.all(first.pending)
  expect(new Set(messages.map((message) => message.sourceTabId)).size).toBe(2)
  for (const tab of tabs) expect(tab.store.getState().user).toEqual(A)
})

it('401 e respostas privados antigos são cancelados sem terminar B', async () => {
  const first = await openTab()
  const second = await openTab()
  const waiting = [deferred(), deferred()]
  const configs = []
  second.api.defaults.adapter = (config) => {
    configs.push(config)
    return waiting[configs.length - 1].promise
  }
  const oldRequests = [second.api.get('/member-profile'), second.api.put('/member-profile', {})]
    .map((request) => request.catch((error) => error))
  second.api.defaults.adapter = second.adapter
  await first.store.getState().login('b@example.test', 'synthetic-password')
  await Promise.all(second.pending)
  expect(configs.every((config) => config.signal.aborted)).toBe(true)
  waiting[0].reject(Object.assign(new Error('401 antigo'), { config: configs[0], response: { status: 401 } }))
  waiting[1].resolve(response(configs[1], A))
  for (const result of await Promise.all(oldRequests)) expect(result.code).toBe('ERR_CANCELED')
  for (const tab of tabs) expect(tab.store.getState().user).toEqual(B)
  expect(messages).toHaveLength(2)
})

it('login recusado reconcilia a sessão anterior também no emissor', async () => {
  const first = await openTab()
  const second = await openTab()
  first.api.defaults.adapter = async (config) => {
    if (config.url === '/auth/login') {
      throw Object.assign(new Error('Login recusado'), { config, response: { status: 422, data: { message: 'Login recusado' } } })
    }
    return response(config, identity)
  }
  expect(await first.store.getState().login('b@example.test', 'synthetic-password')).toMatchObject({ success: false })
  await Promise.all(second.pending)
  for (const tab of tabs) expect(tab.store.getState().user).toEqual(A)
  expect(messages.map((message) => message.type)).toEqual(['changing', 'changed'])
})

it('conclusão antiga não invalida a transição mais recente e duplicados não criam loops', async () => {
  const first = await openTab()
  const second = await openTab()
  const oldTransition = first.sync.notifySessionChange('changing')
  await second.store.getState().login('b@example.test', 'synthetic-password')
  await Promise.all(first.pending)
  const generation = second.store.getState().sessionGeneration
  first.sync.notifySessionChange('changed', oldTransition)
  const last = messages.at(-1)
  for (const channel of channels) {
    channel.onmessage({ data: last })
    channel.onmessage({ data: { ...oldTransition, type: 'changed' } })
  }
  expect(second.store.getState().sessionGeneration).toBe(generation)
  for (const tab of tabs) expect(tab.store.getState().user).toEqual(B)
  expect(messages).toHaveLength(3)
})
