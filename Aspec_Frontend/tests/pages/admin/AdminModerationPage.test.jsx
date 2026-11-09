import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AdminModerationPage from '../../../src/pages/admin/AdminModerationPage'
import { getAdminReviews, hideReview, showReview, unflagReview } from '../../../src/services/adminReviews'
import { normalizeError } from '../../../src/services/api'

vi.mock('../../../src/services/adminReviews', () => ({
  getAdminReviews: vi.fn(),
  hideReview: vi.fn(),
  showReview: vi.fn(),
  unflagReview: vi.fn(),
}))

function review(id, status, reviewer, reviewed, rating, comment, createdAt, extra = {}) {
  return {
    id,
    rating,
    comment,
    status,
    hidden_reason: null,
    reviewer: { business_name: reviewer },
    reviewed: { business_name: reviewed },
    flagging_sources: [],
    created_at: createdAt,
    ...extra,
  }
}

const visible = review(
  '4f1d2c3b-0001-4a00-8000-000000000001', 'Visible', 'Construções Silva & Filhos', 'TechBless Solutions', 5,
  'Trabalho de excelência! A equipa TechBless cumpriu todos os prazos.', '2025-01-15T10:00:00+00:00',
)
const hiddenNoReason = review(
  '4f1d2c3b-0002-4a00-8000-000000000002', 'Hidden', 'Clínica Saúde Plena', 'Advocacia Fernandes', 4,
  'Muito profissional e disponível.', '2025-01-12T10:00:00+00:00',
)
const hiddenWithReason = review(
  '4f1d2c3b-0003-4a00-8000-000000000003', 'Hidden', 'Restaurante Sabor Lusitano', 'Ginásio Vida Ativa', 2,
  'Não recomendo a ninguém.', '2025-01-11T10:00:00+00:00', { hidden_reason: 'Linguagem imprópria.' },
)
const flagged = review(
  '4f1d2c3b-0004-4a00-8000-000000000004', 'Flagged', 'Casa Moderna Decorações', 'Padaria São João', 1,
  'Péssimo atendimento! Nunca mais volto.', '2025-01-10T10:00:00+00:00', { flagging_sources: ['automatic'] },
)
const flaggedByMembers = review(
  '4f1d2c3b-0005-4a00-8000-000000000005', 'Flagged', 'Loja Bem-Estar', 'Café Central', 2,
  'Serviço muito lento.', '2025-01-09T10:00:00+00:00', { flagging_sources: ['member'] },
)

const items = [visible, hiddenNoReason, hiddenWithReason, flagged]
const counts = { all: 31, flagged: 4, visible: 23, hidden: 4 }

function list(listItems = items, pagination = {}, listCounts = counts) {
  return {
    items: listItems,
    pagination: { current_page: 1, per_page: 10, total: 31, last_page: 1, ...pagination },
    counts: listCounts,
  }
}

function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function apiError(status, message, errors) {
  return new AxiosError('x', AxiosError.ERR_BAD_REQUEST, undefined, undefined, {
    status,
    statusText: '',
    headers: {},
    config: {},
    data: { success: false, ...(message ? { message } : {}), ...(errors ? { errors } : {}) },
  })
}

function SearchProbe() {
  return <p data-testid="search">{useLocation().search}</p>
}

function show(path = '/admin/moderacao') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/moderacao" element={<><AdminModerationPage /><SearchProbe /></>} />
      </Routes>
    </MemoryRouter>
  )
}

function waitForList() {
  return screen.findByRole('list', { name: 'Avaliações' })
}

function chip(label) {
  return within(screen.getByRole('group', { name: 'Filtrar avaliações por estado' }))
    .getByRole('button', { name: new RegExp(`^${label}`) })
}

function cardOf(business) {
  return screen.getByText(business).closest('li')
}

function actionName(action, item) {
  const reviewer = item.reviewer.business_name ?? 'Empresa desconhecida'
  const reviewed = item.reviewed.business_name ?? 'Empresa desconhecida'
  const prefix = { hide: 'Ocultar avaliação de', show: 'Mostrar avaliação de', unflag: 'Retirar sinalização da avaliação de' }[action]

  return `${prefix} ${reviewer} a ${reviewed}`
}

