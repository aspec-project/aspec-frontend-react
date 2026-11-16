import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MemberReviews from '../../../src/components/members/MemberReviews'
import { getMemberReviewPage } from '../../../src/services/members'
import { useAuthStore } from '../../../src/store/authStore'

vi.mock('../../../src/services/members', async (importOriginal) => ({
  ...(await importOriginal()),
  getMemberReviewPage: vi.fn(),
}))

const memberId = 'b8f9c1a0-8888-4e88-8888-888888888888'
const LAST_PAGE = 3

/* 3 páginas de 5 avaliações; como no serviço, uma página para lá da última devolve a última. */
function pageOf(page) {
  const current = Math.min(page, LAST_PAGE)

  return {
    average_rating: 4.2,
    reviews_count: 15,
    rating_distribution: [1, 2, 3, 4, 5].map((rating) => ({ rating, count: rating === 4 ? 15 : 0 })),
    mine: null,
    items: Array.from({ length: 5 }, (_, index) => ({
      id: `r-${current}-${index}`,
      rating: 4,
      comment: `Comentário ${current}.${index}`,
      reviewer: { id: null, business_name: `Empresa ${current}.${index}` },
      created_at: '2026-09-20T10:15:00+01:00',
      is_mine: false,
    })),
    pagination: { current_page: current, per_page: 5, total: 15, last_page: LAST_PAGE },
  }
}

function LocationProbe() {
  return <output data-testid="location">{useLocation().search}</output>
}

function show(entry = '/membros/x') {
  return render(<MemoryRouter initialEntries={[entry]}><MemberReviews memberId={memberId} /><LocationProbe /></MemoryRouter>)
}

const lastRequest = () => {
  const [, page, , filters] = getMemberReviewPage.mock.calls.at(-1)
  return { page, ...filters }
}
const nav = () => screen.getByRole('navigation', { name: 'Paginação das avaliações' })

async function choose(user, label, option) {
  await user.click(screen.getByRole('combobox', { name: label }))
  await user.click(screen.getByRole('option', { name: option }))
}

describe('Avaliações do perfil público: filtros e página no endereço', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { id: 'u1', role: { name: 'Member' }, account_status: { name: 'Active' } }, status: 'authenticated' })
    getMemberReviewPage.mockImplementation((_id, page) => Promise.resolve(pageOf(page)))
  })
  afterEach(() => {
    cleanup()
    vi.resetAllMocks()
  })

  it('abre com a ordenação, o filtro e a página do endereço e mostra-os preenchidos', async () => {
    show('/membros/x?reviews_sort=lowest&reviews_rating=4&reviews_page=2')

    expect(await screen.findByText('Empresa 2.0')).toBeInTheDocument()
    expect(getMemberReviewPage.mock.calls.map(([, page, , filters]) => ({ page, ...filters }))).toEqual([{ page: 2, sort: 'lowest', rating: 4 }])
    expect(screen.getByRole('combobox', { name: 'Ordenar avaliações' })).toHaveTextContent('Pior classificação')
    expect(screen.getByRole('combobox', { name: 'Filtrar por estrelas' })).toHaveTextContent('4 estrelas')
    expect(within(nav()).getByRole('button', { name: 'Página 2', current: 'page' })).toBeInTheDocument()
  })

  it('mudar um filtro escreve-o no endereço e volta à página 1', async () => {
    const user = userEvent.setup()
    show('/membros/x?outro=1&reviews_page=3')
    await screen.findByText('Empresa 3.0')

    await choose(user, 'Ordenar avaliações', 'Mais antigas')

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\?outro=1&reviews_sort=oldest$/))
    await waitFor(() => expect(lastRequest()).toEqual({ page: 1, sort: 'oldest', rating: '' }))

    await choose(user, 'Filtrar por estrelas', '5 estrelas')
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\?outro=1&reviews_sort=oldest&reviews_rating=5$/))
  })

  it('mudar de página escreve-a no endereço', async () => {
    const user = userEvent.setup()
    show()
    await screen.findByText('Empresa 1.0')

    await user.click(within(nav()).getByRole('button', { name: 'Página 2' }))

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\?reviews_page=2$/))
    expect(await screen.findByText('Empresa 2.0')).toBeInTheDocument()
  })

  it.each([
    ['página 0', '?reviews_page=0'],
    ['página negativa', '?reviews_page=-1'],
    ['página não numérica', '?reviews_page=abc'],
    ['ordenação desconhecida', '?reviews_sort=random'],
    ['classificação fora de 1 a 5', '?reviews_rating=6'],
    ['classificação não inteira', '?reviews_rating=4.5'],
  ])('ignora %s e usa o padrão sem erro', async (_, query) => {
    show(`/membros/x${query}`)

    expect(await screen.findByText('Empresa 1.0')).toBeInTheDocument()
    expect(getMemberReviewPage.mock.calls.map(([, page, , filters]) => ({ page, ...filters }))).toEqual([{ page: 1, sort: 'newest', rating: '' }])
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('uma página para lá da última passa para a última no endereço', async () => {
    show('/membros/x?reviews_page=9')

    expect(await screen.findByText('Empresa 3.0')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\?reviews_page=3$/))
  })

  it('a confirmação da sessão ao recarregar mantém os parâmetros; uma troca de sessão volta ao padrão', async () => {
    const member = useAuthStore.getState().user
    useAuthStore.setState({ user: null, status: 'loading' })
    show('/membros/x?reviews_page=2&reviews_sort=oldest')

    await act(async () => useAuthStore.setState({ user: member, status: 'authenticated' }))

    expect(await screen.findByText('Empresa 2.0')).toBeInTheDocument()
    expect(lastRequest()).toEqual({ page: 2, sort: 'oldest', rating: '' })
    expect(screen.getByTestId('location')).toHaveTextContent('?reviews_page=2&reviews_sort=oldest')

    await act(async () => useAuthStore.setState({ user: { ...member, id: 'u2' } }))

    expect(await screen.findByText('Empresa 1.0')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toBeEmptyDOMElement()
  })

  it('o padrão não escreve parâmetros no endereço', async () => {
    const user = userEvent.setup()
    show('/membros/x?reviews_sort=oldest')
    await screen.findByText('Empresa 1.0')

    await choose(user, 'Ordenar avaliações', 'Mais recentes')

    await waitFor(() => expect(screen.getByTestId('location')).toBeEmptyDOMElement())
  })
})
