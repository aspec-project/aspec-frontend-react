import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Outlet, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppRouter from '../../src/router/AppRouter'
import { useAuthStore } from '../../src/store/authStore'

// Estas páginas não são o alvo: isolamos os títulos e a navegação real do router.
vi.mock('../../src/pages/HomePage', () => ({ default: () => null }))
vi.mock('../../src/pages/EventsPage', () => ({ default: () => null }))
vi.mock('../../src/pages/MembersPage', () => ({ default: () => null }))
vi.mock('../../src/pages/LoginPage', () => ({ LoginPage: () => null }))
vi.mock('../../src/pages/ForgotPasswordPage', () => ({ default: () => null }))
vi.mock('../../src/pages/ResetPasswordPage', () => ({ default: () => null }))
vi.mock('../../src/pages/RegisterPage', () => ({ default: () => null }))
vi.mock('../../src/pages/AccountActivationPage', () => ({ default: () => null }))
vi.mock('../../src/pages/AccountActivationSuccessPage', () => ({ default: () => null }))
vi.mock('../../src/pages/RequestActivationLinkPage', () => ({ default: () => null }))
vi.mock('../../src/pages/MemberProfilePage', () => ({ default: () => null }))
vi.mock('../../src/pages/PortfolioPage', () => ({ default: () => null }))
vi.mock('../../src/pages/MemberRegistrationsPage', () => ({ default: () => null }))
vi.mock('../../src/pages/MemberReviewsPage', () => ({ default: () => null }))
vi.mock('../../src/pages/AccountInformationPage', () => ({ default: () => null }))
vi.mock('../../src/pages/ChangePasswordPage', () => ({ default: () => null }))
vi.mock('../../src/pages/SubscriptionPage', () => ({ default: () => null }))
vi.mock('../../src/pages/admin/AdminUsersPage', () => ({ default: () => null }))
vi.mock('../../src/pages/admin/AdminUserDetailPage', () => ({ default: () => null }))
vi.mock('../../src/pages/admin/AdminEventsPage', () => ({ default: () => null }))
vi.mock('../../src/pages/admin/AdminEventCategoriesPage', () => ({ default: () => null }))
vi.mock('../../src/pages/admin/AdminDashboardPage', () => ({ default: () => null }))
vi.mock('../../src/components/layout/MainLayout', () => ({ default: () => <Outlet /> }))
vi.mock('../../src/components/layout/MemberAreaLayout', () => ({ default: () => <Outlet /> }))
vi.mock('../../src/components/layout/AdminLayout', () => ({ default: () => <Outlet /> }))

function Navigation() {
  const navigate = useNavigate()
  return <>
    <Link to="/eventos?pagina=2#agenda">Agenda</Link>
    <Link to="/nao-existe">URL desconhecido</Link>
    <Link to="/login">Login</Link>
    <button onClick={() => navigate(-1)}>Voltar</button>
    <button onClick={() => navigate(1)}>Avançar</button>
  </>
}

function show(path) {
  return render(<MemoryRouter initialEntries={[path]}><Navigation /><AppRouter /></MemoryRouter>)
}

describe('Títulos do separador por rota', () => {
  beforeEach(() => useAuthStore.getState().clearSession())
  afterEach(() => useAuthStore.getState().clearSession())

  it.each([
    ['/', 'Início'], ['/eventos', 'Agenda de Eventos'], ['/membros', 'Diretório de Confiança'],
    ['/login', 'Iniciar sessão'], ['/esqueci-password', 'Recuperar palavra-passe'],
    ['/reset-password', 'Redefinir palavra-passe'], ['/registo', 'Candidatura'],
    ['/ativacao/sucesso', 'Conta ativada'], ['/ativacao/novo-link', 'Novo link de ativação'],
    ['/ativacao/conta', 'Ativar conta'], ['/pendente', 'Conta pendente'],
    ['/nao-existe', 'Página não encontrada'], ['/admin/nao-existe', 'Página não encontrada'],
  ])('%s identifica a página pública', (path, title) => {
    show(path)
    expect(document.title).toBe(`${title} | ASPEC`)
  })

  it.each([
    ['/dashboard', 'Dashboard'], ['/perfil', 'Perfil'], ['/perfil/portefolio', 'Portefólio'],
    ['/perfil/inscricoes', 'Inscrições em eventos'], ['/perfil/avaliacoes', 'Avaliações'],
    ['/perfil/conta', 'Informações da conta'], ['/perfil/conta/password', 'Informações da conta'],
    ['/perfil/subscricao', 'Subscrição'], ['/perfil/editar', 'Perfil'],
    ['/perfil/montra', 'Perfil'], ['/perfil/contactos', 'Perfil'],
    ['/perfil/inscricoes-eventos', 'Inscrições em eventos'], ['/conta/subscricao', 'Subscrição'],
  ])('%s identifica a página privada ou o destino do alias', (path, title) => {
    useAuthStore.setState({ user: { id: 'member', role: { name: 'Member' }, account_status: { name: 'Active' } }, status: 'authenticated' })
    show(path)
    expect(document.title).toBe(`${title} | ASPEC`)
  })

  it.each([
    ['/admin', 'Administração'], ['/admin/utilizadores', 'Utilizadores'],
    ['/admin/utilizadores/exemplo', 'Detalhe do utilizador'], ['/admin/eventos', 'Gestão de eventos'],
    ['/admin/tipos-evento', 'Tipos de evento'], ['/admin/moderacao', 'Moderação'],
  ])('%s identifica a página de administração', (path, title) => {
    useAuthStore.setState({ user: { id: 'admin', role: { name: 'Admin' } }, status: 'authenticated' })
    show(path)
    expect(document.title).toBe(`${title} | ASPEC`)
  })

  it('atualiza com links, query/hash, histórico e 404, e limpa ao desmontar', async () => {
    const user = userEvent.setup()
    const view = show('/')
    await user.click(screen.getByRole('link', { name: 'Agenda' }))
    expect(document.title).toBe('Agenda de Eventos | ASPEC')
    await user.click(screen.getByRole('link', { name: 'URL desconhecido' }))
    expect(document.title).toBe('Página não encontrada | ASPEC')
    await user.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(document.title).toBe('Agenda de Eventos | ASPEC')
    await user.click(screen.getByRole('button', { name: 'Avançar' }))
    expect(document.title).toBe('Página não encontrada | ASPEC')
    await user.click(screen.getByRole('link', { name: 'Login' }))
    expect(document.title).toBe('Iniciar sessão | ASPEC')
    view.unmount()
    expect(document.title).toBe('ASPEC')
  })

  it('usa o título do login quando uma rota privada redireciona', () => {
    show('/perfil')
    expect(document.title).toBe('Iniciar sessão | ASPEC')
  })
})
