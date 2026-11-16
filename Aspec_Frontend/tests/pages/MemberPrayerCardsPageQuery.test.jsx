import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MemberPrayerCardsPage from '../../src/pages/MemberPrayerCardsPage'
import { getReceivedPrayerCards } from '../../src/services/prayerCards'

vi.mock('../../src/services/prayerCards', () => ({
  getReceivedPrayerCards: vi.fn(),
}))

const LAST_PAGE = 3

/* Cada período tem 3 páginas de 5 cartões; uma página para lá da última vem vazia, como na API. */
function pageOf(period, page) {
  const items = page > LAST_PAGE
    ? []
    : Array.from({ length: 5 }, (_, index) => ({
      id: `${period}-${page}-${index}`,
      author: { name: `Autor ${period} ${page}.${index}` },
      event: { name: `Evento ${period} ${page}.${index}`, event_date: '2026-10-10' },
    }))

  return { items, pagination: { current_page: page, per_page: 5, total: 15, last_page: LAST_PAGE } }
}

function LocationProbe() {
  return <output data-testid="location">{useLocation().search}</output>
}

function show(entry = '/perfil/cartoes-oracao') {
  return render(<MemoryRouter initialEntries={[entry]}><MemberPrayerCardsPage /><LocationProbe /></MemoryRouter>)
}

const requests = () => getReceivedPrayerCards.mock.calls.map(([period, page]) => [period, page])
const nav = (title) => screen.getByRole('navigation', { name: `Paginação dos cartões: ${title}` })

describe('Os meus cartões de oração: páginas no endereço', () => {
  beforeEach(() => {
    getReceivedPrayerCards.mockImplementation((period, page) => Promise.resolve(pageOf(period, page)))
  })
  afterEach(() => {
    cleanup()
    vi.resetAllMocks()
  })

  it('abre nas páginas do endereço de cada lista e pede-as à API', async () => {
    show('/perfil/cartoes-oracao?current_page=2&previous_page=3')

    expect(await screen.findByText('Evento current 2.0')).toBeInTheDocument()
    expect(await screen.findByText('Evento previous 3.0')).toBeInTheDocument()
    expect(requests()).toEqual(expect.arrayContaining([['current', 2], ['previous', 3]]))
    expect(requests()).not.toContainEqual(['current', 1])
    expect(within(nav('Esta Semana')).getByRole('button', { name: 'Página 2', current: 'page' })).toBeInTheDocument()
    expect(within(nav('Anteriores')).getByRole('button', { name: 'Página 3', current: 'page' })).toBeInTheDocument()
  })

  it('mudar de página escreve-a no endereço e mantém a página da outra lista', async () => {
    const user = userEvent.setup()
    show('/perfil/cartoes-oracao?previous_page=2')
    await screen.findByText('Evento current 1.0')
    await screen.findByText('Evento previous 2.0')

    await user.click(within(nav('Esta Semana')).getByRole('button', { name: 'Página 3' }))

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\?previous_page=2&current_page=3$/))
    expect(await screen.findByText('Evento current 3.0')).toBeInTheDocument()
  })

  it.each([
    ['página 0', '?current_page=0&previous_page=0'],
    ['página negativa', '?current_page=-1&previous_page=-1'],
    ['página não numérica', '?current_page=abc&previous_page=abc'],
  ])('ignora %s e pede a primeira página', async (_, query) => {
    show(`/perfil/cartoes-oracao${query}`)

    expect(await screen.findByText('Evento current 1.0')).toBeInTheDocument()
    expect(await screen.findByText('Evento previous 1.0')).toBeInTheDocument()
    expect(requests().sort()).toEqual([['current', 1], ['previous', 1]])
  })

  it('uma página para lá da última passa para a última', async () => {
    show('/perfil/cartoes-oracao?current_page=9')

    expect(await screen.findByText('Evento current 3.0')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\?current_page=3$/))
  })

  it('o padrão não escreve parâmetros no endereço', async () => {
    const user = userEvent.setup()
    show('/perfil/cartoes-oracao?current_page=2')
    await screen.findByText('Evento current 2.0')

    await user.click(within(nav('Esta Semana')).getByRole('button', { name: 'Página 1' }))

    await waitFor(() => expect(screen.getByTestId('location')).toBeEmptyDOMElement())
  })
})
