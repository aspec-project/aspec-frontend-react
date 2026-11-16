import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import InvoiceList from '../../../src/components/subscription/InvoiceList'
import { getInvoices } from '../../../src/services/subscription'

vi.mock('../../../src/services/subscription', () => ({
  getInvoices: vi.fn(),
  downloadInvoicePdf: vi.fn(),
}))

const LAST_PAGE = 3

/* 3 páginas de 5 faturas; uma página para lá da última vem vazia, como na API. */
function pageOf(page) {
  const items = page > LAST_PAGE
    ? []
    : Array.from({ length: 5 }, (_, index) => ({ id: `f-${page}-${index}`, number: `FT ${page}/${index}`, issued_at: null, pdf_available: false }))

  return { items, pagination: { current_page: page, per_page: 5, total: 15, last_page: LAST_PAGE } }
}

function LocationProbe() {
  return <output data-testid="location">{useLocation().search}</output>
}

function show(entry = '/perfil/subscricao') {
  return render(<MemoryRouter initialEntries={[entry]}><InvoiceList /><LocationProbe /></MemoryRouter>)
}

const pagesRequested = () => getInvoices.mock.calls.map(([page]) => page)
const nav = () => screen.getByRole('navigation', { name: 'Paginação das faturas' })

describe('Faturas: página no endereço', () => {
  beforeEach(() => {
    getInvoices.mockImplementation((page) => Promise.resolve(pageOf(page)))
  })
  afterEach(() => {
    cleanup()
    vi.resetAllMocks()
  })

  it('abre na página do endereço e pede-a à API', async () => {
    show('/perfil/subscricao?invoices_page=2')

    expect(await screen.findByText('Fatura FT 2/0')).toBeInTheDocument()
    expect(pagesRequested()).toEqual([2])
    expect(within(nav()).getByRole('button', { name: 'Página 2', current: 'page' })).toBeInTheDocument()
  })

  it('mudar de página escreve-a no endereço sem apagar outros parâmetros', async () => {
    const user = userEvent.setup()
    show('/perfil/subscricao?outro=1')
    await screen.findByText('Fatura FT 1/0')

    await user.click(within(nav()).getByRole('button', { name: 'Página 3' }))

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\?outro=1&invoices_page=3$/))
    expect(await screen.findByText('Fatura FT 3/0')).toBeInTheDocument()
    expect(pagesRequested()).toEqual([1, 3])
  })

  it.each([
    ['página 0', '?invoices_page=0'],
    ['página negativa', '?invoices_page=-1'],
    ['página não numérica', '?invoices_page=abc'],
  ])('ignora %s e pede a primeira página', async (_, query) => {
    show(`/perfil/subscricao${query}`)

    expect(await screen.findByText('Fatura FT 1/0')).toBeInTheDocument()
    expect(pagesRequested()).toEqual([1])
  })

  it('uma página para lá da última passa para a última', async () => {
    show('/perfil/subscricao?invoices_page=9')

    expect(await screen.findByText('Fatura FT 3/0')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\?invoices_page=3$/))
  })

  it('o padrão não escreve parâmetros no endereço', async () => {
    const user = userEvent.setup()
    show('/perfil/subscricao?invoices_page=2')
    await screen.findByText('Fatura FT 2/0')

    await user.click(within(nav()).getByRole('button', { name: 'Página 1' }))

    await waitFor(() => expect(screen.getByTestId('location')).toBeEmptyDOMElement())
    expect(await screen.findByText('Fatura FT 1/0')).toBeInTheDocument()
  })
})
