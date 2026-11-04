import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { AxiosError } from 'axios'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MemberReviews from '../../../src/components/members/MemberReviews'
import { api } from '../../../src/services/api'
import { useAuthStore } from '../../../src/store/authStore'

const target = '019512a1-9999-7123-8123-123456789abc'
const viewer = '019512a1-9998-7123-8123-123456789abc'
const reviewId = '019512a1-9997-7123-8123-123456789abc'
const review = { id: reviewId, rating: 4, comment: 'Experiência de outro membro', created_at: '2026-10-01T12:00:00Z', reviewer: { id: target, business_name: 'Empresa avaliadora' }, is_mine: false }
const member = { id: viewer, role: { name: 'Member' }, account_status: { name: 'Active' } }

describe('Sinalizar avaliação através do contrato real', () => {
  let original, adapter, rows, failure, pending
  const reportResponse = (config) => ({ config, status: 201, statusText: 'Created', headers: {}, data: {
    success: true, message: 'Avaliação sinalizada para moderação.', data: {
      id: viewer, review_id: reviewId, ...JSON.parse(config.data), comment: JSON.parse(config.data).comment ?? null,
      source: 'member', resolved_at: null, created_at: '2026-11-03T00:00:00Z',
    },
  } })
  beforeEach(() => {
    original = api.defaults.adapter
    rows = [review]; failure = null; pending = null
    useAuthStore.setState({ user: member, status: 'authenticated', sessionChanging: false })
    adapter = vi.fn(async (config) => {
      if (config.method === 'post') {
        if (pending) return new Promise((resolve) => pending.push({ config, resolve }))
        if (failure) throw new AxiosError('Erro', 'ERR_BAD_RESPONSE', config, undefined, { status: failure, data: {
          success: false, message: failure === 409 ? 'Já sinalizou esta avaliação e o report ainda está pendente.' : 'Pedido recusado pelo servidor.',
          ...(failure === 422 ? { errors: { reason: ['Motivo inválido.'], comment: ['Comentário inválido.'] } } : {}),
        } })
        rows = []
        return reportResponse(config)
      }
      return { config, status: 200, statusText: 'OK', headers: {}, data: { success: true, data: {
      average_rating: rows.length ? 4 : null, reviews_count: rows.length, items: rows,
      pagination: { current_page: 1, per_page: 5, total: rows.length, last_page: 1 },
    } } }
    })
    api.defaults.adapter = adapter
  })
  afterEach(() => { cleanup(); api.defaults.adapter = original; vi.restoreAllMocks() })
  const show = () => render(<MemberReviews memberId={target} />)
  const open = async () => {
    const user = userEvent.setup()
    const trigger = await screen.findByRole('button', { name: /Sinalizar avaliação/ })
    await user.click(trigger)
    return { user, trigger, dialog: screen.getByRole('dialog', { name: 'Sinalizar avaliação' }) }
  }

  it('ativa o envio com motivo válido e reconcilia lista, média e contagem após 201', async () => {
    const onSummaryChange = vi.fn()
    render(<MemberReviews memberId={target} onSummaryChange={onSummaryChange} />)
    const { user, dialog } = await open()
    expect(within(dialog).getByText(/Empresa avaliadora/)).toBeInTheDocument()
    const reason = within(dialog).getByRole('combobox', { name: /Motivo/ })
    expect(within(dialog).getByRole('button', { name: 'Enviar sinalização' })).toBeDisabled()
    await user.click(reason)
    await user.click(within(dialog).getByRole('option', { name: 'Outro motivo', exact: true }))
    await user.type(within(dialog).getByRole('textbox', { name: /Comentário/ }), 'Descrição da experiência')
    const submit = within(dialog).getByRole('button', { name: 'Enviar sinalização' })
    expect(submit).toBeEnabled()
    await user.click(submit)
    await screen.findByText('Avaliação sinalizada para moderação.')
    await screen.findByText('Ainda não existem avaliações.')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const requests = adapter.mock.calls.filter(([c]) => c.method === 'post')
    expect(requests).toHaveLength(1)
    expect(requests[0][0].url).toBe(`/reviews/${reviewId}/reports`)
    expect(JSON.parse(requests[0][0].data)).toEqual({ reason: 'other', comment: 'Descrição da experiência' })
    expect(onSummaryChange).toHaveBeenLastCalledWith({ average_rating: null, reviews_count: 0 })
  })

  it.each([401, 403, 404, 409, 419, 422, 429, 500])('mostra erro HTTP %s sem sucesso e preserva os campos', async (status) => {
    failure = status
    show()
    const { user, dialog } = await open()
    await user.click(within(dialog).getByRole('combobox', { name: /Motivo/ }))
    await user.click(within(dialog).getByRole('option', { name: 'Outro motivo', exact: true }))
    await user.type(within(dialog).getByRole('textbox', { name: /Comentário/ }), 'Rascunho a preservar')
    await user.click(within(dialog).getByRole('button', { name: 'Enviar sinalização' }))
    await waitFor(() => expect(within(dialog).getAllByRole('alert').length).toBeGreaterThan(0))
    expect(within(dialog).getByRole('textbox', { name: /Comentário/ })).toHaveValue('Rascunho a preservar')
    expect(screen.queryByText('Avaliação sinalizada para moderação.')).not.toBeInTheDocument()
    expect(adapter.mock.calls.filter(([c]) => c.method === 'post')).toHaveLength(1)
    if (status === 409) expect(within(dialog).getByText(/Já sinalizou esta avaliação/)).toBeInTheDocument()
    if (status === 422) {
      expect(within(dialog).getByText('Motivo inválido.')).toBeInTheDocument()
      expect(within(dialog).getByText('Comentário inválido.')).toBeInTheDocument()
    }
  })

  it('aceita comentário opcional e bloqueia duplo envio; ignora resposta após logout', async () => {
    pending = []
    show()
    const { user, dialog } = await open()
    const comment = within(dialog).getByRole('textbox', { name: /Comentário/ })
    expect(comment).not.toBeRequired()
    await user.click(within(dialog).getByRole('combobox', { name: /Motivo/ }))
    await user.click(within(dialog).getByRole('option', { name: 'Outro motivo', exact: true }))
    await user.dblClick(within(dialog).getByRole('button', { name: 'Enviar sinalização' }))
    await waitFor(() => expect(pending).toHaveLength(1))
    expect(JSON.parse(pending[0].config.data)).toEqual({ reason: 'other' })
    expect(within(dialog).getByRole('combobox', { name: /Motivo/ })).toBeDisabled()
    await act(async () => useAuthStore.setState({ user: null, status: 'idle' }))
    expect(pending[0].config.signal.aborted).toBe(true)
    await act(async () => pending[0].resolve(reportResponse(pending[0].config)))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('Avaliação sinalizada para moderação.')).not.toBeInTheDocument()
  })

  it('fecha o diálogo e impede envio se a sessão entrar em transição', async () => {
    show()
    const { user, dialog } = await open()
    await user.click(within(dialog).getByRole('combobox', { name: /Motivo/ }))
    await user.click(within(dialog).getByRole('option', { name: 'Outro motivo', exact: true }))
    await act(async () => useAuthStore.setState({ sessionChanging: true }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(adapter.mock.calls.filter(([c]) => c.method === 'post')).toHaveLength(0)
  })

  it('valida o limite de 2000 caracteres Unicode de acordo com o backend', async () => {
    show()
    const { user, dialog } = await open()
    await user.click(within(dialog).getByRole('combobox', { name: /Motivo/ }))
    await user.click(within(dialog).getByRole('option', { name: 'Outro motivo', exact: true }))
    const comment = within(dialog).getByRole('textbox', { name: /Comentário/ })
    fireEvent.change(comment, { target: { value: '😀'.repeat(2000) } })
    expect(within(dialog).getByRole('button', { name: 'Enviar sinalização' })).toBeEnabled()
    fireEvent.change(comment, { target: { value: '😀'.repeat(2001) } })
    expect(within(dialog).getByRole('button', { name: 'Enviar sinalização' })).toBeDisabled()
    expect(comment).toHaveAttribute('aria-invalid', 'true')
    expect(within(dialog).getByText('O comentário não pode exceder 2000 caracteres.')).toBeInTheDocument()
    expect(adapter.mock.calls.filter(([c]) => c.method === 'post')).toHaveLength(0)
  })

  it.each(['Cancelar', 'Fechar', 'Escape'])('fecha por %s e devolve o foco à bandeira', async (method) => {
    show()
    const { user, trigger, dialog } = await open()
    if (method === 'Escape') await user.keyboard('{Escape}')
    else await user.click(within(dialog).getByRole('button', { name: method, exact: true }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('mantém o foco no diálogo e limpa o rascunho ao reabrir', async () => {
    show()
    const { user, trigger, dialog } = await open()
    expect(dialog).toContainElement(document.activeElement)
    const close = within(dialog).getByRole('button', { name: 'Fechar', exact: true })
    const cancel = within(dialog).getByRole('button', { name: 'Cancelar', exact: true })
    close.focus()
    await user.tab({ shift: true })
    expect(cancel).toHaveFocus()
    await user.tab()
    expect(close).toHaveFocus()
    await user.type(within(dialog).getByRole('textbox', { name: /Comentário/ }), 'Rascunho privado')
    await user.click(cancel)
    await user.click(trigger)
    expect(screen.getByRole('textbox', { name: /Comentário/ })).toHaveValue('')
  })

  it('não apresenta bandeira na própria avaliação nem com autoria por confirmar', async () => {
    rows = [{ ...review, is_mine: true }, { ...review, id: viewer, is_mine: undefined }]
    show()
    await screen.findByText('A minha avaliação')
    expect(screen.queryByRole('button', { name: /Sinalizar avaliação/ })).not.toBeInTheDocument()
  })

  it.each([
    ['visitante', null, 'idle'],
    ['Member Inactive', { ...member, account_status: { name: 'Inactive' } }, 'authenticated'],
    ['sessão por confirmar', member, 'loading'],
    ['Admin sem contrato de autorização para sinalizar', { ...member, role: { name: 'Admin' } }, 'authenticated'],
  ])('não disponibiliza a ação a %s', async (_, user, status) => {
    useAuthStore.setState({ user, status })
    show()
    if (user?.role?.name === 'Admin') await screen.findByText(review.comment)
    expect(screen.queryByRole('button', { name: /Sinalizar avaliação/ })).not.toBeInTheDocument()
  })

  it('fecha e descarta o comentário imediatamente no logout', async () => {
    show()
    const { user, dialog } = await open()
    await user.type(within(dialog).getByRole('textbox', { name: /Comentário/ }), 'Rascunho privado')
    await act(async () => useAuthStore.setState({ user: null, status: 'idle' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue('Rascunho privado')).not.toBeInTheDocument()
    expect(document.body.style.overflow).not.toBe('hidden')
  })
})
