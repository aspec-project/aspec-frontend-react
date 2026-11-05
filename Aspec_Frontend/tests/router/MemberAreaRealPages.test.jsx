import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Outlet } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppRouter from '../../src/router/AppRouter'
import { getMemberProfile } from '../../src/services/memberProfile'
import { getMyReviews } from '../../src/services/members'
import { getSectors, getSocialPlatforms, getWeekDays } from '../../src/services/referenceLists'
import { useAuthStore } from '../../src/store/authStore'

vi.mock('../../src/services/memberProfile', () => ({
  getMemberProfile: vi.fn(),
  updateMemberProfile: vi.fn(),
  uploadMemberLogo: vi.fn(),
  uploadPortfolioImages: vi.fn(),
  deletePortfolioImage: vi.fn(),
}))
vi.mock('../../src/services/referenceLists', async (importOriginal) => ({
  ...(await importOriginal()),
  getSectors: vi.fn(),
  getWeekDays: vi.fn(),
  getSocialPlatforms: vi.fn(),
}))
vi.mock('../../src/services/members', async (importOriginal) => ({
  ...(await importOriginal()),
  getMyReviews: vi.fn(),
}))
vi.mock('../../src/pages/HomePage', () => ({ default: () => <p>Página Início</p> }))
vi.mock('../../src/components/layout/MainLayout', () => ({ default: () => <Outlet /> }))

const memberProfileId = '9d2f1c3a-5b7e-4a1c-9f2d-3e4b5a6c7d8e'
const adminWithProfile = {
  id: 'admin-1',
  email: 'admin@example.pt',
  role: { name: 'Admin' },
  account_status: { name: 'Active' },
  member_profile: { id: memberProfileId, name: 'Admin', business_name: 'Santos Lda' },
}
const profile = {
  id: memberProfileId,
  name: 'Maria Santos',
  business_name: 'Santos Lda',
  sector: { id: 'setor-1', name: 'Consultoria' },
  location: { id: 'local-1', name: 'Lisboa' },
  address: 'Rua das Flores 10',
  postal_code: '1000-100',
  city: 'Lisboa',
  description: 'Consultoria para pequenas empresas.',
  website_url: 'https://santos.example.pt',
  commercial_email: 'geral@santos.example.pt',
  commercial_phone: '+351210000000',
  logo_url: null,
  congregation: 'Igreja Central',
  role_in_congregation: 'Membro',
  business_hours: [],
  social_links: [],
  portfolio: [],
  average_rating: null,
  reviews_count: 0,
}

describe('Páginas reais da área de membro para o admin com perfil', () => {
  beforeEach(() => {
    getMemberProfile.mockResolvedValue(profile)
    getSectors.mockResolvedValue([])
    getWeekDays.mockResolvedValue([])
    getSocialPlatforms.mockResolvedValue([])
    getMyReviews.mockResolvedValue({ items: [], pagination: { current_page: 1, per_page: 5, total: 0, last_page: 1 } })
  })
  afterEach(() => {
    useAuthStore.getState().clearSession()
    vi.clearAllMocks()
  })

  it.each([
    ['/perfil', 'Perfil', () => screen.findByRole('heading', { level: 2, name: 'Dados do Perfil' })],
    ['/perfil/portefolio', 'Portefólio', () => screen.findByRole('heading', { level: 1, name: 'Portefólio de Imagens' })],
    ['/perfil/avaliacoes', 'Avaliações', () => screen.findByRole('heading', { level: 1, name: 'Avaliações ao meu perfil' })],
  ])('%s mostra o conteúdo da página e a aba ativa', async (path, tab, findHeading) => {
    useAuthStore.setState({ user: adminWithProfile, status: 'authenticated' })
    render(<MemoryRouter initialEntries={[path]}><AppRouter /></MemoryRouter>)

    expect(await findHeading()).toBeInTheDocument()
    const navigation = screen.getByRole('navigation', { name: 'Secções do perfil' })
    expect(within(navigation).getByRole('link', { name: tab })).toHaveAttribute('aria-current', 'page')
  })
})
