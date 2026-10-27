import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, CanceledError } from 'axios'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AdminEventsPage from '../../../src/pages/admin/AdminEventsPage'
import { createAdminEvent, deleteAdminEvent, exportEventAttendees, getAdminEvents, updateAdminEvent } from '../../../src/services/adminEvents'
import { getEventCategories, getLocations } from '../../../src/services/referenceLists'

vi.mock('../../../src/services/adminEvents', () => ({
  getAdminEvents: vi.fn(),
  exportEventAttendees: vi.fn(),
  createAdminEvent: vi.fn(),
  geocodeAddress: vi.fn(),
  updateAdminEvent: vi.fn(),
  deleteAdminEvent: vi.fn(),
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
  return screen.getByRole('combobox', { name: 'Local' })
}

async function chooseOption(user, combobox, optionName) {
  await user.click(combobox)
  await user.click(screen.getByRole('option', { name: optionName }))
}

async function openOptions(user, combobox) {
  await user.click(combobox)

  return screen.getAllByRole('option').map((option) => option.textContent.trim())
}

async function waitForOptions() {
  await waitFor(() => expect(categorySelect()).toBeEnabled())
}

function dateButton(label) {
  return screen.getByRole('button', { name: new RegExp(`^${label} `) })
}

async function pickDate(user, label, dayLabel) {
  await user.click(dateButton(label))
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: dayLabel }))
}

