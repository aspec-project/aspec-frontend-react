import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Outlet, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppRouter from '../../src/router/AppRouter'
import { getMemberProfile } from '../../src/services/memberProfile'
import { useAuthStore } from '../../src/store/authStore'

vi.mock('../../src/services/memberProfile', () => ({
  getMemberProfile: vi.fn(),
  updateMemberProfile: vi.fn(),
  uploadMemberLogo: vi.fn(),
  uploadPortfolioImages: vi.fn(),
  deletePortfolioImage: vi.fn(),
}))
vi.mock('../../src/pages/HomePage', () => ({ default: () => <p>Página Início</p> }))
vi.mock('../../src/pages/MemberProfilePage', () => ({ default: () => <p>Página Perfil</p> }))
vi.mock('../../src/pages/PortfolioPage', () => ({ default: () => <p>Página Portefólio</p> }))
vi.mock('../../src/pages/MemberRegistrationsPage', () => ({ default: () => <p>Página Inscrições</p> }))
vi.mock('../../src/pages/MemberReviewsPage', () => ({ default: () => <p>Página Avaliações</p> }))
vi.mock('../../src/pages/MemberPrayerCardsPage', () => ({ default: () => <p>Página Cartões de oração</p> }))
vi.mock('../../src/pages/AccountInformationPage', () => ({ default: () => <p>Página Conta</p> }))
vi.mock('../../src/pages/SubscriptionPage', () => ({ default: () => <p>Página Subscrição</p> }))
vi.mock('../../src/components/layout/MainLayout', () => ({ default: () => <Outlet /> }))

const memberProfileId = '9d2f1c3a-5b7e-4a1c-9f2d-3e4b5a6c7d8e'
const member = {
  id: 'membro-1',
  email: 'maria@example.pt',
  role: { name: 'Member' },
  account_status: { name: 'Active' },
  member_profile: { id: memberProfileId, name: 'Maria Santos', business_name: 'Santos Lda' },
}
const adminWithProfile = {
  ...member,
  id: 'admin-1',
  role: { name: 'Admin' },
  member_profile: { ...member.member_profile, name: 'Admin' },
}
const technicalAdmin = {
  id: 'tecnico-1',
  email: 'tecnico@example.pt',
  phone: null,
  role: { name: 'Admin' },
  account_status: { name: 'Active' },
  member_profile: null,
}

const pages = [
  ['/perfil', 'Página Perfil'],
  ['/perfil/portefolio', 'Página Portefólio'],
  ['/perfil/inscricoes', 'Página Inscrições'],
  ['/perfil/avaliacoes', 'Página Avaliações'],
  ['/perfil/cartoes-oracao', 'Página Cartões de oração'],
  ['/perfil/conta', 'Página Conta'],
  ['/perfil/subscricao', 'Página Subscrição'],
]
const profilePages = pages.filter(([path]) => path !== '/perfil/conta')
const noProfileMessage = 'Esta conta de administração não tem perfil de membro.'

function Location() {
  return <p data-testid="location">{useLocation().pathname}</p>
}

function show(user, path) {
  useAuthStore.setState({ user, status: 'authenticated' })
  return render(<MemoryRouter initialEntries={[path]}><AppRouter /><Location /></MemoryRouter>)
}

describe('Rotas da área de membro para admins', () => {
  beforeEach(() => {
    getMemberProfile.mockResolvedValue({ ...adminWithProfile.member_profile })
  })
  afterEach(() => {
    useAuthStore.getState().clearSession()
    vi.clearAllMocks()
  })

  it.each(pages)('o admin ativo com perfil abre %s', async (path, page) => {
    show(adminWithProfile, path)
    expect(await screen.findByText(page)).toBeInTheDocument()
  })

  it.each(profilePages)('o admin técnico em %s vê a mensagem de conta sem perfil', async (path, page) => {
    show(technicalAdmin, path)
    expect(await screen.findByText(noProfileMessage)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir para Informações de conta' })).toHaveAttribute('href', '/perfil/conta')
    expect(screen.queryByText(page)).not.toBeInTheDocument()
    expect(getMemberProfile).not.toHaveBeenCalled()
    await waitFor(() => expect(document.title).toBe('Sem perfil de membro | ASPEC'))
  })

  it.each(['/perfil/conta', '/perfil/conta/password'])('o admin técnico em %s abre Informações de conta', async (path) => {
    show(technicalAdmin, path)
    expect(await screen.findByText('Página Conta')).toBeInTheDocument()
    expect(getMemberProfile).not.toHaveBeenCalled()
  })

  it('o alias /perfil/montra leva o admin técnico à mensagem de conta sem perfil', async () => {
    show(technicalAdmin, '/perfil/montra')
    expect(await screen.findByText(noProfileMessage)).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/perfil')
    expect(screen.queryByText('Página Perfil')).not.toBeInTheDocument()
  })

  it('o admin com perfil inativo vai para o início e o membro ativo continua a abrir o portefólio', async () => {
    const view = show({ ...adminWithProfile, account_status: { name: 'Inactive' } }, '/perfil')
    expect(await screen.findByText('Página Início')).toBeInTheDocument()
    expect(screen.getByTestId('location').textContent).toBe('/')
    view.unmount()
    useAuthStore.getState().clearSession()

    getMemberProfile.mockResolvedValue({ ...member.member_profile })
    show(member, '/perfil/portefolio')
    expect(await screen.findByText('Página Portefólio')).toBeInTheDocument()
  })
})
