import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, CanceledError } from 'axios'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AdminUsersPage from '../../../src/pages/admin/AdminUsersPage'
import { getAdminUsers } from '../../../src/services/adminUsers'

vi.mock('../../../src/services/adminUsers', () => ({ getAdminUsers: vi.fn() }))

function member(id, name, business, sector, location, email, status, reason = null, createdAt = '2024-01-15T09:30:00+00:00') {
  return {
    id,
    email,
    created_at: createdAt,
    role: { id: 'role-member', name: 'Member' },
    account_status: { id: `status-${status}`, name: status },
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
  member('u1', 'Ana Costa', 'TechBless Solutions', 'Tecnologia', 'Porto', 'ana@techbless.pt', 'Active'),
  member('u2', 'José Oliveira', 'Padaria Doce Lar', 'Alimentação', 'Setúbal', 'jose@docelar.pt', 'Inactive', 'blocked', '2023-11-02T14:00:00+00:00'),
  member('u3', 'Maria Santos', 'Santos Contabilidade', 'Consultoria', 'Lisboa', 'maria@santos.pt', 'Pending'),
  member('u4', 'Pedro Almeida', 'Almeida Obras', 'Construção', 'Braga', 'pedro@almeida.pt', 'Approved'),
  member('u5', 'Rita Ferreira', 'Rita Design', 'Design', 'Coimbra', 'rita@design.pt', 'Inactive', 'rejected'),
  member('u6', 'Tiago Sousa', 'Sousa Transportes', 'Transportes', 'Faro', 'tiago@sousa.pt', 'Inactive', 'unpaid'),
  member('u7', 'Beatriz Lima', 'Lima Eventos', 'Eventos', 'Aveiro', 'beatriz@lima.pt', 'Active'),
]

const counts = { all: 9, active: 3, pending: 2, approved: 1, blocked: 1, inactive: 2 }

function list(listItems = items, pagination = {}) {
  return {
    items: listItems,
    pagination: { current_page: 1, per_page: 12, total: listItems.length, last_page: 1, ...pagination },
    counts,
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

describe('Gestão de Utilizadores', () => {
  beforeEach(() => { getAdminUsers.mockResolvedValue(list()) })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('mostra o carregamento e depois a tabela pela ordem recebida, com o total e sem coluna de ações', async () => {
    show()

    expect(screen.getByText('A carregar utilizadores...')).toBeInTheDocument()
    const table = await waitForTable()

    expect(within(table).getAllByRole('columnheader').map((header) => header.textContent.trim()))
      .toEqual(['Nome / Negócio', 'Setor', 'Localidade', 'Email', 'Data registo', 'Estado'])
    expect(within(table).queryByRole('columnheader', { name: 'Ações' })).not.toBeInTheDocument()

    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(7)
    expect(rows.map((row) => items.findIndex((item) => within(row).queryByText(item.member_profile.name)))).toEqual([0, 1, 2, 3, 4, 5, 6])

    const first = within(rows[0])
    for (const text of ['Ana Costa', 'TechBless Solutions', 'Tecnologia', 'Porto', 'ana@techbless.pt', 'Jan 2024', 'Ativo']) {
      expect(first.getByText(text)).toBeInTheDocument()
    }
    expect(first.getByText('Jan 2024')).toHaveAttribute('title', '15/01/2024')

    expect(screen.getByText('7 utilizadores encontrados')).toBeInTheDocument()
    expect(getAdminUsers).toHaveBeenNthCalledWith(1, { search: '', includeAdmins: false, page: 1 }, expect.any(AbortSignal))
  })

  it('mostra seis separadores com contagens e filtra por Pendentes', async () => {
    const user = userEvent.setup()
    show()
    await waitForTable()

    const buttons = within(screen.getByRole('group', { name: 'Filtrar por estado' })).getAllByRole('button')
    const expected = [['Todos', 9], ['Ativos', 3], ['Pendentes', 2], ['Aprovados', 1], ['Bloqueados', 1], ['Inativos', 2]]
    expect(buttons).toHaveLength(6)
    expected.forEach(([label, count], index) => {
      expect(buttons[index]).toHaveTextContent(new RegExp(`^${label}\\s*${count}$`))
    })
    expect(tab('Todos')).toHaveAttribute('aria-pressed', 'true')

    await user.click(tab('Pendentes'))

    await waitFor(() => expect(lastCall()).toEqual([{ status: 'Pending', search: '', includeAdmins: false, page: 1 }, expect.any(AbortSignal)]))
    expect(tab('Pendentes')).toHaveAttribute('aria-pressed', 'true')
    expect(tab('Todos')).toHaveAttribute('aria-pressed', 'false')
  })

  it('o separador Bloqueados pede os inativos bloqueados', async () => {
    const user = userEvent.setup()
    show()
    await waitForTable()

    await user.click(tab('Bloqueados'))

    await waitFor(() => expect(lastCall()).toEqual([{ status: 'Inactive', blocked: true, search: '', includeAdmins: false, page: 1 }, expect.any(AbortSignal)]))
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

    await user.click(screen.getByRole('button', { name: 'Seguinte' }))
    await waitFor(() => expect(lastCall()[0]).toMatchObject({ page: 2 }))
    await screen.findByText('Página 2 de 2')

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

  it('Mostrar admins pede os admins e mostra um admin sem perfil com o email como nome', async () => {
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

    await user.click(screen.getByRole('checkbox', { name: 'Mostrar admins' }))

    await waitFor(() => expect(lastCall()).toEqual([{ search: '', includeAdmins: true, page: 1 }, expect.any(AbortSignal)]))
    await waitFor(() => expect(screen.getAllByText('admin@aspec.pt')).toHaveLength(2))
    const row = within(screen.getAllByText('admin@aspec.pt')[0].closest('tr'))
    expect(row.getByText('Admin')).toBeInTheDocument()
    expect(row.getAllByText('—')).toHaveLength(2)
  })

  it('mostra a etiqueta de cada estado na tabela', async () => {
    show()
    const table = within(await waitForTable())

    expect(table.getByText('Aprovado')).toBeInTheDocument()
    expect(table.getByText('Bloqueado')).toBeInTheDocument()
    expect(table.getByText('Recusado')).toBeInTheDocument()
    expect(table.getByText('Pagamento em falta')).toBeInTheDocument()
    expect(table.getByText('Pendente')).toBeInTheDocument()
    expect(table.getAllByText('Ativo')).toHaveLength(2)
  })

  it('pagina com Anterior e Seguinte, desativa os limites e esconde a paginação com uma só página', async () => {
    twoPages()
    const user = userEvent.setup()
    const { unmount } = show()
    await waitForTable()

    const pagination = within(screen.getByRole('navigation', { name: 'Paginação de utilizadores' }))
    expect(pagination.getByText('Página 1 de 2')).toBeInTheDocument()
    expect(pagination.getByRole('button', { name: 'Anterior' })).toBeDisabled()

    await user.click(pagination.getByRole('button', { name: 'Seguinte' }))

    await waitFor(() => expect(lastCall()[0]).toMatchObject({ page: 2 }))
    expect(await screen.findByText('Página 2 de 2')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Seguinte' })).toBeDisabled())
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

  it('o separador Aprovados pede as contas aprovadas', async () => {
    const user = userEvent.setup()
    show()
    await waitForTable()

    await user.click(tab('Aprovados'))

    await waitFor(() => expect(lastCall()).toEqual([{ status: 'Approved', search: '', includeAdmins: false, page: 1 }, expect.any(AbortSignal)]))
    expect(tab('Aprovados')).toHaveAttribute('aria-pressed', 'true')
  })

  it('o separador Inativos pede os inativos não bloqueados e volta à primeira página', async () => {
    twoPages()
    const user = userEvent.setup()
    show()
    await waitForTable()

    await user.click(screen.getByRole('button', { name: 'Seguinte' }))
    await waitFor(() => expect(lastCall()[0]).toMatchObject({ page: 2 }))

    await user.click(tab('Inativos'))

    await waitFor(() => expect(lastCall()).toEqual([{ status: 'Inactive', blocked: false, search: '', includeAdmins: false, page: 1 }, expect.any(AbortSignal)]))
  })
})
