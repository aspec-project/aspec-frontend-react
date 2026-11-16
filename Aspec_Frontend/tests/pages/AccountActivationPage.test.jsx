import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AccountActivationPage from '../../src/pages/AccountActivationPage'
import { getAccountActivation, startAccountActivation } from '../../src/services/accountActivation'

vi.mock('../../src/services/accountActivation', () => ({
  getAccountActivation: vi.fn(),
  startAccountActivation: vi.fn(),
  resendAccountActivationLink: vi.fn(),
}))

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/ativacao/u1?expires=1&signature=abc']}>
      <Routes>
        <Route path="/ativacao/:user" element={<AccountActivationPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AccountActivationPage (ASPEC-463)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAccountActivation.mockResolvedValue({ type: 'reactivation', email: 'ana@costa.pt' })
    /* O pedido fica pendente, como quando o browser já saiu para o Stripe. */
    startAccountActivation.mockReturnValue(new Promise(() => {}))
  })

  it('volta a ativar o botão quando o browser restaura a página ao regressar do Stripe', async () => {
    renderPage()

    const button = await screen.findByRole('button', { name: /continuar para pagamento/i })
    await userEvent.setup().click(button)

    await waitFor(() => expect(screen.getByRole('button', { name: /a encaminhar para o pagamento/i })).toBeDisabled())

    act(() => {
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
    })

    expect(screen.getByRole('button', { name: /continuar para pagamento/i })).toBeEnabled()
  })
})