function exactText(text) {
  return (_, element) => element?.textContent === text
    && ![...element.children].some((child) => child.textContent === text)
}

function lastCall() {
  return getAdminReviews.mock.calls.at(-1)
}

async function openAction(user, action, item) {
  const name = actionName(action, item)
  await waitFor(() => expect(screen.getByRole('button', { name })).toBeEnabled())
  await user.click(screen.getByRole('button', { name }))

  return screen.findByRole('dialog')
}

const CONFIRM_LABEL = { hide: 'Ocultar avaliação', show: 'Mostrar avaliação', unflag: 'Retirar sinalização' }

async function confirm(user, action) {
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: CONFIRM_LABEL[action] }))
}

const SERVICES = { hide: hideReview, show: showReview, unflag: unflagReview }

describe('Moderação de Conteúdos', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-03T10:00:00Z'))
    getAdminReviews.mockResolvedValue(list())
    hideReview.mockResolvedValue({ message: 'Avaliação ocultada com sucesso.' })
    showReview.mockResolvedValue({ message: 'Avaliação mostrada com sucesso.' })
    unflagReview.mockResolvedValue({ message: 'Sinalização removida com sucesso.' })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.resetAllMocks()
    vi.restoreAllMocks()
  })

  it('uma avaliação sinalizada mostra a origem, o motivo e o comentário completo de cada report', async () => {
    const comment = 'O autor nunca foi cliente: não existe qualquer fatura em nome desta empresa nem contacto registado.'
    getAdminReviews.mockResolvedValue(list([{
      ...flagged,
      reports: [
        { id: 'rp1', source: 'automatic', reason: 'language_filter', comment: null, created_at: '2025-01-10T10:00:00+00:00' },
        { id: 'rp2', source: 'member', reason: 'no_business_relationship', comment, created_at: '2025-01-11T10:00:00+00:00' },
        { id: 'rp3', source: 'member', reason: 'codigo_novo', comment: '<b>sem html</b>', created_at: '2025-01-12T10:00:00+00:00' },
      ],
    }]))
    show()
    await waitForList()

    const card = cardOf('Casa Moderna Decorações')

    expect(within(card).getByRole('heading', { level: 3, name: 'Sinalizações' })).toBeInTheDocument()
    expect(within(card).getByText(/Linguagem imprópria \(deteção automática\)/).closest('li')).toHaveTextContent('Automática')
    expect(within(card).getByText(/Sem relação comercial entre as partes/).closest('li')).toHaveTextContent('Membro')
    expect(within(card).getByText(comment)).toBeInTheDocument()
    expect(within(card).getByText(/Motivo não identificado/)).toBeInTheDocument()
    expect(within(card).getByText('<b>sem html</b>')).toBeInTheDocument()
  })

  it('sem reports não aparece a secção de sinalizações', async () => {
    getAdminReviews.mockResolvedValue(list([{ ...flagged, reports: [] }, { ...visible, reports: [] }]))
    show()
    await waitForList()

    expect(screen.queryByRole('heading', { level: 3, name: 'Sinalizações' })).not.toBeInTheDocument()
  })

  it('mostra o carregamento e depois os cartões', async () => {
    const pending = deferred()
    getAdminReviews.mockReturnValueOnce(pending.promise)
    show()

    expect(screen.getByText('A carregar avaliações...').closest('[role="status"]')).not.toBeNull()

    await act(async () => { pending.resolve(list()) })

    expect(await waitForList()).toBeInTheDocument()
    expect(screen.queryByText('A carregar avaliações...')).not.toBeInTheDocument()
    expect(screen.getByText('Construções Silva & Filhos')).toBeInTheDocument()
  })

  it('pede todas as avaliações da página 1 e mostra os chips com as contagens e Todas ativo', async () => {
    show()
    await waitForList()

    expect(getAdminReviews.mock.calls[0]).toEqual([{ status: 'all', page: 1 }, expect.any(AbortSignal)])
    const buttons = within(screen.getByRole('group', { name: 'Filtrar avaliações por estado' })).getAllByRole('button')
    const expected = [['Todas', 31], ['Sinalizadas', 4], ['Visíveis', 23], ['Ocultas', 4]]
    expect(buttons).toHaveLength(4)
    expected.forEach(([label, count], index) => {
      expect(buttons[index]).toHaveTextContent(new RegExp(`^${label}\\s*${count}$`))
    })
    expect(chip('Todas')).toHaveAttribute('aria-pressed', 'true')
    expect(chip('Sinalizadas')).toHaveAttribute('aria-pressed', 'false')
  })

  it('mostra a faixa das sinalizadas no plural, no singular e nada com zero, sem ser um alerta', async () => {
    const { unmount } = show()
    await waitForList()

    const plural = screen.getByText(exactText('4 avaliações sinalizadas ocultas ao público até decisão do admin.'))
    expect(plural.closest('[role="alert"]')).toBeNull()
    unmount()

    getAdminReviews.mockResolvedValue(list(items, {}, { ...counts, flagged: 1 }))
    const second = show()
    await waitForList()

    expect(screen.getByText(exactText('1 avaliação sinalizada oculta ao público até decisão do admin.'))).toBeInTheDocument()
    second.unmount()

    getAdminReviews.mockResolvedValue(list([visible], { total: 1 }, { all: 1, flagged: 0, visible: 1, hidden: 0 }))
    show()
    await waitForList()

    expect(screen.queryByText(/ao público até decisão do admin/)).not.toBeInTheDocument()
  })

  it('mostra um cartão por avaliação com autor, avaliado, estrelas, comentário e data, sem emails nem ids', async () => {
    show()
    const reviews = within(await waitForList())

    expect(reviews.getAllByRole('listitem')).toHaveLength(4)
    const card = within(cardOf('Construções Silva & Filhos'))
    expect(card.getByText('avaliou')).toBeInTheDocument()
    expect(card.getByText('TechBless Solutions')).toBeInTheDocument()
    expect(card.getByRole('img', { name: '5 de 5 estrelas' })).toBeInTheDocument()
    expect(card.getByText(`"${visible.comment}"`)).toBeInTheDocument()
    expect(card.getByText('15 Jan 2025')).toBeInTheDocument()

    const text = document.body.textContent
    expect(text).not.toContain('@')
    for (const item of items) {
      expect(text).not.toContain(item.id)
    }
  })

  it('um cartão visível só tem o botão Ocultar, sem badge nem nota', async () => {
    show()
    await waitForList()

    const card = within(cardOf('Construções Silva & Filhos'))
    const buttons = card.getAllByRole('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0]).toHaveAccessibleName('Ocultar avaliação de Construções Silva & Filhos a TechBless Solutions')
    expect(buttons[0].textContent.trim()).toBe('Ocultar')
    expect(card.queryByText('Oculta')).not.toBeInTheDocument()
    expect(card.queryByText('Sinalizada')).not.toBeInTheDocument()
    expect(card.queryByText(/Oculta sem justificação|Oculta enquanto estiver sinalizada/)).not.toBeInTheDocument()
  })

  it('um cartão oculto mostra o badge, a nota e só o botão Mostrar, e a justificação como texto simples', async () => {
    getAdminReviews.mockResolvedValue(list([hiddenNoReason, { ...hiddenWithReason, hidden_reason: '<b>Viola</b> o código' }]))
    show()
    await waitForList()

    const card = within(cardOf('Clínica Saúde Plena'))
    expect(card.getByText('Oculta')).toBeInTheDocument()
    expect(card.getByText('Oculta sem justificação.')).toBeInTheDocument()
    expect(card.getAllByRole('button').map((button) => button.getAttribute('aria-label') ?? button.textContent))
      .toEqual([actionName('show', hiddenNoReason)])

    const withReason = cardOf('Restaurante Sabor Lusitano')
    expect(within(withReason).getByText('<b>Viola</b> o código')).toBeInTheDocument()
    expect(withReason.querySelector('b')).toBeNull()
  })

  it('um cartão sinalizado mostra o badge, a nota da origem e Retirar sinalização antes de Ocultar', async () => {
    show()
    await waitForList()

    const element = cardOf('Casa Moderna Decorações')
    const card = within(element)
    expect(card.getByText('Sinalizada')).toBeInTheDocument()
    expect(element).toHaveTextContent('Oculta enquanto estiver sinalizada. Sinalizada pelo filtro automático.')
    expect(card.getAllByRole('button').map((button) => button.getAttribute('aria-label') ?? button.textContent))
      .toEqual([actionName('unflag', flagged), actionName('hide', flagged)])
  })

  it('mudar de chip pede esse estado e guarda-o no URL, e Todas tira o estado do URL', async () => {
    const user = userEvent.setup({ delay: null })
    show()
    await waitForList()

    await user.click(chip('Sinalizadas'))

    await waitFor(() => expect(lastCall()).toEqual([{ status: 'flagged', page: 1 }, expect.any(AbortSignal)]))
    expect(chip('Sinalizadas')).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent(/^\?estado=flagged$/))

    await user.click(chip('Todas'))

    await waitFor(() => expect(lastCall()).toEqual([{ status: 'all', page: 1 }, expect.any(AbortSignal)]))
    await waitFor(() => expect(screen.getByTestId('search').textContent).toBe(''))
  })

  it('abre no filtro do URL e ignora um estado desconhecido', async () => {
    const { unmount } = show('/admin/moderacao?estado=hidden')
    await waitForList()

    expect(getAdminReviews.mock.calls[0]).toEqual([{ status: 'hidden', page: 1 }, expect.any(AbortSignal)])
    expect(chip('Ocultas')).toHaveAttribute('aria-pressed', 'true')
    unmount()

    getAdminReviews.mockClear()
    show('/admin/moderacao?estado=xyz')
    await waitForList()

    expect(getAdminReviews.mock.calls[0]).toEqual([{ status: 'all', page: 1 }, expect.any(AbortSignal)])
    expect(chip('Todas')).toHaveAttribute('aria-pressed', 'true')
  })

  it.each([
    ['', 'Não há avaliações.'],
    ['?estado=flagged', 'Não há avaliações sinalizadas.'],
    ['?estado=visible', 'Não há avaliações visíveis.'],
    ['?estado=hidden', 'Não há avaliações ocultas.'],
  ])('sem avaliações em "%s" mostra "%s"', async (search, text) => {
    getAdminReviews.mockResolvedValue(list([], { total: 0 }))
    show(`/admin/moderacao${search}`)

    expect(await screen.findByText(text)).toBeInTheDocument()
  })

  it.each([
    ['erro do servidor', () => apiError(500, 'Erro interno.')],
    ['formato inesperado', () => new Error('A resposta da moderação tem um formato inesperado.')],
  ])('uma falha da carga (%s) mostra o erro e recupera com Tentar novamente', async (_case, makeError) => {
    const error = makeError()
    getAdminReviews.mockRejectedValueOnce(error)
    const user = userEvent.setup({ delay: null })
    show('/admin/moderacao?estado=flagged')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(normalizeError(error).message)

    await user.click(within(alert).getByRole('button', { name: 'Tentar novamente' }))

    await waitForList()
    expect(getAdminReviews).toHaveBeenCalledTimes(2)
    expect(getAdminReviews.mock.calls[1][0]).toEqual(getAdminReviews.mock.calls[0][0])
    expect(getAdminReviews.mock.calls[1][0]).toEqual({ status: 'flagged', page: 1 })
  })

  it('pagina com a paginação numerada, esconde-a com uma só página e mostra o total', async () => {
    getAdminReviews.mockImplementation(({ page }) => Promise.resolve(list(items, { current_page: page, last_page: 3 })))
    const user = userEvent.setup({ delay: null })
    const { unmount } = show()
    await waitForList()

    const pagination = within(screen.getByRole('navigation', { name: 'Paginação de avaliações' }))
    expect(screen.getByText('31 avaliações')).toBeInTheDocument()

    await user.click(pagination.getByRole('button', { name: 'Página 2' }))

    await waitFor(() => expect(lastCall()).toEqual([{ status: 'all', page: 2 }, expect.any(AbortSignal)]))
    unmount()

    getAdminReviews.mockReset()
    getAdminReviews.mockResolvedValue(list([visible], { total: 1 }))
    show()
    await waitForList()

    expect(screen.queryByRole('navigation', { name: 'Paginação de avaliações' })).not.toBeInTheDocument()
    expect(screen.getByText('1 avaliação')).toBeInTheDocument()
  })

  it('mudar de chip na página 2 volta à página 1', async () => {
    getAdminReviews.mockImplementation(({ page }) => Promise.resolve(list(items, { current_page: page, last_page: 3 })))
    const user = userEvent.setup({ delay: null })
    show()
    await waitForList()

    await user.click(screen.getByRole('button', { name: 'Página 2' }))
    await waitFor(() => expect(lastCall()[0]).toEqual({ status: 'all', page: 2 }))
    await waitFor(() => expect(chip('Visíveis')).toBeEnabled())

    await user.click(chip('Visíveis'))

    await waitFor(() => expect(lastCall()[0]).toEqual({ status: 'visible', page: 1 }))
  })

  it('ocultar abre o diálogo do print, envia a justificação e recarrega no mesmo filtro e página', async () => {
    const user = userEvent.setup({ delay: null })
    show()
    await waitForList()

    const dialog = within(await openAction(user, 'hide', visible))

    expect(dialog.getByRole('heading', { name: 'Ocultar avaliação' })).toBeInTheDocument()
    expect(dialog.getByText('A avaliação deixa de ser visível publicamente. Pode indicar uma justificação, que será mostrada ao membro avaliado na sua área pessoal.')).toBeInTheDocument()
    const field = dialog.getByRole('textbox', { name: 'Justificação (opcional)' })
    expect(field).toHaveAttribute('placeholder', 'Ex: A avaliação viola o Código de Conduta da ASPEC...')

    await user.type(field, 'Viola o código')
    await confirm(user, 'hide')

    expect(hideReview.mock.calls).toEqual([[visible.id, 'Viola o código']])
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect((await screen.findByText('Avaliação ocultada com sucesso.')).closest('[role="status"]')).not.toBeNull()
    await waitFor(() => expect(getAdminReviews).toHaveBeenCalledTimes(2))
    expect(getAdminReviews.mock.calls[1][0]).toEqual({ status: 'all', page: 1 })
  })

  it('ocultar sem escrever nada envia o texto vazio', async () => {
    const user = userEvent.setup({ delay: null })
    show()
    await waitForList()

    await openAction(user, 'hide', visible)
    await confirm(user, 'hide')

    expect(hideReview.mock.calls).toEqual([[visible.id, '']])
  })

  it.each([
    ['Cancelar', async (user) => user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))],
    ['Escape', async (user) => user.keyboard('{Escape}')],
  ])('%s fecha o diálogo de ocultar sem pedido e devolve o foco ao botão', async (_case, close) => {
    const user = userEvent.setup({ delay: null })
    show()
    await waitForList()

    await openAction(user, 'hide', visible)
    await close(user)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(hideReview).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: actionName('hide', visible) })).toHaveFocus()
  })

  it('mostrar confirma, chama o serviço só com o id e recarrega', async () => {
    const user = userEvent.setup({ delay: null })
    show()
    await waitForList()

    const dialog = within(await openAction(user, 'show', hiddenNoReason))
    expect(dialog.getByRole('heading', { name: 'Mostrar avaliação' })).toBeInTheDocument()
    expect(dialog.getByText('A avaliação volta a ficar visível publicamente e a justificação de ocultação é removida.')).toBeInTheDocument()

    await confirm(user, 'show')

    expect(showReview.mock.calls).toEqual([[hiddenNoReason.id]])
    expect(await screen.findByText('Avaliação mostrada com sucesso.')).toBeInTheDocument()
    await waitFor(() => expect(getAdminReviews).toHaveBeenCalledTimes(2))
  })

  it('retirar a sinalização confirma, chama o serviço só com o id e recarrega', async () => {
    const user = userEvent.setup({ delay: null })
    show()
    await waitForList()

    const dialog = within(await openAction(user, 'unflag', flagged))
    expect(dialog.getByRole('heading', { name: 'Retirar sinalização' })).toBeInTheDocument()
    expect(dialog.getByText('A avaliação deixa de estar sinalizada e volta a ficar visível publicamente.')).toBeInTheDocument()

    await confirm(user, 'unflag')

    expect(unflagReview.mock.calls).toEqual([[flagged.id]])
    expect(await screen.findByText('Sinalização removida com sucesso.')).toBeInTheDocument()
    await waitFor(() => expect(getAdminReviews).toHaveBeenCalledTimes(2))
  })

  it('Ocultar num cartão sinalizado abre o mesmo diálogo e oculta essa avaliação', async () => {
    const user = userEvent.setup({ delay: null })
    show()
    await waitForList()

    const dialog = within(await openAction(user, 'hide', flagged))
    expect(dialog.getByRole('heading', { name: 'Ocultar avaliação' })).toBeInTheDocument()

    await confirm(user, 'hide')

    expect(hideReview.mock.calls).toEqual([[flagged.id, '']])
  })

  it.each([
    ['hide', 409, 'Apenas avaliações visíveis ou sinalizadas podem ser ocultadas.', visible],
    ['hide', 404, 'Recurso não encontrado.', visible],
    ['show', 409, 'Apenas avaliações ocultas podem ser mostradas.', hiddenNoReason],
    ['show', 404, 'Recurso não encontrado.', hiddenNoReason],
    ['unflag', 409, 'Apenas avaliações sinalizadas podem ter a sinalização removida.', flagged],
    ['unflag', 404, 'Recurso não encontrado.', flagged],
  ])('%s com %i fecha o diálogo, mostra a mensagem da API e recarrega', async (action, status, message, item) => {
    SERVICES[action].mockRejectedValue(apiError(status, message))
    const user = userEvent.setup({ delay: null })
    show()
    await waitForList()

    await openAction(user, action, item)
    await confirm(user, action)

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    await waitFor(() => expect(getAdminReviews).toHaveBeenCalledTimes(2))
  })

  it('ocultar com 422 mantém o diálogo aberto com o erro e o texto escrito, sem recarregar', async () => {
    hideReview.mockRejectedValue(apiError(422, 'Os dados enviados são inválidos.', {
      justification: ['O campo justificação não pode ter mais de 2000 caracteres.'],
    }))
    const user = userEvent.setup({ delay: null })
    show()
    await waitForList()

    const dialog = within(await openAction(user, 'hide', visible))
    await user.type(dialog.getByRole('textbox', { name: 'Justificação (opcional)' }), 'Texto longo')
    await confirm(user, 'hide')

    expect(await dialog.findByRole('alert')).toHaveTextContent('O campo justificação não pode ter mais de 2000 caracteres.')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(dialog.getByRole('textbox', { name: 'Justificação (opcional)' })).toHaveValue('Texto longo')
    expect(getAdminReviews).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['500', () => apiError(500, 'Erro interno.'), 'Erro interno.'],
    ['erro de rede', () => new AxiosError('Network Error', AxiosError.ERR_NETWORK), 'Não foi possível contactar o servidor.'],
  ])('ocultar com %s mantém o diálogo aberto com a mensagem e o texto, sem recarregar', async (_case, makeError, message) => {
    hideReview.mockRejectedValue(makeError())
    const user = userEvent.setup({ delay: null })
    show()
    await waitForList()

    const dialog = within(await openAction(user, 'hide', visible))
    await user.type(dialog.getByRole('textbox', { name: 'Justificação (opcional)' }), 'Viola o código')
    await confirm(user, 'hide')

    expect(await dialog.findByRole('alert')).toHaveTextContent(message)
    expect(dialog.getByRole('textbox', { name: 'Justificação (opcional)' })).toHaveValue('Viola o código')
    expect(getAdminReviews).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['show', hiddenNoReason],
    ['unflag', flagged],
  ])('%s com 429 fecha o diálogo e mostra a mensagem, sem recarregar', async (action, item) => {
    SERVICES[action].mockRejectedValue(apiError(429))
    const user = userEvent.setup({ delay: null })
    show()
    await waitForList()

    await openAction(user, action, item)
    await confirm(user, action)

    expect(await screen.findByRole('alert')).toHaveTextContent('Demasiados pedidos. Tente novamente mais tarde.')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(getAdminReviews).toHaveBeenCalledTimes(1)
  })

  it('durante o pedido desativa o confirmar e as ações dos cartões e só pede uma vez', async () => {
    const pending = deferred()
    showReview.mockReturnValue(pending.promise)
    const user = userEvent.setup({ delay: null })
    show()
    await waitForList()

    await openAction(user, 'show', hiddenNoReason)
    const confirmButton = within(screen.getByRole('dialog')).getByRole('button', { name: 'Mostrar avaliação' })
    fireEvent.click(confirmButton)
    fireEvent.click(confirmButton)

    await waitFor(() => expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'A processar...' })).toBeDisabled())
    expect(showReview).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: actionName('hide', visible) })).toBeDisabled()
    expect(screen.getByRole('button', { name: actionName('unflag', flagged) })).toBeDisabled()

    await act(async () => { pending.resolve({ message: 'Avaliação mostrada com sucesso.' }) })
  })

  it('se a página ficar vazia depois de uma ação, pede a última página', async () => {
    let unflagged = false
    unflagReview.mockImplementation(() => {
      unflagged = true
      return Promise.resolve({ message: 'Sinalização removida com sucesso.' })
    })
    getAdminReviews.mockImplementation(({ page }) => {
      if (page === 2) {
        return Promise.resolve(unflagged
          ? list([], { current_page: 2, last_page: 1, total: 10 })
          : list([flaggedByMembers], { current_page: 2, last_page: 2, total: 11 }))
      }
      return Promise.resolve(list([flagged], { current_page: 1, last_page: unflagged ? 1 : 2, total: unflagged ? 10 : 11 }))
    })
    const user = userEvent.setup({ delay: null })
    show('/admin/moderacao?estado=flagged')
    await waitForList()

    await user.click(screen.getByRole('button', { name: 'Página 2' }))
    expect(await screen.findByText('Loja Bem-Estar')).toBeInTheDocument()

    await openAction(user, 'unflag', flaggedByMembers)
    await confirm(user, 'unflag')

    expect(await screen.findByText('Casa Moderna Decorações')).toBeInTheDocument()
    expect(getAdminReviews.mock.calls.map(([filters]) => filters)).toEqual([
      { status: 'flagged', page: 1 },
      { status: 'flagged', page: 2 },
      { status: 'flagged', page: 2 },
      { status: 'flagged', page: 1 },
    ])
    expect(screen.queryByText('Loja Bem-Estar')).not.toBeInTheDocument()
  })

  it('depois de ocultar, o foco vai para o primeiro botão da mesma avaliação no novo lugar', async () => {
    getAdminReviews
      .mockResolvedValueOnce(list([flagged, visible, hiddenNoReason]))
      .mockResolvedValueOnce(list([{ ...visible, status: 'Hidden' }, flagged, hiddenNoReason]))
    const user = userEvent.setup({ delay: null })
    show()
    await waitForList()

    await openAction(user, 'hide', visible)
    await confirm(user, 'hide')

    await waitFor(() => expect(screen.getByRole('button', { name: actionName('show', visible) })).toHaveFocus())
  })

  it.each([
    ['a avaliação seguinte', [flagged, flaggedByMembers], flagged, flaggedByMembers],
    ['a nova última avaliação', [flagged, flaggedByMembers], flaggedByMembers, flagged],
  ])('se a avaliação sai da lista, o foco vai para %s', async (_case, initial, treated, focused) => {
    getAdminReviews
      .mockResolvedValueOnce(list(initial, { total: 2 }))
      .mockResolvedValueOnce(list(initial.filter((item) => item !== treated), { total: 1 }))
    const user = userEvent.setup({ delay: null })
    show('/admin/moderacao?estado=flagged')
    await waitForList()

    await openAction(user, 'unflag', treated)
    await confirm(user, 'unflag')

    await waitFor(() => expect(screen.getByRole('button', { name: actionName('unflag', focused) })).toHaveFocus())
  })

  it('se a lista fica vazia, o foco vai para o título Avaliações', async () => {
    getAdminReviews
      .mockResolvedValueOnce(list([flagged], { total: 1 }))
      .mockResolvedValueOnce(list([], { total: 0 }))
    const user = userEvent.setup({ delay: null })
    show('/admin/moderacao?estado=flagged')
    await waitForList()

    await openAction(user, 'unflag', flagged)
    await confirm(user, 'unflag')

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Avaliações' })).toHaveFocus())
  })

  it('a faixa de resultado fecha-se com o seu botão e uma nova ação apaga-a antes do pedido', async () => {
    const user = userEvent.setup({ delay: null })
    show()
    await waitForList()

    await openAction(user, 'show', hiddenNoReason)
    await confirm(user, 'show')
    await screen.findByText('Avaliação mostrada com sucesso.')

    await user.click(screen.getByRole('button', { name: 'Fechar mensagem' }))
    expect(screen.queryByText('Avaliação mostrada com sucesso.')).not.toBeInTheDocument()

    await openAction(user, 'show', hiddenNoReason)
    await confirm(user, 'show')
    await screen.findByText('Avaliação mostrada com sucesso.')

    const pending = deferred()
    hideReview.mockReturnValue(pending.promise)
    await openAction(user, 'hide', visible)
    await confirm(user, 'hide')

    expect(hideReview).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Avaliação mostrada com sucesso.')).not.toBeInTheDocument()

    await act(async () => { pending.resolve({ message: 'Avaliação ocultada com sucesso.' }) })
  })

  it('desmontar com a lista pendente cancela o pedido e ignora a resposta tardia', async () => {
    const pending = deferred()
    getAdminReviews.mockReturnValueOnce(pending.promise)
    const consoleError = vi.spyOn(console, 'error')
    const { container, unmount } = show()

    unmount()

    expect(getAdminReviews.mock.calls[0][1].aborted).toBe(true)
    await act(async () => { pending.resolve(list()) })
    expect(container.innerHTML).toBe('')
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('durante a recarga mantém a lista anterior e as contagens dos chips', async () => {
    const reload = deferred()
    getAdminReviews
      .mockResolvedValueOnce(list())
      .mockReturnValueOnce(reload.promise)
    const user = userEvent.setup({ delay: null })
    show()
    await waitForList()

    await openAction(user, 'show', hiddenNoReason)
    await confirm(user, 'show')
    await waitFor(() => expect(getAdminReviews).toHaveBeenCalledTimes(2))

    expect(screen.getByRole('list', { name: 'Avaliações' })).toBeInTheDocument()
    expect(screen.getByText('Construções Silva & Filhos')).toBeInTheDocument()
    expect(screen.queryByText('A carregar avaliações...')).not.toBeInTheDocument()
    expect(chip('Todas')).toHaveTextContent(/^Todas\s*31$/)

    await act(async () => { reload.resolve(list()) })
  })

  it('um negócio sem nome aparece como Empresa desconhecida, com a inicial e no nome do botão', async () => {
    const unnamed = { ...visible, reviewer: { business_name: null } }
    getAdminReviews.mockResolvedValue(list([unnamed], { total: 1 }))
    show()
    await waitForList()

    const card = within(cardOf('Empresa desconhecida'))
    expect(card.getByText('E')).toBeInTheDocument()
    expect(card.getByRole('button', { name: 'Ocultar avaliação de Empresa desconhecida a TechBless Solutions' })).toBeInTheDocument()
  })
})
