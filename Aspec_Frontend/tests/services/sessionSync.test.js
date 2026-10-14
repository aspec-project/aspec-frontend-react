import { afterEach, expect, it, vi } from 'vitest'
import { listenSessionChanges, notifySessionChange } from '../../src/services/sessionSync'

afterEach(() => vi.unstubAllGlobals())

it('sincroniza mudanças entre abas sem transmitir utilizadores ou credenciais', () => {
  const instances = []
  class Channel {
    constructor(name) { this.name = name; instances.push(this) }
    postMessage = vi.fn()
    close = vi.fn()
  }
  vi.stubGlobal('BroadcastChannel', Channel)
  const onChange = vi.fn()
  const stop = listenSessionChanges(onChange)
  notifySessionChange('changing')
  expect(instances[1].postMessage).toHaveBeenCalledWith('changing')
  expect(instances[1].close).toHaveBeenCalled()
  instances[0].onmessage({ data: 'changing' })
  instances[0].onmessage({ data: 'changed' })
  instances[0].onmessage({ data: { user: 'não aceite' } })
  expect(onChange.mock.calls).toEqual([['changing'], ['changed']])
  stop()
  expect(instances[0].close).toHaveBeenCalled()
})
