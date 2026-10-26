import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, CanceledError } from 'axios'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AdminUsersPage from '../../../src/pages/admin/AdminUsersPage'
import {
  approveUser,
  blockUser,
  demoteUser,
  getAdminUsers,
  promoteUser,
  rejectUser,
  sendPaymentLink,
  unblockUser,
} from '../../../src/services/adminUsers'
import { useAuthStore } from '../../../src/store/authStore'

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

const STATE = {
  pending: { value: 'pending', label: 'Pendente' },
  awaiting_activation: { value: 'awaiting_activation', label: 'Por ativar' },
  trial: { value: 'trial', label: 'Em trial' },
  active: { value: 'active', label: 'Ativo' },
  grace: { value: 'grace', label: 'Em carência' },
  lapsed: { value: 'lapsed', label: 'Subscrição caída' },
  blocked: { value: 'blocked', label: 'Bloqueado' },
  inactive: { value: 'inactive', label: 'Inativo' },
  exempt: { value: 'exempt', label: 'Isento' },
}

function member(id, name, business, sector, location, email, status, reason = null, state = undefined, createdAt = '2024-01-15T09:30:00+00:00') {
  return {
    id,
    email,
    created_at: createdAt,
    role: { id: 'role-member', name: 'Member' },
    account_status: { id: `status-${status}`, name: status },
    ...(state ? { subscription_state: state } : {}),
    inactive_reason: reason,
    member_profile: {
      name,
      business_name: business,
      sector: { id: `sector-${id}`, name: sector },
      location: { id: `location-${id}`, name: location },
    },
  }
}

const items = [
  member('u1', 'Ana Costa', 'TechBless Solutions', 'Tecnologia', 'Porto', 'ana@techbless.pt', 'Active', null, STATE.active),
  member('u2', 'José Oliveira', 'Padaria Doce Lar', 'Alimentação', 'Setúbal', 'jose@docelar.pt', 'Inactive', 'blocked', STATE.blocked, '2023-11-02T14:00:00+00:00'),
  member('u3', 'Maria Santos', 'Santos Contabilidade', 'Consultoria', 'Lisboa', 'maria@santos.pt', 'Pending', null, STATE.pending),
  member('u4', 'Pedro Almeida', 'Almeida Obras', 'Construção', 'Braga', 'pedro@almeida.pt', 'Approved', null, STATE.awaiting_activation),
  member('u5', 'Rita Ferreira', 'Rita Design', 'Design', 'Coimbra', 'rita@design.pt', 'Inactive', 'rejected', STATE.inactive),
  member('u6', 'Tiago Sousa', 'Sousa Transportes', 'Transportes', 'Faro', 'tiago@sousa.pt', 'Inactive', 'unpaid', STATE.lapsed),
  member('u7', 'Beatriz Lima', 'Lima Eventos', 'Eventos', 'Aveiro', 'beatriz@lima.pt', 'Active', null, STATE.active),
  member('u8', 'Sara Antunes', 'Flores do Vale', 'Comércio', 'Coimbra', 'sara@floresdovale.pt', 'Active', null, STATE.grace),
  member('u9', 'Ricardo Barros', 'Barros Seguros', 'Seguros', 'Viseu', 'ricardo@barros.pt', 'Active', null, STATE.trial),
]

const counts = { all: 11, active: 5, pending: 3, approved: 1, blocked: 1, inactive: 1 }

const subscriptionStateCounts = { pending: 3, awaiting_activation: 1, trial: 1, active: 3, grace: 1, lapsed: 1, blocked: 1, inactive: 0, exempt: 0 }

function list(listItems = items, pagination = {}) {
  return {
    items: listItems,
    pagination: { current_page: 1, per_page: 12, total: listItems.length, last_page: 1, ...pagination },
    counts,
    subscription_state_counts: subscriptionStateCounts,
    admins_count: 2,
  }
}

function deferred() {
  let resolve
  const promise = new Promise((res) => { resolve = res })
  return { promise, resolve }
}

function twoPages() {
  getAdminUsers.mockImplementation((filters) => Promise.resolve(list(items, { current_page: filters.page, total: 20, last_page: 2 })))
}

function show() {
  return render(<MemoryRouter><AdminUsersPage /></MemoryRouter>)
}

function tab(label) {
  return within(screen.getByRole('group', { name: 'Filtrar por estado' })).getByRole('button', { name: new RegExp(`^${label}`) })
}

function lastCall() {
  return getAdminUsers.mock.calls.at(-1)
}

async function waitForTable() {
  return screen.findByRole('table')
}

function rowOf(name) {
  return within(screen.getByText(name).closest('tr'))
}

function adminRow(id, email, state = STATE.active) {
  return {
    id,
    email,
    created_at: '2024-01-15T09:30:00+00:00',
    role: { id: 'role-admin', name: 'Admin' },
    account_status: { id: 'status-Active', name: 'Active' },
    subscription_state: state,
    inactive_reason: null,
    member_profile: null,
  }
}

function rowOfEmail(email) {
  return within(screen.getAllByText(email)[0].closest('tr'))
}

function apiError(status, message) {
  return new AxiosError('x', 'ERR_BAD_REQUEST', undefined, undefined, { status, data: { success: false, message } })
}

async function openAction(user, name) {
  await waitFor(() => expect(screen.getByRole('button', { name })).toBeEnabled())
  await user.click(screen.getByRole('button', { name }))

  return screen.findByRole('dialog')
}

function actionLabels(row) {
  return row.getAllByRole('button').map((button) => button.getAttribute('aria-label'))
}

async function confirmAction(user, label) {
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: label }))
}

