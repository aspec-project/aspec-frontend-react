import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AdminDashboardPage from '../../../src/pages/admin/AdminDashboardPage'
import { getAdminDashboard, getDashboardPendingApplications } from '../../../src/services/adminDashboard'

vi.mock('../../../src/services/adminDashboard', () => ({
  getAdminDashboard: vi.fn(),
  getDashboardPendingApplications: vi.fn(),
}))

vi.mock('../../../src/services/adminUsers', () => ({
  getAdminUsers: vi.fn(),
  anonymizeUser: vi.fn(),
  sendPaymentLink: vi.fn(),
  approveUser: vi.fn(),
  rejectUser: vi.fn(),
  blockUser: vi.fn(),
  unblockUser: vi.fn(),
  promoteUser: vi.fn(),
  demoteUser: vi.fn(),
}))

const TOTAL = 9
const LAST_PAGE = 3

const stats = {
  active_members: { total: 320, new_this_month: 12, trial: 300, active: 20, admins: 0 },
  pending_applications: { total: TOTAL },
  events: { this_month: 8, this_week: 2 },
  reviews: { flagged: 2, new_this_week: 5 },
  overdue_payments: { total: 7, grace: 4, unpaid: 3 },
  event_registrations: { this_week: 23, events_with_registrations: 2 },
}

function application(page, index) {
  return {
    id: `u-${page}-${index}`,
    email: `pessoa${page}${index}@example.pt`,
    created_at: '2026-10-28T10:00:00+00:00',
    role: { id: 'role-member', name: 'Member' },
    account_status: { id: 'status-pending', name: 'Pending' },
    subscription_state: { value: 'pending', label: 'Pendente' },
    inactive_reason: null,
    member_profile: {
      name: `Pessoa ${page}.${index}`,
      business_name: `Negócio ${page}.${index}`,
      sector: { id: 'sector', name: 'Design' },
      location: { id: 'location', name: 'Lisboa' },
    },
  }
}

/* 3 páginas de 3 candidaturas; uma página para lá da última vem vazia, como na API. */
function pageOf(page) {
  const items = page > LAST_PAGE ? [] : [0, 1, 2].map((index) => application(page, index))

  return { items, pagination: { current_page: page, per_page: 3, total: TOTAL, last_page: LAST_PAGE } }
}

function LocationProbe() {
  return <output data-testid="location">{useLocation().search}</output>
}

function show(entry = '/admin') {
  return render(<MemoryRouter initialEntries={[entry]}><AdminDashboardPage /><LocationProbe /></MemoryRouter>)
}

const nav = () => screen.getByRole('navigation', { name: 'Paginação das candidaturas pendentes' })
const pagesRequested = () => getDashboardPendingApplications.mock.calls.map(([page]) => page)

describe('Painel do admin: página das candidaturas no endereço', () => {
  beforeEach(() => {
    getAdminDashboard.mockResolvedValue({ stats, pending_applications: pageOf(1).items, recent_reviews: [] })
    getDashboardPendingApplications.mockImplementation((page) => Promise.resolve(pageOf(page)))
  })
  afterEach(() => {
    cleanup()
    vi.resetAllMocks()
  })

  it('abre na página do endereço e pede-a à API', async () => {
    show('/admin?applications_page=2')

    expect(await screen.findByText('Pessoa 2.0')).toBeInTheDocument()
    expect(pagesRequested()).toEqual([2])
    expect(within(nav()).getByRole('button', { name: 'Página 2', current: 'page' })).toBeInTheDocument()
  })

  it('mudar de página escreve-a no endereço', async () => {
    const user = userEvent.setup({ delay: null })
    show()
    await screen.findByText('Pessoa 1.0')

    await user.click(within(nav()).getByRole('button', { name: 'Página 3' }))

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\?applications_page=3$/))
    expect(await screen.findByText('Pessoa 3.0')).toBeInTheDocument()
  })

  it.each([
    ['página 0', '?applications_page=0'],
    ['página negativa', '?applications_page=-1'],
    ['página não numérica', '?applications_page=abc'],
  ])('ignora %s e mostra a página 1 do painel sem pedidos extra', async (_, query) => {
    show(`/admin${query}`)

    expect(await screen.findByText('Pessoa 1.0')).toBeInTheDocument()
    expect(within(nav()).getByRole('button', { name: 'Página 1', current: 'page' })).toBeInTheDocument()
    expect(getDashboardPendingApplications).not.toHaveBeenCalled()
  })

  it('uma página para lá da última passa para a última', async () => {
    show('/admin?applications_page=9')

    expect(await screen.findByText('Pessoa 3.0')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\?applications_page=3$/))
  })

  it('o padrão não escreve parâmetros no endereço', async () => {
    const user = userEvent.setup({ delay: null })
    show('/admin?applications_page=2')
    await screen.findByText('Pessoa 2.0')

    await user.click(within(nav()).getByRole('button', { name: 'Página 1' }))

    await waitFor(() => expect(screen.getByTestId('location')).toBeEmptyDOMElement())
    expect(await screen.findByText('Pessoa 1.0')).toBeInTheDocument()
  })
})
