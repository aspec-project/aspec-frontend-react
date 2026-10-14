import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppRouter from '../../src/router/AppRouter'
import { getAdminUsers } from '../../src/services/adminUsers'
import { getEvents } from '../../src/services/events'
import { useAuthStore } from '../../src/store/authStore'

vi.mock('../../src/services/adminUsers', () => ({ getAdminUsers: vi.fn() }))
vi.mock('../../src/services/events', () => ({
  getEvents: vi.fn(),
  getEventsErrorMessage: vi.fn(() => 'Erro'),
}))

const emptyList = {
  items: [],
  pagination: { current_page: 1, per_page: 12, total: 0, last_page: 1 },
  counts: { all: 0, active: 0, pending: 0, approved: 0, blocked: 0, inactive: 0 },
}

function show() {
  return render(<MemoryRouter initialEntries={['/admin/utilizadores']}><AppRouter /></MemoryRouter>)
}

describe('Rotas de administração', () => {
  beforeEach(() => {
    getAdminUsers.mockResolvedValue(emptyList)
    getEvents.mockResolvedValue([])
  })
  afterEach(() => {
    vi.clearAllMocks()
    useAuthStore.getState().clearSession()
  })

  it('um admin vê a gestão de utilizadores dentro do layout de administração', async () => {
    useAuthStore.setState({ user: { id: 'admin-1', email: 'admin@aspec.pt', role: { name: 'Admin' }, account_status: { name: 'Active' } }, status: 'authenticated' })

    show()

    expect(await screen.findByRole('heading', { level: 1, name: 'Gestão de Utilizadores' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Secções da administração' })).toBeInTheDocument()
    await waitFor(() => expect(getAdminUsers).toHaveBeenCalled())
  })

  it('um membro não chega à gestão de utilizadores nem dispara o pedido', async () => {
    useAuthStore.setState({ user: { id: 'member-1', email: 'membro@aspec.pt', role: { name: 'Member' }, account_status: { name: 'Active' } }, status: 'authenticated' })

    show()

    await waitFor(() => expect(getEvents).toHaveBeenCalled())
    expect(screen.queryByRole('heading', { name: 'Gestão de Utilizadores' })).not.toBeInTheDocument()
    expect(getAdminUsers).not.toHaveBeenCalled()
  })
})
