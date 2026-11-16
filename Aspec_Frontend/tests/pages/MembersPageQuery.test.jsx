import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MembersPage from '../../src/pages/MembersPage'
import { api } from '../../src/services/api'
import { useAuthStore } from '../../src/store/authStore'

const sectorId = '019512a1-1234-7123-8123-123456789abc'
const otherSectorId = '019512a1-1234-7123-8123-123456789abd'
const locationId = '019512a1-5678-7123-8123-123456789abc'
const sectors = [{ id: sectorId, name: 'Consultoria' }, { id: otherSectorId, name: 'Design' }]
const locations = [{ id: locationId, name: 'Lisboa' }]
const member = { id: '019512a1-9999-7123-8123-123456789abc', name: 'Ana', business_name: 'Serviços Ana', sector: sectors[0], location: locations[0], logo_url: null, average_rating: 4.8, reviews_count: 12 }

const response = (data, config) => ({ data, config, status: 200, statusText: '', headers: {} })

/* Como a API: uma página acima da última vem vazia, com current_page igual à página pedida. */
function body(config, total = 100) {
  const lastPage = Math.max(1, Math.ceil(total / config.params.per_page))
  const items = config.params.page > lastPage ? [] : [{ ...member, business_name: `Serviços Ana ${config.params.page}` }]
  return { success: true, data: { items, pagination: { current_page: config.params.page, per_page: config.params.per_page, total, last_page: lastPage } } }
}

function setupAdapter(total = 100) {
  const adapter = vi.fn((config) => {
    if (config.url === '/members') return Promise.resolve(response(body(config, total), config))
    return Promise.resolve(response({ success: true, data: config.url === '/sectors' ? sectors : locations }, config))
  })
  api.defaults.adapter = adapter
  return adapter
}

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.search}</output>
}

function show(entry = '/membros') {
  return render(<MemoryRouter initialEntries={[entry]}><MembersPage /><LocationProbe /></MemoryRouter>)
}

const memberRequests = (adapter) => adapter.mock.calls.filter(([config]) => config.url === '/members').map(([config]) => config.params)

describe('Diretório de membros: filtros e página no endereço', () => {
  let original
  beforeEach(() => { original = api.defaults.adapter; useAuthStore.setState({ user: null, status: 'idle' }) })
  afterEach(() => { cleanup(); api.defaults.adapter = original; vi.restoreAllMocks() })

  it('abre com os filtros do endereço, pede-os à API e mostra-os preenchidos', async () => {
    const adapter = setupAdapter()
    show(`/membros?search=contabilidade&sector_id=${sectorId}&location_id=${locationId}&min_rating=4.5&page=3&per_page=24`)

    await screen.findByRole('heading', { name: /^Serviços Ana/ })
    expect(memberRequests(adapter)).toEqual([{ page: 3, per_page: 24, search: 'contabilidade', sector_id: sectorId, location_id: locationId, min_rating: 4.5 }])
    expect(screen.getByLabelText('Pesquisar')).toHaveValue('contabilidade')
    expect(screen.getByLabelText('Setor')).toHaveTextContent('Consultoria')
    expect(screen.getByLabelText('Distrito')).toHaveTextContent('Lisboa')
    expect(screen.getByRole('button', { name: 'Pelo menos 4,5 estrelas' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Página 3', current: 'page' })).toBeInTheDocument()
  })

  it('mudar um filtro escreve-o no endereço e volta à página 1', async () => {
    const user = userEvent.setup()
    const adapter = setupAdapter()
    show('/membros?page=3')
    await screen.findByRole('heading', { name: /^Serviços Ana/ })

    await user.click(screen.getByRole('button', { name: 'Pelo menos 4 estrelas' }))

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\?min_rating=4$/))
    await waitFor(() => expect(memberRequests(adapter).at(-1)).toEqual({ page: 1, per_page: 12, min_rating: 4 }))

    await user.click(screen.getByLabelText('Setor'))
    await user.click(within(document.getElementById(screen.getByLabelText('Setor').getAttribute('aria-controls'))).getByRole('option', { name: 'Design' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(`?sector_id=${otherSectorId}&min_rating=4`))
  })

  it('mudar de página e de número por página atualiza o endereço', async () => {
    const user = userEvent.setup()
    setupAdapter()
    show()
    await screen.findByRole('heading', { name: /^Serviços Ana/ })

    await user.click(screen.getByRole('button', { name: 'Página seguinte' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\?page=2$/))

    await user.selectOptions(screen.getByLabelText('Resultados por página'), '24')
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\?per_page=24$/))
  })

  it.each([
    ['página 0', '?page=0'],
    ['página negativa', '?page=-1'],
    ['página não numérica', '?page=abc'],
    ['per_page fora das opções', '?per_page=13'],
    ['avaliação desconhecida', '?min_rating=2'],
    ['setor inexistente', '?sector_id=019512a1-0000-7123-8123-123456789abc'],
  ])('ignora %s e usa o padrão sem erro', async (_, query) => {
    const adapter = setupAdapter()
    show(`/membros${query}`)

    await screen.findByRole('heading', { name: /^Serviços Ana/ })
    expect(memberRequests(adapter)).toEqual([{ page: 1, per_page: 12 }])
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it.each([
    [100, `?sector_id=${sectorId}&page=9`, 9],
    [5, `?sector_id=${sectorId}`, 1],
  ])('com %i membros, uma página acima da última passa para a última no endereço', async (total, expected, lastPage) => {
    const adapter = setupAdapter(total)
    show(`/membros?sector_id=${sectorId}&page=999`)

    expect(await screen.findByRole('heading', { name: `Serviços Ana ${lastPage}` })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe(expected))
    expect(memberRequests(adapter).map((params) => params.page)).toEqual([999, lastPage])
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('o padrão não escreve parâmetros no endereço', async () => {
    const user = userEvent.setup()
    setupAdapter()
    show('/membros?page=2&min_rating=3')
    await screen.findByRole('heading', { name: /^Serviços Ana/ })

    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))

    await waitFor(() => expect(screen.getByTestId('location')).toBeEmptyDOMElement())
  })
})