describe('Gestão de Utilizadores', () => {
  beforeEach(() => {
    getAdminUsers.mockResolvedValue(list())
    useAuthStore.setState({ user: { id: 'admin-1', email: 'admin@aspec.pt', role: { name: 'Admin' }, account_status: { name: 'Active' } }, status: 'authenticated' })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    useAuthStore.getState().clearSession()
  })

  it('mostra o carregamento e depois a tabela pela ordem recebida, com o total e a coluna de ações', async () => {
    show()

    expect(screen.getByText('A carregar utilizadores...')).toBeInTheDocument()
    const table = await waitForTable()

    expect(within(table).getAllByRole('columnheader').map((header) => header.textContent.trim()))
      .toEqual(['Nome / Negócio', 'Setor', 'Localidade', 'Email', 'Data registo', 'Estado', 'Ações'])

    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(9)
    expect(rows.map((row) => items.findIndex((item) => within(row).queryByText(item.member_profile.name)))).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])

    const first = within(rows[0])
    for (const text of ['Ana Costa', 'TechBless Solutions', 'Tecnologia', 'Porto', 'ana@techbless.pt', 'Jan 2024', 'Ativo']) {
      expect(first.getByText(text)).toBeInTheDocument()
    }
    expect(first.getByText('Jan 2024')).toHaveAttribute('title', '15/01/2024')

    expect(screen.getByText('9 utilizadores encontrados')).toBeInTheDocument()
    expect(getAdminUsers).toHaveBeenNthCalledWith(1, { search: '', includeAdmins: false, page: 1 }, expect.any(AbortSignal))
  })

  it('mostra oito chips de estado da subscrição com contagens e Todos selecionado', async () => {
    show()
    await waitForTable()

    const buttons = within(screen.getByRole('group', { name: 'Filtrar por estado' })).getAllByRole('button')
    const expected = [
      ['Todos', 11], ['Pendentes', 3], ['Por ativar', 1], ['Em trial', 1],
      ['Ativos', 3], ['Em carência', 1], ['Subscrição caída', 1], ['Bloqueados', 1],
    ]
    expect(buttons).toHaveLength(8)
    expected.forEach(([label, count], index) => {
      expect(buttons[index]).toHaveTextContent(new RegExp(`^${label}\\s*${count}$`))
    })
    expect(tab('Todos')).toHaveAttribute('aria-pressed', 'true')
    expect(getAdminUsers.mock.calls[0]).toEqual([{ search: '', includeAdmins: false, page: 1 }, expect.any(AbortSignal)])
  })

  it.each([
    ['Pendentes', 'pending'],
    ['Por ativar', 'awaiting_activation'],
    ['Em trial', 'trial'],
    ['Ativos', 'active'],
    ['Em carência', 'grace'],
    ['Subscrição caída', 'lapsed'],
    ['Bloqueados', 'blocked'],
  ])('o chip %s filtra pelo estado da subscrição %s', async (label, value) => {
    const user = userEvent.setup()
    show()
    await waitForTable()

    await user.click(tab(label))

    await waitFor(() => expect(lastCall()).toEqual([{ subscriptionState: value, search: '', includeAdmins: false, page: 1 }, expect.any(AbortSignal)]))
    expect(tab(label)).toHaveAttribute('aria-pressed', 'true')
    expect(tab('Todos')).toHaveAttribute('aria-pressed', 'false')
  })

  it('sem contagens por estado da subscrição mostra os chips só com o texto', async () => {
    const { subscription_state_counts: _ignored, ...withoutStateCounts } = list()
    getAdminUsers.mockResolvedValue(withoutStateCounts)
    show()
    await waitForTable()

    for (const label of ['Todos', 'Pendentes', 'Por ativar', 'Em trial', 'Ativos', 'Em carência', 'Subscrição caída', 'Bloqueados']) {
      expect(tab(label)).toHaveTextContent(new RegExp(`^${label}$`))
    }
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('o botão de olho Ver admins vem antes dos chips, pede os admins e não há checkbox nem Exportar', async () => {
    const user = userEvent.setup()
    show()
    await waitForTable()

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Exportar/ })).not.toBeInTheDocument()

    const eye = screen.getByRole('button', { name: 'Ver admins' })
    const group = screen.getByRole('group', { name: 'Filtrar por estado' })
    expect(eye).toHaveAttribute('aria-pressed', 'false')
    expect(group).not.toContainElement(eye)
    expect(eye.compareDocumentPosition(group) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    document.activeElement.blur()
    await user.tab()
    expect(eye).toHaveFocus()
    await user.tab()
    expect(tab('Todos')).toHaveFocus()

    await user.click(eye)

    await waitFor(() => expect(lastCall()).toEqual([{ search: '', includeAdmins: true, page: 1 }, expect.any(AbortSignal)]))
    expect(eye).toHaveAttribute('aria-pressed', 'true')
    expect(eye).toHaveAttribute('title', 'Esconder admins')

    await user.click(eye)

    await waitFor(() => expect(lastCall()).toEqual([{ search: '', includeAdmins: false, page: 1 }, expect.any(AbortSignal)]))
    expect(eye).toHaveAttribute('aria-pressed', 'false')
  })

  it('pesquisar dentro de um chip mantém o chip e volta à primeira página', async () => {
    const user = userEvent.setup()
    show()
    await waitForTable()

    await user.click(tab('Bloqueados'))
    await user.type(screen.getByRole('searchbox', { name: 'Pesquisar utilizadores' }), 'ana')

    await waitFor(() => expect(lastCall()[0]).toEqual({ subscriptionState: 'blocked', search: 'ana', includeAdmins: false, page: 1 }))
  })

  it('a pesquisa espera 300 ms e faz um só pedido', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    show()
    await waitForTable()
    const callsBefore = getAdminUsers.mock.calls.length

    await user.type(screen.getByRole('searchbox', { name: 'Pesquisar utilizadores' }), 'ana')
    act(() => { vi.advanceTimersByTime(200) })
    expect(getAdminUsers).toHaveBeenCalledTimes(callsBefore)

    act(() => { vi.advanceTimersByTime(300) })
    await waitFor(() => expect(getAdminUsers).toHaveBeenCalledTimes(callsBefore + 1))
    expect(lastCall()[0]).toMatchObject({ search: 'ana', page: 1 })
  })

  it('depois de mudar de página, uma nova pesquisa volta à primeira página', async () => {
    twoPages()
    const user = userEvent.setup()
    show()
    await waitForTable()

    await user.click(screen.getByRole('button', { name: 'Página 2' }))
    await waitFor(() => expect(lastCall()[0]).toMatchObject({ page: 2 }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page'))

    await user.type(screen.getByRole('searchbox', { name: 'Pesquisar utilizadores' }), 'ana')

    await waitFor(() => expect(lastCall()[0]).toMatchObject({ search: 'ana', page: 1 }))
  })

  it('cancela o pedido anterior e ignora a sua resposta quando o separador muda', async () => {
    const first = deferred()
    const listA = [member('a1', 'Antiga Resposta', 'Negócio A', 'Setor A', 'Local A', 'antiga@x.pt', 'Active')]
    const listB = [member('b1', 'Nova Resposta', 'Negócio B', 'Setor B', 'Local B', 'nova@x.pt', 'Active')]
    getAdminUsers.mockImplementationOnce(() => first.promise).mockResolvedValueOnce(list(listB))
    const user = userEvent.setup()
    show()

    await user.click(tab('Ativos'))
    expect(getAdminUsers.mock.calls[0][1].aborted).toBe(true)
    expect(await screen.findByText('Nova Resposta')).toBeInTheDocument()

    await act(async () => { first.resolve(list(listA)) })

    expect(screen.getByText('Nova Resposta')).toBeInTheDocument()
    expect(screen.queryByText('Antiga Resposta')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('Ver admins pede os admins e mostra um admin sem perfil com o email como nome', async () => {
    const adminUser = {
      id: 'adm1',
      email: 'admin@aspec.pt',
      created_at: '2024-01-15T09:30:00+00:00',
      role: { id: 'role-admin', name: 'Admin' },
      account_status: { id: 'status-Active', name: 'Active' },
      inactive_reason: null,
      member_profile: null,
    }
    const user = userEvent.setup()
    show()
    await waitForTable()
    getAdminUsers.mockResolvedValue(list([adminUser, ...items]))

    await user.click(screen.getByRole('button', { name: 'Ver admins' }))

    await waitFor(() => expect(lastCall()).toEqual([{ search: '', includeAdmins: true, page: 1 }, expect.any(AbortSignal)]))
    await waitFor(() => expect(screen.getAllByText('admin@aspec.pt')).toHaveLength(2))
    const row = within(screen.getAllByText('admin@aspec.pt')[0].closest('tr'))
    expect(row.getByText('Admin')).toBeInTheDocument()
    const cells = row.getAllByRole('cell')
    expect(cells[1]).toHaveTextContent(/^—$/)
    expect(cells[2]).toHaveTextContent(/^—$/)
  })

  it('mostra na tabela o estado da subscrição com o texto da API', async () => {
    show()
    const table = within(await waitForTable())

    expect(table.getAllByText('Ativo')).toHaveLength(2)
    for (const label of ['Bloqueado', 'Pendente', 'Por ativar', 'Inativo', 'Subscrição caída', 'Em carência', 'Em trial']) {
      expect(table.getByText(label)).toBeInTheDocument()
    }
    for (const label of ['Aprovado', 'Recusado', 'Pagamento em falta']) {
      expect(table.queryByText(label)).not.toBeInTheDocument()
    }
  })

  it('pagina com a paginação numerada, desativa os limites e esconde-a com uma só página', async () => {
    twoPages()
    const user = userEvent.setup()
    const { unmount } = show()
    await waitForTable()

    const pagination = within(screen.getByRole('navigation', { name: 'Paginação de utilizadores' }))
    expect(pagination.getByRole('button', { name: 'Página 1' })).toHaveAttribute('aria-current', 'page')
    expect(pagination.getByRole('button', { name: 'Página anterior' })).toBeDisabled()
    expect(screen.getByText('20 utilizadores encontrados')).toBeInTheDocument()

    await user.click(pagination.getByRole('button', { name: 'Página 2' }))

    await waitFor(() => expect(lastCall()[0]).toMatchObject({ page: 2 }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page'))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Página seguinte' })).toBeDisabled())
    unmount()

    getAdminUsers.mockReset()
    getAdminUsers.mockResolvedValue(list())
    show()
    await waitForTable()

    expect(screen.queryByRole('navigation', { name: 'Paginação de utilizadores' })).not.toBeInTheDocument()
  })

  it('mostra a mensagem de lista vazia e o total no singular e no plural', async () => {
    getAdminUsers.mockResolvedValue(list([], { total: 0 }))
    const { unmount } = show()

    expect(await screen.findByText('Não foram encontrados utilizadores.')).toBeInTheDocument()
    expect(screen.getByText('0 utilizadores encontrados')).toBeInTheDocument()
    unmount()

    getAdminUsers.mockResolvedValue(list([items[0]], { total: 1 }))
    show()

    expect(await screen.findByText('1 utilizador encontrado')).toBeInTheDocument()
  })

  it('mostra o erro da API e recupera com Tentar novamente', async () => {
    const message = 'Não tem permissão para realizar esta ação.'
    getAdminUsers.mockRejectedValueOnce(new AxiosError('Request failed with status code 403', AxiosError.ERR_BAD_REQUEST, undefined, undefined, {
      status: 403,
      statusText: 'Forbidden',
      headers: {},
      config: {},
      data: { success: false, message },
    }))
    const user = userEvent.setup()
    show()

    expect(await screen.findByRole('alert')).toHaveTextContent(message)

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(getAdminUsers).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('não mostra erro quando o pedido anterior é cancelado', async () => {
    getAdminUsers.mockImplementationOnce((filters, signal) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new CanceledError()))
    }))
    const user = userEvent.setup()
    show()

    await user.click(tab('Ativos'))

    await waitForTable()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('depois de mudar de página, o chip Subscrição caída volta à primeira página', async () => {
    twoPages()
    const user = userEvent.setup()
    show()
    await waitForTable()

    await user.click(screen.getByRole('button', { name: 'Página 2' }))
    await waitFor(() => expect(lastCall()[0]).toMatchObject({ page: 2 }))

    await user.click(tab('Subscrição caída'))

    await waitFor(() => expect(lastCall()[0]).toEqual({ subscriptionState: 'lapsed', search: '', includeAdmins: false, page: 1 }))
  })

  it('depois de mudar de página, Ver admins mantém o chip e volta à primeira página', async () => {
    twoPages()
    const user = userEvent.setup()
    show()
    await waitForTable()

    await user.click(tab('Ativos'))
    await waitFor(() => expect(lastCall()[0]).toMatchObject({ subscriptionState: 'active', page: 1 }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Página 2' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Página 2' }))
    await waitFor(() => expect(lastCall()[0]).toMatchObject({ subscriptionState: 'active', page: 2 }))

    await user.click(screen.getByRole('button', { name: 'Ver admins' }))

    await waitFor(() => expect(lastCall()[0]).toEqual({ subscriptionState: 'active', search: '', includeAdmins: true, page: 1 }))
  })

  it('mostra na coluna Ações só os botões que fazem sentido para cada estado, sem promover em trial e carência', async () => {
    show()
    await waitForTable()

    const labels = (name) => actionLabels(rowOf(name))

    expect(rowOf('Ana Costa').getByRole('button', { name: 'Bloquear Ana Costa' })).toHaveAttribute('title', 'Bloquear')
    expect(labels('Ana Costa')).toEqual(['Bloquear Ana Costa', 'Promover a administrador Ana Costa'])
    expect(rowOf('Ana Costa').getByRole('button', { name: 'Promover a administrador Ana Costa' })).toHaveAttribute('title', 'Promover a administrador')
    expect(labels('Beatriz Lima')).toEqual(['Bloquear Beatriz Lima', 'Promover a administrador Beatriz Lima'])
    expect(labels('José Oliveira')).toEqual(['Desbloquear José Oliveira'])
    expect(labels('Maria Santos')).toEqual(['Aprovar Maria Santos', 'Recusar Maria Santos'])
    expect(rowOf('Maria Santos').getByRole('button', { name: 'Aprovar Maria Santos' })).toHaveAttribute('title', 'Aprovar')
    expect(labels('Pedro Almeida')).toEqual(['Enviar email Pedro Almeida', 'Bloquear Pedro Almeida'])
    expect(rowOf('Pedro Almeida').getByRole('button', { name: 'Enviar email Pedro Almeida' })).toHaveAttribute('title', 'Enviar email')
    expect(labels('Tiago Sousa')).toEqual(['Enviar email Tiago Sousa', 'Bloquear Tiago Sousa'])
    expect(labels('Sara Antunes')).toEqual(['Enviar email Sara Antunes', 'Bloquear Sara Antunes'])
    expect(labels('Ricardo Barros')).toEqual(['Bloquear Ricardo Barros'])
    expect(rowOf('Rita Ferreira').queryAllByRole('button')).toHaveLength(0)
    const actionsCell = within(rowOf('Rita Ferreira').getAllByRole('cell').at(-1))
    expect(actionsCell.getByText('Sem ações')).toBeInTheDocument()
    expect(actionsCell.getByText('—')).toHaveAttribute('aria-hidden', 'true')
    expect(within(screen.getByRole('table')).queryByRole('button', { name: /detalhe/i })).not.toBeInTheDocument()
  })

  it('com Ver admins marca os admins, a própria conta com (você), o técnico como Isento e Enviar email só noutro admin em carência', async () => {
    const user = userEvent.setup()
    show()
    await waitForTable()
    getAdminUsers.mockResolvedValue(list([
      adminRow('admin-1', 'admin@aspec.pt', STATE.grace),
      adminRow('admin-2', 'outro@aspec.pt', STATE.grace),
      adminRow('admin-3', 'tecnico@aspec.pt', STATE.exempt),
      ...items,
    ]))

    await user.click(screen.getByRole('button', { name: 'Ver admins' }))
    await screen.findAllByText('outro@aspec.pt')

    expect(rowOf('Maria Santos').getByRole('button', { name: 'Aprovar Maria Santos' })).toBeInTheDocument()

    const own = rowOfEmail('admin@aspec.pt')
    expect(own.getByText('Admin')).toBeInTheDocument()
    expect(own.getByText('(você)')).toBeInTheDocument()
    expect(actionLabels(own)).toEqual(['Despromover admin@aspec.pt (indisponível na própria conta)'])
    expect(own.getByRole('button', { name: 'Despromover admin@aspec.pt (indisponível na própria conta)' })).toBeDisabled()

    const other = rowOfEmail('outro@aspec.pt')
    expect(other.getByText('Admin')).toBeInTheDocument()
    expect(other.queryByText('(você)')).not.toBeInTheDocument()
    expect(actionLabels(other)).toEqual(['Enviar email outro@aspec.pt', 'Despromover outro@aspec.pt'])
    expect(other.getByRole('button', { name: 'Despromover outro@aspec.pt' })).toBeEnabled()

    const technical = rowOfEmail('tecnico@aspec.pt')
    expect(technical.getByText('Isento')).toBeInTheDocument()
    expect(technical.getByText('Admin')).toBeInTheDocument()
    expect(technical.queryAllByRole('button')).toHaveLength(0)
    expect(within(technical.getAllByRole('cell').at(-1)).getByText('Sem ações')).toBeInTheDocument()

    expect(screen.getAllByText('(você)')).toHaveLength(1)
  })

  it('promove um membro ativo e recarrega a lista com os mesmos filtros', async () => {
    const message = 'Utilizador promovido a administrador.'
    promoteUser.mockResolvedValue({ message, user: { id: 'u1' } })
    const user = userEvent.setup()
    show()
    await waitForTable()

    await user.click(tab('Ativos'))
    await waitFor(() => expect(lastCall()[0]).toEqual({ subscriptionState: 'active', search: '', includeAdmins: false, page: 1 }))
    const callsBefore = getAdminUsers.mock.calls.length

    const dialog = await openAction(user, 'Promover a administrador Ana Costa')
    expect(screen.getByRole('dialog', { name: 'Promover a administrador' })).toBe(dialog)
    await confirmAction(user, 'Promover a administrador')

    expect(promoteUser).toHaveBeenCalledTimes(1)
    expect(promoteUser).toHaveBeenCalledWith('u1')
    expect((await screen.findByText(message)).closest('[role="status"]')).not.toBeNull()
    await waitFor(() => expect(getAdminUsers).toHaveBeenCalledTimes(callsBefore + 1))
    expect(lastCall()[0]).toEqual({ subscriptionState: 'active', search: '', includeAdmins: false, page: 1 })
  })

  it('despromove outro admin com a contagem de administradores da lista e num 409 mostra o erro e recarrega', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const message = 'O administrador técnico não pode ser despromovido.'
    demoteUser.mockRejectedValue(apiError(409, message))
    getAdminUsers.mockResolvedValue(list([adminRow('admin-2', 'outro@aspec.pt'), ...items]))
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    show()
    await waitForTable()
    const callsBefore = getAdminUsers.mock.calls.length

    const dialog = await openAction(user, 'Despromover outro@aspec.pt')
    expect(screen.getByRole('dialog', { name: 'Despromover administrador' })).toBe(dialog)
    expect(within(dialog).getByRole('note')).toHaveTextContent('Existem 2 administradores. Depois desta ação ficam 1. A plataforma tem sempre de ter pelo menos um.')
    expect(within(dialog).getByRole('button', { name: 'Despromover (2s)' })).toBeDisabled()

    act(() => vi.advanceTimersByTime(2000))
    await confirmAction(user, 'Despromover')

    expect(demoteUser).toHaveBeenCalledWith('admin-2')
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    await waitFor(() => expect(getAdminUsers).toHaveBeenCalledTimes(callsBefore + 1))
  })

  it('pede confirmação antes de aprovar e explica o que acontece', async () => {
    const user = userEvent.setup()
    show()
    await waitForTable()

    const dialog = await openAction(user, 'Aprovar Maria Santos')

    expect(screen.getByRole('dialog', { name: 'Aprovar candidatura' })).toBe(dialog)
    expect(dialog).toHaveAccessibleDescription(/Maria Santos \(maria@santos\.pt\)/)
    expect(dialog).toHaveAccessibleDescription(/email/)
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toHaveFocus()
    expect(approveUser).not.toHaveBeenCalled()
  })

  it('Cancelar fecha o diálogo sem pedido e devolve o foco ao botão da linha', async () => {
    const user = userEvent.setup()
    show()
    await waitForTable()

    await openAction(user, 'Recusar Maria Santos')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(rejectUser).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Recusar Maria Santos' })).toHaveFocus()
  })

  it('aprova um pendente, mostra a mensagem da API e recarrega com os mesmos filtros e contagens', async () => {
    const message = 'Utilizador aprovado. Foi enviado o email de ativação.'
    let approved = false
    getAdminUsers.mockImplementation(() => Promise.resolve(approved
      ? { ...list(), subscription_state_counts: { ...subscriptionStateCounts, pending: 2, awaiting_activation: 2 } }
      : list()))
    approveUser.mockImplementation(() => {
      approved = true
      return Promise.resolve({ message, user: { id: 'u3' } })
    })
    const user = userEvent.setup()
    show()
    await waitForTable()

    await user.click(tab('Pendentes'))
    await waitFor(() => expect(lastCall()[0]).toEqual({ subscriptionState: 'pending', search: '', includeAdmins: false, page: 1 }))
    expect(tab('Pendentes')).toHaveTextContent(/^Pendentes\s*3$/)
    await openAction(user, 'Aprovar Maria Santos')
    await confirmAction(user, 'Aprovar')

    expect(approveUser).toHaveBeenCalledTimes(1)
    expect(approveUser).toHaveBeenCalledWith('u3')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect((await screen.findByText(message)).closest('[role="status"]')).not.toBeNull()
    await waitFor(() => expect(tab('Pendentes')).toHaveTextContent(/^Pendentes\s*2$/))
    expect(tab('Por ativar')).toHaveTextContent(/^Por ativar\s*2$/)
    expect(tab('Todos')).toHaveTextContent(/^Todos\s*11$/)
    expect(lastCall()[0]).toEqual({ subscriptionState: 'pending', search: '', includeAdmins: false, page: 1 })
  })

  it('recusa um pendente, mostra a mensagem e recarrega a lista', async () => {
    rejectUser.mockResolvedValue({ message: 'Utilizador rejeitado com sucesso.' })
    const user = userEvent.setup()
    show()
    await waitForTable()
    const callsBefore = getAdminUsers.mock.calls.length

    await openAction(user, 'Recusar Maria Santos')
    await confirmAction(user, 'Recusar')

    expect(rejectUser).toHaveBeenCalledWith('u3', '')
    expect(await screen.findByText('Utilizador rejeitado com sucesso.')).toBeInTheDocument()
    await waitFor(() => expect(getAdminUsers).toHaveBeenCalledTimes(callsBefore + 1))
  })

  it('bloqueia um membro ativo depois de avisar sobre a subscrição', async () => {
    blockUser.mockResolvedValue({ message: 'Utilizador bloqueado com sucesso.' })
    const user = userEvent.setup()
    show()
    await waitForTable()
    const callsBefore = getAdminUsers.mock.calls.length

    const dialog = await openAction(user, 'Bloquear Ana Costa')
    expect(screen.getByRole('dialog', { name: 'Bloquear membro' })).toBe(dialog)
    expect(dialog).toHaveAccessibleDescription(/subscrição/)
    await confirmAction(user, 'Bloquear')

    expect(blockUser).toHaveBeenCalledWith('u1', '')
    expect(await screen.findByText('Utilizador bloqueado com sucesso.')).toBeInTheDocument()
    await waitFor(() => expect(getAdminUsers).toHaveBeenCalledTimes(callsBefore + 1))
  })

  it('o diálogo de recusar explica o email e o efeito e põe o foco na justificação', async () => {
    const user = userEvent.setup()
    show()
    await waitForTable()

    const dialog = await openAction(user, 'Recusar Maria Santos')

    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('dialog', { name: 'Recusar candidatura' })).toBe(dialog)
    expect(dialog).toHaveAccessibleDescription(/Maria Santos/)
    expect(dialog).toHaveAccessibleDescription(/maria@santos\.pt/)
    expect(dialog).toHaveAccessibleDescription(/voltar a candidatar-se/)
    expect(within(dialog).getByRole('textbox', { name: 'Justificação (opcional)' })).toHaveFocus()
  })

  it('recusa um pendente com justificação, mostra a mensagem e recarrega a lista', async () => {
    rejectUser.mockResolvedValue({ message: 'Utilizador rejeitado com sucesso.', user: null })
    const user = userEvent.setup()
    show()
    await waitForTable()
    const callsBefore = getAdminUsers.mock.calls.length

    const dialog = await openAction(user, 'Recusar Maria Santos')
    await user.type(within(dialog).getByRole('textbox', { name: 'Justificação (opcional)' }), 'Não cumpre os critérios.')
    await confirmAction(user, 'Recusar')

    expect(rejectUser).toHaveBeenCalledTimes(1)
    expect(rejectUser).toHaveBeenCalledWith('u3', 'Não cumpre os critérios.')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect((await screen.findByText('Utilizador rejeitado com sucesso.')).closest('[role="status"]')).not.toBeNull()
    await waitFor(() => expect(getAdminUsers).toHaveBeenCalledTimes(callsBefore + 1))
  })

  it('bloqueia um membro ativo com justificação depois de explicar o email e a subscrição', async () => {
    blockUser.mockResolvedValue({ message: 'Utilizador bloqueado com sucesso.' })
    const user = userEvent.setup()
    show()
    await waitForTable()
    const callsBefore = getAdminUsers.mock.calls.length

    const dialog = await openAction(user, 'Bloquear Ana Costa')
    expect(screen.getByRole('dialog', { name: 'Bloquear membro' })).toBe(dialog)
    expect(dialog).toHaveAccessibleDescription(/Ana Costa/)
    expect(dialog).toHaveAccessibleDescription(/ana@techbless\.pt/)
    expect(dialog).toHaveAccessibleDescription(/subscrição/)

    await user.type(within(dialog).getByRole('textbox', { name: 'Justificação (opcional)' }), 'Faltas repetidas.')
    await confirmAction(user, 'Bloquear')

    expect(blockUser).toHaveBeenCalledTimes(1)
    expect(blockUser).toHaveBeenCalledWith('u1', 'Faltas repetidas.')
    expect(await screen.findByText('Utilizador bloqueado com sucesso.')).toBeInTheDocument()
    await waitFor(() => expect(getAdminUsers).toHaveBeenCalledTimes(callsBefore + 1))
  })

  it('aprovar e desbloquear não pedem justificação e chamam o serviço só com o id', async () => {
    approveUser.mockResolvedValue({ message: 'Utilizador aprovado. Foi enviado o email de ativação.' })
    unblockUser.mockResolvedValue({ message: 'Utilizador desbloqueado. Foi enviado o email de reativação.' })
    const user = userEvent.setup()
    show()
    await waitForTable()

    let dialog = await openAction(user, 'Aprovar Maria Santos')
    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument()
    await confirmAction(user, 'Aprovar')

    expect(approveUser).toHaveBeenCalledWith('u3')
    await screen.findByText('Utilizador aprovado. Foi enviado o email de ativação.')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    dialog = await openAction(user, 'Desbloquear José Oliveira')
    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument()
    await confirmAction(user, 'Desbloquear')

    expect(unblockUser).toHaveBeenCalledWith('u2')
  })

  it('desbloqueia um membro bloqueado depois de avisar sobre o email', async () => {
    unblockUser.mockResolvedValue({ message: 'Utilizador desbloqueado. Foi enviado o email de reativação.' })
    const user = userEvent.setup()
    show()
    await waitForTable()
    const callsBefore = getAdminUsers.mock.calls.length

    const dialog = await openAction(user, 'Desbloquear José Oliveira')
    expect(screen.getByRole('dialog', { name: 'Desbloquear membro' })).toBe(dialog)
    expect(dialog).toHaveAccessibleDescription(/email/)
    await confirmAction(user, 'Desbloquear')

    expect(unblockUser).toHaveBeenCalledWith('u2')
    expect(await screen.findByText('Utilizador desbloqueado. Foi enviado o email de reativação.')).toBeInTheDocument()
    await waitFor(() => expect(getAdminUsers).toHaveBeenCalledTimes(callsBefore + 1))
  })

  it('num 409 ou 404 mostra a mensagem da API como alerta e recarrega a lista', async () => {
    approveUser.mockRejectedValue(apiError(409, 'Apenas utilizadores pendentes podem ser aprovados.'))
    blockUser.mockRejectedValue(apiError(404, 'Recurso não encontrado.'))
    const user = userEvent.setup()
    show()
    await waitForTable()
    let callsBefore = getAdminUsers.mock.calls.length

    await openAction(user, 'Aprovar Maria Santos')
    await confirmAction(user, 'Aprovar')

    expect(await screen.findByRole('alert')).toHaveTextContent('Apenas utilizadores pendentes podem ser aprovados.')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(getAdminUsers).toHaveBeenCalledTimes(callsBefore + 1))

    await user.click(screen.getByRole('button', { name: 'Fechar mensagem' }))
    callsBefore = getAdminUsers.mock.calls.length

    await openAction(user, 'Bloquear Ana Costa')
    await confirmAction(user, 'Bloquear')

    expect(await screen.findByRole('alert')).toHaveTextContent('Recurso não encontrado.')
    await waitFor(() => expect(getAdminUsers).toHaveBeenCalledTimes(callsBefore + 1))
  })

  it('num 403 ou 500 mostra a mensagem da API e não recarrega a lista', async () => {
    rejectUser.mockRejectedValue(apiError(403, 'Não tem permissão para realizar esta ação.'))
    blockUser.mockRejectedValue(apiError(500, 'Ocorreu um erro interno. Tente novamente mais tarde.'))
    const user = userEvent.setup()
    show()
    await waitForTable()
    const callsBefore = getAdminUsers.mock.calls.length

    await openAction(user, 'Recusar Maria Santos')
    await confirmAction(user, 'Recusar')

    expect(await screen.findByRole('alert')).toHaveTextContent('Não tem permissão para realizar esta ação.')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await openAction(user, 'Bloquear Ana Costa')
    await confirmAction(user, 'Bloquear')

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Ocorreu um erro interno. Tente novamente mais tarde.'))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(getAdminUsers).toHaveBeenCalledTimes(callsBefore)
  })

  it('enquanto a ação está pendente não repete o pedido nem deixa fechar o diálogo', async () => {
    const pending = deferred()
    approveUser.mockImplementation(() => pending.promise)
    const user = userEvent.setup()
    show()
    await waitForTable()

    const dialog = await openAction(user, 'Aprovar Maria Santos')
    const confirmButton = within(dialog).getByRole('button', { name: 'Aprovar' })
    act(() => {
      confirmButton.click()
      confirmButton.click()
    })
    await user.dblClick(confirmButton)

    expect(approveUser).toHaveBeenCalledTimes(1)
    expect(within(dialog).getByRole('button', { name: 'A processar...' })).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeDisabled()

    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await act(async () => { pending.resolve({ message: 'Utilizador aprovado. Foi enviado o email de ativação.' }) })

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('desativa os botões das linhas enquanto a lista recarrega depois de uma ação', async () => {
    const reload = deferred()
    blockUser.mockResolvedValue({ message: 'Utilizador bloqueado com sucesso.' })
    const user = userEvent.setup()
    show()
    await waitForTable()

    await openAction(user, 'Bloquear Ana Costa')
    getAdminUsers.mockImplementationOnce(() => reload.promise)
    await confirmAction(user, 'Bloquear')

    await screen.findByText('Utilizador bloqueado com sucesso.')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Aprovar Maria Santos' })).toBeDisabled())

    await act(async () => { reload.resolve(list()) })

    await waitFor(() => expect(screen.getByRole('button', { name: 'Aprovar Maria Santos' })).toBeEnabled())
  })

  it('se a página ficar vazia depois da ação, passa para a última página sem mostrar a lista vazia', async () => {
    const maria = items[2]
    const others = items.filter((item) => item !== maria)
    let approved = false
    getAdminUsers.mockImplementation((filters) => {
      if (filters.page === 2) {
        return Promise.resolve(approved
          ? { items: [], pagination: { current_page: 2, per_page: 12, total: 12, last_page: 1 }, counts, subscription_state_counts: subscriptionStateCounts }
          : list([maria], { current_page: 2, total: 13, last_page: 2 }))
      }

      return Promise.resolve(list(others, { current_page: 1, total: approved ? 12 : 13, last_page: approved ? 1 : 2 }))
    })
    approveUser.mockImplementation(() => {
      approved = true
      return Promise.resolve({ message: 'Utilizador aprovado. Foi enviado o email de ativação.' })
    })
    const emptyShown = []
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.textContent?.includes('Não foram encontrados utilizadores.')) emptyShown.push(node)
        }
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    const user = userEvent.setup()
    show()
    await waitForTable()

    await user.click(screen.getByRole('button', { name: 'Página 2' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page'))
    await openAction(user, 'Aprovar Maria Santos')
    await confirmAction(user, 'Aprovar')

    await waitFor(() => expect(lastCall()[0]).toEqual({ search: '', includeAdmins: false, page: 1 }))
    expect(await screen.findByText('Ana Costa')).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Página 2', current: 'page' })).not.toBeInTheDocument()
    observer.disconnect()
    expect(emptyShown).toHaveLength(0)
  })

  it('fecha a mensagem de resultado com Fechar mensagem', async () => {
    blockUser.mockResolvedValue({ message: 'Utilizador bloqueado com sucesso.' })
    const user = userEvent.setup()
    show()
    await waitForTable()

    await openAction(user, 'Bloquear Ana Costa')
    await confirmAction(user, 'Bloquear')
    await screen.findByText('Utilizador bloqueado com sucesso.')

    await user.click(screen.getByRole('button', { name: 'Fechar mensagem' }))

    expect(screen.queryByText('Utilizador bloqueado com sucesso.')).not.toBeInTheDocument()
  })

  it('se o pedido da ação for cancelado fecha o diálogo sem mensagem e sem recarregar', async () => {
    blockUser.mockRejectedValue(new CanceledError())
    const user = userEvent.setup()
    show()
    await waitForTable()
    const callsBefore = getAdminUsers.mock.calls.length

    await openAction(user, 'Bloquear Ana Costa')
    await confirmAction(user, 'Bloquear')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(blockUser).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText(/com sucesso/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Fechar mensagem' })).not.toBeInTheDocument()
    expect(getAdminUsers).toHaveBeenCalledTimes(callsBefore)
  })

  it('cada linha tem uma ligação Ver detalhe para a página do membro, incluindo admins sem perfil', async () => {
    const otherAdmin = adminRow('admin-2', 'outro@aspec.pt')
    const user = userEvent.setup()
    show()
    await waitForTable()

    const ana = rowOf('Ana Costa').getByRole('link', { name: 'Ver detalhe de Ana Costa' })
    expect(ana).toHaveAttribute('href', '/admin/utilizadores/u1')
    expect(ana).toHaveAttribute('title', 'Ver detalhe')
    expect(rowOf('Rita Ferreira').getByRole('link', { name: 'Ver detalhe de Rita Ferreira' })).toHaveAttribute('href', '/admin/utilizadores/u5')
    expect(within(rowOf('Rita Ferreira').getAllByRole('cell').at(-1)).getByText('Sem ações')).toBeInTheDocument()

    getAdminUsers.mockResolvedValue(list([otherAdmin, ...items]))
    await user.click(screen.getByRole('button', { name: 'Ver admins' }))
    await screen.findAllByText('outro@aspec.pt')

    const otherRow = rowOfEmail('outro@aspec.pt')
    expect(otherRow.getByRole('link', { name: 'Ver detalhe de outro@aspec.pt' })).toHaveAttribute('href', '/admin/utilizadores/admin-2')
    expect(otherRow.getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual(['Despromover outro@aspec.pt'])
  })
})

describe('Mensagem trazida pela navegação e envio do email de pagamento na lista', () => {
  beforeEach(() => {
    getAdminUsers.mockResolvedValue(list())
    useAuthStore.setState({ user: { id: 'admin-1', email: 'admin@aspec.pt', role: { name: 'Admin' }, account_status: { name: 'Active' } }, status: 'authenticated' })
  })
  afterEach(() => {
    vi.clearAllMocks()
    useAuthStore.getState().clearSession()
  })

  it('mostra a mensagem trazida da navegação e fecha-a com Fechar mensagem', async () => {
    const message = 'Membro anonimizado com sucesso.'
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={[{ pathname: '/admin/utilizadores', state: { feedback: { type: 'success', message } } }]}>
        <AdminUsersPage />
      </MemoryRouter>
    )

    expect((await screen.findByText(message)).closest('[role="status"]')).not.toBeNull()
    await waitForTable()

    await user.click(screen.getByRole('button', { name: 'Fechar mensagem' }))

    expect(screen.queryByText(message)).not.toBeInTheDocument()
  })

  it('sem o estado da subscrição nos itens não mostra Enviar email', async () => {
    const withoutState = items.map(({ subscription_state: _ignored, ...item }) => item)
    getAdminUsers.mockResolvedValue(list(withoutState))
    show()
    await waitForTable()

    expect(rowOf('Pedro Almeida').getByRole('button', { name: 'Bloquear Pedro Almeida' })).toBeInTheDocument()
    expect(rowOf('Tiago Sousa').getByRole('button', { name: 'Bloquear Tiago Sousa' })).toBeInTheDocument()
    expect(within(screen.getByRole('table')).queryByRole('button', { name: /^Enviar email/ })).not.toBeInTheDocument()
  })

  it('reenvia o email de ativação a quem está por ativar e recarrega a lista', async () => {
    const message = 'Foi enviado o email de ativação.'
    sendPaymentLink.mockResolvedValue({ message, data: { id: 'u4', type: 'activation' } })
    const user = userEvent.setup()
    show()
    await waitForTable()
    const callsBefore = getAdminUsers.mock.calls.length

    const dialog = await openAction(user, 'Enviar email Pedro Almeida')
    expect(screen.getByRole('dialog', { name: 'Reenviar email de ativação' })).toBe(dialog)
    expect(dialog).toHaveAccessibleDescription(/pedro@almeida\.pt/)
    expect(dialog).toHaveAccessibleDescription(/Pedro Almeida/)
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toHaveFocus()
    await confirmAction(user, 'Enviar email')

    expect(sendPaymentLink).toHaveBeenCalledTimes(1)
    expect(sendPaymentLink.mock.calls).toEqual([['u4']])
    expect((await screen.findByText(message)).closest('[role="status"]')).not.toBeNull()
    await waitFor(() => expect(getAdminUsers).toHaveBeenCalledTimes(callsBefore + 1))
  })

  it('envia o lembrete de pagamento a quem está em carência e recarrega com o chip selecionado', async () => {
    const message = 'Foi enviado o lembrete de pagamento.'
    sendPaymentLink.mockResolvedValue({ message, data: { id: 'u8', type: 'payment_reminder' } })
    const user = userEvent.setup()
    show()
    await waitForTable()

    await user.click(tab('Em carência'))
    await waitFor(() => expect(lastCall()[0]).toEqual({ subscriptionState: 'grace', search: '', includeAdmins: false, page: 1 }))
    const callsBefore = getAdminUsers.mock.calls.length

    const dialog = await openAction(user, 'Enviar email Sara Antunes')
    expect(screen.getByRole('dialog', { name: 'Enviar lembrete de pagamento' })).toBe(dialog)
    expect(dialog).toHaveAccessibleDescription(/sara@floresdovale\.pt/)
    expect(dialog).toHaveAccessibleDescription(/carência/)
    await confirmAction(user, 'Enviar email')

    expect(sendPaymentLink.mock.calls).toEqual([['u8']])
    expect((await screen.findByText(message)).closest('[role="status"]')).not.toBeNull()
    await waitFor(() => expect(getAdminUsers).toHaveBeenCalledTimes(callsBefore + 1))
    expect(lastCall()[0]).toEqual({ subscriptionState: 'grace', search: '', includeAdmins: false, page: 1 })
  })

  it('explica o email de reativação com o texto do design e Cancelar fecha sem pedido', async () => {
    const user = userEvent.setup()
    show()
    await waitForTable()

    const dialog = await openAction(user, 'Enviar email Tiago Sousa')
    expect(screen.getByRole('dialog', { name: 'Enviar email de reativação' })).toBe(dialog)
    expect(dialog).toHaveAccessibleDescription(
      'Será enviado para tiago@sousa.pt um email com uma ligação para Tiago Sousa atualizar o método de pagamento e reativar a subscrição.'
    )

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(sendPaymentLink).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Enviar email Tiago Sousa' })).toHaveFocus()
  })

  it('num 409 ao enviar o email mostra o erro e recarrega, num 429 mostra o erro sem recarregar', async () => {
    sendPaymentLink
      .mockRejectedValueOnce(apiError(409, 'A conta já está ativa.'))
      .mockRejectedValueOnce(apiError(429, 'Demasiados pedidos. Tente novamente mais tarde.'))
    const user = userEvent.setup()
    show()
    await waitForTable()
    let callsBefore = getAdminUsers.mock.calls.length

    await openAction(user, 'Enviar email Tiago Sousa')
    await confirmAction(user, 'Enviar email')

    expect(await screen.findByRole('alert')).toHaveTextContent('A conta já está ativa.')
    await waitFor(() => expect(getAdminUsers).toHaveBeenCalledTimes(callsBefore + 1))

    await user.click(screen.getByRole('button', { name: 'Fechar mensagem' }))
    callsBefore = getAdminUsers.mock.calls.length

    await openAction(user, 'Enviar email Tiago Sousa')
    await confirmAction(user, 'Enviar email')

    expect(await screen.findByRole('alert')).toHaveTextContent('Demasiados pedidos. Tente novamente mais tarde.')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(getAdminUsers).toHaveBeenCalledTimes(callsBefore)
  })

})
