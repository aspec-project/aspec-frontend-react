import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AdminUserDetailPage from '../../../src/pages/admin/AdminUserDetailPage'
import AdminUsersPage from '../../../src/pages/admin/AdminUsersPage'
import {
  anonymizeUser,
  approveUser,
  blockUser,
  demoteUser,
  getAdminUser,
  getAdminUsers,
  promoteUser,
  sendPaymentLink,
} from '../../../src/services/adminUsers'
import { useAuthStore } from '../../../src/store/authStore'

vi.mock('../../../src/services/adminUsers', () => ({
  getAdminUser: vi.fn(),
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

const maria = {
  id: 'u3',
  email: 'maria@santos.pt',
  phone: '+351912345678',
  created_at: '2026-10-14T09:30:00+00:00',
  role: { name: 'Member' },
  account_status: { name: 'Active' },
  inactive_reason: null,
  subscription_state: { value: 'active', label: 'Ativo' },
  review_counts: {
    received: { total: 13, hidden: 3, flagged: 1 },
    given: { total: 8, hidden: 3, flagged: 2 },
  },
  member_profile: {
    name: 'Maria Santos',
    business_name: 'Santos Contabilidade',
    commercial_email: 'geral@santos.pt',
    commercial_phone: '+351213456780',
    email: 'maria@santos.pt',
    phone: '+351912345678',
    website_url: 'https://santos.pt',
    congregation: 'Igreja Central',
    role_in_congregation: 'Diaconisa',
    description: 'Contabilidade para pequenas empresas.',
    address: 'Rua Direita 1, Lisboa',
    sector: { name: 'Consultoria' },
    location: { name: 'Lisboa' },
    logo_url: 'http://localhost:8000/storage/logos/u3/logo.png',
    business_hours: [1, 2, 3, 4, 5].map((day) => ({ week_day_id: day, week_day: 'Dia', open_time: '09:00', close_time: '18:00' })),
    social_links: [
      { platform_id: 'p1', platform: 'LinkedIn', url: 'https://www.linkedin.com/company/santos' },
      { platform_id: 'p2', platform: 'Instagram', url: 'https://www.instagram.com/santos' },
    ],
    portfolio: [
      { id: 'i1', image_url: 'http://localhost:8000/storage/portfolios/u3/1.jpg' },
      { id: 'i2', image_url: 'http://localhost:8000/storage/portfolios/u3/2.jpg' },
    ],
  },
}

const helena = {
  id: 'admin-2',
  email: 'helena@brandao.pt',
  phone: '+351934567890',
  created_at: '2025-03-02T10:00:00+00:00',
  role: { name: 'Admin' },
  account_status: { name: 'Active' },
  inactive_reason: null,
  subscription_state: { value: 'active', label: 'Ativo' },
  admins_count: 2,
  member_profile: { ...maria.member_profile, name: 'Helena Brandão', business_name: 'Brandão Arquitetura' },
}

const ACTION_NAME = /^(Aprovar|Recusar|Bloquear|Desbloquear|Promover a administrador|Despromover) /

const DEMOTE_DESCRIPTION = 'Helena Brandão deixa de ter acesso ao backoffice, à gestão de utilizadores, eventos e moderação. Continua a ser membro e só então pode ser gerido(a) como tal. Esta é uma decisão importante: só outro administrador a poderá reverter, promovendo-o(a) de novo.'

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

function loaded(name = 'Maria Santos') {
  return screen.findByRole('heading', { level: 1, name })
}

function region(name) {
  return within(screen.getByRole('region', { name }))
}

function field(scope, label) {
  const term = scope.getAllByText(label).find((element) => !element.closest('h1, h2, h3'))

  return term.closest('div')
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

  it('mostra o carregamento e depois a banda com o nome, o estado, o negócio e a data de registo', async () => {
    const pending = deferred()
    getAdminUser.mockImplementationOnce(() => pending.promise)
    show()

    expect(screen.getByRole('status')).toHaveTextContent('A carregar membro...')
    expect(screen.getByRole('heading', { level: 1, name: 'Detalhe do membro' })).toBeInTheDocument()

    await act(async () => { pending.resolve(maria) })

    expect(await loaded()).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const contaCard = screen.getByRole('region', { name: 'Conta' })
    expect(screen.getAllByText('Ativo').some((badge) => !contaCard.contains(badge))).toBe(true)
    expect(screen.getByText('Santos Contabilidade')).toBeInTheDocument()
    expect(screen.getByText('Consultoria')).toBeInTheDocument()
    expect(screen.getAllByText('Lisboa').some((item) => !contaCard.contains(item))).toBe(true)
    expect(screen.getByText('Registo: Out 2026')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar aos utilizadores' })).toHaveAttribute('href', '/admin/utilizadores')
    expect(getAdminUser).toHaveBeenCalledWith('u3', expect.any(AbortSignal))
  })

  it('mostra no cartão Conta os contactos pessoais, o perfil, o núcleo, a subscrição e a data de membro', async () => {
    show()

    await loaded()
    const conta = region('Conta')
    const expected = [
      ['Responsável', 'Maria Santos'],
      ['Email pessoal', 'maria@santos.pt'],
      ['Telefone pessoal', '+351912345678'],
      ['Perfil', 'Membro'],
      ['Núcleo', 'Lisboa'],
      ['Subscrição', 'Ativo'],
      ['Membro desde', '14/10/2026'],
    ]

    for (const [label, value] of expected) {
      expect(field(conta, label)).toHaveTextContent(value)
    }
  })

  it('mostra em Contactos e redes só os contactos comerciais, o website e as redes sociais', async () => {
    show()

    await loaded()
    const contactos = region('Contactos e redes')
    expect(field(contactos, 'Email profissional')).toHaveTextContent('geral@santos.pt')
    expect(field(contactos, 'Telefone da empresa')).toHaveTextContent('+351213456780')

    const website = contactos.getByRole('link', { name: 'https://santos.pt' })
    expect(website.getAttribute('href')).toMatch(/^https:\/\/santos\.pt\/?$/)
    expect(website).toHaveAttribute('target', '_blank')
    expect(website).toHaveAttribute('rel', 'noopener noreferrer')

    expect(within(field(contactos, 'LinkedIn')).getByRole('link')).toHaveAttribute('href', 'https://www.linkedin.com/company/santos')
    expect(within(field(contactos, 'Instagram')).getByRole('link')).toHaveAttribute('href', 'https://www.instagram.com/santos')

    const card = screen.getByRole('region', { name: 'Contactos e redes' })
    expect(card).not.toHaveTextContent('maria@santos.pt')
    expect(card).not.toHaveTextContent('+351912345678')
    expect(screen.queryByText('Contactos comerciais')).not.toBeInTheDocument()
  })

  it('sem contactos comerciais mostra Não indicado e nunca cai para os contactos pessoais', async () => {
    getAdminUser.mockResolvedValue(withProfile({ commercial_email: null, commercial_phone: null, website_url: null, social_links: [] }))
    show()

    await loaded()
    const contactos = region('Contactos e redes')
    for (const label of ['Email profissional', 'Telefone da empresa', 'Website']) {
      expect(field(contactos, label)).toHaveTextContent('Não indicado')
    }
    expect(contactos.getByText('Sem redes sociais.')).toBeInTheDocument()

    const card = screen.getByRole('region', { name: 'Contactos e redes' })
    expect(card).not.toHaveTextContent('maria@santos.pt')
    expect(card).not.toHaveTextContent('+351912345678')
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

    await loaded()
    const contactos = region('Contactos e redes')
    const linkedin = contactos.getByRole('link', { name: 'https://www.linkedin.com/company/santos' })
    expect(linkedin).toHaveAttribute('href', 'https://www.linkedin.com/company/santos')
    expect(linkedin).toHaveAttribute('rel', 'noopener noreferrer')
    expect(contactos.getByText('javascript:alert(1)')).toBeInTheDocument()
    expect(contactos.getByText('javascript:alert(2)')).toBeInTheDocument()
    expect(screen.getAllByRole('link').filter((link) => (link.getAttribute('href') ?? '').trim().toLowerCase().startsWith('javascript:'))).toHaveLength(0)
  })

  it('mostra as contagens de avaliações recebidas e feitas', async () => {
    show()

    await loaded()
    const avaliacoes = region('Avaliações')
    const groups = [
      ['No perfil do membro', ['13', '3', '1']],
      ['Feitas a outros membros', ['8', '3', '2']],
    ]

    for (const [name, [total, hidden, flagged]] of groups) {
      const group = within(avaliacoes.getByRole('group', { name }))
      expect(field(group, 'Total')).toHaveTextContent(total)
      expect(field(group, 'Ocultas')).toHaveTextContent(hidden)
      expect(field(group, 'Sinalizadas')).toHaveTextContent(flagged)
    }
  })

  it('sem contagens de avaliações válidas avisa que ainda não estão disponíveis', async () => {
    const { review_counts: _omitted, ...withoutCounts } = maria

    for (const response of [withoutCounts, { ...maria, review_counts: { received: { total: 1 } } }]) {
      getAdminUser.mockResolvedValue(response)
      const { unmount } = show()

      await loaded()
      const card = screen.getByRole('region', { name: 'Avaliações' })
      expect(within(card).getByText('As contagens de avaliações ainda não estão disponíveis.')).toBeInTheDocument()
      expect(card.textContent).not.toMatch(/\d/)
      unmount()
    }
  })

  it('agrupa o horário de atendimento e mostra Sem horário definido quando não há horas', async () => {
    const { unmount } = show()

    await loaded()
    const horario = region('Horário de atendimento')
    expect(field(horario, 'Segunda — Sexta')).toHaveTextContent('09:00 — 18:00')
    expect(field(horario, 'Sábado — Domingo')).toHaveTextContent('Encerrado')
    expect(horario.getByText('Encerrado')).toHaveClass('text-red-600')
    unmount()

    getAdminUser.mockResolvedValue(withProfile({ business_hours: [] }))
    show()

    await loaded()
    expect(region('Horário de atendimento').getByText('Sem horário definido.')).toBeInTheDocument()
  })

  it('mostra a congregação, o cargo e a descrição do negócio, ou os textos de vazio', async () => {
    const { unmount } = show()

    await loaded()
    const congregacao = region('Congregação')
    expect(field(congregacao, 'Congregação')).toHaveTextContent('Igreja Central')
    expect(field(congregacao, 'Cargo')).toHaveTextContent('Diaconisa')
    expect(region('Sobre o negócio').getByText('Contabilidade para pequenas empresas.')).toBeInTheDocument()
    unmount()

    getAdminUser.mockResolvedValue(withProfile({ congregation: null, role_in_congregation: null, description: null }))
    show()

    await loaded()
    expect(field(region('Congregação'), 'Congregação')).toHaveTextContent('Não indicado')
    expect(field(region('Congregação'), 'Cargo')).toHaveTextContent('Não indicado')
    expect(region('Sobre o negócio').getByText('Sem descrição.')).toBeInTheDocument()
  })

  it('mostra o logótipo e o portefólio em Imagens e, sem logótipo, a inicial do negócio', async () => {
    const { unmount } = show()

    await loaded()
    const imagens = region('Imagens (3)')
    expect(imagens.getAllByRole('img').map((img) => img.getAttribute('alt'))).toEqual([
      'Logótipo de Maria Santos',
      'Imagem 1 do portefólio de Maria Santos',
      'Imagem 2 do portefólio de Maria Santos',
    ])
    expect(imagens.getByRole('img', { name: 'Logótipo de Maria Santos' })).toHaveAttribute('src', 'http://localhost:8000/storage/logos/u3/logo.png')
    expect(imagens.getByRole('img', { name: 'Imagem 2 do portefólio de Maria Santos' })).toHaveAttribute('src', 'http://localhost:8000/storage/portfolios/u3/2.jpg')
    expect(imagens.getByText('A primeira imagem é o logótipo.')).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: 'Logótipo de Maria Santos' })).toHaveLength(1)
    unmount()

    getAdminUser.mockResolvedValue(withProfile({ logo_url: null }))
    const second = show()

    await loaded()
    expect(region('Imagens (2)').getAllByRole('img')).toHaveLength(2)
    expect(screen.queryByText('A primeira imagem é o logótipo.')).not.toBeInTheDocument()
    expect(screen.getByText('S')).toBeInTheDocument()
    second.unmount()

    getAdminUser.mockResolvedValue(withProfile({ logo_url: null, portfolio: [] }))
    show()

    await loaded()
    expect(region('Imagens (0)').getByText('Sem imagens.')).toBeInTheDocument()
  })

  it('um admin sem perfil mostra só a conta, o badge Admin e a ação de despromover', async () => {
    getAdminUser.mockResolvedValue({ ...helena, phone: null, member_profile: null })
    show()

    expect(await loaded('helena@brandao.pt')).toBeInTheDocument()
    expect(screen.getAllByText('Admin').length).toBeGreaterThan(0)
    const conta = region('Conta')
    for (const label of ['Responsável', 'Telefone pessoal', 'Núcleo']) {
      expect(field(conta, label)).toHaveTextContent('Não indicado')
    }
    expect(field(conta, 'Perfil')).toHaveTextContent('Administrador')
    expect(screen.getByText('Este utilizador não tem perfil de membro.')).toBeInTheDocument()
    for (const name of ['Contactos e redes', 'Avaliações', 'Congregação', 'Sobre o negócio', 'Horário de atendimento', /^Imagens/]) {
      expect(screen.queryByRole('region', { name })).not.toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'Despromover helena@brandao.pt' })).toBeEnabled()
  })

  it('o admin técnico mostra o badge Isento e nenhuma ação', async () => {
    getAdminUser.mockResolvedValue({ ...helena, subscription_state: { value: 'exempt', label: 'Isento' } })
    show()

    await loaded('Helena Brandão')
    expect(screen.getAllByText('Isento').length).toBeGreaterThan(0)
    expect(actionButtons()).toHaveLength(0)
  })

  it('num 404 mostra Utilizador não encontrado sem Tentar novamente', async () => {
    getAdminUser.mockRejectedValue(apiError(404, 'Recurso não encontrado.'))
    show()

    expect(await screen.findByRole('heading', { level: 1, name: 'Utilizador não encontrado.' })).toBeInTheDocument()
    expect(screen.getByText('O utilizador pedido não existe ou foi apagado.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar aos utilizadores' })).toBeInTheDocument()
  })

  it('num erro do servidor mostra a mensagem e recupera com Tentar novamente', async () => {
    const message = 'Ocorreu um erro interno. Tente novamente mais tarde.'
    getAdminUser.mockRejectedValueOnce(apiError(500, message)).mockResolvedValueOnce(maria)
    const user = userEvent.setup()
    show()

    expect(await screen.findByRole('alert')).toHaveTextContent(message)

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect((await screen.findAllByText('Maria Santos')).length).toBeGreaterThan(0)
    expect(getAdminUser).toHaveBeenCalledTimes(2)
  })

  it('Voltar aos utilizadores leva à lista', async () => {
    const user = userEvent.setup()
    show()

    await user.click(await screen.findByRole('link', { name: 'Voltar aos utilizadores' }))

    expect(await screen.findByText('Lista de utilizadores')).toBeInTheDocument()
  })

  it('promove um membro ativo sem contagem decrescente e mostra-o como admin depois de recarregar', async () => {
    const message = 'Utilizador promovido a administrador.'
    getAdminUser.mockResolvedValueOnce(maria).mockResolvedValueOnce({ ...maria, role: { name: 'Admin' }, admins_count: 3 })
    promoteUser.mockResolvedValue({ message })
    const user = userEvent.setup()
    show()

    await loaded()
    const dialog = await openAction(user, 'Promover a administrador Maria Santos')
    expect(screen.getByRole('dialog', { name: 'Promover a administrador' })).toHaveAccessibleDescription(
      'Maria Santos (maria@santos.pt) passa a ter acesso total ao backoffice: aprovar e bloquear membros, gerir eventos, moderar avaliações e promover ou despromover outros administradores.'
    )
    const confirm = within(dialog).getByRole('button', { name: 'Promover a administrador' })
    expect(confirm).toBeEnabled()
    await user.click(confirm)

    expect(promoteUser).toHaveBeenCalledTimes(1)
    expect(promoteUser).toHaveBeenCalledWith('u3')
    expect((await screen.findByText(message)).closest('[role="status"]')).not.toBeNull()
    await waitFor(() => expect(getAdminUser).toHaveBeenCalledTimes(2))
    expect(await screen.findByRole('button', { name: 'Despromover Maria Santos' })).toBeInTheDocument()
    expect(screen.getAllByText('Admin').length).toBeGreaterThan(0)
  })

  it('na própria conta não há ações de membro e o despromover aparece desativado', async () => {
    const user = userEvent.setup()
    getAdminUser.mockResolvedValue({ ...maria, id: 'admin-1' })
    const { unmount } = show()

    await loaded()
    expect(actionButtons()).toHaveLength(0)
    unmount()

    getAdminUser.mockResolvedValue({ ...maria, id: 'admin-1', role: { name: 'Admin' }, admins_count: 2 })
    show()

    await loaded()
    const locked = screen.getByRole('button', { name: 'Despromover Maria Santos (indisponível na própria conta)' })
    expect(locked).toBeDisabled()
    expect(actionButtons()).toEqual([locked])

    await user.click(locked)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('aprova um pendente no detalhe e mostra o estado da subscrição novo depois de recarregar', async () => {
    const message = 'Utilizador aprovado. Foi enviado o email de ativação.'
    const pendingMaria = { ...maria, account_status: { name: 'Pending' }, subscription_state: { value: 'pending', label: 'Pendente' } }
    getAdminUser
      .mockResolvedValueOnce(pendingMaria)
      .mockResolvedValueOnce({ ...maria, account_status: { name: 'Approved' }, subscription_state: { value: 'awaiting_activation', label: 'Por ativar' } })
    approveUser.mockResolvedValue({ message })
    const user = userEvent.setup()
    show()

    await loaded()
    expect(screen.getByRole('button', { name: 'Recusar Maria Santos' })).toBeInTheDocument()

    await openAction(user, 'Aprovar Maria Santos')
    expect(screen.getByRole('dialog', { name: 'Aprovar candidatura' })).toBeInTheDocument()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Aprovar' }))

    expect(approveUser).toHaveBeenCalledTimes(1)
    expect(approveUser).toHaveBeenCalledWith('u3')
    expect((await screen.findByText(message)).closest('[role="status"]')).not.toBeNull()
    await waitFor(() => expect(getAdminUser).toHaveBeenCalledTimes(2))
    expect(await screen.findByRole('button', { name: 'Bloquear Maria Santos' })).toBeInTheDocument()
    expect(screen.getAllByText('Por ativar').length).toBeGreaterThan(0)
  })

  it('num 409 recarrega o detalhe e num 403 mostra o erro sem recarregar', async () => {
    blockUser
      .mockRejectedValueOnce(apiError(409, 'O utilizador já está bloqueado.'))
      .mockRejectedValueOnce(apiError(403, 'Não tem permissão para realizar esta ação.'))
    const user = userEvent.setup()
    show()
    await screen.findByRole('button', { name: 'Bloquear Maria Santos' })
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

  it('cancela o pedido ao sair da página e ignora a resposta que chega depois', async () => {
    const pending = deferred()
    getAdminUser.mockImplementationOnce(() => pending.promise)
    const { unmount } = show()

    unmount()

    expect(getAdminUser.mock.calls[0][1].aborted).toBe(true)
    await act(async () => { pending.resolve(maria) })
  })
})

describe('Despromover administrador no detalhe', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    getAdminUser.mockResolvedValue(helena)
    useAuthStore.setState({ user: { id: 'admin-1', email: 'admin@aspec.pt', role: { name: 'Admin' }, account_status: { name: 'Active' } }, status: 'authenticated' })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    useAuthStore.getState().clearSession()
  })

  function setupUser() {
    return userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  }

  it('abre o diálogo com a descrição, a contagem de administradores e o botão em contagem decrescente', async () => {
    const user = setupUser()
    show()

    await loaded('Helena Brandão')
    const dialog = await openAction(user, 'Despromover Helena Brandão')

    expect(screen.getByRole('dialog', { name: 'Despromover administrador' })).toHaveAccessibleDescription(DEMOTE_DESCRIPTION)
    expect(within(dialog).getByRole('note')).toHaveTextContent('Existem 2 administradores. Depois desta ação ficam 1. A plataforma tem sempre de ter pelo menos um.')
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeEnabled()
    expect(within(dialog).getByRole('button', { name: 'Despromover (2s)' })).toBeDisabled()
  })

  it('só despromove depois da contagem decrescente e recarrega o detalhe', async () => {
    const message = 'Administrador despromovido a membro.'
    demoteUser.mockResolvedValue({ message })
    const user = setupUser()
    show()

    await loaded('Helena Brandão')
    const dialog = await openAction(user, 'Despromover Helena Brandão')
    await user.click(within(dialog).getByRole('button', { name: 'Despromover (2s)' }))
    expect(demoteUser).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(2000))
    const confirm = within(dialog).getByRole('button', { name: 'Despromover' })
    expect(confirm).toBeEnabled()
    await user.click(confirm)

    expect(demoteUser).toHaveBeenCalledTimes(1)
    expect(demoteUser).toHaveBeenCalledWith('admin-2')
    expect((await screen.findByText(message)).closest('[role="status"]')).not.toBeNull()
    await waitFor(() => expect(getAdminUser).toHaveBeenCalledTimes(2))
  })

  it('Cancelar durante a contagem fecha o diálogo sem pedido e devolve o foco ao botão', async () => {
    const user = setupUser()
    show()

    await loaded('Helena Brandão')
    const dialog = await openAction(user, 'Despromover Helena Brandão')
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(demoteUser).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Despromover Helena Brandão' })).toHaveFocus()
  })

  it.each([
    'Tem de existir pelo menos um administrador.',
    'O administrador técnico não pode ser despromovido.',
  ])('num 409 (%s) mostra o erro e recarrega o detalhe', async (message) => {
    demoteUser.mockRejectedValue(apiError(409, message))
    const user = setupUser()
    show()

    await loaded('Helena Brandão')
    const dialog = await openAction(user, 'Despromover Helena Brandão')
    act(() => vi.advanceTimersByTime(2000))
    await user.click(within(dialog).getByRole('button', { name: 'Despromover' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    await waitFor(() => expect(getAdminUser).toHaveBeenCalledTimes(2))
  })

  it('sem a contagem de administradores a nota lembra só a regra', async () => {
    const { admins_count: _omitted, ...withoutCount } = helena
    getAdminUser.mockResolvedValue(withoutCount)
    const user = setupUser()
    show()

    await loaded('Helena Brandão')
    const dialog = await openAction(user, 'Despromover Helena Brandão')

    expect(within(dialog).getByRole('note')).toHaveTextContent('A plataforma tem sempre de ter pelo menos um administrador.')
  })
})

describe('Zona de risco e envio do email de pagamento no detalhe', () => {
  const sara = {
    ...maria,
    id: 'u9',
    email: 'sara@floresdovale.pt',
    account_status: { name: 'Inactive' },
    inactive_reason: 'unpaid',
    subscription_state: { value: 'lapsed', label: 'Subscrição caída' },
    member_profile: { ...maria.member_profile, name: 'Sara Antunes', business_name: 'Flores do Vale' },
  }

  beforeEach(() => {
    getAdminUser.mockResolvedValue(maria)
    getAdminUsers.mockResolvedValue({
      items: [],
      pagination: { current_page: 1, per_page: 12, total: 0, last_page: 1 },
      counts: { all: 0, active: 0, pending: 0, approved: 0, blocked: 0, inactive: 0 },
      admins_count: 1,
    })
    useAuthStore.setState({ user: { id: 'admin-1', email: 'admin@aspec.pt', role: { name: 'Admin' }, account_status: { name: 'Active' } }, status: 'authenticated' })
  })
  afterEach(() => {
    vi.clearAllMocks()
    useAuthStore.getState().clearSession()
  })

  function showWithList() {
    return render(
      <MemoryRouter initialEntries={['/admin/utilizadores/u3']}>
        <Routes>
          <Route path="/admin/utilizadores/:id" element={<AdminUserDetailPage />} />
          <Route path="/admin/utilizadores" element={<AdminUsersPage />} />
        </Routes>
      </MemoryRouter>
    )
  }

  function riskButton() {
    return within(screen.getByRole('region', { name: 'Zona de risco · RGPD' })).getByRole('button', { name: 'Anonimizar membro' })
  }

  async function anonymize(user) {
    await waitFor(() => expect(riskButton()).toBeEnabled())
    await user.click(riskButton())
    const dialog = await screen.findByRole('dialog', { name: 'Anonimizar membro' })
    await user.type(within(dialog).getByRole('textbox', { name: 'Para confirmar, escreva ANONIMIZAR' }), 'ANONIMIZAR')
    await user.click(within(dialog).getByRole('button', { name: 'Anonimizar' }))

    return dialog
  }

  it('mostra a zona de risco com Anonimizar membro ativo num membro e desativado num admin', async () => {
    const { unmount } = show()

    await loaded()
    await waitFor(() => expect(riskButton()).toBeEnabled())
    unmount()

    getAdminUser.mockResolvedValue(helena)
    show()

    await loaded('Helena Brandão')
    expect(riskButton()).toBeDisabled()
  })

  it('anonimiza o membro depois de escrever ANONIMIZAR e volta à lista com a mensagem da API', async () => {
    const message = 'Membro anonimizado com sucesso.'
    anonymizeUser.mockResolvedValue({ message, data: { id: 'u3', anonymized_at: '2026-10-22T10:15:00+00:00' } })
    const user = userEvent.setup()
    showWithList()

    await loaded()
    await anonymize(user)

    expect(anonymizeUser).toHaveBeenCalledTimes(1)
    expect(anonymizeUser).toHaveBeenCalledWith('u3')
    expect(await screen.findByRole('group', { name: 'Filtrar por estado' })).toBeInTheDocument()
    expect((await screen.findByText(message)).closest('[role="status"]')).not.toBeNull()
    expect(screen.queryByRole('heading', { level: 1, name: 'Maria Santos' })).not.toBeInTheDocument()
    expect(getAdminUser).toHaveBeenCalledTimes(1)
  })

  it('num 409 ao anonimizar fica no detalhe, mostra o erro e recarrega', async () => {
    const message = 'Não é possível anonimizar um administrador.'
    anonymizeUser.mockRejectedValue(apiError(409, message))
    const user = userEvent.setup()
    show()

    await loaded()
    await anonymize(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Maria Santos' })).toBeInTheDocument()
    await waitFor(() => expect(getAdminUser).toHaveBeenCalledTimes(2))
  })

  it('num 429 ao anonimizar mostra o erro sem recarregar', async () => {
    const message = 'Demasiados pedidos. Tente novamente mais tarde.'
    anonymizeUser.mockRejectedValue(apiError(429, message))
    const user = userEvent.setup()
    show()

    await loaded()
    await anonymize(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(getAdminUser).toHaveBeenCalledTimes(1)
  })

  it('envia o email de reativação a um membro com a subscrição caída e recarrega o detalhe', async () => {
    const message = 'Foi enviado o email de reativação.'
    getAdminUser.mockResolvedValue(sara)
    sendPaymentLink.mockResolvedValue({ message, data: { id: 'u9', type: 'reactivation' } })
    const user = userEvent.setup()
    show()

    await loaded('Sara Antunes')
    const send = screen.getByRole('button', { name: 'Enviar email Sara Antunes' })
    const block = screen.getByRole('button', { name: 'Bloquear Sara Antunes' })
    expect(send.compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    const dialog = await openAction(user, 'Enviar email Sara Antunes')
    expect(screen.getByRole('dialog', { name: 'Enviar email de reativação' })).toBe(dialog)
    expect(dialog).toHaveAccessibleDescription('Será enviado para sara@floresdovale.pt um email com uma ligação para Sara Antunes atualizar o método de pagamento e reativar a subscrição.')
    await user.click(within(dialog).getByRole('button', { name: 'Enviar email' }))

    expect(sendPaymentLink).toHaveBeenCalledTimes(1)
    expect(sendPaymentLink).toHaveBeenCalledWith('u9')
    expect((await screen.findByText(message)).closest('[role="status"]')).not.toBeNull()
    await waitFor(() => expect(getAdminUser).toHaveBeenCalledTimes(2))
  })

  it('explica o reenvio da ativação a quem está por ativar e o lembrete a quem está em carência', async () => {
    const user = userEvent.setup()
    getAdminUser.mockResolvedValue({ ...maria, account_status: { name: 'Approved' }, subscription_state: { value: 'awaiting_activation', label: 'Por ativar' } })
    const { unmount } = show()

    await loaded()
    await openAction(user, 'Enviar email Maria Santos')
    expect(screen.getByRole('dialog', { name: 'Reenviar email de ativação' })).toBeInTheDocument()
    unmount()

    getAdminUser.mockResolvedValue({ ...maria, subscription_state: { value: 'grace', label: 'Em carência' } })
    show()

    await loaded()
    await openAction(user, 'Enviar email Maria Santos')
    expect(screen.getByRole('dialog', { name: 'Enviar lembrete de pagamento' })).toBeInTheDocument()
  })

  it.each(['active', 'trial'])('um membro com a subscrição %s não tem Enviar email', async (value) => {
    getAdminUser.mockResolvedValue({ ...maria, subscription_state: { value, label: 'X' } })
    show()

    await loaded()
    expect(screen.getByRole('button', { name: 'Bloquear Maria Santos' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Enviar email/ })).not.toBeInTheDocument()
  })

  it('num 409 ao enviar o email mostra o erro e recarrega o detalhe', async () => {
    const message = 'A conta já está ativa.'
    getAdminUser.mockResolvedValue(sara)
    sendPaymentLink.mockRejectedValue(apiError(409, message))
    const user = userEvent.setup()
    show()

    await loaded('Sara Antunes')
    const dialog = await openAction(user, 'Enviar email Sara Antunes')
    await user.click(within(dialog).getByRole('button', { name: 'Enviar email' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    await waitFor(() => expect(getAdminUser).toHaveBeenCalledTimes(2))
  })

  it('durante a anonimização desativa a zona de risco e as ações do cabeçalho', async () => {
    const pending = deferred()
    anonymizeUser.mockImplementation(() => pending.promise)
    const user = userEvent.setup()
    show()

    await loaded()
    const dialog = await anonymize(user)

    expect(within(dialog).getByRole('button', { name: 'A processar...' })).toBeDisabled()
    expect(riskButton()).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Bloquear Maria Santos' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Promover a administrador Maria Santos' })).toBeDisabled()

    await act(async () => { pending.resolve({ message: 'Membro anonimizado com sucesso.', data: { id: 'u3' } }) })
  })
})
