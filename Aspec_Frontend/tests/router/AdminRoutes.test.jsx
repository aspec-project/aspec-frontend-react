import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppRouter from '../../src/router/AppRouter'
import { getAdminUser, getAdminUsers } from '../../src/services/adminUsers'
import { getEvents } from '../../src/services/events'
import { useAuthStore } from '../../src/store/authStore'

vi.mock('../../src/services/adminUsers', () => ({
  getAdminUsers: vi.fn(),
  getAdminUser: vi.fn(),
  approveUser: vi.fn(),
  rejectUser: vi.fn(),
  blockUser: vi.fn(),
  unblockUser: vi.fn(),
}))
vi.mock('../../src/services/events', () => ({
  getEvents: vi.fn(),
  getEventsErrorMessage: vi.fn(() => 'Erro'),
}))

const memberId = '9d2f1c3a-5b7e-4a1c-9f2d-3e4b5a6c7d8e'

const maria = {
  id: memberId,
  email: 'maria@santos.pt',
  phone: '912345678',
  created_at: '2026-10-14T09:30:00+00:00',
  role: { name: 'Member' },
  account_status: { name: 'Pending' },
  inactive_reason: null,
  member_profile: {
    name: 'Maria Santos',
    business_name: 'Santos Contabilidade',
    sector: { name: 'Consultoria' },
    location: { name: 'Lisboa' },
    business_hours: [],
    social_links: [],
    portfolio: [],
  },
}

const emptyList = {
  items: [],
  pagination: { current_page: 1, per_page: 12, total: 0, last_page: 1 },
  counts: { all: 0, active: 0, pending: 0, approved: 0, blocked: 0, inactive: 0 },
}

function show(path = '/admin/utilizadores') {
  return render(<MemoryRouter initialEntries={[path]}><AppRouter /></MemoryRouter>)
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

  it('um admin abre o detalhe de um membro no layout de administração e um membro não chega lá', async () => {
    getAdminUser.mockResolvedValue(maria)
    useAuthStore.setState({ user: { id: 'admin-1', email: 'admin@aspec.pt', role: { name: 'Admin' }, account_status: { name: 'Active' } }, status: 'authenticated' })

    const { unmount } = show(`/admin/utilizadores/${memberId}`)

    expect(await screen.findByRole('heading', { level: 1, name: 'Detalhe do membro' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Maria Santos' })).toBeInTheDocument()
    expect(getAdminUser.mock.calls[0][0]).toBe(memberId)
    unmount()

    vi.clearAllMocks()
    useAuthStore.setState({ user: { id: 'member-1', email: 'membro@aspec.pt', role: { name: 'Member' }, account_status: { name: 'Active' } }, status: 'authenticated' })

    show(`/admin/utilizadores/${memberId}`)

    await waitFor(() => expect(getEvents).toHaveBeenCalled())
    expect(screen.queryByRole('heading', { name: 'Detalhe do membro' })).not.toBeInTheDocument()
    expect(getAdminUser).not.toHaveBeenCalled()
  })
})
