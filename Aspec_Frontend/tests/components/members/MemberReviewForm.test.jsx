import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MemberReviews from '../../../src/components/members/MemberReviews'
import PublicMemberProfile from '../../../src/components/members/PublicMemberProfile'
import { MemoryRouter } from 'react-router-dom'
import { api } from '../../../src/services/api'
import { useAuthStore } from '../../../src/store/authStore'

const target = '019512a1-9999-7123-8123-123456789abc'
const viewer = '019512a1-9998-7123-8123-123456789abc'
const reviewId = '019512a1-9997-7123-8123-123456789abc'
const initialMine = { id: reviewId, rating: 4, comment: 'A minha experiência', created_at: '2026-10-01T12:00:00Z', is_mine: true, reviewer: { id: viewer, business_name: 'Empresa membro' } }
const other = { ...initialMine, id: target, is_mine: false, rating: 5, comment: 'Outra experiência', reviewer: { id: target, business_name: 'Outra empresa' } }
const response = (config, data, status = 200) => ({ config, status, statusText: '', headers: {}, data: { success: true, data } })

describe('Formulário de avaliação do perfil público', () => {
  let original, mine, profileId, failure, pending, adapter
  beforeEach(() => {
    original = api.defaults.adapter
    mine = null; profileId = viewer; failure = null; pending = null
    useAuthStore.setState({ user: { id: target, role: { name: 'Member' }, account_status: { name: 'Active' } }, status: 'authenticated' })
    adapter = vi.fn(async (config) => {
      if (config.url === '/member-profile') return response(config, { id: profileId })
      if (config.method === 'post' || config.method === 'delete') {
        if (failure) throw new AxiosError('Erro', 'ERR_BAD_RESPONSE', config, undefined, { status: failure, data: { message: 'Pedido recusado.', errors: failure === 422 ? { comment: ['Comentário inválido.'] } : undefined } })
        if (pending) return new Promise((resolve) => pending.push({ config, resolve }))
        if (config.method === 'delete') { mine = null; return response(config, null) }
        const payload = JSON.parse(config.data)
        const existed = !!mine
        mine = { ...initialMine, ...payload }
        return response(config, mine, existed ? 200 : 201)
      }
      const items = mine ? [mine, other] : [other]
      return response(config, {
        items,
        average_rating: mine ? (mine.rating + 5) / 2 : 5,
        reviews_count: items.length,
        rating_distribution: [1, 2, 3, 4, 5].map((rating) => ({
          rating,
          count: items.filter((item) => item.rating === rating).length,
        })),
        pagination: { current_page: 1, per_page: 5, total: items.length, last_page: 1 },
      })
    })
    api.defaults.adapter = adapter
  })
  afterEach(() => { cleanup(); api.defaults.adapter = original; vi.restoreAllMocks() })
  const show = (props = {}) => render(<MemberReviews memberId={target} allowReview {...props} />)
  const openCreate = async () => {
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Avaliar', exact: true }))
    await user.click(screen.getByRole('radio', { name: '5 estrelas' }))
    return user
  }

  it('cria com 201, recarrega o resumo e impede a criação duplicada', async () => {
    const onSummaryChange = vi.fn()
    show({ onSummaryChange })
    const user = await openCreate()
    await user.click(screen.getByRole('radio', { name: /3/ }))
    await user.type(screen.getByRole('textbox'), 'Bom serviço')
    await user.click(screen.getByRole('button', { name: 'Publicar avaliação' }))
    await screen.findByText('A minha avaliação')
    expect(screen.getAllByText('Bom serviço')).toHaveLength(1)
    expect(screen.queryByRole('button', { name: 'Avaliar', exact: true })).not.toBeInTheDocument()
    expect(adapter.mock.calls.filter(([c]) => c.method === 'post')).toHaveLength(1)
    expect(JSON.parse(adapter.mock.calls.find(([c]) => c.method === 'post')[0].data)).toEqual({ rating: 3, comment: 'Bom serviço' })
    expect(onSummaryChange).toHaveBeenLastCalledWith(expect.objectContaining({ average_rating: 4, reviews_count: 2 }))
  })

  it('edita com 200 e cancela sem alterar o conteúdo guardado', async () => {
    mine = { ...initialMine }
    show()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Editar', exact: true }))
    expect(screen.getByRole('textbox')).toHaveValue(initialMine.comment)
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'Rascunho')
    await user.click(screen.getByRole('button', { name: 'Cancelar', exact: true }))
    expect(screen.getByText(initialMine.comment)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Editar', exact: true }))
    expect(screen.getByRole('textbox')).toHaveValue(initialMine.comment)
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'Experiência atualizada')
    await user.click(screen.getByRole('button', { name: 'Guardar alterações' }))
    await screen.findByText('Experiência atualizada')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getAllByText('A minha avaliação')).toHaveLength(1)
  })

  it('remove apenas após confirmação e recarrega a contagem', async () => {
    mine = { ...initialMine }
    const onSummaryChange = vi.fn()
    show({ onSummaryChange })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Editar', exact: true }))
    await user.click(screen.getByRole('button', { name: 'Remover avaliação', exact: true }))
    expect(adapter.mock.calls.filter(([c]) => c.method === 'delete')).toHaveLength(0)
    await user.click(screen.getByRole('button', { name: /Sim, remover|Confirmar remoção/ }))
    await screen.findByRole('button', { name: 'Avaliar', exact: true })
    expect(screen.queryByText('A minha avaliação')).not.toBeInTheDocument()
    expect(onSummaryChange).toHaveBeenLastCalledWith(expect.objectContaining({ average_rating: 5, reviews_count: 1 }))
  })

  it.each([422, 409, 403, 429, 500])('conserva o rascunho com erro %s sem repetir o POST', async (status) => {
    failure = status
    show()
    const user = await openCreate()
    await user.type(screen.getByRole('textbox'), 'Texto a preservar')
    await user.click(screen.getByRole('button', { name: 'Publicar avaliação' }))
    await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0))
    expect(screen.getByRole('textbox')).toHaveValue('Texto a preservar')
    expect(adapter.mock.calls.filter(([c]) => c.method === 'post')).toHaveLength(1)
    if (status === 422) expect(screen.getByText('Comentário inválido.')).toBeInTheDocument()
  })

  it('impede autoavaliação usando o ID do perfil e não o ID do utilizador', async () => {
    profileId = target
    show()
    await screen.findByText('Outra experiência')
    await waitFor(() => expect(adapter.mock.calls.some(([c]) => c.url === '/member-profile')).toBe(true))
    expect(screen.queryByRole('button', { name: 'Avaliar', exact: true })).not.toBeInTheDocument()
  })

  it('mantém a própria em primeiro ao filtrar e quando a leitura falha', async () => {
    mine = { ...initialMine }
    show()
    const user = userEvent.setup()
    await screen.findByText('A minha avaliação')
    await user.click(screen.getByRole('combobox', { name: 'Filtrar por estrelas' }))
    await user.click(screen.getByRole('option', { name: '5 estrelas', exact: true }))
    await waitFor(() => expect(adapter.mock.calls.some(([c]) => c.params?.rating === 5)).toBe(true))
    await screen.findByRole('button', { name: 'Editar', exact: true })
    expect(screen.getByText('A minha avaliação').closest('li')).toHaveTextContent('A minha avaliação')
    expect(screen.getAllByText(initialMine.comment)).toHaveLength(1)
    api.defaults.adapter = async (config) => { throw new AxiosError('Erro', 'ERR_BAD_RESPONSE', config, undefined, { status: 500 }) }
    await user.click(screen.getByRole('combobox', { name: 'Ordenar avaliações' }))
    await user.click(screen.getByRole('option', { name: 'Mais antigas', exact: true }))
    await screen.findByRole('alert')
    expect(screen.getByText(initialMine.comment)).toBeInTheDocument()
    expect(screen.getAllByText('A minha avaliação')).toHaveLength(1)
  })

  it('exige escolher uma classificação antes de publicar', async () => {
    show()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Avaliar', exact: true }))
    await user.type(screen.getByRole('textbox'), 'Comentário')
    await user.click(screen.getByRole('button', { name: 'Publicar avaliação' }))
    expect(screen.getByText('Selecione entre 1 e 5 estrelas.')).toBeInTheDocument()
    expect(adapter.mock.calls.filter(([c]) => c.method === 'post')).toHaveLength(0)
  })

  it('não envia comentário em branco e limita o campo a 2000 caracteres', async () => {
    show()
    await openCreate()
    const textbox = screen.getByRole('textbox')
    expect(textbox).toHaveAttribute('maxlength', '2000')
    fireEvent.change(textbox, { target: { value: '   ' } })
    fireEvent.submit(textbox.closest('form'))
    expect(adapter.mock.calls.filter(([c]) => c.method === 'post')).toHaveLength(0)
  })

  it('bloqueia submissões duplas e ignora resultados após mudança de sessão', async () => {
    pending = []
    show()
    const user = await openCreate()
    await user.type(screen.getByRole('textbox'), 'Texto')
    const form = screen.getByRole('textbox').closest('form')
    fireEvent.submit(form); fireEvent.submit(form)
    await waitFor(() => expect(pending).toHaveLength(1))
    await act(async () => useAuthStore.setState({ user: { id: viewer, role: { name: 'Member' }, account_status: { name: 'Active' } } }))
    expect(pending[0].config.signal.aborted).toBe(true)
    await act(async () => pending[0].resolve(response(pending[0].config, initialMine, 201)))
    expect(screen.queryByText('A minha experiência')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('atualiza também a classificação global do perfil após guardar', async () => {
    const member = { id: target, name: 'Empresa', business_name: 'Empresa', description: null, logo_url: null, sector: { name: 'Setor' }, location: { name: 'Lisboa' }, average_rating: 5, reviews_count: 1, business_hours: [], portfolio: [] }
    render(<MemoryRouter><PublicMemberProfile member={member} allowContacts allowComments allowReview /></MemoryRouter>)
    const user = await openCreate()
    await user.click(screen.getByRole('radio', { name: /1/ }))
    await user.type(screen.getByRole('textbox'), 'Experiência')
    await user.click(screen.getByRole('button', { name: 'Publicar avaliação' }))
    await screen.findByText('Baseado em 2 avaliações')
    const summary = screen.getByRole('heading', { name: 'Classificação Global' }).parentElement
    expect(within(summary).getByText('3,0')).toBeInTheDocument()
  })
})
