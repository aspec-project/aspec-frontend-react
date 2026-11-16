import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AdminEventsPage from '../../../src/pages/admin/AdminEventsPage'
import { getAdminEvents } from '../../../src/services/adminEvents'
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

const categories = [{ id: 'c1', name: 'Workshop', color: '#6A1B9A' }, { id: 'c2', name: 'Formação', color: '#1565C0' }]
const locations = [{ id: 'l1', name: 'Lisboa' }, { id: 'l2', name: 'Porto' }]
const BASE_FILTERS = { period: 'upcoming', page: 1, dateFrom: '', dateTo: '', categoryId: '', locationId: '' }

function event(id) {
  return {
    id,
    name: `Evento ${id}`,
    category: categories[0],
    location: locations[0],
    event_date: '2099-01-21',
    event_start_time: '08:00',
    event_end_time: '10:00',
    max_attendees: 30,
    registrations_count: 2,
    registration_deadline: '2099-01-19T23:59:00+00:00',
    is_online: false,
  }
}

function pageOf(filters) {
  return {
    items: Array.from({ length: 6 }, (_, index) => event(`${filters.page}-${index}`)),
    pagination: { current_page: filters.page, per_page: 6, total: 30, last_page: 5 },
    counts: { upcoming: 30, past: 30 },
  }
}

function LocationProbe() {
  return <output data-testid="location">{useLocation().search}</output>
}

function show(entry = '/admin/eventos') {
  return render(<MemoryRouter initialEntries={[entry]}><AdminEventsPage /><LocationProbe /></MemoryRouter>)
}

const lastFilters = () => getAdminEvents.mock.calls.at(-1)[0]

describe('Gestão de Eventos: filtros e página no endereço', () => {
  beforeEach(() => {
    getAdminEvents.mockImplementation((filters) => Promise.resolve(pageOf(filters)))
    getEventCategories.mockResolvedValue(categories)
    getLocations.mockResolvedValue(locations)
  })
  afterEach(() => {
    cleanup()
    vi.resetAllMocks()
  })

  it('abre com os filtros do endereço, pede-os à API e mostra-os preenchidos', async () => {
    show('/admin/eventos?period=past&date_from=2026-11-01&date_to=2026-11-30&category_id=c2&location_id=l2&page=3')

    await screen.findByText('Evento 3-0')
    expect(getAdminEvents.mock.calls.map(([filters]) => filters)).toEqual([
      { period: 'past', page: 3, dateFrom: '2026-11-01', dateTo: '2026-11-30', categoryId: 'c2', locationId: 'l2' },
    ])
    expect(within(screen.getByRole('group', { name: 'Período dos eventos' })).getByRole('button', { name: /^Passados/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('combobox', { name: 'Tipo de evento' })).toHaveTextContent('Formação')
    expect(screen.getByRole('combobox', { name: 'Local' })).toHaveTextContent('Porto')
    expect(screen.getByRole('button', { name: 'Data de 1 Nov 2026' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Página 3', current: 'page' })).toBeInTheDocument()
  })

  it('mudar um filtro escreve-o no endereço e volta à página 1', async () => {
    const user = userEvent.setup({ delay: null })
    show('/admin/eventos?page=2')
    await screen.findByText('Evento 2-0')
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Local' })).toBeEnabled())

    await user.click(screen.getByRole('combobox', { name: 'Local' }))
    await user.click(screen.getByRole('option', { name: 'Porto' }))

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\?location_id=l2$/))
    await waitFor(() => expect(lastFilters()).toEqual({ ...BASE_FILTERS, locationId: 'l2' }))

    await user.click(within(screen.getByRole('group', { name: 'Período dos eventos' })).getByRole('button', { name: /^Passados/ }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\?period=past&location_id=l2$/))
  })

  it('mudar de página atualiza o endereço', async () => {
    const user = userEvent.setup({ delay: null })
    show()
    await screen.findByText('Evento 1-0')

    await user.click(within(screen.getByRole('navigation', { name: 'Paginação de eventos' })).getByRole('button', { name: 'Página 2' }))

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\?page=2$/))
    await waitFor(() => expect(lastFilters()).toEqual({ ...BASE_FILTERS, page: 2 }))
  })

  it.each([
    ['página 0', '?page=0'],
    ['página negativa', '?page=-1'],
    ['página não numérica', '?page=abc'],
    ['período desconhecido', '?period=futuro'],
    ['data impossível', '?date_from=2026-02-30'],
    ['data noutro formato', '?date_to=30-11-2026'],
    ['tipo inexistente', '?category_id=c9'],
    ['local inexistente', '?location_id=l9'],
  ])('ignora %s e usa o padrão sem erro', async (_, query) => {
    show(`/admin/eventos${query}`)

    await screen.findByText('Evento 1-0')
    expect(getAdminEvents.mock.calls.map(([filters]) => filters)).toEqual([BASE_FILTERS])
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('o padrão não escreve parâmetros no endereço', async () => {
    const user = userEvent.setup({ delay: null })
    show('/admin/eventos?category_id=c1')
    await screen.findByText('Evento 1-0')

    await user.click(screen.getByRole('button', { name: 'Limpar (1)' }))

    await waitFor(() => expect(screen.getByTestId('location')).toBeEmptyDOMElement())
    await waitFor(() => expect(lastFilters()).toEqual(BASE_FILTERS))
  })
})
