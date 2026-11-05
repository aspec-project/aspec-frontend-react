import { render, screen } from '@testing-library/react'
import { MemoryRouter, Outlet } from 'react-router-dom'
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
vi.mock('../../src/components/layout/MainLayout', () => ({ default: () => <Outlet /> }))

const { contextPage } = vi.hoisted(() => ({
  contextPage: async (name) => {
    const { useOutletContext } = await import('react-router-dom')
    return {
      default: function ContextPage() {
        const { profile, reloadProfile } = useOutletContext()
        return <p>Página {name} · {profile.business_name} · {typeof reloadProfile}</p>
      },
    }
  },
}))

vi.mock('../../src/pages/MemberProfilePage', () => contextPage('Perfil'))
vi.mock('../../src/pages/PortfolioPage', () => contextPage('Portefólio'))
vi.mock('../../src/pages/MemberRegistrationsPage', () => contextPage('Inscrições'))
vi.mock('../../src/pages/MemberReviewsPage', () => contextPage('Avaliações'))
vi.mock('../../src/pages/MemberPrayerCardsPage', () => contextPage('Cartões de oração'))
vi.mock('../../src/pages/SubscriptionPage', () => contextPage('Subscrição'))
vi.mock('../../src/pages/AccountInformationPage', () => contextPage('Conta'))

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

const pages = [
  ['/perfil', 'Perfil'],
  ['/perfil/portefolio', 'Portefólio'],
  ['/perfil/inscricoes', 'Inscrições'],
  ['/perfil/avaliacoes', 'Avaliações'],
  ['/perfil/cartoes-oracao', 'Cartões de oração'],
  ['/perfil/subscricao', 'Subscrição'],
  ['/perfil/conta', 'Conta'],
]
const accounts = [['o membro ativo', member], ['o admin ativo com perfil', adminWithProfile]]
const cases = accounts.flatMap(([who, user]) => pages.map(([path, page]) => [who, path, page, user]))

function show(user, path) {
  useAuthStore.setState({ user, status: 'authenticated' })
  return render(<MemoryRouter initialEntries={[path]}><AppRouter /></MemoryRouter>)
}

describe('Contexto do layout nas páginas da área de membro', () => {
  beforeEach(() => {
    getMemberProfile.mockResolvedValue({ id: memberProfileId, business_name: 'Santos Lda', name: 'Maria Santos', portfolio: [] })
  })
  afterEach(() => {
    useAuthStore.getState().clearSession()
    vi.clearAllMocks()
  })

  it.each(cases)('%s em %s recebe o perfil e o recarregamento do layout', async (who, path, page, user) => {
    show(user, path)
    expect(await screen.findByText(`Página ${page} · Santos Lda · function`)).toBeInTheDocument()
  })

  it.each([
    ['/perfil/editar', 'Perfil'],
    ['/perfil/montra', 'Perfil'],
    ['/perfil/contactos', 'Perfil'],
    ['/perfil/inscricoes-eventos', 'Inscrições'],
  ])('o alias %s leva o admin com perfil a uma página com o contexto do layout', async (path, page) => {
    show(adminWithProfile, path)
    expect(await screen.findByText(`Página ${page} · Santos Lda · function`)).toBeInTheDocument()
  })
})
