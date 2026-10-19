import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AdminUserDetailPage from '../../../src/pages/admin/AdminUserDetailPage'
import { approveUser, blockUser, getAdminUser } from '../../../src/services/adminUsers'
import { useAuthStore } from '../../../src/store/authStore'

vi.mock('../../../src/services/adminUsers', () => ({
  getAdminUser: vi.fn(),
  approveUser: vi.fn(),
  rejectUser: vi.fn(),
  blockUser: vi.fn(),
  unblockUser: vi.fn(),
}))

const maria = {
  id: 'u3',
  email: 'maria@santos.pt',
  phone: '912345678',
  created_at: '2026-10-14T09:30:00+00:00',
  role: { name: 'Member' },
  account_status: { name: 'Pending' },
  inactive_reason: null,
  member_profile: {
    name: 'Maria Santos',
    business_name: 'Santos Contabilidade',
    congregation: 'Igreja Central',
    role_in_congregation: 'Diaconisa',
    description: 'Contabilidade para pequenas empresas.',
    website_url: 'https://santos.pt',
    commercial_contacts: 'geral@santos.pt',
    address: 'Rua Direita 1, Lisboa',
    sector: { name: 'Consultoria' },
    location: { name: 'Lisboa' },
    logo_url: 'http://localhost:8000/storage/logos/u3/logo.png',
    business_hours: [{ week_day_id: 1, week_day: 'Segunda-feira', open_time: '09:00', close_time: '18:00' }],
    social_links: [{ platform_id: 'p1', platform: 'LinkedIn', url: 'https://www.linkedin.com/company/santos' }],
    portfolio: [
      { id: 'i1', image_url: 'http://localhost:8000/storage/portfolios/u3/1.jpg' },
      { id: 'i2', image_url: 'http://localhost:8000/storage/portfolios/u3/2.jpg' },
    ],
  },
}

const otherAdmin = {
  id: 'admin-2',
  email: 'outro@aspec.pt',
  phone: null,
  role: { name: 'Admin' },
  account_status: { name: 'Active' },
  member_profile: null,
}

const ACTION_NAME = /^(Aprovar|Recusar|Bloquear|Desbloquear) /

function withProfile(changes) {
  return { ...maria, member_profile: { ...maria.member_profile, ...changes } }
}

function deferred() {
  let resolve
  const promise = new Promise((res) => { resolve = res })
  return { promise, resolve }
}

function apiError(status, message) {
  return new AxiosError('x', 'ERR_BAD_REQUEST', undefined, undefined, { status, data: { success: false, message } })
}

function show() {
  return render(
    <MemoryRouter initialEntries={['/admin/utilizadores/u3']}>
      <Routes>
        <Route path="/admin/utilizadores/:id" element={<AdminUserDetailPage />} />
        <Route path="/admin/utilizadores" element={<p>Lista de utilizadores</p>} />
      </Routes>
    </MemoryRouter>
  )
}

function region(name) {
  return within(screen.getByRole('region', { name }))
}

function field(card, label) {
  return card.getByText(label).closest('div')
}

function actionButtons() {
  return screen.queryAllByRole('button', { name: ACTION_NAME })
}

async function openAction(user, name) {
  await waitFor(() => expect(screen.getByRole('button', { name })).toBeEnabled())
  await user.click(screen.getByRole('button', { name }))

  return screen.findByRole('dialog')
}

