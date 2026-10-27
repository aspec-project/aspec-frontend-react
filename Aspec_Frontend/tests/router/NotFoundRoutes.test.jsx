import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppRouter from '../../src/router/AppRouter'
import { useAuthStore } from '../../src/store/authStore'

vi.mock('../../src/pages/HomePage', () => ({
  default: () => <h1>Página inicial</h1>,
}))

vi.mock('../../src/pages/LoginPage', () => ({
  LoginPage: () => <h1>Iniciar sessão</h1>,
}))

function show(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRouter />
    </MemoryRouter>,
  )
}

describe('Página não encontrada', () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession()
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  afterEach(() => {
    useAuthStore.getState().clearSession()
    vi.restoreAllMocks()
  })

  it.each(['/pagina-inexistente', '/endereco/inexistente/detalhe'])('apresenta a página 404 em %s com o layout público uma única vez', (path) => {
    show(path)

    expect(screen.getByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Página não encontrada' })).toBeInTheDocument()
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getAllByRole('navigation')).toHaveLength(1)
    expect(screen.getAllByRole('contentinfo')).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Voltar ao início' })).toHaveAttribute('href', '/')
  })

  it('permite regressar à página inicial através do teclado', async () => {
    const user = userEvent.setup()
    show('/pagina-inexistente')

    const returnLink = screen.getByRole('link', { name: 'Voltar ao início' })
    returnLink.focus()
    expect(returnLink).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(screen.getByRole('heading', { level: 1, name: 'Página inicial' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Página não encontrada' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('contentinfo')).toHaveLength(1)
  })

  it('preserva a rota pública de login sem o layout global', () => {
    show('/login')

    expect(screen.getByRole('heading', { name: 'Iniciar sessão' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Página não encontrada' })).not.toBeInTheDocument()
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
  })

  it('continua a encaminhar uma rota privada para o login quando não existe sessão', () => {
    show('/perfil')

    expect(screen.getByRole('heading', { name: 'Iniciar sessão' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Página não encontrada' })).not.toBeInTheDocument()
  })
})
