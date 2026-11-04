import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MemberReviews from '../../../src/components/members/MemberReviews'
import { getMemberReviews } from '../../../src/services/members'
import { api } from '../../../src/services/api'
import { useAuthStore } from '../../../src/store/authStore'

const id = 'b8f9c1a0-8888-4e88-8888-888888888888'
const otherId = 'b8f9c1a0-7777-4e88-8888-888888888888'
const review = {
  id, rating: 5, comment: 'Excelente serviço <script>alert(1)</script>',
  reviewer: { id, business_name: 'Santos & Filhos', contacts: { email: 'privado@example.test' } },
  created_at: '2026-09-20T10:15:00+01:00', contacts: 'Dados privados',
}
const body = (page = 1, items = [review], total = 2) => ({
  success: true, message: 'Avaliações', data: {
    average_rating: 4.8, reviews_count: total, items,
    rating_distribution: [1, 2, 3, 4, 5].map((rating) => ({
      rating,
      count: rating === 5 ? total : 0,
    })),
    pagination: { current_page: page, per_page: 5, total, last_page: Math.max(1, Math.ceil(total / 5)) },
  },
})
const response = (config, data = body(config.params.page)) => ({ data, config, status: 200, statusText: '', headers: {} })
const httpError = (config, status) => new AxiosError('Erro', AxiosError.ERR_BAD_RESPONSE, config, undefined, { ...response(config), status })

