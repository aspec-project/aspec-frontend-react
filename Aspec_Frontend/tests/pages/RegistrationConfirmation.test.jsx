import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import PendingAccountPage from '../../src/pages/PendingAccountPage'
import SuccessView from '../../src/components/register/SuccessView'

describe('Confirmação genérica do registo', () => {
  it('não afirma que foi criada uma candidatura', () => {
    render(<SuccessView />)

    expect(
      screen.getByRole('heading', { name: 'Pedido recebido' }),
    ).toBeInTheDocument()
  })

  it('não afirma que todas as contas estão pendentes ou receberão email', () => {
    render(
      <MemoryRouter>
        <PendingAccountPage />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: 'Pedido recebido' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Se o endereço puder ser usado para uma candidatura/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Se já tiver uma conta/),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/Enquanto a conta estiver pendente/),
    ).not.toBeInTheDocument()
  })
})