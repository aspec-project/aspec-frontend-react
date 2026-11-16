import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MemberRegistrationsPage from '../../src/pages/MemberRegistrationsPage'
import { getMyEventRegistrations } from '../../src/services/eventRegistrations'

vi.mock('../../src/services/eventRegistrations', () => ({
  getMyEventRegistrations: vi.fn(),
  changeEventRegistration: vi.fn(),
  getRegistrationErrorMessage: vi.fn(() => 'Erro'),
}))

/* 10 inscrições futuras e 6 passadas: 3 páginas de próximos e 2 de anteriores, 4 por página. */
function registration(id, eventDate) {
  return {
    id,
    event: {
      id: `evento-${id}`,
      name: `Evento ${id}`,
      event_date: eventDate,
      event_start_time: '10:00',
      registration_deadline: null,
    },
  }
}

const registrations = [
  ...Array.from({ length: 10 }, (_, index) => registration(`f${index + 1}`, `2099-01-${String(index + 10).padStart(2, '0')}`)),
  ...Array.from({ length: 6 }, (_, index) => registration(`p${index + 1}`, `2020-01-${String(index + 10).padStart(2, '0')}`)),
]

function LocationProbe() {
  return <output data-testid="location">{useLocation().search}</output>
}

function show(entry = '/perfil/inscricoes') {
  return render(<MemoryRouter initialEntries={[entry]}><MemberRegistrationsPage /><LocationProbe /></MemoryRouter>)
}

const upcomingNav = () => screen.getByRole('navigation', { name: 'Paginação dos próximos eventos' })
const pastNav = () => screen.getByRole('navigation', { name: 'Paginação dos eventos anteriores' })

describe('As minhas inscrições: páginas no endereço', () => {
  beforeEach(() => {
    getMyEventRegistrations.mockResolvedValue(registrations)
  })
  afterEach(() => {
    cleanup()
    vi.resetAllMocks()
  })

  it('abre nas páginas do endereço de cada lista', async () => {
    show('/perfil/inscricoes?upcoming_page=3&past_page=2')

    expect(await screen.findByText('Evento f9')).toBeInTheDocument()
    expect(screen.getByText('Evento p5')).toBeInTheDocument()
    expect(within(upcomingNav()).getByRole('button', { name: 'Página 3', current: 'page' })).toBeInTheDocument()
    expect(within(pastNav()).getByRole('button', { name: 'Página 2', current: 'page' })).toBeInTheDocument()
  })

  it('mudar de página escreve-a no endereço e mantém a página da outra lista', async () => {
    const user = userEvent.setup()
    show('/perfil/inscricoes?past_page=2')
    await screen.findByText('Evento f1')

    await user.click(within(upcomingNav()).getByRole('button', { name: 'Página 2' }))

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\?past_page=2&upcoming_page=2$/))
    expect(screen.getByText('Evento f5')).toBeInTheDocument()

    await user.click(within(pastNav()).getByRole('button', { name: 'Página 1' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\?upcoming_page=2$/))
  })

  it.each([
    ['página 0', '?upcoming_page=0&past_page=0'],
    ['página negativa', '?upcoming_page=-1&past_page=-1'],
    ['página não numérica', '?upcoming_page=abc&past_page=abc'],
  ])('ignora %s e abre na primeira página', async (_, query) => {
    show(`/perfil/inscricoes${query}`)

    expect(await screen.findByText('Evento f1')).toBeInTheDocument()
    expect(within(upcomingNav()).getByRole('button', { name: 'Página 1', current: 'page' })).toBeInTheDocument()
    expect(within(pastNav()).getByRole('button', { name: 'Página 1', current: 'page' })).toBeInTheDocument()
  })

  it('uma página para lá da última mostra a última', async () => {
    show('/perfil/inscricoes?upcoming_page=99')

    expect(await screen.findByText('Evento f9')).toBeInTheDocument()
    expect(within(upcomingNav()).getByRole('button', { name: 'Página 3', current: 'page' })).toBeInTheDocument()
  })

  it('o padrão não escreve parâmetros no endereço', async () => {
    const user = userEvent.setup()
    show('/perfil/inscricoes?upcoming_page=2')
    await screen.findByText('Evento f5')

    await user.click(within(upcomingNav()).getByRole('button', { name: 'Página 1' }))

    await waitFor(() => expect(screen.getByTestId('location')).toBeEmptyDOMElement())
  })
})
