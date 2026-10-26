import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, CanceledError } from 'axios'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AdminEventsPage from '../../../src/pages/admin/AdminEventsPage'
import { createAdminEvent, deleteAdminEvent, exportEventAttendees, getAdminEvents, getEventAttendees, updateAdminEvent } from '../../../src/services/adminEvents'
import { getEventCategories, getLocations } from '../../../src/services/referenceLists'

vi.mock('../../../src/services/adminEvents', () => ({
  getAdminEvents: vi.fn(),
  exportEventAttendees: vi.fn(),
  createAdminEvent: vi.fn(),
  geocodeAddress: vi.fn(),
  updateAdminEvent: vi.fn(),
  deleteAdminEvent: vi.fn(),
  getEventAttendees: vi.fn(),
}))
vi.mock('../../../src/services/referenceLists', () => ({
  getSocialPlatforms: vi.fn(),
  getWeekDays: vi.fn(),
  getEventCategories: vi.fn(),
  getSectors: vi.fn(),
  getLocations: vi.fn(),
}))

const categories = [
  { id: 'c1', name: 'Workshop', color: '#6A1B9A' },
  { id: 'c2', name: 'Formação', color: '#1565C0' },
  { id: 'c3', name: 'Jantar', color: '#C62828' },
]

const locations = [
  { id: 'l1', name: 'Lisboa' },
  { id: 'l2', name: 'Porto' },
  { id: 'l3', name: 'Braga' },
]

const OPEN_DEADLINE = '2099-01-19T23:59:00+00:00'
const CLOSED_DEADLINE = '2020-01-14T23:59:00+00:00'

function event(id, name, overrides = {}) {
  return {
    id,
    name,
    category: categories[0],
    location: locations[0],
    event_date: '2099-01-21',
    event_start_time: '08:00',
    event_end_time: '10:00',
    description: 'Descrição pública.',
    address: 'Rua Castilho 39, 1250-068 Lisboa',
    venue_name: 'Centro de Congressos',
    latitude: 38.7223,
    longitude: -9.1533,
    max_attendees: 30,
    registration_deadline: OPEN_DEADLINE,
    organizer_notes: 'Notas do organizador.',
    registrations_count: 22,
    available_spots: 8,
    registration_open: true,
    is_online: false,
    ...overrides,
  }
}

const workshop = event('e1', 'Workshop de Liderança')
const online = event('e2', 'Formação Online', {
  category: categories[1],
  location: locations[1],
  event_date: '2099-02-10',
  address: null,
  latitude: null,
  longitude: null,
  is_online: true,
  online_url: 'https://meet.example.pt/sala',
  registration_deadline: CLOSED_DEADLINE,
  registrations_count: 10,
  max_attendees: 40,
})
const dinner = event('e3', 'Jantar de Natal', {
  category: categories[2],
  location: locations[2],
  registrations_count: 47,
  max_attendees: 50,
})

const items = [workshop, online, dinner]

const BASE_FILTERS = { period: 'upcoming', page: 1, dateFrom: '', dateTo: '', categoryId: '', locationId: '' }

function list(listItems = items, pagination = {}, counts = { upcoming: 4, past: 9 }) {
  return {
    items: listItems,
    pagination: { current_page: 1, per_page: 6, total: listItems.length, last_page: 1, ...pagination },
    counts,
  }
}

function sixEvents(prefix) {
  return Array.from({ length: 6 }, (_, index) => event(`${prefix}${index}`, `${prefix} evento ${index + 1}`))
}

function threePages() {
  getAdminEvents.mockImplementation((filters) => Promise.resolve(
    list(sixEvents('Página'), { current_page: filters.page, total: 13, last_page: 3 }),
  ))
}

function deferred() {
  let resolve
  const promise = new Promise((res) => { resolve = res })
  return { promise, resolve }
}

function show() {
  return render(<MemoryRouter><AdminEventsPage /></MemoryRouter>)
}

function lastCall() {
  return getAdminEvents.mock.calls.at(-1)
}

function periodTab(label) {
  return within(screen.getByRole('group', { name: 'Período dos eventos' })).getByRole('button', { name: new RegExp(`^${label}`) })
}

function rowOf(name) {
  return screen.getByText(name).closest('tr')
}

function cellOf(name, header) {
  const headers = screen.getAllByRole('columnheader').map((cell) => cell.textContent.trim())

  return rowOf(name).children[headers.indexOf(header)]
}

function categorySelect() {
  return screen.getByRole('combobox', { name: 'Tipo de evento' })
}

function locationSelect() {
  return screen.getByRole('combobox', { name: 'Distrito' })
}

async function waitForOptions() {
  await waitFor(() => expect(categorySelect()).toBeEnabled())
  await waitFor(() => expect(within(categorySelect()).getAllByRole('option')).toHaveLength(4))
}

function apiError(status, message) {
  return new AxiosError(`Request failed with status code ${status}`, AxiosError.ERR_BAD_RESPONSE, undefined, undefined, {
    status,
    statusText: 'Error',
    headers: {},
    config: {},
    data: { success: false, message },
  })
}

