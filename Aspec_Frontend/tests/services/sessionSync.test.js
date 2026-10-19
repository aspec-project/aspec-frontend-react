import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => vi.unstubAllGlobals())

it('centraliza o canal, ignora eventos próprios e não transmite identidade ou credenciais', async () => {
  vi.resetModules()
  const { listenSessionChanges, notifySessionChange } = await import('../../src/services/sessionSync')
  const instances = []
  class Channel {
    constructor(name) { this.name = name; instances.push(this) }
    postMessage = vi.fn()
    close = vi.fn()
  }
  vi.stubGlobal('BroadcastChannel', Channel)
  const onChange = vi.fn()
  const stop = listenSessionChanges(onChange)
  const stopSecond = listenSessionChanges(vi.fn())
  const own = notifySessionChange('changing')
  expect(instances).toHaveLength(1)
  expect(instances[0].postMessage).toHaveBeenCalledWith({ type: 'changing', sourceTabId: expect.any(String), sessionVersion: 1 })
  instances[0].onmessage({ data: own })
  expect(onChange).not.toHaveBeenCalled()
  const remote = { sourceTabId: 'remote-tab', sessionVersion: 2 }
  instances[0].onmessage({ data: { ...remote, type: 'changing' } })
  instances[0].onmessage({ data: { ...remote, type: 'changed' } })
  instances[0].onmessage({ data: { ...remote, type: 'changed' } })
  instances[0].onmessage({ data: { ...remote, sessionVersion: 1, type: 'logged-out' } })
  notifySessionChange('changed', own)
  instances[0].onmessage({ data: { user: 'não aceite' } })
  expect(onChange.mock.calls).toEqual([['changing'], ['changed']])
  expect(instances[0].postMessage).toHaveBeenCalledTimes(1)
  stop()
  expect(instances[0].close).not.toHaveBeenCalled()
  stopSecond()
  expect(instances[0].close).toHaveBeenCalled()
})
