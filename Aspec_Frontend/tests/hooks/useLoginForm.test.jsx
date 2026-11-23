import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useLoginForm } from '../../src/hooks/useLoginForm'
import { useAuthStore } from '../../src/store/authStore'

const wrapper = ({ children }) => <MemoryRouter>{children}</MemoryRouter>
const originalLogin = useAuthStore.getState().login

describe('avisos de estado da conta no login', () => {
  afterEach(() => {
    useAuthStore.setState({ login: originalLogin, status: 'idle' })
    vi.restoreAllMocks()
  })

  it.each([
    ['pending', 'pending', false],
    ['approved', 'activation', true],
    ['inactive_unpaid', 'expired', true],
    ['inactive_cancelled', 'expired', true],
    ['inactive', 'blocked', false],
  ])(
    'mapeia account_state %s sem depender da mensagem',
    async (accountState, expectedNotice, canRequestLink) => {
      useAuthStore.setState({
        status: 'idle',
        login: vi.fn().mockResolvedValue({
          success: false,
          error: {
            status: 403,
            message: 'Mensagem que pode mudar.',
            accountState,
          },
        }),
      })

      const { result } = renderHook(() => useLoginForm(), { wrapper })

      act(() => {
        result.current.setEmail('membro@example.test')
        result.current.setPassword('password')
      })

      await act(async () => {
        await result.current.handleLogin()
      })

      expect(result.current.accountNotice).toBe(expectedNotice)
      expect(result.current.canRequestActivationLink).toBe(canRequestLink)
    },
  )
})