function useFakeToday() {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 15, 12))
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
    vi.useRealTimers()
    vi.resetAllMocks()
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

    expect(row.getByText('Workshop')).toHaveStyle({ backgroundColor: '#EDE4F3', color: '#300C45' })
    expect(row.getByText('21 Jan 2099')).toBeInTheDocument()
    expect(row.getByText('08:00–10:00')).toBeInTheDocument()
    expect(row.getByText('Lisboa')).toBeInTheDocument()
    expect(row.getByText('19 Jan 2099, 23:59')).toBeInTheDocument()
    expect(row.queryByText(/\d{2}\/\d{2}\/\d{4}/)).toBeNull()
    expect(row.getByText('Abertas')).toBeInTheDocument()
    expect(row.getByText('22 / 30')).toBeInTheDocument()
    expect(row.getByText('73%')).toBeInTheDocument()
    expect(row.getByText('22 inscritos de 30 lugares (73%)')).toBeInTheDocument()
  })

  it('os ícones das datas seguem o design', async () => {
    show()
    await screen.findByRole('table')

    const date = cellOf('Workshop de Liderança', 'Data e hora')
    for (const selector of ['svg.lucide-calendar-days', 'svg.lucide-clock']) {
      expect(date.querySelector(selector)).toHaveAttribute('aria-hidden', 'true')
    }

    const deadline = cellOf('Workshop de Liderança', 'Inscrições até')
    expect(deadline.querySelector('svg.lucide-calendar-clock')).toHaveAttribute('aria-hidden', 'true')
    expect(within(deadline).getByText('Abertas')).toHaveClass('text-[11px]')
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

    await chooseOption(user, categorySelect(), 'Jantar')
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

  it('os filtros de tipo e local têm as opções da API e pedem a primeira página filtrada', async () => {
    const user = userEvent.setup()
    show()
    await screen.findByRole('table')
    await waitForOptions()

    expect(await openOptions(user, categorySelect())).toEqual(['Todos os tipos', 'Workshop', 'Formação', 'Jantar'])
    await user.click(screen.getByRole('option', { name: 'Formação' }))
    await waitFor(() => expect(lastCall()).toEqual([{ ...BASE_FILTERS, categoryId: 'c2' }, expect.any(AbortSignal)]))

    expect(await openOptions(user, locationSelect())).toEqual(['Todos os locais', 'Lisboa', 'Porto', 'Braga'])
    await user.click(screen.getByRole('option', { name: 'Porto' }))
    await waitFor(() => expect(lastCall()).toEqual([{ ...BASE_FILTERS, categoryId: 'c2', locationId: 'l2' }, expect.any(AbortSignal)]))
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

    await chooseOption(user, locationSelect(), 'Braga')

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

    await chooseOption(user, categorySelect(), 'Formação')

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
    await chooseOption(user, categorySelect(), 'Workshop')
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
    expect(await openOptions(user, locationSelect())).toHaveLength(4)
    expect(screen.queryByText('Não foi possível carregar as opções dos filtros.')).not.toBeInTheDocument()
  })

  it('uma categoria com cor inválida usa o azul-marinho no badge', async () => {
    getAdminEvents.mockResolvedValue(list([event('e9', 'Evento Sem Cor', { category: { id: 'c9', name: 'Sem cor', color: 'red' } })]))
    show()
    await screen.findByRole('table')

    expect(within(rowOf('Evento Sem Cor')).getByText('Sem cor')).toHaveStyle({ backgroundColor: '#E2E4E7', color: '#060E18' })
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

  it('sem data válida mostra um travessão na coluna Data e hora', async () => {
    getAdminEvents.mockResolvedValue(list([event('e7', 'Evento Sem Data', { event_date: null })]))
    show()
    await screen.findByRole('table')

    const date = cellOf('Evento Sem Data', 'Data e hora')
    expect(date).toHaveTextContent('—')
    expect(date).not.toHaveTextContent(/Jan|\//)
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

  describe('Filtros e acabamento do design v3', () => {
    it('mostra os filtros de datas, tipo e local com os textos do design e o Limpar desativado sem filtros', async () => {
      show()
      await screen.findByRole('table')
      await waitForOptions()

      const filters = screen.getByRole('group', { name: 'Filtros de eventos' })
      expect(within(filters).getByRole('button', { name: 'Data de Qualquer data' })).toBeInTheDocument()
      expect(within(filters).getByRole('button', { name: 'Data até Qualquer data' })).toBeInTheDocument()
      expect(categorySelect()).toHaveTextContent('Todos os tipos')
      expect(locationSelect()).toHaveTextContent('Todos os locais')
      const clear = within(filters).getByRole('button', { name: 'Limpar' })
      expect(clear).toBeVisible()
      expect(clear).toBeDisabled()
      expect(filters.querySelector('select')).toBeNull()
      expect(filters.querySelector('input[type="date"]')).toBeNull()

      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toHaveTextContent('Eventos Agendados')
      expect(heading).toHaveClass('sr-only')
    })

    it('a data De escolhida no calendário filtra os eventos e limita os dias da data Até', async () => {
      useFakeToday()
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')

      await pickDate(user, 'Data de', '20 de novembro de 2026')

      await waitFor(() => expect(lastCall()).toEqual([{ ...BASE_FILTERS, dateFrom: '2026-11-20' }, expect.any(AbortSignal)]))
      expect(dateButton('Data de')).toHaveAccessibleName('Data de 20 Nov 2026')

      await user.click(dateButton('Data até'))
      const before = within(screen.getByRole('dialog')).getByRole('button', { name: '19 de novembro de 2026' })
      expect(before).toHaveAttribute('aria-disabled', 'true')
      const callsBefore = getAdminEvents.mock.calls.length

      await user.click(before)

      expect(getAdminEvents).toHaveBeenCalledTimes(callsBefore)
      expect(getAdminEvents.mock.calls.some(([filters]) => filters.dateTo === '2026-11-19')).toBe(false)

      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '25 de novembro de 2026' }))

      await waitFor(() => expect(lastCall()).toEqual([{ ...BASE_FILTERS, dateFrom: '2026-11-20', dateTo: '2026-11-25' }, expect.any(AbortSignal)]))
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('Limpar mostra o número de filtros, limpa-os mantendo o separador e devolve o foco à data De', async () => {
      useFakeToday()
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')
      await waitForOptions()

      await user.click(periodTab('Passados'))
      await pickDate(user, 'Data de', '20 de novembro de 2026')
      await chooseOption(user, categorySelect(), 'Workshop')

      const clear = await screen.findByRole('button', { name: 'Limpar (2)' })
      expect(clear).toBeEnabled()

      await user.click(clear)

      await waitFor(() => expect(lastCall()).toEqual([{ ...BASE_FILTERS, period: 'past' }, expect.any(AbortSignal)]))
      expect(screen.getByRole('button', { name: 'Limpar' })).toBeDisabled()
      expect(dateButton('Data de')).toHaveAccessibleName('Data de Qualquer data')
      expect(dateButton('Data até')).toHaveAccessibleName('Data até Qualquer data')
      expect(categorySelect()).toHaveTextContent('Todos os tipos')
      expect(screen.getByRole('button', { name: 'Data de Qualquer data' })).toHaveFocus()
    })

    it('o badge da categoria na tabela é tingido e o botão de editar é dourado', async () => {
      show()
      await screen.findByRole('table')

      expect(within(rowOf('Jantar de Natal')).getByText('Jantar')).toHaveStyle({ backgroundColor: '#F8E5E5', color: '#591212' })
      const edit = screen.getByRole('button', { name: 'Editar Workshop de Liderança' })
      expect(edit).toHaveClass('bg-[#f5efe3]')
      expect(edit).toHaveClass('text-[#8a7043]')
    })
  })

  it('não há botão de ver inscritos em nenhum separador e as ações de um agendado são só exportar, editar e apagar', async () => {
    const user = userEvent.setup()
    show()
    await screen.findByRole('table')

    expect(screen.queryByRole('button', { name: /Ver inscritos/ })).not.toBeInTheDocument()
    const actions = within(cellOf('Workshop de Liderança', 'Ações')).getAllByRole('button')
    expect(actions).toHaveLength(3)
    expect(actions[0]).toHaveAccessibleName(/^Exportar lista de presenças de Workshop de Liderança/)
    expect(actions[1]).toHaveAccessibleName('Editar Workshop de Liderança')
    expect(actions[2]).toHaveAccessibleName('Apagar Workshop de Liderança')
    for (const service of [exportEventAttendees, createAdminEvent, updateAdminEvent, deleteAdminEvent]) {
      expect(service).not.toHaveBeenCalled()
    }
    expect(getAdminEvents).toHaveBeenCalled()

    await user.click(periodTab('Passados'))
    await screen.findByRole('table', { name: 'Eventos passados' })

    expect(screen.queryByRole('button', { name: /Ver inscritos/ })).not.toBeInTheDocument()
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

    function dialogField(text, suffix = '') {
      const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const ending = suffix ? `\\s*${escape(suffix)}` : ''

      return within(createDialog()).getByLabelText(new RegExp(`^${escape(text)}\\s*\\*?${ending}$`))
    }

    async function pickDialogDate(user, opener, dayLabel) {
      await user.click(opener)
      await user.click(within(screen.getByRole('dialog', { name: /^Escolher / })).getByRole('button', { name: dayLabel }))
    }

    async function fillValidInPerson(user) {
      await user.type(dialogField('Título do evento'), 'Jantar de Networking Lisboa')
      await chooseOption(user, dialogField('Tipo de evento'), 'Jantar')
      await chooseOption(user, dialogField('Delegação / Localidade'), 'Lisboa')
      await pickDialogDate(user, dialogField('Data'), '20 de novembro de 2026')
      await user.type(dialogField('Hora de início'), '19:30')
      await user.type(dialogField('Hora de fim'), '21:30')
      await pickDialogDate(user, dialogField('Data limite de inscrição'), '18 de novembro de 2026')
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
      expect(await openOptions(user, dialogField('Tipo de evento'))).toEqual(['Workshop', 'Formação', 'Jantar'])
      expect(await openOptions(user, dialogField('Delegação / Localidade'))).toEqual(['Lisboa', 'Porto', 'Braga'])
      expect(getEventCategories).toHaveBeenCalledTimes(1)
      expect(getLocations).toHaveBeenCalledTimes(1)
    })

    it('depois de criar fecha o modal, mostra a mensagem e recarrega a lista com os mesmos filtros', async () => {
      useFakeToday()
      createAdminEvent.mockResolvedValue({ success: true, message: SUCCESS, data: { id: 'n1' } })
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')
      await waitForOptions()

      await user.click(periodTab('Passados'))
      await chooseOption(user, categorySelect(), 'Jantar')
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

    it('criar uma série pede confirmação, mostra a mensagem da série e recarrega com os mesmos filtros', async () => {
      const SERIES_SUCCESS = 'Série de eventos criada com sucesso.'
      useFakeToday()
      createAdminEvent.mockResolvedValue({ success: true, message: SERIES_SUCCESS, data: { series: { id: 's1' }, sessions: [] } })
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')
      await waitForOptions()

      await chooseOption(user, categorySelect(), 'Jantar')
      await waitFor(() => expect(lastCall()).toEqual([{ ...BASE_FILTERS, categoryId: 'c3' }, expect.any(AbortSignal)]))
      await screen.findByRole('table')
      const callsBefore = getAdminEvents.mock.calls.length

      await user.click(createButton())
      await fillValidInPerson(user)
      await user.click(within(within(createDialog()).getByRole('group', { name: 'Repetição' })).getByRole('button', { name: 'Recorrente' }))
      await chooseOption(user, dialogField('Frequência'), 'Semanal')
      await pickDialogDate(user, dialogField('Fim', '(inclusive)'), '27 de novembro de 2026')
      fireEvent.change(dialogField('Fechar inscrições antes de cada sessão'), { target: { value: '3' } })
      await user.click(within(createDialog()).getByRole('button', { name: 'Criar série' }))

      expect(createAdminEvent).not.toHaveBeenCalled()
      const confirmation = screen.getByRole('dialog', { name: 'Criar série de eventos?' })
      await user.click(within(confirmation).getByRole('button', { name: 'Criar 2 sessões' }))

      expect(createAdminEvent).toHaveBeenCalledTimes(1)
      expect(createAdminEvent.mock.calls[0][0]).toMatchObject({
        event_date: '2026-11-20',
        recurrence: { frequency: 'weekly', ends_on: '2026-11-27', registration_deadline_days_before: 3 },
      })
      expect(createAdminEvent.mock.calls[0][0]).not.toHaveProperty('registration_deadline')
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      await waitFor(() => expect(screen.queryAllByRole('status').some((element) => element.textContent.includes(SERIES_SUCCESS))).toBe(true))
      await waitFor(() => expect(getAdminEvents.mock.calls.length).toBe(callsBefore + 1))
      expect(lastCall()).toEqual([{ ...BASE_FILTERS, categoryId: 'c3' }, expect.any(AbortSignal)])
    }, 15000)

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

    function confirmDialog() {
      return screen.getByRole('dialog', { name: 'Confirmar alterações?' })
    }

    async function editTitleAndSave(user) {
      await user.click(editButton())
      await user.type(dialogField('Título do evento'), ' — nova data')
      await user.click(within(editDialog()).getByRole('button', { name: 'Guardar alterações' }))
      await user.click(within(confirmDialog()).getByRole('button', { name: 'Guardar e notificar' }))
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
      expect(await openOptions(user, dialogField('Tipo de evento'))).toEqual(['Workshop', 'Formação', 'Jantar'])
      expect(await openOptions(user, dialogField('Delegação / Localidade'))).toEqual(['Lisboa', 'Porto', 'Braga'])
      expect(getEventCategories).toHaveBeenCalledTimes(1)
      expect(getLocations).toHaveBeenCalledTimes(1)
    })

    it('depois de guardar fecha o modal, mostra a mensagem, recarrega com os mesmos filtros e devolve o foco', async () => {
      updateAdminEvent.mockResolvedValue({ success: true, message: SUCCESS, data: { id: 'e1' } })
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')
      await waitForOptions()

      await chooseOption(user, categorySelect(), 'Workshop')
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

    it('sem inscritos a confirmação diz que ninguém será notificado e grava com Guardar', async () => {
      const empty = event('e4', 'Almoço Sem Inscritos', { registrations_count: 0 })
      getAdminEvents.mockResolvedValue(list([workshop, online, dinner, empty]))
      updateAdminEvent.mockResolvedValue({ success: true, message: SUCCESS, data: { id: 'e4' } })
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')
      await waitForOptions()

      await user.click(editButton('Almoço Sem Inscritos'))
      await user.type(dialogField('Título do evento'), ' — nova data')
      await user.click(within(editDialog()).getByRole('button', { name: 'Guardar alterações' }))

      const dialog = confirmDialog()
      expect(dialog).toHaveAccessibleDescription('Não há inscritos, por isso ninguém será notificado.')
      expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument()
      expect(updateAdminEvent).not.toHaveBeenCalled()

      await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))

      expect(updateAdminEvent).toHaveBeenCalledTimes(1)
      expect(updateAdminEvent.mock.calls[0][0]).toBe('e4')
      expect(updateAdminEvent.mock.calls[0][1]).not.toHaveProperty('justification')
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      await waitFor(() => expect(successBanner()).toBeDefined())
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

      await chooseOption(user, categorySelect(), 'Workshop')
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

    it('apagar uma sessão de uma série diz que só essa sessão é apagada', async () => {
      getAdminEvents.mockResolvedValue(list([event('s1', 'Grupo de Oração', { registrations_count: 0, series: { position: 3, total: 8 } })]))
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')

      await user.click(deleteButton('Grupo de Oração'))

      expect(deleteDialog()).toHaveAccessibleDescription(expect.stringMatching(/ Só esta sessão \(3\/8\) é apagada; as outras sessões da série mantêm-se\.$/))
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
})
