import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import App from '../src/App'
import { api } from '../src/services/api'
import { useAuthStore } from '../src/store/authStore'

vi.mock('../src/router/AppRouter', () => ({ default: function MockAppRouter() {
  const user = useAuthStore((state) => state.user)
  return <p>{user?.id ?? 'Sem identidade'}</p>
} }))

let channel, original
beforeEach(() => {
  original = api.defaults.adapter
  useAuthStore.getState().clearSession()
  class Channel {
    constructor() { channel = this }
    close = vi.fn()
  }
  vi.stubGlobal('BroadcastChannel', Channel)
})
afterEach(() => { api.defaults.adapter = original; useAuthStore.getState().clearSession(); vi.unstubAllGlobals() })

it('limpa a identidade ao mudar sessão noutra aba e só restaura após confirmar a nova sessão', async () => {
  let identity = 'A'
  api.defaults.adapter = async (config) => ({ config, status: 200, statusText: 'OK', headers: {}, data: { data: { id: identity, role: { name: 'Member' }, account_status: { name: 'Active' } } } })
  const view = render(<App />)
  expect(await screen.findByText('A')).toBeInTheDocument()
  act(() => channel.onmessage({ data: { type: 'changing', sourceTabId: 'other-tab', sessionVersion: 1 } }))
  expect(screen.getByText('Sem identidade')).toBeInTheDocument()
  expect(useAuthStore.getState().status).toBe('idle')
  identity = 'B'
  act(() => channel.onmessage({ data: { type: 'changed', sourceTabId: 'other-tab', sessionVersion: 1 } }))
  expect(await screen.findByText('B')).toBeInTheDocument()
  view.unmount()
  expect(channel.close).toHaveBeenCalled()
})
