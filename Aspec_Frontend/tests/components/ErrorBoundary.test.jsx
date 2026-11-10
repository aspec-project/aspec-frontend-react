import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ErrorBoundary, { RouteErrorBoundary } from '../../src/components/ErrorBoundary'

function Broken() {
  throw new Error('falha de teste')
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('mostra o conteúdo normal quando não há erro', () => {
    render(<ErrorBoundary><p>Conteúdo</p></ErrorBoundary>)

    expect(screen.getByText('Conteúdo')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('mostra uma mensagem e formas de sair em vez de um ecrã em branco', () => {
    render(<ErrorBoundary><Broken /></ErrorBoundary>)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ocorreu um erro inesperado' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar ao início' })).toHaveAttribute('href', '/')
    expect(screen.queryByText('falha de teste')).not.toBeInTheDocument()
  })

  it('tentar novamente recarrega a página', async () => {
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })
    render(<ErrorBoundary><Broken /></ErrorBoundary>)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(reload).toHaveBeenCalledOnce()
    vi.unstubAllGlobals()
  })

  it('sai do ecrã de erro quando se navega para outra página', async () => {
    render(
      <MemoryRouter initialEntries={['/avariada']}>
        <Link to="/">Ir para o início</Link>
        <RouteErrorBoundary>
          <Routes>
            <Route path="/avariada" element={<Broken />} />
            <Route path="/" element={<p>Página inicial</p>} />
          </Routes>
        </RouteErrorBoundary>
      </MemoryRouter>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()

    await userEvent.setup().click(screen.getByRole('link', { name: 'Ir para o início' }))

    expect(screen.getByText('Página inicial')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
