import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AdminLayout from '../../../src/components/layout/AdminLayout'
import { useAuthStore } from '../../../src/store/authStore'

const admin = { id: 'admin-1', email: 'admin@aspec.pt', role: { name: 'Admin' }, account_status: { name: 'Active' } }

function show(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<p>Conteúdo do dashboard</p>} />
          <Route path="/admin/utilizadores" element={<p>Conteúdo dos utilizadores</p>} />
          <Route path="/admin/utilizadores/:id" element={<p>Conteúdo do detalhe</p>} />
          <Route path="/admin/eventos" element={<p>Conteúdo dos eventos</p>} />
          <Route path="/admin/moderacao" element={<p>Conteúdo da moderação</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

function sectionTabs() {
  return within(screen.getByRole('navigation', { name: 'Secções da administração' }))
}

describe('AdminLayout', () => {
  beforeEach(() => useAuthStore.setState({ user: admin, status: 'authenticated' }))
  afterEach(() => {
    vi.useRealTimers()
    useAuthStore.getState().clearSession()
  })

  it('mostra o herói, os separadores de secção e o conteúdo da página de utilizadores entre o Header e o Footer', () => {
    show('/admin/utilizadores')

    expect(screen.getByText('Área de Administração')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Gestão de Utilizadores' })).toBeInTheDocument()
    expect(sectionTabs().getAllByRole('link').map((link) => link.textContent.trim())).toEqual(['Dashboard', 'Utilizadores', 'Eventos', 'Moderação'])
    expect(sectionTabs().getByRole('link', { name: 'Utilizadores' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('Conteúdo dos utilizadores')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('no dashboard mostra o título da área e a data de hoje por extenso', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 13, 12))

    show('/admin')

    expect(screen.getByRole('heading', { level: 1, name: 'Área de Administração' })).toBeInTheDocument()
    expect(screen.getByText('terça-feira, 13 de outubro de 2026')).toBeInTheDocument()
    expect(sectionTabs().getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page')
    expect(sectionTabs().getByRole('link', { name: 'Utilizadores' })).not.toHaveAttribute('aria-current')
  })

  it('marca só o separador Eventos em /admin/eventos', () => {
    show('/admin/eventos')

    expect(sectionTabs().getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current')
    expect(sectionTabs().getByRole('link', { name: 'Eventos' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('heading', { level: 1, name: 'Gestão de Eventos' })).toBeInTheDocument()
  })

  it('no detalhe de um membro mostra só o Header, o conteúdo da página e o Footer', () => {
    show('/admin/utilizadores/u3')

    expect(screen.getByText('Conteúdo do detalhe')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Secções da administração' })).not.toBeInTheDocument()
    expect(screen.queryByText('Área de Administração')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
    expect(screen.getByRole('main')).toContainElement(screen.getByText('Conteúdo do detalhe'))
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })
})