describe('Gestão de Eventos', () => {
  beforeEach(() => {
    getAdminEvents.mockResolvedValue(list())
    getEventCategories.mockResolvedValue(categories)
    getLocations.mockResolvedValue(locations)
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('mostra o carregamento e pede os agendados da primeira página sem filtros', async () => {
    show()

    expect(screen.getByText('A carregar eventos...')).toBeInTheDocument()
    expect(getAdminEvents).toHaveBeenNthCalledWith(1, BASE_FILTERS, expect.any(AbortSignal))
    await screen.findByRole('table')
  })

  it('mostra os separadores com contagens, o título e os cabeçalhos dos agendados', async () => {
    show()

    const table = await screen.findByRole('table', { name: 'Eventos agendados' })

    expect(periodTab('Agendados')).toHaveTextContent(/^Agendados\s*4$/)
    expect(periodTab('Agendados')).toHaveAttribute('aria-pressed', 'true')
    expect(periodTab('Passados')).toHaveTextContent(/^Passados\s*9$/)
    expect(periodTab('Passados')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('heading', { level: 2, name: 'Eventos Agendados' })).toBeInTheDocument()
    expect(within(table).getAllByRole('columnheader').map((header) => header.textContent.trim()))
      .toEqual(['Evento', 'Data e hora', 'Local', 'Inscrições até', 'Lotação', 'Ações'])
  })

  it('mostra a linha de um evento presencial com categoria, datas, local, prazo e lotação', async () => {
    show()
    await screen.findByRole('table')

    const row = within(rowOf('Workshop de Liderança'))

    expect(row.getByText('Workshop')).toHaveStyle({ backgroundColor: '#6A1B9A' })
    expect(row.getByText('21 Jan 2099')).toBeInTheDocument()
    expect(row.getByText('08:00–10:00')).toBeInTheDocument()
    expect(row.getByText('Lisboa')).toBeInTheDocument()
    expect(row.getByText('19 Jan 2099, 23:59')).toBeInTheDocument()
    expect(row.getByText('Abertas')).toBeInTheDocument()
    expect(row.getByText('22 / 30')).toBeInTheDocument()
    expect(row.getByText('73%')).toBeInTheDocument()
    expect(row.getByText('22 inscritos de 30 lugares (73%)')).toBeInTheDocument()
  })

  it('um evento online mostra Online com o distrito e as inscrições encerradas, sem o link', async () => {
    show()
    await screen.findByRole('table')

    const location = within(cellOf('Formação Online', 'Local'))

    expect(location.getByText('Online')).toBeInTheDocument()
    expect(location.getByText('Porto')).toBeInTheDocument()
    expect(within(rowOf('Formação Online')).getByText('Encerradas')).toBeInTheDocument()
    expect(screen.queryByText(/meet\.example\.pt/)).not.toBeInTheDocument()
  })

  it('nos agendados um evento a 94% fica marcado como quase esgotado', async () => {
    show()
    await screen.findByRole('table')

    expect(within(rowOf('Jantar de Natal')).getByText('47 inscritos de 50 lugares (94%), quase esgotado')).toBeInTheDocument()
  })

  it('o separador Passados mantém os filtros, volta à página 1 e mostra a participação sem aviso', async () => {
    const user = userEvent.setup()
    show()
    await screen.findByRole('table')
    await waitForOptions()

    await user.selectOptions(categorySelect(), 'c3')
    await waitFor(() => expect(lastCall()[0]).toMatchObject({ categoryId: 'c3' }))

    await user.click(periodTab('Passados'))

    await waitFor(() => expect(lastCall()).toEqual([{ ...BASE_FILTERS, period: 'past', categoryId: 'c3' }, expect.any(AbortSignal)]))
    expect(await screen.findByRole('heading', { level: 2, name: 'Eventos Passados' })).toBeInTheDocument()
    expect(periodTab('Passados')).toHaveAttribute('aria-pressed', 'true')
    const table = await screen.findByRole('table', { name: 'Eventos passados' })
    const headers = within(table).getAllByRole('columnheader').map((header) => header.textContent.trim())
    expect(headers).toContain('Participação')
    expect(headers).not.toContain('Lotação')
    expect(within(rowOf('Jantar de Natal')).getByText('47 inscritos de 50 lugares (94%)')).toBeInTheDocument()
    expect(screen.queryByText(/quase esgotado/)).not.toBeInTheDocument()
  })

  it('mostra a coluna de ações', async () => {
    show()
    await screen.findByRole('table')

    expect(screen.getByRole('columnheader', { name: 'Ações' })).toBeInTheDocument()
  })

  it('os filtros de tipo e distrito têm as opções da API e pedem a primeira página filtrada', async () => {
    const user = userEvent.setup()
    show()
    await screen.findByRole('table')
    await waitForOptions()

    expect(within(categorySelect()).getAllByRole('option').map((option) => option.textContent))
      .toEqual(['Todos os tipos', 'Workshop', 'Formação', 'Jantar'])
    expect(within(locationSelect()).getAllByRole('option').map((option) => option.textContent))
      .toEqual(['Todos os distritos', 'Lisboa', 'Porto', 'Braga'])

    await user.selectOptions(categorySelect(), 'c2')
    await waitFor(() => expect(lastCall()).toEqual([{ ...BASE_FILTERS, categoryId: 'c2' }, expect.any(AbortSignal)]))

    await user.selectOptions(locationSelect(), 'l2')
    await waitFor(() => expect(lastCall()).toEqual([{ ...BASE_FILTERS, categoryId: 'c2', locationId: 'l2' }, expect.any(AbortSignal)]))
  })

  it('a data De filtra os eventos e passa a ser o mínimo da data Até', async () => {
    show()
    await screen.findByRole('table')

    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-01-01' } })

    await waitFor(() => expect(lastCall()).toEqual([{ ...BASE_FILTERS, dateFrom: '2026-01-01' }, expect.any(AbortSignal)]))
    expect(screen.getByLabelText('Até')).toHaveAttribute('min', '2026-01-01')
  })

  it('Limpar mostra o número de filtros, limpa-os mantendo o separador e devolve o foco ao campo De', async () => {
    const user = userEvent.setup()
    show()
    await screen.findByRole('table')
    await waitForOptions()

    expect(screen.queryByRole('button', { name: /^Limpar/ })).not.toBeInTheDocument()

    await user.click(periodTab('Passados'))
    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-01-01' } })
    await user.selectOptions(categorySelect(), 'c1')

    const clear = await screen.findByRole('button', { name: 'Limpar (2)' })
    await user.click(clear)

    await waitFor(() => expect(lastCall()).toEqual([{ ...BASE_FILTERS, period: 'past' }, expect.any(AbortSignal)]))
    expect(screen.queryByRole('button', { name: /^Limpar/ })).not.toBeInTheDocument()
    expect(screen.getByLabelText('De')).toHaveFocus()
  })

  it('um intervalo de datas invertido mostra o erro junto ao Até e não faz o pedido', async () => {
    show()
    await screen.findByRole('table')

    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-11-20' } })
    fireEvent.change(screen.getByLabelText('Até'), { target: { value: '2026-11-19' } })

    expect(await screen.findByRole('alert')).toHaveTextContent('A data final tem de ser igual ou posterior à data inicial.')
    expect(screen.getByLabelText('Até')).toHaveAttribute('aria-invalid', 'true')
    expect(getAdminEvents.mock.calls.some(([filters]) => filters.dateTo === '2026-11-19')).toBe(false)

    fireEvent.change(screen.getByLabelText('Até'), { target: { value: '2026-11-25' } })

    await waitFor(() => expect(lastCall()).toEqual([{ ...BASE_FILTERS, dateFrom: '2026-11-20', dateTo: '2026-11-25' }, expect.any(AbortSignal)]))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })

  it('mostra o intervalo de resultados e muda de página com os mesmos filtros', async () => {
    threePages()
    const user = userEvent.setup()
    show()

    expect(await screen.findByText('1–6 de 13 eventos')).toBeInTheDocument()
    const pagination = screen.getByRole('navigation', { name: 'Paginação de eventos' })

    await user.click(within(pagination).getByRole('button', { name: 'Página 2' }))

    await waitFor(() => expect(lastCall()).toEqual([{ ...BASE_FILTERS, page: 2 }, expect.any(AbortSignal)]))
  })

  it('mudar um filtro estando na página 2 volta à página 1', async () => {
    threePages()
    const user = userEvent.setup()
    show()
    await screen.findByText('1–6 de 13 eventos')
    await waitForOptions()

    await user.click(screen.getByRole('button', { name: 'Página 2' }))
    await waitFor(() => expect(lastCall()[0]).toMatchObject({ page: 2 }))
    await screen.findByText('7–12 de 13 eventos')

    await user.selectOptions(locationSelect(), 'l3')

    await waitFor(() => expect(lastCall()).toEqual([{ ...BASE_FILTERS, locationId: 'l3' }, expect.any(AbortSignal)]))
  })

  it('enquanto a página seguinte carrega mantém a tabela ocupada e desativa a paginação', async () => {
    threePages()
    const user = userEvent.setup()
    show()
    await screen.findByText('1–6 de 13 eventos')

    const pending = deferred()
    getAdminEvents.mockImplementationOnce(() => pending.promise)
    await user.click(screen.getByRole('button', { name: 'Página 2' }))

    await waitFor(() => expect(screen.getByRole('table').closest('[aria-busy]')).toHaveAttribute('aria-busy', 'true'))
    expect(screen.getByText('Página evento 1')).toBeInTheDocument()
    for (const button of within(screen.getByRole('navigation', { name: 'Paginação de eventos' })).getAllByRole('button')) {
      expect(button).toBeDisabled()
    }

    await act(async () => { pending.resolve(list(sixEvents('Página'), { current_page: 2, total: 13, last_page: 3 })) })

    await waitFor(() => expect(screen.getByRole('button', { name: 'Página 3' })).toBeEnabled())
  })

  it('cancela o pedido anterior e ignora a sua resposta quando o filtro muda', async () => {
    const first = deferred()
    getAdminEvents
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValueOnce(list([event('b1', 'Nova Resposta')]))
    const user = userEvent.setup()
    show()
    await waitForOptions()

    await user.selectOptions(categorySelect(), 'c2')

    expect(getAdminEvents.mock.calls[0][1].aborted).toBe(true)
    expect(await screen.findByText('Nova Resposta')).toBeInTheDocument()

    await act(async () => { first.resolve(list([event('a1', 'Antiga Resposta')])) })

    expect(screen.getByText('Nova Resposta')).toBeInTheDocument()
    expect(screen.queryByText('Antiga Resposta')).not.toBeInTheDocument()
  })

  it('mostra a mensagem de lista vazia de cada separador e a de sem resultados com filtros', async () => {
    getAdminEvents.mockResolvedValue(list([], { total: 0 }, { upcoming: 0, past: 0 }))
    const user = userEvent.setup()
    show()

    expect(await screen.findByText('Não há eventos agendados.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Paginação de eventos' })).not.toBeInTheDocument()

    await user.click(periodTab('Passados'))
    expect(await screen.findByText('Não há eventos passados.')).toBeInTheDocument()

    await waitForOptions()
    await user.selectOptions(categorySelect(), 'c1')
    expect(await screen.findByText('Nenhum evento corresponde aos filtros.')).toBeInTheDocument()
    expect(screen.queryByText('Não há eventos passados.')).not.toBeInTheDocument()
  })

  it('mostra o erro da API e recupera com Tentar novamente usando os mesmos filtros', async () => {
    getAdminEvents.mockRejectedValueOnce(apiError(500, 'Erro interno.'))
    const user = userEvent.setup()
    show()

    expect(await screen.findByRole('alert')).toHaveTextContent('Erro interno.')

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(getAdminEvents).toHaveBeenCalledTimes(2)
    expect(getAdminEvents.mock.calls[1][0]).toEqual(getAdminEvents.mock.calls[0][0])
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('se as opções dos filtros falharem, desativa os selects, a tabela carrega e é possível tentar de novo', async () => {
    getEventCategories.mockRejectedValueOnce(new Error('Falha de rede'))
    const user = userEvent.setup()
    show()

    expect(await screen.findByText('Não foi possível carregar as opções dos filtros.')).toBeInTheDocument()
    expect(categorySelect()).toBeDisabled()
    expect(locationSelect()).toBeDisabled()
    expect(await screen.findByRole('table')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Tentar carregar filtros novamente' }))

    await waitForOptions()
    expect(locationSelect()).toBeEnabled()
    expect(within(locationSelect()).getAllByRole('option')).toHaveLength(4)
    expect(screen.queryByText('Não foi possível carregar as opções dos filtros.')).not.toBeInTheDocument()
  })

  it('uma categoria com cor inválida usa o azul-marinho no badge', async () => {
    getAdminEvents.mockResolvedValue(list([event('e9', 'Evento Sem Cor', { category: { id: 'c9', name: 'Sem cor', color: 'red' } })]))
    show()
    await screen.findByRole('table')

    expect(within(rowOf('Evento Sem Cor')).getByText('Sem cor')).toHaveStyle({ backgroundColor: '#0D1F35' })
  })

  it('sem prazo válido nem lotação válida mostra travessões', async () => {
    getAdminEvents.mockResolvedValue(list([event('e8', 'Evento Incompleto', { registration_deadline: null, max_attendees: null })]))
    show()
    await screen.findByRole('table')

    const deadline = cellOf('Evento Incompleto', 'Inscrições até')
    expect(deadline).toHaveTextContent('—')
    expect(deadline).not.toHaveTextContent(/Abertas|Encerradas/)

    const capacity = cellOf('Evento Incompleto', 'Lotação')
    expect(capacity).toHaveTextContent('—')
    expect(capacity).not.toHaveTextContent(/%|\//)
  })

  it('mostra Sessão X/Y só nos eventos de uma série, sem texto provisório nos outros', async () => {
    getAdminEvents.mockResolvedValue(list([
      event('s1', 'Grupo de Oração', { series: { position: 2, total: 5 } }),
      event('s2', 'Evento Pontual'),
    ]))
    show()
    await screen.findByRole('table')

    expect(within(rowOf('Grupo de Oração')).getByText('Sessão 2/5')).toBeInTheDocument()
    expect(within(rowOf('Evento Pontual')).queryByText(/^Sessão/)).not.toBeInTheDocument()
  })

  describe('Exportar lista de presenças', () => {
    const OPEN_MESSAGE = 'As inscrições ainda estão abertas. A lista de presenças só pode ser exportada depois do prazo de inscrição.'
    const NOTE = 'Dados sensíveis (art. 9.º do RGPD): numa associação cristã, estar inscrito num evento pode revelar convicções religiosas. Use a lista só dentro da ASPEC, não a envie a terceiros (ao local do evento indique só o número de inscritos) e apague o ficheiro depois de usado.'
    const closed = event('a1', 'Jantar — Lisboa', { registration_deadline: CLOSED_DEADLINE, registrations_count: 28, max_attendees: 40 })
    const open = event('b1', 'Workshop Aberto')
    const noDeadline = event('c1', 'Evento Sem Prazo', { registration_deadline: null })
    const originalCreateObjectURL = URL.createObjectURL
    const originalRevokeObjectURL = URL.revokeObjectURL
    let clicks
    let anchorClick

    function exportButton(name) {
      return screen.getByRole('button', { name: `Exportar lista de presenças de ${name}` })
    }

    async function openExportDialog(user) {
      await screen.findByRole('table')
      await user.click(exportButton('Jantar — Lisboa'))

      return screen.findByRole('dialog', { name: 'Exportar lista de presenças' })
    }

    async function downloadWith(user, result) {
      const dialog = await openExportDialog(user)
      exportEventAttendees.mockImplementationOnce(result)
      await user.click(within(dialog).getByRole('button', { name: 'Descarregar CSV' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    }

    function expectNoExportMessage() {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      for (const status of screen.queryAllByRole('status')) {
        expect(status).not.toHaveTextContent(/presenças|descarreg|export/i)
      }
      expect(screen.queryByText(/descarregada/i)).not.toBeInTheDocument()
    }

    function restoreUrl(name, original) {
      if (original === undefined) {
        delete URL[name]
      } else {
        URL[name] = original
      }
    }

    beforeEach(() => {
      getAdminEvents.mockResolvedValue(list([closed, open, noDeadline]))
      clicks = []
      URL.createObjectURL = vi.fn(() => 'blob:mock-1')
      URL.revokeObjectURL = vi.fn()
      anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
        clicks.push({ href: this.getAttribute('href'), download: this.download, connected: this.isConnected })
      })
    })
    afterEach(() => {
      anchorClick.mockRestore()
      restoreUrl('createObjectURL', originalCreateObjectURL)
      restoreUrl('revokeObjectURL', originalRevokeObjectURL)
    })

    it('o botão de exportar só fica ativo quando as inscrições estão encerradas', async () => {
      show()
      await screen.findByRole('table')

      const available = exportButton('Jantar — Lisboa')
      expect(cellOf('Jantar — Lisboa', 'Ações')).toContainElement(available)
      expect(available).toBeEnabled()
      expect(available).toHaveAttribute('title', 'Exportar lista de presenças')

      for (const name of ['Workshop Aberto', 'Evento Sem Prazo']) {
        const locked = exportButton(`${name} (disponível depois do prazo de inscrição)`)
        expect(cellOf(name, 'Ações')).toContainElement(locked)
        expect(locked).toBeDisabled()
        expect(locked).toHaveAttribute('title', 'Disponível depois do prazo de inscrição')
      }
    })

    it('nos passados o botão de exportar está ativo e não há editar nem apagar', async () => {
      getAdminEvents.mockResolvedValue(list([closed]))
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')

      await user.click(periodTab('Passados'))
      await screen.findByRole('table', { name: 'Eventos passados' })

      expect(exportButton('Jantar — Lisboa')).toBeEnabled()
      expect(screen.queryByRole('button', { name: /Editar/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Apagar/i })).not.toBeInTheDocument()
    })

    it('abre o diálogo com o evento, o número de inscritos e o aviso do RGPD sem descarregar nada', async () => {
      const user = userEvent.setup()
      show()

      const dialog = await openExportDialog(user)

      expect(dialog).toHaveAccessibleDescription('Vai descarregar a lista de presenças de «Jantar — Lisboa» (21 Jan 2099) com o nome, a empresa e o email e telefone pessoais dos 28 inscritos.')
      expect(within(dialog).getByRole('note')).toHaveTextContent(NOTE)
      expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toHaveFocus()
      expect(within(dialog).getByRole('button', { name: 'Descarregar CSV' })).toBeEnabled()
      expect(exportEventAttendees).not.toHaveBeenCalled()
    })

    it('Cancelar e Escape fecham o diálogo sem descarregar e devolvem o foco ao botão', async () => {
      const user = userEvent.setup()
      show()

      const dialog = await openExportDialog(user)
      await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(exportButton('Jantar — Lisboa')).toHaveFocus()

      await user.click(exportButton('Jantar — Lisboa'))
      await screen.findByRole('dialog', { name: 'Exportar lista de presenças' })
      await user.keyboard('{Escape}')

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(exportButton('Jantar — Lisboa')).toHaveFocus()
      expect(exportEventAttendees).not.toHaveBeenCalled()
    })

    it('enquanto descarrega mostra A processar e desativa os botões do diálogo e da tabela', async () => {
      const pending = deferred()
      exportEventAttendees.mockImplementationOnce(() => pending.promise)
      const user = userEvent.setup()
      show()

      const dialog = await openExportDialog(user)
      await user.click(within(dialog).getByRole('button', { name: 'Descarregar CSV' }))

      expect(exportEventAttendees).toHaveBeenCalledTimes(1)
      expect(exportEventAttendees).toHaveBeenCalledWith('a1')
      expect(within(dialog).getByRole('button', { name: 'A processar...' })).toBeDisabled()
      expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeDisabled()
      expect(exportButton('Jantar — Lisboa')).toBeDisabled()

      await act(async () => { pending.resolve({ blob: new Blob(['x']), filename: 'presencas.csv' }) })
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })

    it('descarrega o CSV com o nome do backend, revoga o URL e não mostra mensagem de sucesso', async () => {
      const blob = new Blob(['Nome;Empresa'], { type: 'text/csv' })
      const user = userEvent.setup()
      show()

      await downloadWith(user, () => Promise.resolve({ blob, filename: 'presencas_2099-01-21_jantar-lisboa.csv' }))

      expect(URL.createObjectURL).toHaveBeenCalledWith(blob)
      expect(clicks).toEqual([{ href: 'blob:mock-1', download: 'presencas_2099-01-21_jantar-lisboa.csv', connected: true }])
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-1')
      expectNoExportMessage()
      await waitFor(() => expect(exportButton('Jantar — Lisboa')).toHaveFocus())
      expect(document.querySelector('a[download]')).toBeNull()
    })

    it('sem nome do backend usa o nome com a data do evento', async () => {
      const user = userEvent.setup()
      show()

      await downloadWith(user, () => Promise.resolve({ blob: new Blob(['x']), filename: null }))

      expect(clicks).toHaveLength(1)
      expect(clicks[0].download).toBe('presencas_2099-01-21.csv')
    })

    it('mostra a mensagem do backend quando as inscrições ainda estão abertas', async () => {
      const user = userEvent.setup()
      show()

      await downloadWith(user, () => Promise.reject(apiError(409, OPEN_MESSAGE)))

      expect(await screen.findByRole('alert')).toHaveTextContent(OPEN_MESSAGE)
      expect(URL.createObjectURL).not.toHaveBeenCalled()
      expect(getAdminEvents).toHaveBeenCalledTimes(1)
    })

    it('se o evento já não existir avisa e recarrega a lista com os mesmos filtros', async () => {
      const user = userEvent.setup()
      show()

      await downloadWith(user, () => Promise.reject(apiError(404, 'Recurso não encontrado.')))

      expect(await screen.findByRole('alert')).toHaveTextContent('O evento já não existe. A lista foi atualizada.')
      expect(screen.queryByText('Recurso não encontrado.')).not.toBeInTheDocument()
      await waitFor(() => expect(getAdminEvents).toHaveBeenCalledTimes(2))
      expect(getAdminEvents).toHaveBeenLastCalledWith(getAdminEvents.mock.calls[0][0], expect.any(AbortSignal))
    })

    it('mostra a mensagem de demasiados pedidos', async () => {
      const user = userEvent.setup()
      show()

      await downloadWith(user, () => Promise.reject(apiError(429, 'Demasiados pedidos. Tente novamente mais tarde.')))

      expect(await screen.findByRole('alert')).toHaveTextContent('Demasiados pedidos. Tente novamente mais tarde.')
    })

    it('um pedido cancelado fecha o diálogo sem mensagem nem download', async () => {
      const user = userEvent.setup()
      show()

      await downloadWith(user, () => Promise.reject(new CanceledError()))

      expectNoExportMessage()
      expect(URL.createObjectURL).not.toHaveBeenCalled()
    })

    it('a mensagem de erro fecha-se e o botão fica desativado enquanto a lista recarrega', async () => {
      getAdminEvents.mockResolvedValue(list([closed, open, noDeadline], { total: 13, last_page: 3 }))
      const user = userEvent.setup()
      show()

      await downloadWith(user, () => Promise.reject(apiError(409, OPEN_MESSAGE)))
      await screen.findByRole('alert')
      await user.click(screen.getByRole('button', { name: 'Fechar mensagem' }))

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()

      const reload = deferred()
      getAdminEvents.mockImplementationOnce(() => reload.promise)
      await user.click(screen.getByRole('button', { name: 'Página 2' }))

      await waitFor(() => expect(exportButton('Jantar — Lisboa')).toBeDisabled())

      await act(async () => { reload.resolve(list([closed, open, noDeadline], { current_page: 2, total: 13, last_page: 3 })) })
    })
  })

  describe('Criar evento', () => {
    const SUCCESS = 'Evento criado com sucesso.'

    function createButton() {
      return screen.getByRole('button', { name: /Criar Evento/ })
    }

    function createDialog() {
      return screen.getByRole('dialog', { name: 'Criar Novo Evento' })
    }

    function dialogField(text) {
      const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      return within(createDialog()).getByLabelText(new RegExp(`^${escaped}\\s*\\*?$`))
    }

    async function fillValidInPerson(user) {
      await user.type(dialogField('Título do evento'), 'Jantar de Networking Lisboa')
      await user.selectOptions(dialogField('Tipo de evento'), 'c3')
      await user.selectOptions(dialogField('Delegação / Localidade'), 'l1')
      fireEvent.change(dialogField('Data'), { target: { value: '2099-03-20' } })
      fireEvent.change(dialogField('Hora de início'), { target: { value: '19:30' } })
      fireEvent.change(dialogField('Hora de fim'), { target: { value: '21:30' } })
      fireEvent.change(dialogField('Data limite de inscrição'), { target: { value: '2099-03-18' } })
      await user.type(dialogField('Nome do local'), 'Restaurante Estrela do Norte')
      await user.type(dialogField('Morada completa'), 'Rua das Flores 42')
      fireEvent.change(dialogField('Capacidade máxima'), { target: { value: '40' } })
      await user.type(dialogField('Sobre o evento'), 'Encontro mensal de networking entre membros.')
    }

    function successBanner() {
      return screen.queryAllByRole('status').find((element) => element.textContent.includes(SUCCESS))
    }

    it('o botão Criar Evento existe nos dois separadores e abre o modal com as opções já carregadas', async () => {
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')
      await waitForOptions()

      expect(createButton()).toBeInTheDocument()
      await user.click(periodTab('Passados'))
      await screen.findByRole('table', { name: 'Eventos passados' })
      expect(createButton()).toBeInTheDocument()

      await user.click(createButton())

      expect(createDialog()).toBeInTheDocument()
      expect(within(dialogField('Tipo de evento')).getAllByRole('option').map((option) => option.textContent))
        .toEqual(['Selecione o tipo de evento', 'Workshop', 'Formação', 'Jantar'])
      expect(within(dialogField('Delegação / Localidade')).getAllByRole('option').map((option) => option.textContent))
        .toEqual(['Selecione a delegação', 'Lisboa', 'Porto', 'Braga'])
      expect(getEventCategories).toHaveBeenCalledTimes(1)
      expect(getLocations).toHaveBeenCalledTimes(1)
    })

    it('depois de criar fecha o modal, mostra a mensagem e recarrega a lista com os mesmos filtros', async () => {
      createAdminEvent.mockResolvedValue({ success: true, message: SUCCESS, data: { id: 'n1' } })
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')
      await waitForOptions()

      await user.click(periodTab('Passados'))
      await user.selectOptions(categorySelect(), 'c3')
      await waitFor(() => expect(lastCall()).toEqual([{ ...BASE_FILTERS, period: 'past', categoryId: 'c3' }, expect.any(AbortSignal)]))
      await screen.findByRole('table', { name: 'Eventos passados' })
      const callsBefore = getAdminEvents.mock.calls.length

      await user.click(createButton())
      await fillValidInPerson(user)
      await user.click(within(createDialog()).getByRole('button', { name: 'Criar evento' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(createAdminEvent).toHaveBeenCalledTimes(1)
      await waitFor(() => expect(successBanner()).toBeDefined())
      await waitFor(() => expect(getAdminEvents.mock.calls.length).toBe(callsBefore + 1))
      expect(lastCall()).toEqual([{ ...BASE_FILTERS, period: 'past', categoryId: 'c3' }, expect.any(AbortSignal)])
      await waitFor(() => expect(createButton()).toHaveFocus())

      await user.click(within(successBanner()).getByRole('button', { name: 'Fechar mensagem' }))

      expect(successBanner()).toBeUndefined()
    })

    it('Cancelar fecha o modal sem mensagem nem novo pedido e devolve o foco ao botão', async () => {
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')
      const callsBefore = getAdminEvents.mock.calls.length

      await user.click(createButton())
      await user.click(within(createDialog()).getByRole('button', { name: 'Cancelar' }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(createButton()).toHaveFocus()
      expect(screen.queryByText(SUCCESS)).not.toBeInTheDocument()
      expect(getAdminEvents).toHaveBeenCalledTimes(callsBefore)
      expect(createAdminEvent).not.toHaveBeenCalled()
    })
  })

  describe('Editar evento', () => {
    const SUCCESS = 'Evento atualizado com sucesso.'
    const PASSED = 'Não é possível alterar um evento que já decorreu.'

    function editButton(name = 'Workshop de Liderança') {
      return screen.getByRole('button', { name: `Editar ${name}` })
    }

    function editDialog() {
      return screen.getByRole('dialog', { name: 'Editar Evento' })
    }

    function dialogField(text) {
      const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      return within(editDialog()).getByLabelText(new RegExp(`^${escaped}\\s*\\*?$`))
    }

    function successBanner() {
      return screen.queryAllByRole('status').find((element) => element.textContent.includes(SUCCESS))
    }

    async function editTitleAndSave(user) {
      await user.click(editButton())
      await user.type(dialogField('Título do evento'), ' — nova data')
      await user.click(within(editDialog()).getByRole('button', { name: 'Guardar alterações' }))
    }

    it('nos agendados cada linha tem o botão de editar depois do de exportar, desativado enquanto a lista recarrega', async () => {
      threePages()
      const user = userEvent.setup()
      show()
      await screen.findByText('1–6 de 13 eventos')

      for (let index = 1; index <= 6; index += 1) {
        const name = `Página evento ${index}`
        const cell = cellOf(name, 'Ações')
        const edit = editButton(name)
        const exportButton = within(cell).getByRole('button', { name: /^Exportar/ })

        expect(cell).toContainElement(edit)
        expect(edit).toHaveAttribute('title', 'Editar evento')
        expect(exportButton.compareDocumentPosition(edit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        expect(edit).toBeEnabled()
      }

      const pending = deferred()
      getAdminEvents.mockImplementationOnce(() => pending.promise)
      await user.click(screen.getByRole('button', { name: 'Página 2' }))

      await waitFor(() => expect(editButton('Página evento 1')).toBeDisabled())
      for (const button of screen.getAllByRole('button', { name: /^Editar / })) {
        expect(button).toBeDisabled()
      }

      await act(async () => { pending.resolve(list(sixEvents('Página'), { current_page: 2, total: 13, last_page: 3 })) })
    })

    it('o botão de editar abre o modal com os dados do evento e as opções já carregadas', async () => {
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')
      await waitForOptions()

      await user.click(editButton())

      expect(editDialog()).toBeInTheDocument()
      expect(dialogField('Título do evento')).toHaveValue('Workshop de Liderança')
      expect(within(dialogField('Tipo de evento')).getAllByRole('option').map((option) => option.textContent))
        .toEqual(['Selecione o tipo de evento', 'Workshop', 'Formação', 'Jantar'])
      expect(within(dialogField('Delegação / Localidade')).getAllByRole('option').map((option) => option.textContent))
        .toEqual(['Selecione a delegação', 'Lisboa', 'Porto', 'Braga'])
      expect(getEventCategories).toHaveBeenCalledTimes(1)
      expect(getLocations).toHaveBeenCalledTimes(1)
    })

    it('depois de guardar fecha o modal, mostra a mensagem, recarrega com os mesmos filtros e devolve o foco', async () => {
      updateAdminEvent.mockResolvedValue({ success: true, message: SUCCESS, data: { id: 'e1' } })
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')
      await waitForOptions()

      await user.selectOptions(categorySelect(), 'c1')
      await waitFor(() => expect(lastCall()).toEqual([{ ...BASE_FILTERS, categoryId: 'c1' }, expect.any(AbortSignal)]))
      await screen.findByRole('table')
      await waitFor(() => expect(editButton()).toBeEnabled())
      const callsBefore = getAdminEvents.mock.calls.length

      await editTitleAndSave(user)

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      await waitFor(() => expect(editButton()).toHaveFocus())
      expect(updateAdminEvent).toHaveBeenCalledTimes(1)
      await waitFor(() => expect(successBanner()).toBeDefined())
      await waitFor(() => expect(getAdminEvents.mock.calls.length).toBe(callsBefore + 1))
      expect(lastCall()).toEqual([{ ...BASE_FILTERS, categoryId: 'c1' }, expect.any(AbortSignal)])

      await user.click(within(successBanner()).getByRole('button', { name: 'Fechar mensagem' }))

      expect(successBanner()).toBeUndefined()
    })

    it('se o evento já decorreu fecha o modal, mostra o erro e recarrega com os mesmos filtros', async () => {
      updateAdminEvent.mockRejectedValueOnce(apiError(409, PASSED))
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')
      const callsBefore = getAdminEvents.mock.calls.length

      await editTitleAndSave(user)

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(await screen.findByRole('alert')).toHaveTextContent(PASSED)
      await waitFor(() => expect(getAdminEvents.mock.calls.length).toBe(callsBefore + 1))
      expect(lastCall()).toEqual([BASE_FILTERS, expect.any(AbortSignal)])
    })

    it('Cancelar fecha o modal sem mensagem nem novo pedido e devolve o foco ao botão', async () => {
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')
      const callsBefore = getAdminEvents.mock.calls.length

      await user.click(editButton())
      await user.click(within(editDialog()).getByRole('button', { name: 'Cancelar' }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(editButton()).toHaveFocus()
      expect(screen.queryByText(SUCCESS)).not.toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(getAdminEvents).toHaveBeenCalledTimes(callsBefore)
      expect(updateAdminEvent).not.toHaveBeenCalled()
    })
  })

  describe('Apagar evento', () => {
    const DELETED = 'Evento eliminado com sucesso.'
    const PASSED = 'Não é possível alterar um evento que já decorreu.'
    const HINT = 'A justificação é obrigatória para apagar o evento.'
    const REGISTRANTS_CHANGED = 'Entretanto houve inscrições neste evento e a justificação passou a ser obrigatória. A lista foi atualizada: carregue de novo em Apagar para a escrever.'
    const empty = event('e4', 'Almoço Sem Inscritos', { registrations_count: 0 })

    function deleteButton(name = 'Workshop de Liderança') {
      return screen.getByRole('button', { name: `Apagar ${name}` })
    }

    function deleteDialog() {
      return screen.getByRole('dialog', { name: 'Apagar evento?' })
    }

    function justificationField() {
      return within(deleteDialog()).getByRole('textbox', { name: 'Justificação' })
    }

    function dialogButton(name) {
      return within(deleteDialog()).getByRole('button', { name })
    }

    function successBanner() {
      return screen.queryAllByRole('status').find((element) => element.textContent.includes(DELETED))
    }

    function validationError() {
      return new AxiosError('Request failed with status code 422', AxiosError.ERR_BAD_REQUEST, undefined, undefined, {
        status: 422,
        statusText: 'Error',
        headers: {},
        config: {},
        data: {
          success: false,
          message: 'Os dados enviados são inválidos.',
          errors: { justification: ['O campo justification é obrigatório.'] },
        },
      })
    }

    async function openWithJustification(user, text = 'O orador adoeceu.') {
      await screen.findByRole('table')
      await user.click(deleteButton())
      await user.type(justificationField(), text)
    }

    beforeEach(() => {
      getAdminEvents.mockResolvedValue(list([workshop, online, dinner, empty]))
    })

    it('nos agendados cada linha tem o botão de apagar depois do de editar, desativado enquanto a lista recarrega', async () => {
      threePages()
      const user = userEvent.setup()
      show()
      await screen.findByText('1–6 de 13 eventos')

      for (let index = 1; index <= 6; index += 1) {
        const name = `Página evento ${index}`
        const cell = cellOf(name, 'Ações')
        const remove = deleteButton(name)
        const exportButton = within(cell).getByRole('button', { name: /^Exportar/ })
        const edit = within(cell).getByRole('button', { name: `Editar ${name}` })

        expect(cell).toContainElement(remove)
        expect(remove).toHaveAttribute('title', 'Apagar evento')
        expect(remove).toHaveAttribute('aria-haspopup', 'dialog')
        expect(exportButton.compareDocumentPosition(edit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        expect(edit.compareDocumentPosition(remove) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        expect(remove).toBeEnabled()
      }

      const pending = deferred()
      getAdminEvents.mockImplementationOnce(() => pending.promise)
      await user.click(screen.getByRole('button', { name: 'Página 2' }))

      await waitFor(() => expect(deleteButton('Página evento 1')).toBeDisabled())
      for (const button of screen.getAllByRole('button', { name: /^Apagar / })) {
        expect(button).toBeDisabled()
      }

      await act(async () => { pending.resolve(list(sixEvents('Página'), { current_page: 2, total: 13, last_page: 3 })) })
    })

    it('com inscritos abre o diálogo com a justificação obrigatória e o botão de apagar desativado', async () => {
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')

      await user.click(deleteButton())

      expect(screen.getAllByRole('dialog')).toHaveLength(1)
      const dialog = deleteDialog()
      expect(dialog).toHaveAccessibleDescription(expect.stringContaining('«Workshop de Liderança» (21 Jan 2099)'))
      expect(dialog).toHaveAccessibleDescription(expect.stringContaining('22 inscritos'))
      expect(dialog).toHaveAccessibleDescription(expect.stringContaining('apagados definitivamente'))
      expect(justificationField()).toBeRequired()
      expect(justificationField()).toHaveFocus()
      expect(justificationField()).toHaveAttribute('placeholder', 'Explique aos inscritos o motivo do cancelamento.')
      expect(justificationField()).toHaveAccessibleDescription(expect.stringContaining(HINT))
      expect(dialogButton('Voltar')).toBeEnabled()
      expect(dialogButton('Apagar e notificar')).toBeDisabled()
      expect(deleteAdminEvent).not.toHaveBeenCalled()
    })

    it('apaga com a justificação, bloqueia tudo durante o pedido e recarrega com os mesmos filtros', async () => {
      const pending = deferred()
      deleteAdminEvent.mockImplementationOnce(() => pending.promise)
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')
      await waitForOptions()

      await user.selectOptions(categorySelect(), 'c1')
      await waitFor(() => expect(lastCall()).toEqual([{ ...BASE_FILTERS, categoryId: 'c1' }, expect.any(AbortSignal)]))
      await screen.findByRole('table')
      await waitFor(() => expect(deleteButton()).toBeEnabled())
      const callsBefore = getAdminEvents.mock.calls.length

      await user.click(deleteButton())
      await user.type(justificationField(), 'O orador adoeceu.')
      await user.click(dialogButton('Apagar e notificar'))

      expect(deleteAdminEvent).toHaveBeenCalledTimes(1)
      expect(deleteAdminEvent).toHaveBeenCalledWith('e1', 'O orador adoeceu.')
      expect(dialogButton('A processar...')).toBeDisabled()
      expect(justificationField()).toBeDisabled()
      expect(dialogButton('Voltar')).toBeDisabled()
      expect(dialogButton('Fechar')).toBeDisabled()
      fireEvent.keyDown(deleteDialog(), { key: 'Escape' })
      expect(deleteDialog()).toBeInTheDocument()
      for (const button of screen.getAllByRole('button', { name: /^(Apagar|Editar) / })) {
        expect(button).toBeDisabled()
      }

      await act(async () => { pending.resolve({ success: true, message: DELETED, data: null }) })

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      await waitFor(() => expect(successBanner()).toBeDefined())
      await waitFor(() => expect(getAdminEvents.mock.calls.length).toBe(callsBefore + 1))
      expect(lastCall()).toEqual([{ ...BASE_FILTERS, categoryId: 'c1' }, expect.any(AbortSignal)])
    })

    it('sem inscritos abre uma confirmação sem campo e apaga sem justificação', async () => {
      deleteAdminEvent.mockResolvedValueOnce({ success: true, message: DELETED, data: null })
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')
      const callsBefore = getAdminEvents.mock.calls.length

      await user.click(deleteButton('Almoço Sem Inscritos'))

      const dialog = deleteDialog()
      expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument()
      expect(dialog).toHaveAccessibleDescription(expect.stringContaining('não tem inscritos, por isso ninguém é notificado'))
      expect(dialogButton('Voltar')).toHaveFocus()

      await user.click(dialogButton('Apagar evento'))

      expect(deleteAdminEvent).toHaveBeenCalledWith('e4')
      expect(deleteAdminEvent.mock.calls).toEqual([['e4']])
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      await waitFor(() => expect(successBanner()).toBeDefined())
      await waitFor(() => expect(getAdminEvents.mock.calls.length).toBe(callsBefore + 1))
      expect(lastCall()).toEqual([BASE_FILTERS, expect.any(AbortSignal)])
    })

    it('se o evento já decorreu fecha o diálogo, mostra o erro e recarrega com os mesmos filtros', async () => {
      deleteAdminEvent.mockRejectedValueOnce(apiError(409, PASSED))
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')
      const callsBefore = getAdminEvents.mock.calls.length

      await openWithJustification(user)
      await user.click(dialogButton('Apagar e notificar'))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(await screen.findByRole('alert')).toHaveTextContent(PASSED)
      await waitFor(() => expect(getAdminEvents.mock.calls.length).toBe(callsBefore + 1))
      expect(lastCall()).toEqual([BASE_FILTERS, expect.any(AbortSignal)])
    })

    it('se o evento já não existir fecha o diálogo, avisa e recarrega', async () => {
      deleteAdminEvent.mockRejectedValueOnce(apiError(404, 'Recurso não encontrado.'))
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')
      const callsBefore = getAdminEvents.mock.calls.length

      await openWithJustification(user)
      await user.click(dialogButton('Apagar e notificar'))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(await screen.findByRole('alert')).toHaveTextContent('O evento já não existe. A lista foi atualizada.')
      expect(screen.queryByText('Recurso não encontrado.')).not.toBeInTheDocument()
      await waitFor(() => expect(getAdminEvents.mock.calls.length).toBe(callsBefore + 1))
      expect(lastCall()).toEqual([BASE_FILTERS, expect.any(AbortSignal)])
    })

    it('sem inscritos, se entretanto houver inscrições, explica que a justificação passou a ser obrigatória e recarrega', async () => {
      deleteAdminEvent.mockRejectedValueOnce(validationError())
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')
      const callsBefore = getAdminEvents.mock.calls.length

      await user.click(deleteButton('Almoço Sem Inscritos'))
      await user.click(dialogButton('Apagar evento'))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(await screen.findByRole('alert')).toHaveTextContent(REGISTRANTS_CHANGED)
      expect(screen.queryByText(/O campo justification/)).not.toBeInTheDocument()
      await waitFor(() => expect(getAdminEvents.mock.calls.length).toBe(callsBefore + 1))
      expect(lastCall()).toEqual([BASE_FILTERS, expect.any(AbortSignal)])
    })

    it('com inscritos, num erro do servidor o diálogo fica aberto com o erro e o texto e pode tentar de novo', async () => {
      const retry = deferred()
      deleteAdminEvent
        .mockRejectedValueOnce(apiError(500, 'Erro interno do servidor.'))
        .mockImplementationOnce(() => retry.promise)
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')
      const callsBefore = getAdminEvents.mock.calls.length

      await openWithJustification(user)
      await user.click(dialogButton('Apagar e notificar'))

      const alert = await within(deleteDialog()).findByRole('alert')
      expect(alert).toHaveTextContent('Erro interno do servidor.')
      expect(screen.getAllByRole('alert')).toHaveLength(1)
      expect(justificationField()).toHaveValue('O orador adoeceu.')
      expect(getAdminEvents).toHaveBeenCalledTimes(callsBefore)

      await user.click(dialogButton('Apagar e notificar'))

      expect(deleteAdminEvent).toHaveBeenCalledTimes(2)
      expect(deleteAdminEvent).toHaveBeenLastCalledWith('e1', 'O orador adoeceu.')
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()

      await act(async () => { retry.resolve({ success: true, message: DELETED, data: null }) })

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      await waitFor(() => expect(successBanner()).toBeDefined())
    })

    it('sem inscritos, com demasiados pedidos fecha o diálogo e mostra o erro sem recarregar', async () => {
      deleteAdminEvent.mockRejectedValueOnce(apiError(429, 'Demasiados pedidos. Tente novamente mais tarde.'))
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')
      const callsBefore = getAdminEvents.mock.calls.length

      await user.click(deleteButton('Almoço Sem Inscritos'))
      await user.click(dialogButton('Apagar evento'))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(await screen.findByRole('alert')).toHaveTextContent('Demasiados pedidos. Tente novamente mais tarde.')
      expect(getAdminEvents).toHaveBeenCalledTimes(callsBefore)
    })

    it('Voltar, Fechar e Escape fecham sem pedido nem mensagem, devolvem o foco e o campo recomeça vazio', async () => {
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')
      const callsBefore = getAdminEvents.mock.calls.length

      await openWithJustification(user, 'Texto a perder')
      await user.click(dialogButton('Voltar'))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(deleteButton()).toHaveFocus()

      await user.click(deleteButton())
      expect(justificationField()).toHaveValue('')
      await user.click(dialogButton('Fechar'))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(deleteButton()).toHaveFocus()

      await user.click(deleteButton())
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(deleteButton()).toHaveFocus()

      expect(deleteAdminEvent).not.toHaveBeenCalled()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(successBanner()).toBeUndefined()
      expect(getAdminEvents).toHaveBeenCalledTimes(callsBefore)
    })

    it('dois cliques rápidos em Apagar e notificar fazem um só pedido', async () => {
      const pending = deferred()
      deleteAdminEvent.mockImplementation(() => pending.promise)
      const user = userEvent.setup()
      show()

      await openWithJustification(user)
      const confirm = dialogButton('Apagar e notificar')
      fireEvent.click(confirm)
      fireEvent.click(confirm)

      expect(deleteAdminEvent).toHaveBeenCalledTimes(1)

      await act(async () => { pending.resolve({ success: true, message: DELETED, data: null }) })
    })

    it('um pedido cancelado não mostra erro nem mensagem', async () => {
      deleteAdminEvent.mockRejectedValueOnce(new CanceledError())
      const user = userEvent.setup()
      show()

      await openWithJustification(user)
      await user.click(dialogButton('Apagar e notificar'))

      await waitFor(() => expect(deleteAdminEvent).toHaveBeenCalledTimes(1))
      await act(async () => {})
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(successBanner()).toBeUndefined()
    })

    it('se a página ficar vazia depois de apagar passa para a última página que existe', async () => {
      let deleted = false
      getAdminEvents.mockImplementation((filters) => {
        if (filters.page === 3) {
          return Promise.resolve(deleted
            ? list([], { current_page: 3, total: 12, last_page: 2 })
            : list([event('z1', 'Último evento')], { current_page: 3, total: 13, last_page: 3 }))
        }

        return Promise.resolve(list(sixEvents(`P${filters.page}`), { current_page: filters.page, total: deleted ? 12 : 13, last_page: deleted ? 2 : 3 }))
      })
      deleteAdminEvent.mockImplementationOnce(() => {
        deleted = true
        return Promise.resolve({ success: true, message: DELETED, data: null })
      })
      const emptySeen = []
      const observer = new MutationObserver(() => {
        if (document.body.textContent.includes('Não há eventos agendados.')) emptySeen.push(true)
      })
      observer.observe(document.body, { childList: true, subtree: true, characterData: true })
      const user = userEvent.setup()
      show()
      await screen.findByText('1–6 de 13 eventos')

      await user.click(within(screen.getByRole('navigation', { name: 'Paginação de eventos' })).getByRole('button', { name: 'Página 3' }))
      await screen.findByText('Último evento')
      await waitFor(() => expect(deleteButton('Último evento')).toBeEnabled())

      await user.click(deleteButton('Último evento'))
      await user.type(justificationField(), 'O orador adoeceu.')
      await user.click(dialogButton('Apagar e notificar'))

      await waitFor(() => expect(lastCall()).toEqual([{ ...BASE_FILTERS, page: 2 }, expect.any(AbortSignal)]))
      expect(await screen.findByText('P2 evento 1')).toBeInTheDocument()
      const pagination = screen.getByRole('navigation', { name: 'Paginação de eventos' })
      expect(within(pagination).getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')
      observer.disconnect()
      expect(emptySeen).toEqual([])
      expect(screen.queryByText('Não há eventos agendados.')).not.toBeInTheDocument()
    })

    it('na página 1 uma lista vazia mostra a mensagem de vazio sem pedido extra', async () => {
      getAdminEvents.mockResolvedValue(list([], { current_page: 1, total: 0, last_page: 1 }, { upcoming: 0, past: 0 }))
      show()

      expect(await screen.findByText('Não há eventos agendados.')).toBeInTheDocument()
      await act(async () => {})
      expect(getAdminEvents).toHaveBeenCalledTimes(1)
    })
  })

  describe('Inscritos do evento', () => {
    const NOTE = 'Dados sensíveis (art. 9.º do RGPD): numa associação cristã, estar inscrito num evento pode revelar convicções religiosas. Use esta lista só dentro da ASPEC e não a partilhe com terceiros (ao local do evento indique só o número de inscritos).'
    const WORKSHOP_DESCRIPTION = '«Workshop de Liderança» (21 Jan 2099)'
    const empty = event('e4', 'Almoço Sem Inscritos', { registrations_count: 0 })
    const attendees = [
      { id: 'r1', name: 'Álvaro Dias', business_name: 'Dias & Filhos, Lda.', registered_at: '2026-07-15T13:05:00+00:00', email: 'alvaro.dias@example.pt', phone: '+351910000001' },
      { id: 'r2', name: 'andré Costa', business_name: 'Costa Lda.', registered_at: '2026-12-01T09:30:00+00:00', email: 'andre@example.pt', phone: '+351910000002' },
      { id: 'r3', name: 'Utilizador Anónimo', business_name: 'Empresa Removida', registered_at: '2026-07-16T09:00:00+00:00' },
      { id: 'r4', name: null, business_name: null, registered_at: '2026-07-17T18:30:00+00:00', email: 'admin@example.pt', phone: '+351210000003' },
    ]

    function attendeesButton(name) {
      return screen.getByRole('button', { name: `Ver inscritos de ${name}` })
    }

    function attendeesDialog() {
      return screen.getByRole('dialog', { name: 'Inscritos' })
    }

    function dialogButton(name) {
      return within(attendeesDialog()).getByRole('button', { name })
    }

    function attendeesTable() {
      return within(attendeesDialog()).getByRole('table', { name: 'Inscritos do evento' })
    }

    function attendeeRows() {
      return within(attendeesTable()).getAllByRole('row').slice(1)
    }

    async function openAttendees(user, name = 'Workshop de Liderança') {
      await screen.findByRole('table')
      await user.click(attendeesButton(name))

      return screen.findByRole('dialog', { name: 'Inscritos' })
    }

    beforeEach(() => {
      getAdminEvents.mockResolvedValue(list([workshop, online, empty]))
    })

    it('cada linha tem o botão de ver inscritos antes do de exportar, ativo mesmo sem inscritos ou com o prazo encerrado', async () => {
      show()
      await screen.findByRole('table')

      for (const name of ['Workshop de Liderança', 'Formação Online', 'Almoço Sem Inscritos']) {
        const cell = cellOf(name, 'Ações')
        const view = attendeesButton(name)
        const exportButton = within(cell).getByRole('button', { name: /^Exportar/ })

        expect(cell).toContainElement(view)
        expect(view).toBeEnabled()
        expect(view).toHaveAttribute('title', 'Ver inscritos')
        expect(view).toHaveAttribute('aria-haspopup', 'dialog')
        expect(view.compareDocumentPosition(exportButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      }
    })

    it('nos passados o botão de ver inscritos também existe e está ativo, sem editar nem apagar', async () => {
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')

      await user.click(periodTab('Passados'))
      await screen.findByRole('table', { name: 'Eventos passados' })

      for (const name of ['Workshop de Liderança', 'Formação Online', 'Almoço Sem Inscritos']) {
        expect(cellOf(name, 'Ações')).toContainElement(attendeesButton(name))
        expect(attendeesButton(name)).toBeEnabled()
      }
      expect(screen.queryByRole('button', { name: /Editar/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Apagar/i })).not.toBeInTheDocument()
    })

    it('os botões de ver inscritos ficam desativados enquanto a lista recarrega', async () => {
      threePages()
      const user = userEvent.setup()
      show()
      await screen.findByText('1–6 de 13 eventos')

      const pending = deferred()
      getAdminEvents.mockImplementationOnce(() => pending.promise)
      await user.click(screen.getByRole('button', { name: 'Página 2' }))

      await waitFor(() => expect(attendeesButton('Página evento 1')).toBeDisabled())
      for (const button of screen.getAllByRole('button', { name: /^Ver inscritos de / })) {
        expect(button).toBeDisabled()
      }

      await act(async () => { pending.resolve(list(sixEvents('Página'), { current_page: 2, total: 13, last_page: 3 })) })
    })

    it('abre um só diálogo com o evento e o carregamento, foca Fechar e pede os inscritos desse evento', async () => {
      const pending = deferred()
      getEventAttendees.mockImplementation(() => pending.promise)
      const user = userEvent.setup()
      show()

      const dialog = await openAttendees(user)

      expect(screen.getAllByRole('dialog')).toHaveLength(1)
      expect(dialog).toHaveAccessibleDescription(WORKSHOP_DESCRIPTION)
      expect(within(dialog).getByRole('status')).toHaveTextContent('A carregar inscritos...')
      expect(within(dialog).getByRole('button', { name: 'Fechar' })).toHaveFocus()
      expect(getEventAttendees).toHaveBeenCalledTimes(1)
      expect(getEventAttendees).toHaveBeenCalledWith('e1', expect.any(AbortSignal))
      expect(exportEventAttendees).not.toHaveBeenCalled()
      expect(deleteAdminEvent).not.toHaveBeenCalled()
      expect(updateAdminEvent).not.toHaveBeenCalled()

      await act(async () => { pending.resolve(attendees) })
    })

    it('mostra o nome, a empresa e a data de inscrição pela ordem recebida, sem contactos pessoais', async () => {
      getEventAttendees.mockResolvedValue(attendees)
      const user = userEvent.setup()
      show()

      const dialog = await openAttendees(user)
      const table = await within(dialog).findByRole('table', { name: 'Inscritos do evento' })

      expect(within(table).getAllByRole('columnheader').map((header) => header.textContent.trim()))
        .toEqual(['Nome', 'Empresa', 'Data de inscrição'])
      expect(attendeeRows().map((row) => row.children[0].textContent.trim()))
        .toEqual(['Álvaro Dias', 'andré Costa', 'Utilizador Anónimo', 'Conta sem perfil'])
      expect(attendeeRows()[0]).toHaveTextContent('15 Jul 2026, 14:05')
      expect(attendeeRows()[1]).toHaveTextContent('1 Dez 2026, 09:30')
      expect(attendeeRows()[2].children[1]).toHaveTextContent('Empresa Removida')
      expect(attendeeRows()[3].children[1].textContent.trim()).toBe('—')
      expect(dialog).toHaveAccessibleDescription(`${WORKSHOP_DESCRIPTION} · 4 inscritos de 30 lugares`)
      expect(within(dialog).getByRole('note')).toHaveTextContent(NOTE)
      expect(screen.queryByText('alvaro.dias@example.pt')).not.toBeInTheDocument()
      expect(screen.queryByText('+351910000001')).not.toBeInTheDocument()
      expect(screen.queryByText('admin@example.pt')).not.toBeInTheDocument()
      expect(within(dialog).getByRole('region', { name: 'Lista de inscritos' })).toHaveAttribute('tabindex', '0')
    })

    it('sem inscritos diz que a lista está vazia e mantém o aviso do RGPD', async () => {
      getEventAttendees.mockResolvedValue([])
      const user = userEvent.setup()
      show()

      const dialog = await openAttendees(user, 'Almoço Sem Inscritos')

      expect(await within(dialog).findByRole('status')).toHaveTextContent('Este evento não tem inscritos.')
      expect(within(dialog).queryByRole('table')).not.toBeInTheDocument()
      expect(dialog).toHaveAccessibleDescription('«Almoço Sem Inscritos» (21 Jan 2099) · 0 inscritos de 30 lugares')
      expect(within(dialog).getByRole('note')).toHaveTextContent(NOTE)
    })

    it('um erro do servidor aparece dentro do diálogo e Tentar novamente volta a pedir', async () => {
      getEventAttendees.mockRejectedValueOnce(apiError(500, 'Erro interno do servidor.'))
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')
      const callsBefore = getAdminEvents.mock.calls.length

      const dialog = await openAttendees(user)

      expect(await within(dialog).findByRole('alert')).toHaveTextContent('Erro interno do servidor.')
      expect(dialog).toHaveAccessibleDescription(WORKSHOP_DESCRIPTION)
      for (const alert of screen.getAllByRole('alert')) {
        expect(dialog).toContainElement(alert)
      }
      expect(getAdminEvents).toHaveBeenCalledTimes(callsBefore)

      const pending = deferred()
      getEventAttendees.mockImplementationOnce(() => pending.promise)
      await user.click(dialogButton('Tentar novamente'))

      expect(within(attendeesDialog()).getByRole('status')).toHaveTextContent('A carregar inscritos...')
      await act(async () => { pending.resolve(attendees) })
      expect(attendeesTable()).toBeInTheDocument()
      expect(getEventAttendees.mock.calls.map((call) => call[0])).toEqual(['e1', 'e1'])
    })

    it('com demasiados pedidos mostra a mensagem do backend e permite tentar de novo', async () => {
      getEventAttendees.mockRejectedValueOnce(apiError(429, 'Demasiados pedidos. Tente novamente mais tarde.'))
      const user = userEvent.setup()
      show()

      const dialog = await openAttendees(user)

      expect(await within(dialog).findByRole('alert')).toHaveTextContent('Demasiados pedidos. Tente novamente mais tarde.')
      expect(within(dialog).getByRole('button', { name: 'Tentar novamente' })).toBeEnabled()
    })

    it('uma resposta com formato inesperado mostra a frase própria e não fala em contactar o servidor', async () => {
      getEventAttendees.mockRejectedValueOnce(new Error('A resposta dos inscritos tem um formato inesperado.'))
      const user = userEvent.setup()
      show()

      const dialog = await openAttendees(user)

      expect(await within(dialog).findByRole('alert')).toHaveTextContent('Não foi possível carregar os inscritos. Tente novamente.')
      expect(screen.queryByText(/Não foi possível contactar o servidor/)).not.toBeInTheDocument()
      expect(within(dialog).getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
    })

    it('se o evento já não existe avisa, não deixa tentar de novo e recarrega a lista com os mesmos filtros', async () => {
      getEventAttendees.mockRejectedValueOnce(apiError(404, 'Recurso não encontrado.'))
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')
      const callsBefore = getAdminEvents.mock.calls.length
      const filtersBefore = lastCall()[0]

      const dialog = await openAttendees(user)

      expect(await within(dialog).findByRole('alert')).toHaveTextContent('O evento já não existe. A lista foi atualizada.')
      expect(within(dialog).queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument()
      await waitFor(() => expect(getAdminEvents).toHaveBeenCalledTimes(callsBefore + 1))
      expect(lastCall()[0]).toEqual(filtersBefore)
      expect(attendeesDialog()).toBeInTheDocument()

      await user.click(dialogButton('Fechar'))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('Escape e Fechar fecham o diálogo e devolvem o foco ao botão, e o Tab fica preso no diálogo', async () => {
      getEventAttendees.mockResolvedValue(attendees)
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')
      const callsBefore = getAdminEvents.mock.calls.length

      await openAttendees(user)
      await screen.findByRole('table', { name: 'Inscritos do evento' })
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(attendeesButton('Workshop de Liderança')).toHaveFocus()

      await openAttendees(user)
      await screen.findByRole('table', { name: 'Inscritos do evento' })
      const close = dialogButton('Fechar')
      const region = within(attendeesDialog()).getByRole('region', { name: 'Lista de inscritos' })
      expect(close).toHaveFocus()
      await user.tab()
      expect(region).toHaveFocus()
      await user.tab({ shift: true })
      expect(close).toHaveFocus()

      await user.click(close)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(attendeesButton('Workshop de Liderança')).toHaveFocus()
      expect(getAdminEvents).toHaveBeenCalledTimes(callsBefore)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('fechar durante o pedido cancela-o e uma resposta tardia não mostra nada', async () => {
      const pending = deferred()
      getEventAttendees.mockImplementationOnce(() => pending.promise)
      const user = userEvent.setup()
      show()

      await openAttendees(user)
      const signal = getEventAttendees.mock.calls[0][1]
      await user.click(dialogButton('Fechar'))

      expect(signal.aborted).toBe(true)
      await act(async () => { pending.resolve(attendees) })
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.queryByRole('table', { name: 'Inscritos do evento' })).not.toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('um pedido cancelado não mostra erro e reabrir pede a lista outra vez', async () => {
      getEventAttendees.mockRejectedValueOnce(new CanceledError())
      const user = userEvent.setup()
      show()

      await openAttendees(user)
      await waitFor(() => expect(getEventAttendees).toHaveBeenCalledTimes(1))
      await act(async () => {})
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()

      await user.click(dialogButton('Fechar'))
      getEventAttendees.mockResolvedValueOnce(attendees)
      await openAttendees(user)

      expect(getEventAttendees).toHaveBeenCalledTimes(2)
      expect(await screen.findByRole('table', { name: 'Inscritos do evento' })).toBeInTheDocument()
    })

    it('nos passados mostra os inscritos do evento escolhido com a lotação dele', async () => {
      getAdminEvents.mockResolvedValue(list([online]))
      const pending = deferred()
      getEventAttendees.mockImplementationOnce(() => pending.promise)
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')

      await user.click(periodTab('Passados'))
      await screen.findByRole('table', { name: 'Eventos passados' })
      await user.click(attendeesButton('Formação Online'))
      const dialog = await screen.findByRole('dialog', { name: 'Inscritos' })

      expect(dialog).toHaveAccessibleDescription('«Formação Online» (10 Fev 2099)')
      expect(getEventAttendees).toHaveBeenCalledWith('e2', expect.any(AbortSignal))

      await act(async () => { pending.resolve(attendees) })
      expect(dialog).toHaveAccessibleDescription('«Formação Online» (10 Fev 2099) · 4 inscritos de 40 lugares')
    })

    it('Tentar novamente com o teclado passa o foco para Fechar e o foco não sai do diálogo', async () => {
      const pending = deferred()
      getEventAttendees
        .mockRejectedValueOnce(apiError(500, 'Erro interno do servidor.'))
        .mockImplementationOnce(() => pending.promise)
      const user = userEvent.setup()
      show()

      const dialog = await openAttendees(user)
      await within(dialog).findByRole('alert')
      act(() => { dialogButton('Tentar novamente').focus() })
      await user.keyboard('{Enter}')

      expect(within(attendeesDialog()).getByRole('status')).toHaveTextContent('A carregar inscritos...')
      const close = dialogButton('Fechar')
      expect(close).toHaveFocus()
      expect(attendeesDialog()).toContainElement(document.activeElement)
      await user.tab()
      expect(close).toHaveFocus()
      await user.tab({ shift: true })
      expect(close).toHaveFocus()

      await act(async () => { pending.resolve(attendees) })
      expect(attendeesTable()).toBeInTheDocument()
      expect(close).toHaveFocus()

      await user.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(attendeesButton('Workshop de Liderança')).toHaveFocus()
    })

    it('se o novo pedido voltar a falhar o foco fica em Fechar e o Tab alterna com o novo Tentar novamente', async () => {
      getEventAttendees
        .mockRejectedValueOnce(apiError(500, 'Erro interno do servidor.'))
        .mockRejectedValueOnce(apiError(429, 'Demasiados pedidos. Tente novamente mais tarde.'))
      const user = userEvent.setup()
      show()

      const dialog = await openAttendees(user)
      await within(dialog).findByRole('alert')
      await user.click(dialogButton('Tentar novamente'))

      expect(dialogButton('Fechar')).toHaveFocus()
      await waitFor(() => expect(within(attendeesDialog()).getByRole('alert')).toHaveTextContent('Demasiados pedidos. Tente novamente mais tarde.'))
      expect(within(attendeesDialog()).getAllByRole('alert')).toHaveLength(1)
      const close = dialogButton('Fechar')
      const retry = dialogButton('Tentar novamente')
      expect(retry).toBeVisible()
      expect(retry).not.toHaveFocus()
      expect(close).toHaveFocus()

      await user.tab({ shift: true })
      expect(retry).toHaveFocus()
      await user.tab()
      expect(close).toHaveFocus()

      await user.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(getEventAttendees.mock.calls.map((call) => call[0])).toEqual(['e1', 'e1'])
    })
  })
})