describe('Detalhe do membro', () => {
  beforeEach(() => {
    getAdminUser.mockResolvedValue(maria)
    useAuthStore.setState({ user: { id: 'admin-1', email: 'admin@aspec.pt', role: { name: 'Admin' }, account_status: { name: 'Active' } }, status: 'authenticated' })
  })
  afterEach(() => {
    vi.clearAllMocks()
    useAuthStore.getState().clearSession()
  })

  it('mostra o carregamento e depois o cabeçalho e o cartão Conta', async () => {
    const pending = deferred()
    getAdminUser.mockImplementationOnce(() => pending.promise)
    show()

    expect(screen.getByRole('status')).toHaveTextContent('A carregar membro...')

    await act(async () => { pending.resolve(maria) })

    expect(await screen.findByRole('heading', { level: 2, name: 'Maria Santos' })).toBeInTheDocument()
    expect(screen.getByText('Santos Contabilidade')).toBeInTheDocument()
    const conta = region('Conta')
    for (const text of ['maria@santos.pt', '912345678', 'Membro', 'Pendente', '14/10/2026']) {
      expect(conta.getByText(text)).toBeInTheDocument()
    }
    const contaCard = screen.getByRole('region', { name: 'Conta' })
    expect(screen.getAllByText('Pendente').some((badge) => !contaCard.contains(badge))).toBe(true)
    expect(getAdminUser).toHaveBeenCalledWith('u3', expect.any(AbortSignal))
  })

  it('mostra o cartão Perfil com o website como ligação externa segura', async () => {
    show()

    await screen.findByRole('heading', { level: 2, name: 'Maria Santos' })
    const perfil = region('Perfil')
    for (const text of ['Consultoria', 'Lisboa', 'Igreja Central', 'Diaconisa', 'Rua Direita 1, Lisboa', 'geral@santos.pt', 'Contabilidade para pequenas empresas.']) {
      expect(perfil.getByText(text)).toBeInTheDocument()
    }
    const website = perfil.getByRole('link', { name: 'https://santos.pt' })
    expect(website.getAttribute('href')).toMatch(/^https:\/\/santos\.pt\/?$/)
    expect(website).toHaveAttribute('target', '_blank')
    expect(website).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('mostra o horário da semana com Encerrado nos dias sem horas', async () => {
    show()

    await screen.findByRole('heading', { level: 2, name: 'Maria Santos' })
    const horario = region('Horário')
    expect(field(horario, 'Segunda-feira')).toHaveTextContent('09:00 – 18:00')
    expect(field(horario, 'Domingo')).toHaveTextContent('Encerrado')
  })

  it('não cria ligações para URLs que não são http ou https', async () => {
    getAdminUser.mockResolvedValue(withProfile({
      website_url: 'javascript:alert(1)',
      social_links: [
        { platform_id: 'p1', platform: 'LinkedIn', url: 'https://www.linkedin.com/company/santos' },
        { platform_id: 'p2', platform: 'Instagram', url: 'javascript:alert(2)' },
      ],
    }))
    show()

    await screen.findByRole('heading', { level: 2, name: 'Maria Santos' })
    const linkedin = screen.getByRole('link', { name: 'https://www.linkedin.com/company/santos' })
    expect(linkedin).toHaveAttribute('href', 'https://www.linkedin.com/company/santos')
    expect(linkedin).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByText('javascript:alert(1)')).toBeInTheDocument()
    expect(screen.getByText('javascript:alert(2)')).toBeInTheDocument()
    expect(screen.getAllByRole('link').filter((link) => (link.getAttribute('href') ?? '').trim().toLowerCase().startsWith('javascript:'))).toHaveLength(0)
  })

  it('mostra o logótipo e as imagens do portefólio e, sem logótipo, a inicial', async () => {
    const { unmount } = show()

    expect(await screen.findByRole('img', { name: 'Logótipo de Maria Santos' })).toHaveAttribute('src', 'http://localhost:8000/storage/logos/u3/logo.png')
    expect(screen.getByRole('img', { name: 'Imagem 1 do portefólio de Maria Santos' })).toHaveAttribute('src', 'http://localhost:8000/storage/portfolios/u3/1.jpg')
    expect(screen.getByRole('img', { name: 'Imagem 2 do portefólio de Maria Santos' })).toHaveAttribute('src', 'http://localhost:8000/storage/portfolios/u3/2.jpg')
    unmount()

    getAdminUser.mockResolvedValue(withProfile({ logo_url: null }))
    show()

    await screen.findByRole('heading', { level: 2, name: 'Maria Santos' })
    expect(screen.queryByRole('img', { name: 'Logótipo de Maria Santos' })).not.toBeInTheDocument()
    expect(screen.getByText('M')).toBeInTheDocument()
  })

  it('um admin sem perfil mostra só a conta e nenhuma ação', async () => {
    getAdminUser.mockResolvedValue(otherAdmin)
    show()

    expect(await screen.findByRole('heading', { level: 2, name: 'outro@aspec.pt' })).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.getByText('Este utilizador não tem perfil de membro.')).toBeInTheDocument()
    for (const name of ['Horário', 'Portefólio', 'Redes sociais']) {
      expect(screen.queryByRole('region', { name })).not.toBeInTheDocument()
    }
    const conta = region('Conta')
    expect(conta.getByText('Administrador')).toBeInTheDocument()
    expect(field(conta, 'Telefone')).toHaveTextContent('Não indicado')
    expect(actionButtons()).toHaveLength(0)
  })

  it('num 404 mostra Utilizador não encontrado sem Tentar novamente', async () => {
    getAdminUser.mockRejectedValue(apiError(404, 'Recurso não encontrado.'))
    show()

    expect(await screen.findByRole('heading', { name: 'Utilizador não encontrado.' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar à lista de utilizadores' })).toBeInTheDocument()
  })

  it('num erro do servidor mostra a mensagem e recupera com Tentar novamente', async () => {
    const message = 'Ocorreu um erro interno. Tente novamente mais tarde.'
    getAdminUser.mockRejectedValueOnce(apiError(500, message)).mockResolvedValueOnce(maria)
    const user = userEvent.setup()
    show()

    expect(await screen.findByRole('alert')).toHaveTextContent(message)

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByRole('heading', { level: 2, name: 'Maria Santos' })).toBeInTheDocument()
    expect(getAdminUser).toHaveBeenCalledTimes(2)
  })

  it('Voltar à lista de utilizadores leva à lista', async () => {
    const user = userEvent.setup()
    show()

    await user.click(await screen.findByRole('link', { name: 'Voltar à lista de utilizadores' }))

    expect(await screen.findByText('Lista de utilizadores')).toBeInTheDocument()
  })

  it('aprova um pendente no detalhe e mostra o estado novo depois de recarregar', async () => {
    const message = 'Utilizador aprovado. Foi enviado o email de ativação.'
    getAdminUser.mockResolvedValueOnce(maria).mockResolvedValueOnce({ ...maria, account_status: { name: 'Approved' } })
    approveUser.mockResolvedValue({ message })
    const user = userEvent.setup()
    show()

    await screen.findByRole('heading', { level: 2, name: 'Maria Santos' })
    expect(screen.getByRole('button', { name: 'Recusar Maria Santos' })).toBeInTheDocument()

    await openAction(user, 'Aprovar Maria Santos')
    expect(screen.getByRole('dialog', { name: 'Aprovar candidatura' })).toBeInTheDocument()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Aprovar' }))

    expect(approveUser).toHaveBeenCalledTimes(1)
    expect(approveUser).toHaveBeenCalledWith('u3')
    expect((await screen.findByText(message)).closest('[role="status"]')).not.toBeNull()
    await waitFor(() => expect(getAdminUser).toHaveBeenCalledTimes(2))
    expect(await screen.findByRole('button', { name: 'Bloquear Maria Santos' })).toBeInTheDocument()
    expect(screen.getAllByText('Aprovado').length).toBeGreaterThan(0)
  })

  it('num 409 recarrega o detalhe e num 403 mostra o erro sem recarregar', async () => {
    getAdminUser.mockResolvedValue({ ...maria, account_status: { name: 'Active' } })
    blockUser
      .mockRejectedValueOnce(apiError(409, 'O utilizador já está bloqueado.'))
      .mockRejectedValueOnce(apiError(403, 'Não tem permissão para realizar esta ação.'))
    const user = userEvent.setup()
    show()
    await screen.findByRole('heading', { level: 2, name: 'Maria Santos' })
    let callsBefore = getAdminUser.mock.calls.length

    await openAction(user, 'Bloquear Maria Santos')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Bloquear' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('O utilizador já está bloqueado.')
    await waitFor(() => expect(getAdminUser).toHaveBeenCalledTimes(callsBefore + 1))

    await user.click(screen.getByRole('button', { name: 'Fechar mensagem' }))
    callsBefore = getAdminUser.mock.calls.length

    await openAction(user, 'Bloquear Maria Santos')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Bloquear' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Não tem permissão para realizar esta ação.')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(getAdminUser).toHaveBeenCalledTimes(callsBefore)
  })

  it('não mostra ações na própria conta nem noutro admin', async () => {
    getAdminUser.mockResolvedValue({ ...maria, id: 'admin-1', account_status: { name: 'Active' } })
    const { unmount } = show()

    await screen.findByRole('heading', { level: 2, name: 'Maria Santos' })
    expect(actionButtons()).toHaveLength(0)
    unmount()

    getAdminUser.mockResolvedValue({ ...maria, id: 'admin-3', role: { name: 'Admin' }, account_status: { name: 'Active' } })
    show()

    await screen.findByRole('heading', { level: 2, name: 'Maria Santos' })
    expect(actionButtons()).toHaveLength(0)
  })

  it('mostra Não indicado e as mensagens de secção vazia', async () => {
    getAdminUser.mockResolvedValue(withProfile({
      website_url: null,
      commercial_contacts: null,
      congregation: null,
      business_hours: [],
      social_links: [],
      portfolio: [],
    }))
    show()

    await screen.findByRole('heading', { level: 2, name: 'Maria Santos' })
    const perfil = region('Perfil')
    for (const label of ['Website', 'Contactos comerciais', 'Congregação']) {
      expect(field(perfil, label)).toHaveTextContent('Não indicado')
    }
    expect(region('Horário').getByText('Sem horário definido.')).toBeInTheDocument()
    expect(region('Redes sociais').getByText('Sem redes sociais.')).toBeInTheDocument()
    expect(region('Portefólio').getByText('Sem imagens no portefólio.')).toBeInTheDocument()
  })

  it('cancela o pedido ao sair da página e ignora a resposta que chega depois', async () => {
    const pending = deferred()
    getAdminUser.mockImplementationOnce(() => pending.promise)
    const { unmount } = show()

    unmount()

    expect(getAdminUser.mock.calls[0][1].aborted).toBe(true)
    await act(async () => { pending.resolve(maria) })
  })
})