describe('Avaliações públicas de membros', () => {
  let original
  beforeEach(() => {
    original = api.defaults.adapter
    useAuthStore.setState({ user: { id, role: { name: 'Member' }, account_status: { name: 'Active' } }, status: 'authenticated' })
    api.defaults.adapter = (config) => Promise.resolve(response(config))
  })
  afterEach(() => { cleanup(); api.defaults.adapter = original; vi.restoreAllMocks() })

  it('um membro Active lê avaliações e datas em português sem expor campos adicionais', async () => {
    const adapter = vi.fn((config) => Promise.resolve(response(config)))
    api.defaults.adapter = adapter
    render(<MemberReviews memberId={id} />)
    expect(screen.getByRole('status')).toHaveTextContent('A carregar avaliações')
    await screen.findByText('Santos & Filhos')
    expect(screen.getByText('S')).toBeInTheDocument()
    expect(screen.getByText('Set 2026')).toHaveAttribute('datetime', review.created_at)
    expect(screen.getByText(review.comment)).toBeInTheDocument()
    expect(document.querySelector('script')).toBeNull()
    expect(screen.queryByText('privado@example.test')).not.toBeInTheDocument()
    expect(screen.queryByText('Dados privados')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByText('Para avaliar este membro, é necessário ser membro ASPEC.')).not.toBeInTheDocument()
    expect(screen.getByText('Distribuição por estrelas')).toBeInTheDocument()
    expect(adapter.mock.calls[0][0]).toMatchObject({ url: `/members/${id}/reviews`, params: { page: 1 }, skipAuthRedirect: true })
  })

  it('o serviço conserva apenas os campos confirmados sem exigir items.length igual ao total', async () => {
    const data = await getMemberReviews(id)
    expect(data.items).toHaveLength(1)
    expect(data.pagination.total).toBe(2)
    expect(data.items[0]).not.toHaveProperty('contacts')
    expect(data.items[0].reviewer).not.toHaveProperty('contacts')
    expect(data.items[0].reviewer).toEqual({ id, business_name: 'Santos & Filhos' })
  })

  it('apresenta autores anonimizados sem exigir um ID nem um nome pessoal', async () => {
    api.defaults.adapter = (config) => Promise.resolve(response(config, body(1, [
      { ...review, reviewer: { id: null, business_name: 'Empresa anonimizada' } },
    ])))
    render(<MemberReviews memberId={id} />)
    expect(await screen.findByText('Empresa anonimizada')).toBeInTheDocument()
    expect(screen.getByText('E')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('não interpreta um resumo público sem items como lista vazia', async () => {
    api.defaults.adapter = (config) => Promise.resolve(response(config, {
      success: true, data: { average_rating: 4, reviews_count: 2 },
    }))
    render(<MemberReviews memberId={id} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar as avaliações')
    expect(screen.queryByText('Ainda não existem avaliações.')).not.toBeInTheDocument()
  })

  it.each(['Member', 'Admin'])('não mostra aviso ao %s Active mesmo sem permissão de submissão nem cria formulário', async (role) => {
    useAuthStore.setState({ user: { id, role: { name: role }, account_status: { name: 'Active' } }, status: 'authenticated' })
    render(<MemberReviews memberId={id} allowReview={false} />)
    await screen.findByText('Santos & Filhos')
    expect(screen.queryByText('Para avaliar este membro, é necessário ser membro ASPEC.')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(document.querySelector('form')).toBeNull()
  })

  it('mostra estado vazio numa resposta válida', async () => {
    api.defaults.adapter = (config) => Promise.resolve(response(config, body(1, [], 0)))
    render(<MemberReviews memberId={id} />)
    expect(await screen.findByText('Ainda não existem avaliações.')).toBeInTheDocument()
    expect(screen.queryByText('Para avaliar este membro, é necessário ser membro ASPEC.')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('pagina no servidor e apresenta a distribuição enviada pela API', async () => {
    const user = userEvent.setup()
    const adapter = vi.fn((config) => Promise.resolve(response(config, body(config.params.page, [{ ...review, reviewer: { ...review.reviewer, business_name: `Autor página ${config.params.page}` } }], 6))))
    api.defaults.adapter = adapter
    render(<MemberReviews memberId={id} />)
    await screen.findByText('Autor página 1')
    expect(screen.getByRole('button', { name: 'Avaliações anteriores' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Avaliações seguintes' }))
    await screen.findByText('Autor página 2')
    expect(screen.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Avaliações seguintes' })).toBeDisabled()
    expect(adapter.mock.calls.map(([config]) => config.params.page)).toEqual([1, 1, 2])
    expect(screen.getByText('Distribuição por estrelas')).toBeInTheDocument()
  })

  it.each([401, 403, 404, 500, undefined])('erro %s permite repetir a lista sem afetar o perfil', async (status) => {
    let failure = true
    api.defaults.adapter = (config) => failure
      ? Promise.reject(status === undefined ? new AxiosError('Network Error', AxiosError.ERR_NETWORK) : httpError(config, status))
      : Promise.resolve(response(config))
    render(<><h1>Perfil disponível</h1><MemberReviews memberId={id} /></>)
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar as avaliações')
    expect(screen.getByRole('heading', { name: 'Perfil disponível' })).toBeInTheDocument()
    failure = false
    screen.getByRole('button', { name: 'Tentar carregar avaliações novamente' }).focus()
    await userEvent.setup().keyboard('{Enter}')
    await screen.findByText('Santos & Filhos')
  })

  it('cancela pedidos de outro membro e ignora resposta fora de ordem', async () => {
    const pending = []
    api.defaults.adapter = (config) => new Promise((resolve) => pending.push({ config, resolve }))
    const view = render(<MemberReviews memberId={id} />)
    await waitFor(() => expect(pending).toHaveLength(1))
    view.rerender(<MemberReviews memberId={otherId} />)
    await waitFor(() => expect(pending).toHaveLength(2))
    expect(pending[0].config.signal.aborted).toBe(true)
    await act(async () => pending[1].resolve(response(pending[1].config, body(1, [{ ...review, reviewer: { ...review.reviewer, business_name: 'Autor atual' } }]))))
    await screen.findByText('Autor atual')
    await act(async () => pending[0].resolve(response(pending[0].config)))
    expect(screen.queryByText('Santos & Filhos')).not.toBeInTheDocument()
    view.unmount()
    expect(pending[1].config.signal.aborted).toBe(true)
  })

  it('mantém foco durante a paginação e cancela uma página pendente quando muda o membro', async () => {
    const pending = []
    api.defaults.adapter = (config) => config.url === `/members/${id}/reviews` && config.params.page === 1
      ? Promise.resolve(response(config, body(1, [review], 6)))
      : new Promise((resolve) => pending.push({ config, resolve }))
    const view = render(<MemberReviews memberId={id} />)
    await screen.findByText('Santos & Filhos')
    const next = screen.getByRole('button', { name: 'Avaliações seguintes' })
    next.focus()
    await userEvent.setup().keyboard('{Enter}')
    await waitFor(() => expect(pending).toHaveLength(1))
    expect(next).toBeDisabled()
    expect(next).toHaveFocus()
    view.rerender(<MemberReviews memberId={otherId} />)
    await waitFor(() => expect(pending).toHaveLength(2))
    expect(pending[0].config.signal.aborted).toBe(true)
    expect(pending[1].config.params.page).toBe(1)
    await act(async () => pending[1].resolve(response(pending[1].config, body(1, []))))
    await screen.findByText('Ainda não existem avaliações.')
    await act(async () => pending[0].resolve(response(pending[0].config, body(2, [review], 6))))
    expect(screen.queryByText('Santos & Filhos')).not.toBeInTheDocument()
  })

  it('limpa resultados ao mudar de sessão e regressa à primeira página', async () => {
    const pending = []
    let block = false
    const adapter = vi.fn((config) => block ? new Promise((resolve) => pending.push({ config, resolve })) : Promise.resolve(response(config, body(config.params.page, [review], 6))))
    api.defaults.adapter = adapter
    render(<MemberReviews memberId={id} />)
    await screen.findByText('Santos & Filhos')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Avaliações seguintes' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page'))
    block = true
    await act(async () => useAuthStore.setState({ user: { id: otherId, role: { name: 'Member' }, account_status: { name: 'Active' } }, status: 'authenticated' }))
    expect(screen.queryByText('Santos & Filhos')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('A carregar avaliações')
    await waitFor(() => expect(pending).toHaveLength(1))
    expect(pending[0].config.params.page).toBe(1)
    await act(async () => pending[0].resolve(response(pending[0].config, body(1, [review], 6))))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Página 1' })).toHaveAttribute('aria-current', 'page'))
  })

  it('ignora respostas de pedidos pendentes de uma sessão anterior', async () => {
    const pending = []
    api.defaults.adapter = (config) => new Promise((resolve) => pending.push({ config, resolve }))
    render(<MemberReviews memberId={id} />)
    await waitFor(() => expect(pending).toHaveLength(1))
    await act(async () => useAuthStore.setState({ user: { id: otherId, role: { name: 'Member' }, account_status: { name: 'Active' } }, status: 'authenticated' }))
    await waitFor(() => expect(pending).toHaveLength(2))
    await act(async () => pending[1].resolve(response(pending[1].config, body(1, []))))
    await screen.findByText('Ainda não existem avaliações.')
    await act(async () => pending[0].resolve(response(pending[0].config)))
    expect(screen.queryByText('Santos & Filhos')).not.toBeInTheDocument()
    expect(pending[0].config.signal.aborted).toBe(true)
  })

  it.each([
    { rating: 0 }, { rating: 5.5 }, { created_at: 'data inválida' }, { created_at: '2026-02-31T10:15:00+01:00' },
    { reviewer: { id, business_name: ' ' } }, { id: '../privado' },
  ])('trata avaliação malformada como erro: %j', async (change) => {
    api.defaults.adapter = (config) => Promise.resolve(response(config, body(1, [{ ...review, ...change }])))
    render(<MemberReviews memberId={id} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar as avaliações')
    expect(screen.queryByText('Santos & Filhos')).not.toBeInTheDocument()
  })

  it.each([['inválido', 1], [id, 0], [id, 1.5]])('valida UUID e página antes de pedir: %s / %s', async (memberId, page) => {
    const adapter = vi.fn()
    api.defaults.adapter = adapter
    await expect(getMemberReviews(memberId, page)).rejects.toThrow('parâmetros')
    expect(adapter).not.toHaveBeenCalled()
  })

  it('não transforma paginação malformada em estado vazio', async () => {
    const data = body()
    data.data.pagination.last_page = 2
    api.defaults.adapter = (config) => Promise.resolve(response(config, data))
    await expect(getMemberReviews(id)).rejects.toThrow('formato inesperado')
  })
})
