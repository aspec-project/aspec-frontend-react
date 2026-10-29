import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, CanceledError } from 'axios'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AdminDashboardPage from '../../../src/pages/admin/AdminDashboardPage'
import { getAdminDashboard } from '../../../src/services/adminDashboard'
import { approveUser, rejectUser } from '../../../src/services/adminUsers'

vi.mock('../../../src/services/adminDashboard', () => ({
  getAdminDashboard: vi.fn(),
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

const TOO_MANY = 'Demasiados pedidos. Tente novamente mais tarde.'

const stats = {
  active_members: { total: 320, new_this_month: 12 },
  pending_applications: { total: 3 },
  events: { this_month: 8, this_week: 2 },
  reviews: { flagged: 2, new_this_week: 5 },
}

const zeroStats = {
  active_members: { total: 0, new_this_month: 0 },
  pending_applications: { total: 0 },
  events: { this_month: 0, this_week: 0 },
  reviews: { flagged: 0, new_this_week: 0 },
}

function application(id, name, business, sector, email, createdAt) {
  return {
    id,
    email,
    created_at: createdAt,
    role: { id: 'role-member', name: 'Member' },
    account_status: { id: 'status-pending', name: 'Pending' },
    subscription_state: { value: 'pending', label: 'Pendente' },
    inactive_reason: null,
    member_profile: {
      name,
      business_name: business,
      sector: sector ? { id: `sector-${id}`, name: sector } : null,
      location: { id: `location-${id}`, name: 'Lisboa' },
    },
  }
}

const applications = [
  application('u1', 'Filipa Rodrigues', 'Design Studio FiR', 'Design', 'filipa.rodrigues@example.pt', '2026-10-29T10:32:00+00:00'),
  application('u2', 'Tiago Mendes', 'Consultoria TM', 'Consultoria', 'tiago.mendes@example.pt', '2026-10-28T14:15:00+00:00'),
  application('u3', 'Carla Nunes', 'Clínica Bem Viver', 'Saúde', 'carla.nunes@example.pt', '2026-10-28T09:40:00+00:00'),
]

function review(id, rating, status, reviewed, reviewer) {
  return {
    id,
    rating,
    status,
    reviewed: reviewed === null ? null : { business_name: reviewed },
    reviewer: reviewer === null ? null : { business_name: reviewer },
  }
}

const reviews = [
  review('r1', 5, 'Visible', 'TechBless Solutions', 'Construções Silva & Filhos'),
  review('r2', 4, 'Hidden', 'Advocacia Fernandes', 'Clínica Saúde Plena'),
  review('r3', 1, 'Flagged', 'Padaria São João', 'Casa Moderna Decorações'),
]

function dashboard(data = {}) {
  return { stats, pending_applications: applications, recent_reviews: reviews, ...data }
}

function deferred() {
  let resolve
  const promise = new Promise((res) => { resolve = res })
  return { promise, resolve }
}

function apiError(status, data) {
  return new AxiosError(`Request failed with status code ${status}`, AxiosError.ERR_BAD_RESPONSE, undefined, undefined, {
    status,
    statusText: 'Error',
    headers: {},
    config: {},
    data,
  })
}

function UsersProbe() {
  const location = useLocation()

  return <p>Lista de utilizadores {location.search}</p>
}

function DetailProbe() {
  const location = useLocation()

  return <p>Detalhe {location.pathname}</p>
}

function show() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/utilizadores" element={<UsersProbe />} />
        <Route path="/admin/utilizadores/:id" element={<DetailProbe />} />
        <Route path="/admin/moderacao" element={<p>Página de moderação</p>} />
      </Routes>
    </MemoryRouter>
  )
}

function summaryItems() {
  return within(screen.getByRole('list', { name: 'Resumo' })).getAllByRole('listitem')
}

function region(name) {
  return screen.getByRole('region', { name })
}

function itemsOf(name) {
  return within(region(name)).getAllByRole('listitem')
}

async function waitForDashboard() {
  return screen.findByRole('list', { name: 'Resumo' })
}

describe('Painel do admin', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-29T10:40:00Z'))
    getAdminDashboard.mockResolvedValue(dashboard())
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('mostra o carregamento e faz um só pedido com um signal', () => {
    getAdminDashboard.mockImplementation(() => new Promise(() => {}))
    show()

    expect(screen.getByRole('status')).toHaveTextContent('A carregar o painel...')
    expect(getAdminDashboard).toHaveBeenCalledTimes(1)
    expect(getAdminDashboard.mock.calls[0][0]).toBeInstanceOf(AbortSignal)
  })

  it('mostra os quatro cartões de totais por ordem com rótulo, número e linha de baixo', async () => {
    show()
    await waitForDashboard()

    expect(screen.getByRole('heading', { level: 2, name: 'Resumo' })).toBeInTheDocument()

    const expected = [
      ['Membros Ativos', '320', '+12 este mês'],
      ['Candidaturas Pendentes', '3', 'Requerem ação'],
      ['Eventos este mês', '8', '2 esta semana'],
      ['Avaliações para moderar', '2', '5 novas esta semana'],
    ]
    const cards = summaryItems()
    expect(cards).toHaveLength(4)
    expected.forEach(([label, value, hint], index) => {
      const card = within(cards[index])
      expect(card.getByText(label)).toBeInTheDocument()
      expect(card.getByText(value)).toBeInTheDocument()
      expect(card.getByText(hint)).toBeInTheDocument()
    })
  })

  it('lista as candidaturas pendentes pela ordem da API com inicial, nome, negócio e setor e data relativa', async () => {
    show()
    await waitForDashboard()

    expect(screen.getByRole('heading', { level: 2, name: 'Candidaturas Pendentes' })).toBeInTheDocument()

    const expected = [
      ['F', 'Filipa Rodrigues', 'Design Studio FiR · Design', 'Hoje, 10:32'],
      ['T', 'Tiago Mendes', 'Consultoria TM · Consultoria', 'Ontem, 14:15'],
      ['C', 'Carla Nunes', 'Clínica Bem Viver · Saúde', 'Ontem, 09:40'],
    ]
    const rows = itemsOf('Candidaturas Pendentes')
    expect(rows).toHaveLength(3)
    expected.forEach(([initial, name, business, date], index) => {
      const row = within(rows[index])
      for (const text of [initial, name, business, date]) {
        expect(row.getByText(text)).toBeInTheDocument()
      }
    })

    const time = within(rows[0]).getByText('Hoje, 10:32').closest('time')
    expect(time).not.toBeNull()
    expect(time).toHaveAttribute('datetime', '2026-10-29T10:32:00+00:00')
  })

  it('sem setor não mostra o separador, sem perfil mostra Nome não indicado e nunca mostra emails', async () => {
    getAdminDashboard.mockResolvedValue(dashboard({
      pending_applications: [
        application('u4', 'Rui Lopes', 'Só Negócio', null, 'rui.lopes@example.pt', '2026-10-29T09:00:00+00:00'),
        { ...applications[1], id: 'u5', email: 'sem.perfil@example.pt', member_profile: null },
        applications[2],
      ],
    }))
    show()
    await waitForDashboard()

    const rows = itemsOf('Candidaturas Pendentes')
    expect(within(rows[0]).getByText('Só Negócio')).toBeInTheDocument()
    expect(rows[0]).not.toHaveTextContent('·')
    expect(within(rows[1]).getByText('Nome não indicado')).toBeInTheDocument()
    expect(within(rows[1]).getByText('?')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('@example.pt')
  })

  it('Ver todas abre a lista filtrada nas pendentes e Moderar abre a moderação', async () => {
    const user = userEvent.setup()
    show()
    await waitForDashboard()

    expect(screen.getByRole('link', { name: 'Ver todas as candidaturas pendentes' })).toHaveAttribute('href', '/admin/utilizadores?estado=pending')
    expect(screen.getByRole('link', { name: 'Moderar avaliações' })).toHaveAttribute('href', '/admin/moderacao')

    await user.click(screen.getByRole('link', { name: 'Moderar avaliações' }))

    expect(screen.getByText('Página de moderação')).toBeInTheDocument()
  })

  it('lista as avaliações recentes com o negócio, o autor, as estrelas e Sinalizado só nas sinalizadas', async () => {
    show()
    await waitForDashboard()

    expect(screen.getByRole('heading', { level: 2, name: 'Avaliações Recentes' })).toBeInTheDocument()

    const expected = [
      ['TechBless Solutions', 'por Construções Silva & Filhos', '5 de 5 estrelas', false],
      ['Advocacia Fernandes', 'por Clínica Saúde Plena', '4 de 5 estrelas', false],
      ['Padaria São João', 'por Casa Moderna Decorações', '1 de 5 estrelas', true],
    ]
    const rows = itemsOf('Avaliações Recentes')
    expect(rows).toHaveLength(3)
    expected.forEach(([reviewed, reviewer, stars, flagged], index) => {
      const row = within(rows[index])
      expect(row.getByText(reviewed)).toBeInTheDocument()
      expect(row.getByText(reviewer)).toBeInTheDocument()
      expect(row.getByRole('img', { name: stars })).toBeInTheDocument()
      if (flagged) {
        expect(row.getByText('Sinalizado')).toBeInTheDocument()
      } else {
        expect(row.queryByText('Sinalizado')).not.toBeInTheDocument()
      }
    })
  })

  it('uma avaliação de um negócio sem perfil mostra Empresa desconhecida', async () => {
    getAdminDashboard.mockResolvedValue(dashboard({
      recent_reviews: [review('r4', 3, 'Visible', null, 'Empresa Removida')],
    }))
    show()
    await waitForDashboard()

    const row = within(itemsOf('Avaliações Recentes')[0])
    expect(row.getByText('Empresa desconhecida')).toBeInTheDocument()
    expect(row.getByText('por Empresa Removida')).toBeInTheDocument()
  })

  it('sem dados mostra os zeros, as mensagens de lista vazia e mantém as ligações', async () => {
    getAdminDashboard.mockResolvedValue({ stats: zeroStats, pending_applications: [], recent_reviews: [] })
    show()
    await waitForDashboard()

    expect(within(region('Candidaturas Pendentes')).getByText('Não há candidaturas pendentes.')).toBeInTheDocument()
    expect(within(region('Avaliações Recentes')).getByText('Ainda não há avaliações.')).toBeInTheDocument()

    const cards = summaryItems()
    expect(cards.map((card) => within(card).getByText('0'))).toHaveLength(4)
    for (const hint of ['+0 este mês', 'Nenhuma por analisar', '0 esta semana', '0 novas esta semana']) {
      expect(screen.getByText(hint)).toBeInTheDocument()
    }
    expect(screen.getByRole('link', { name: 'Ver todas as candidaturas pendentes' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Moderar avaliações' })).toBeInTheDocument()
  })

  it('num 429 mostra a mensagem da API e recupera com Tentar novamente', async () => {
    getAdminDashboard.mockRejectedValueOnce(apiError(429, { success: false, message: TOO_MANY }))
    const user = userEvent.setup()
    show()

    expect(await screen.findByRole('alert')).toHaveTextContent(TOO_MANY)

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByRole('list', { name: 'Resumo' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(getAdminDashboard).toHaveBeenCalledTimes(2)
  })

  it('num 500 sem corpo mostra Erro do servidor (500).', async () => {
    getAdminDashboard.mockRejectedValue(apiError(500, undefined))
    show()

    expect(await screen.findByRole('alert')).toHaveTextContent('Erro do servidor (500).')
  })

  it('uma resposta com formato inesperado mostra uma frase própria e um pedido cancelado não mostra nada', async () => {
    const consoleError = vi.spyOn(console, 'error')
    getAdminDashboard.mockRejectedValueOnce(new Error('A resposta do painel tem um formato inesperado.'))
    const { unmount } = show()

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o painel.')
    unmount()

    getAdminDashboard.mockRejectedValueOnce(new CanceledError('canceled'))
    show()

    await act(async () => {})
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('A carregar o painel...')
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('ao desmontar cancela o pedido e ignora a resposta que chegar depois', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const pending = deferred()
    getAdminDashboard.mockImplementation(() => pending.promise)
    const { unmount } = show()
    const signal = getAdminDashboard.mock.calls[0][0]

    unmount()

    expect(signal.aborted).toBe(true)
    await act(async () => {
      pending.resolve(dashboard())
      await pending.promise
    })
    expect(screen.queryByRole('list', { name: 'Resumo' })).not.toBeInTheDocument()
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('o nome da candidatura liga ao detalhe do utilizador com o id codificado', async () => {
    getAdminDashboard.mockResolvedValue(dashboard({
      pending_applications: [{ ...applications[0], id: 'a b' }, applications[1], applications[2]],
    }))
    const user = userEvent.setup()
    show()
    await waitForDashboard()

    const link = screen.getByRole('link', { name: 'Filipa Rodrigues' })
    expect(link).toHaveAttribute('href', '/admin/utilizadores/a%20b')

    await user.click(link)

    await waitFor(() => expect(screen.getByText(/^Detalhe/)).toHaveTextContent(/^Detalhe \/admin\/utilizadores\/a(%20| )b$/))
  })
})

const APPROVED = 'Utilizador aprovado. Foi enviado o email de ativação.'
const REJECTED = 'Utilizador rejeitado com sucesso.'

function withoutFilipa() {
  return dashboard({
    stats: { ...stats, pending_applications: { total: 2 } },
    pending_applications: [applications[1], applications[2]],
  })
}

function rowButtons() {
  return within(region('Candidaturas Pendentes')).getAllByRole('button')
}

async function openRowAction(user, name) {
  await user.click(screen.getByRole('button', { name }))
  return screen.findByRole('dialog')
}

describe('Aprovar e recusar no painel', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-29T10:40:00Z'))
    getAdminDashboard.mockResolvedValue(dashboard())
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.resetAllMocks()
    vi.restoreAllMocks()
  })

  it('cada candidatura tem Aprovar e Recusar com o nome da linha e nenhum atributo leva o email', async () => {
    getAdminDashboard.mockResolvedValue(dashboard({
      pending_applications: [
        ...applications,
        { ...applications[1], id: 'u5', email: 'sem.perfil@example.pt', member_profile: null },
      ],
    }))
    show()
    await waitForDashboard()

    const names = ['Filipa Rodrigues', 'Tiago Mendes', 'Carla Nunes', 'Nome não indicado']
    const rows = itemsOf('Candidaturas Pendentes')
    expect(rows).toHaveLength(4)
    names.forEach((name, index) => {
      const buttons = within(rows[index]).getAllByRole('button')
      expect(buttons).toHaveLength(2)
      expect(buttons[0]).toHaveAccessibleName(`Aprovar ${name}`)
      expect(buttons[0]).toHaveAttribute('title', 'Aprovar')
      expect(buttons[1]).toHaveAccessibleName(`Recusar ${name}`)
      expect(buttons[1]).toHaveAttribute('title', 'Recusar')
    })

    for (const element of document.querySelectorAll('[aria-label], [title]')) {
      expect(element.getAttribute('aria-label') ?? '').not.toContain('@')
      expect(element.getAttribute('title') ?? '').not.toContain('@')
    }
    expect(document.body.textContent).not.toContain('@example.pt')
  })

  it('aprovar pede confirmação com o email só no diálogo, bloqueia os botões e recarrega o painel', async () => {
    const pending = deferred()
    approveUser.mockImplementation(() => pending.promise)
    getAdminDashboard.mockResolvedValueOnce(dashboard()).mockResolvedValueOnce(withoutFilipa())
    const user = userEvent.setup()
    show()
    await waitForDashboard()

    const dialog = await openRowAction(user, 'Aprovar Filipa Rodrigues')

    expect(screen.getByRole('dialog', { name: 'Aprovar candidatura' })).toBe(dialog)
    expect(dialog).toHaveAccessibleDescription(/Filipa Rodrigues \(filipa\.rodrigues@example\.pt\)/)
    expect(region('Candidaturas Pendentes').textContent).not.toContain('filipa.rodrigues@example.pt')

    await user.click(within(dialog).getByRole('button', { name: 'Aprovar' }))

    expect(within(dialog).getByRole('button', { name: 'A processar...' })).toBeDisabled()
    for (const button of rowButtons()) {
      expect(button).toBeDisabled()
    }
    expect(approveUser).toHaveBeenCalledTimes(1)
    expect(approveUser).toHaveBeenCalledWith('u1')

    await act(async () => { pending.resolve({ message: APPROVED }) })

    expect(await screen.findByRole('status')).toHaveTextContent(APPROVED)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(getAdminDashboard).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(itemsOf('Candidaturas Pendentes')).toHaveLength(2))

    const rows = itemsOf('Candidaturas Pendentes')
    expect(within(rows[0]).getByText('Tiago Mendes')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Carla Nunes')).toBeInTheDocument()
    expect(within(summaryItems()[1]).getByText('2')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('filipa.rodrigues@example.pt')
  })

  it('Cancelar fecha o diálogo sem pedido e devolve o foco ao botão Aprovar', async () => {
    const user = userEvent.setup()
    show()
    await waitForDashboard()

    const dialog = await openRowAction(user, 'Aprovar Filipa Rodrigues')
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(approveUser).not.toHaveBeenCalled()
    expect(getAdminDashboard).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Aprovar Filipa Rodrigues' })).toHaveFocus()
  })

  it.each([
    ['com justificação', 'Não cumpre os critérios.'],
    ['sem justificação', ''],
  ])('recusar %s envia o que foi escrito e recarrega o painel', async (_case, reason) => {
    rejectUser.mockResolvedValue({ message: REJECTED, user: null })
    getAdminDashboard.mockResolvedValueOnce(dashboard()).mockResolvedValueOnce(withoutFilipa())
    const user = userEvent.setup()
    show()
    await waitForDashboard()

    const dialog = await openRowAction(user, 'Recusar Filipa Rodrigues')

    expect(screen.getByRole('dialog', { name: 'Recusar candidatura' })).toBe(dialog)
    expect(dialog).toHaveAccessibleDescription(/filipa\.rodrigues@example\.pt/)
    expect(within(dialog).getByText(/^A conta é apagada/)).toBeInTheDocument()
    const field = within(dialog).getByLabelText('Justificação (opcional)')

    if (reason) {
      await user.type(field, reason)
    }
    await user.click(within(dialog).getByRole('button', { name: 'Recusar' }))

    expect(rejectUser).toHaveBeenCalledTimes(1)
    expect(rejectUser).toHaveBeenCalledWith('u1', reason)
    expect(await screen.findByRole('status')).toHaveTextContent(REJECTED)
    expect(getAdminDashboard).toHaveBeenCalledTimes(2)
  })

  it('enquanto o painel recarrega depois de uma ação os botões das linhas ficam desativados', async () => {
    const reload = deferred()
    approveUser.mockResolvedValue({ message: APPROVED })
    getAdminDashboard.mockResolvedValueOnce(dashboard()).mockImplementationOnce(() => reload.promise)
    const user = userEvent.setup()
    show()
    await waitForDashboard()

    const dialog = await openRowAction(user, 'Aprovar Filipa Rodrigues')
    await user.click(within(dialog).getByRole('button', { name: 'Aprovar' }))
    await screen.findByRole('status')

    expect(screen.getByRole('list', { name: 'Resumo' }).closest('[aria-busy]')).toHaveAttribute('aria-busy', 'true')
    for (const button of rowButtons()) {
      expect(button).toBeDisabled()
    }

    await act(async () => { reload.resolve(withoutFilipa()) })

    await waitFor(() => expect(itemsOf('Candidaturas Pendentes')).toHaveLength(2))
    expect(screen.getByRole('list', { name: 'Resumo' }).closest('[aria-busy]')).toHaveAttribute('aria-busy', 'false')
    for (const button of rowButtons()) {
      expect(button).toBeEnabled()
    }
  })

  it.each([
    {
      title: 'aprovar a primeira põe o foco na que passa a ocupar o lugar',
      initial: applications,
      rowButton: 'Aprovar Filipa Rodrigues',
      confirmLabel: 'Aprovar',
      reloaded: withoutFilipa(),
      target: () => screen.getByRole('button', { name: 'Aprovar Tiago Mendes' }),
    },
    {
      title: 'aprovar a última põe o foco na nova última',
      initial: applications,
      rowButton: 'Aprovar Carla Nunes',
      confirmLabel: 'Aprovar',
      reloaded: dashboard({ pending_applications: [applications[0], applications[1]] }),
      target: () => screen.getByRole('button', { name: 'Aprovar Tiago Mendes' }),
    },
    {
      title: 'recusar a única põe o foco no título do cartão',
      initial: [applications[0]],
      rowButton: 'Recusar Filipa Rodrigues',
      confirmLabel: 'Recusar',
      reloaded: dashboard({ stats: { ...stats, pending_applications: { total: 0 } }, pending_applications: [] }),
      target: () => screen.getByRole('heading', { level: 2, name: 'Candidaturas Pendentes' }),
    },
  ])('$title', async ({ initial, rowButton, confirmLabel, reloaded, target }) => {
    approveUser.mockResolvedValue({ message: APPROVED })
    rejectUser.mockResolvedValue({ message: REJECTED, user: null })
    getAdminDashboard.mockResolvedValueOnce(dashboard({ pending_applications: initial })).mockResolvedValueOnce(reloaded)
    const user = userEvent.setup()
    show()
    await waitForDashboard()

    const dialog = await openRowAction(user, rowButton)
    await user.click(within(dialog).getByRole('button', { name: confirmLabel }))

    await waitFor(() => expect(target()).toHaveFocus())
    expect(document.body).not.toHaveFocus()
    if (reloaded.pending_applications.length === 0) {
      expect(within(region('Candidaturas Pendentes')).getByText('Não há candidaturas pendentes.')).toBeVisible()
    }
  })

  it.each([
    ['409 ao aprovar', 'Aprovar', 409, 'Apenas utilizadores pendentes podem ser aprovados.'],
    ['404 ao recusar', 'Recusar', 404, 'Recurso não encontrado.'],
  ])('num %s mostra a mensagem da API, recarrega e foca a linha seguinte', async (_case, label, status, message) => {
    const service = label === 'Aprovar' ? approveUser : rejectUser
    service.mockRejectedValue(apiError(status, { success: false, message }))
    getAdminDashboard.mockResolvedValueOnce(dashboard()).mockResolvedValueOnce(withoutFilipa())
    const user = userEvent.setup()
    show()
    await waitForDashboard()

    const dialog = await openRowAction(user, `${label} Filipa Rodrigues`)
    await user.click(within(dialog).getByRole('button', { name: label }))

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(getAdminDashboard).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Aprovar Tiago Mendes' })).toHaveFocus())
  })

  it.each([
    ['429', () => apiError(429, { success: false, message: TOO_MANY }), TOO_MANY],
    ['500 sem corpo', () => apiError(500, undefined), 'Erro do servidor (500).'],
    ['erro de rede', () => new AxiosError('Network Error', 'ERR_NETWORK'), 'Não foi possível contactar o servidor.'],
  ])('num %s ao aprovar mostra o erro, não recarrega e devolve o foco ao botão', async (_case, error, message) => {
    approveUser.mockRejectedValue(error())
    const user = userEvent.setup()
    show()
    await waitForDashboard()

    const dialog = await openRowAction(user, 'Aprovar Filipa Rodrigues')
    await user.click(within(dialog).getByRole('button', { name: 'Aprovar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(getAdminDashboard).toHaveBeenCalledTimes(1)
    expect(within(region('Candidaturas Pendentes')).getByText('Filipa Rodrigues')).toBeInTheDocument()
    const approve = screen.getByRole('button', { name: 'Aprovar Filipa Rodrigues' })
    expect(approve).toBeEnabled()
    await waitFor(() => expect(approve).toHaveFocus())

    await user.click(screen.getByRole('button', { name: 'Fechar mensagem' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('se o recarregamento falhar mantém a mensagem de sucesso e foca Tentar novamente', async () => {
    approveUser.mockResolvedValue({ message: APPROVED })
    getAdminDashboard.mockResolvedValueOnce(dashboard()).mockRejectedValueOnce(apiError(500, undefined))
    const user = userEvent.setup()
    show()
    await waitForDashboard()

    const dialog = await openRowAction(user, 'Aprovar Filipa Rodrigues')
    await user.click(within(dialog).getByRole('button', { name: 'Aprovar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Erro do servidor (500).')
    expect(screen.getByRole('status')).toHaveTextContent(APPROVED)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tentar novamente' })).toHaveFocus())
  })

  it('a mensagem do resultado aparece no topo, antes dos cartões de totais', async () => {
    approveUser.mockResolvedValue({ message: APPROVED })
    getAdminDashboard.mockResolvedValueOnce(dashboard()).mockResolvedValueOnce(withoutFilipa())
    const user = userEvent.setup()
    show()
    await waitForDashboard()

    const dialog = await openRowAction(user, 'Aprovar Filipa Rodrigues')
    await user.click(within(dialog).getByRole('button', { name: 'Aprovar' }))

    const message = await screen.findByRole('status')
    expect(message).toHaveTextContent(APPROVED)
    const summary = screen.getByRole('list', { name: 'Resumo' })
    expect(message.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
