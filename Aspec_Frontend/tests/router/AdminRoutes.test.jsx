import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppRouter from '../../src/router/AppRouter'
import { getAdminEvents } from '../../src/services/adminEvents'
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
  promoteUser: vi.fn(),
  demoteUser: vi.fn(),
  anonymizeUser: vi.fn(),
  sendPaymentLink: vi.fn(),
}))
vi.mock('../../src/services/events', () => ({
  getEvents: vi.fn(),
  getEventsErrorMessage: vi.fn(() => 'Erro'),
}))
vi.mock('../../src/services/adminEvents', () => ({
  getAdminEvents: vi.fn(),
  exportEventAttendees: vi.fn(),
  createAdminEvent: vi.fn(),
  geocodeAddress: vi.fn(),
  updateAdminEvent: vi.fn(),
  deleteAdminEvent: vi.fn(),
}))
vi.mock('../../src/services/referenceLists', () => ({
  getSocialPlatforms: vi.fn(() => Promise.resolve([])),
  getWeekDays: vi.fn(() => Promise.resolve([])),
  getEventCategories: vi.fn(() => Promise.resolve([])),
  getSectors: vi.fn(() => Promise.resolve([])),
  getLocations: vi.fn(() => Promise.resolve([])),
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
    getAdminEvents.mockResolvedValue({
      items: [],
      pagination: { current_page: 1, per_page: 6, total: 0, last_page: 1 },
      counts: { upcoming: 0, past: 0 },
    })
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

  it('um admin abre o detalhe de um membro com o nome como título e um membro não chega lá', async () => {
    getAdminUser.mockResolvedValue(maria)
    useAuthStore.setState({ user: { id: 'admin-1', email: 'admin@aspec.pt', role: { name: 'Admin' }, account_status: { name: 'Active' } }, status: 'authenticated' })

    const { unmount } = show(`/admin/utilizadores/${memberId}`)

    expect(await screen.findByRole('heading', { level: 1, name: 'Maria Santos' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(getAdminUser.mock.calls[0][0]).toBe(memberId)
    unmount()

    vi.clearAllMocks()
    useAuthStore.setState({ user: { id: 'member-1', email: 'membro@aspec.pt', role: { name: 'Member' }, account_status: { name: 'Active' } }, status: 'authenticated' })

    show(`/admin/utilizadores/${memberId}`)

    await waitFor(() => expect(getEvents).toHaveBeenCalled())
    expect(screen.queryByRole('heading', { name: 'Maria Santos' })).not.toBeInTheDocument()
    expect(getAdminUser).not.toHaveBeenCalled()
  })

  it('um admin vê a lista de eventos agendados dentro do layout de administração', async () => {
    useAuthStore.setState({ user: { id: 'admin-1', email: 'admin@aspec.pt', role: { name: 'Admin' }, account_status: { name: 'Active' } }, status: 'authenticated' })

    show('/admin/eventos')

    expect(await screen.findByRole('heading', { level: 1, name: 'Gestão de Eventos' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 2, name: 'Eventos Agendados' })).toBeInTheDocument()
    await waitFor(() => expect(getAdminEvents).toHaveBeenCalled())
  })

  it('um membro não chega à lista de eventos do backoffice nem dispara o pedido', async () => {
    useAuthStore.setState({ user: { id: 'member-1', email: 'membro@aspec.pt', role: { name: 'Member' }, account_status: { name: 'Active' } }, status: 'authenticated' })

    show('/admin/eventos')

    await waitFor(() => expect(getEvents).toHaveBeenCalled())
    expect(screen.queryByRole('heading', { name: 'Eventos Agendados' })).not.toBeInTheDocument()
    expect(getAdminEvents).not.toHaveBeenCalled()
  })
})
