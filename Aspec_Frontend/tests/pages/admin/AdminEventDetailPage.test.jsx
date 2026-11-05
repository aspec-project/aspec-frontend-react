import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AdminEventDetailPage from '../../../src/pages/admin/AdminEventDetailPage'
import { distributePrayerCards, getAdminEvent, getPrayerCardsStatus } from '../../../src/services/adminEvents'

vi.mock('../../../src/services/adminEvents', () => ({
  getAdminEvents: vi.fn(),
  getAdminEvent: vi.fn(),
  getPrayerCardsStatus: vi.fn(),
  distributePrayerCards: vi.fn(),
  exportEventAttendees: vi.fn(),
  createAdminEvent: vi.fn(),
  geocodeAddress: vi.fn(),
  updateAdminEvent: vi.fn(),
  deleteAdminEvent: vi.fn(),
}))

const EVENT_NAME = 'Pequeno-Almoço de Oração e Negócios — Porto'
const DISABLED_NOTE = 'Os cartões de oração não estão ativos neste evento. Pode ativá-los ao editar o evento.'
const LOCK_NOTE = 'Por confidencialidade, a administração não vê o conteúdo dos cartões nem quem recebe cada um.'
const DIALOG_DESCRIPTION = 'Depois de distribuídos, quem ainda não preencheu deixa de poder fazê-lo.'
const DISTRIBUTED_MESSAGE = 'Cartões de oração distribuídos.'
const ALREADY_DISTRIBUTED = 'Os cartões deste evento já foram distribuídos.'
const NOT_STARTED = 'Ainda não é possível distribuir: o evento ainda não começou.'
const TOO_MANY = 'Demasiados pedidos. Tente novamente mais tarde.'

const BEFORE_OPENING = '2025-01-20T12:00:00Z'
const DURING_EVENT_DAY = '2025-02-03T12:00:00Z'
const AFTER_DEADLINE = '2025-02-04T00:30:00Z'

const baseEvent = {
  id: 'ev-1',
  name: EVENT_NAME,
  category: { id: 'c1', name: 'Pequeno-Almoço' },
  location: { id: 'l2', name: 'Porto' },
  event_date: '2025-02-03',
  event_start_time: '08:00',
  event_end_time: '09:30',
  venue_name: 'Café Majestic',
  is_online: false,
  max_attendees: 25,
  registration_deadline: '2025-02-01T23:59:00+00:00',
  registrations_count: 18,
  prayer_cards_enabled: true,
}

function participant(name, business, submittedAt) {
  return { name, business_name: business, submitted_at: submittedAt }
}

const participants = [
  participant('Rui Magalhães', 'Magalhães Engenharia', '2025-02-03T08:07:00+00:00'),
  participant('Sofia Pereira', 'Pereira Contabilidade', '2025-02-03T08:12:00+00:00'),
  participant('Tiago Fonseca', 'Fonseca Arquitetos', '2025-02-03T08:20:00+00:00'),
  participant('Inês Moreira', 'Moreira Seguros', '2025-02-03T08:31:00+00:00'),
  participant('Bruno Teixeira', 'Teixeira & Filhos', '2025-02-03T08:45:00+00:00'),
  participant('Carla Antunes', 'Antunes Design', '2025-02-03T09:02:00+00:00'),
]

const baseStatus = {
  window: { status: 'open', opens_at: '2025-02-03T08:00:00+00:00', closes_at: '2025-02-03T23:59:59+00:00' },
  registrations_count: 18,
  cards_count: 6,
  distributed_at: null,
  participants,
}

const distributedStatus = {
  ...baseStatus,
  window: { ...baseStatus.window, status: 'closed' },
  distributed_at: '2025-02-03T12:05:00+00:00',
}

function eventWith(changes) {
  return { ...baseEvent, ...changes }
}

function statusWith(changes) {
  return { ...baseStatus, ...changes }
}

function deferred() {
  let resolve
  const promise = new Promise((res) => { resolve = res })
  return { promise, resolve }
}

function apiError(status, message) {
  return new AxiosError(`Request failed with status code ${status}`, AxiosError.ERR_BAD_RESPONSE, undefined, undefined, {
    status,
    statusText: 'Error',
    headers: {},
    config: {},
    data: { success: false, message },
  })
}

function show() {
  return render(
    <MemoryRouter initialEntries={['/admin/eventos/ev-1']}>
      <Routes>
        <Route path="/admin/eventos/:id" element={<AdminEventDetailPage />} />
        <Route path="/admin/eventos" element={<p>Lista de eventos</p>} />
      </Routes>
    </MemoryRouter>
  )
}

function freezeAt(iso) {
  vi.setSystemTime(new Date(iso))
}

function loaded(name = EVENT_NAME) {
  return screen.findByRole('heading', { level: 1, name })
}

function region(name) {
  return within(screen.getByRole('region', { name }))
}

function cardsRegion() {
  return screen.findByRole('region', { name: 'Cartões de oração' })
}

function pageDistributeButton() {
  return within(screen.getByRole('region', { name: 'Cartões de oração' })).getByRole('button', { name: 'Distribuir agora' })
}

function cardsHeading() {
  return screen.getByRole('heading', { level: 2, name: 'Cartões de oração' })
}

function exactText(text) {
  return (_, element) => element?.textContent === text
    && Array.from(element.children).every((child) => child.textContent !== text)
}

function textLeaves(element) {
  return Array.from(element.querySelectorAll('*'))
    .filter((node) => node.children.length === 0 && node.textContent.trim() !== '')
    .map((node) => node.textContent.trim())
}

async function findBanner(role, text) {
  const matches = (element) => (typeof text === 'string' ? element.textContent.includes(text) : text.test(element.textContent))

  await waitFor(() => expect(screen.getAllByRole(role).some(matches)).toBe(true))
}

async function openDialog(user) {
  await cardsRegion()
  await user.click(pageDistributeButton())

  return screen.getByRole('dialog', { name: 'Distribuir os cartões já?' })
}

async function confirmDistribution(user) {
  const dialog = await openDialog(user)
  await user.click(within(dialog).getByRole('button', { name: 'Distribuir agora' }))
}

describe('Detalhe do evento no backoffice', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    freezeAt(DURING_EVENT_DAY)
    getAdminEvent.mockResolvedValue(baseEvent)
    getPrayerCardsStatus.mockResolvedValue(baseStatus)
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.resetAllMocks()
  })

  it('mostra o carregamento e depois o regresso à lista, o tipo de evento e o nome', async () => {
    show()

    expect(screen.getByRole('status')).toHaveTextContent('A carregar evento...')
    await loaded()
    expect(screen.getByRole('link', { name: 'Voltar aos eventos' })).toHaveAttribute('href', '/admin/eventos')
    expect(screen.getByText('Pequeno-Almoço')).toBeInTheDocument()
    expect(screen.queryByText(/Sessão/)).not.toBeInTheDocument()
    expect(getAdminEvent.mock.calls[0][0]).toBe('ev-1')
  })

  it('o cartão de informação mostra a data, a hora, o local, o prazo e a lotação', async () => {
    const { unmount } = show()
    await loaded()

    const info = region('Informação do evento')
    expect(info.getByText('3 Fev 2025')).toBeInTheDocument()
    expect(info.getByText('08:00–09:30')).toBeInTheDocument()
    expect(info.getByText('Café Majestic · Porto')).toBeInTheDocument()
    expect(info.getByText('1 Fev 2025, 23:59')).toBeInTheDocument()
    expect(info.getByText(exactText('18 / 25 (72%)'))).toBeInTheDocument()
    unmount()

    getAdminEvent.mockResolvedValue(eventWith({ is_online: true, venue_name: null }))
    show()
    await loaded()

    expect(region('Informação do evento').getByText('Online')).toBeInTheDocument()
  })

  it('mostra Sessão X de Y quando o evento pertence a uma série', async () => {
    getAdminEvent.mockResolvedValue(eventWith({ series: { position: 1, total: 4 } }))
    show()
    await loaded()

    expect(screen.getByText('Sessão 1 de 4')).toBeInTheDocument()
  })

  it('sem cartões ativos mostra a nota e não pede o estado dos cartões', async () => {
    getAdminEvent.mockResolvedValue(eventWith({ prayer_cards_enabled: false }))
    show()
    await loaded()

    expect(screen.getByText(DISABLED_NOTE)).toBeInTheDocument()
    expect(getPrayerCardsStatus).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Distribuir agora' })).not.toBeInTheDocument()
  })

  it('antes da abertura mostra a contagem, a data de abertura e o botão desativado com o porquê', async () => {
    freezeAt(BEFORE_OPENING)
    show()
    await cardsRegion()

    const cards = region('Cartões de oração')
    expect(cards.getByText(exactText('6 de 18 inscritos'))).toBeInTheDocument()
    expect(cards.getByText('Abre a 3 Fev 2025')).toBeInTheDocument()
    const button = pageDistributeButton()
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-describedby')
    expect(button).toHaveAccessibleDescription('Abre a 3 Fev 2025')
    expect(screen.queryByText(/simulado/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Hoje/ })).not.toBeInTheDocument()
  })

  it('a lista de quem entregou segue a ordem da API com nome, empresa e hora de Lisboa', async () => {
    const { unmount } = show()
    await cardsRegion()

    const cards = region('Cartões de oração')
    expect(cards.getByRole('heading', { level: 3, name: 'Entregaram o cartão' })).toBeInTheDocument()
    const rows = cards.getAllByRole('listitem')
    expect(rows).toHaveLength(6)
    rows.forEach((row, index) => {
      expect(within(row).getByText(participants[index].name)).toBeInTheDocument()
      expect(within(row).getByText(participants[index].business_name)).toBeInTheDocument()
    })
    expect(within(rows[0]).getByText('03/02 às 08:07')).toBeInTheDocument()
    expect(screen.getByText(LOCK_NOTE)).toBeInTheDocument()
    unmount()

    getPrayerCardsStatus.mockResolvedValue(statusWith({
      cards_count: 2,
      participants: [
        participant(null, 'Empresa Sem Nome', '2027-06-10T18:15:00+00:00'),
        participant('Ana Lopes', null, '2025-02-03T09:00:00+00:00'),
      ],
    }))
    show()
    await cardsRegion()

    const [noName, noBusiness] = region('Cartões de oração').getAllByRole('listitem')
    expect(within(noName).getByText('Nome indisponível')).toBeInTheDocument()
    expect(within(noName).getByText('10/06 às 19:15')).toBeInTheDocument()
    expect(textLeaves(noBusiness)).toEqual(['Ana Lopes', '03/02 às 09:00'])
  })

  it('sem cartões entregues mostra a mensagem de lista vazia e 0 inscritos preenchidos', async () => {
    getPrayerCardsStatus.mockResolvedValue(statusWith({ participants: [], cards_count: 0 }))
    show()
    await cardsRegion()

    const cards = region('Cartões de oração')
    expect(cards.getByText('Ainda ninguém entregou o cartão.')).toBeInTheDocument()
    expect(cards.getByText(exactText('0 de 18 inscritos'))).toBeInTheDocument()
  })

  it('no dia do evento, antes das 23h59, aguarda o fim do prazo e permite distribuir', async () => {
    show()
    await cardsRegion()

    expect(region('Cartões de oração').getByText('A aguardar o fim do prazo (23h59)')).toBeInTheDocument()
    expect(pageDistributeButton()).toBeEnabled()
  })

  it('com os cartões distribuídos mostra a data da distribuição e desativa o botão', async () => {
    getPrayerCardsStatus.mockResolvedValue(statusWith({ distributed_at: '2025-02-04T18:18:00+00:00', window: { ...baseStatus.window, status: 'closed' } }))
    freezeAt('2025-02-05T09:00:00Z')
    show()
    await cardsRegion()

    expect(region('Cartões de oração').getByText('Distribuídos em 04/02 às 18:18')).toBeInTheDocument()
    expect(pageDistributeButton()).toBeDisabled()
  })

  it('depois das 23h59 sem distribuição avisa que vem a automática e mantém o botão ativo', async () => {
    freezeAt(AFTER_DEADLINE)
    show()
    await cardsRegion()

    expect(region('Cartões de oração').getByText('Prazo terminado · distribuição automática em breve')).toBeInTheDocument()
    expect(pageDistributeButton()).toBeEnabled()
  })

  it('pede confirmação com o resumo e Cancelar fecha sem distribuir e devolve o foco ao botão', async () => {
    const user = userEvent.setup({ delay: null })
    show()

    const dialog = await openDialog(user)

    expect(dialog).toHaveAccessibleDescription(DIALOG_DESCRIPTION)
    expect(within(dialog).getByText(EVENT_NAME)).toBeInTheDocument()
    expect(within(dialog).getByText('6 de 18 inscritos preencheram o cartão.')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Distribuir agora' })).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(distributePrayerCards).not.toHaveBeenCalled()
    await waitFor(() => expect(pageDistributeButton()).toHaveFocus())
  })

  it('ao confirmar distribui uma vez, mostra o sucesso e o novo estado da resposta e põe o foco no título', async () => {
    distributePrayerCards.mockResolvedValue({ message: DISTRIBUTED_MESSAGE, status: distributedStatus })
    const user = userEvent.setup({ delay: null })
    show()

    await confirmDistribution(user)

    await findBanner('status', DISTRIBUTED_MESSAGE)
    expect(distributePrayerCards).toHaveBeenCalledTimes(1)
    expect(distributePrayerCards.mock.calls[0][0]).toBe('ev-1')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(region('Cartões de oração').getByText('Distribuídos em 03/02 às 12:05')).toBeInTheDocument()
    expect(getPrayerCardsStatus).toHaveBeenCalledTimes(1)
    expect(pageDistributeButton()).toBeDisabled()
    await waitFor(() => expect(cardsHeading()).toHaveFocus())
  })

  it('com o pedido pendente um segundo clique não distribui outra vez', async () => {
    const pending = deferred()
    distributePrayerCards.mockReturnValue(pending.promise)
    const user = userEvent.setup({ delay: null })
    show()

    const dialog = await openDialog(user)
    const confirm = within(dialog).getByRole('button', { name: 'Distribuir agora' })
    await user.click(confirm)
    await waitFor(() => expect(confirm).toBeDisabled())
    for (const button of within(dialog).getAllByRole('button')) {
      expect(button).toBeDisabled()
    }
    await user.click(confirm)

    expect(distributePrayerCards).toHaveBeenCalledTimes(1)
    await act(async () => { pending.resolve({ message: DISTRIBUTED_MESSAGE, status: distributedStatus }) })
    expect(distributePrayerCards).toHaveBeenCalledTimes(1)
  })

  it('409 por já estarem distribuídos fecha o diálogo, mostra o erro, recarrega o estado e põe o foco no título', async () => {
    distributePrayerCards.mockRejectedValue(apiError(409, ALREADY_DISTRIBUTED))
    getPrayerCardsStatus.mockResolvedValueOnce(baseStatus).mockResolvedValueOnce(distributedStatus)
    const user = userEvent.setup({ delay: null })
    show()

    await confirmDistribution(user)

    await findBanner('alert', ALREADY_DISTRIBUTED)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(getPrayerCardsStatus).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Distribuídos em 03/02 às 12:05')).toBeInTheDocument()
    await waitFor(() => expect(cardsHeading()).toHaveFocus())
  })

  it('409 por o evento ainda não ter começado mostra a mensagem e recarrega o estado', async () => {
    distributePrayerCards.mockRejectedValue(apiError(409, NOT_STARTED))
    const user = userEvent.setup({ delay: null })
    show()

    await confirmDistribution(user)

    await findBanner('alert', NOT_STARTED)
    await waitFor(() => expect(getPrayerCardsStatus).toHaveBeenCalledTimes(2))
  })

  it('429 fecha o diálogo e mostra o erro sem recarregar, com o botão ativo e o foco nele', async () => {
    distributePrayerCards.mockRejectedValue(apiError(429, TOO_MANY))
    const user = userEvent.setup({ delay: null })
    show()

    await confirmDistribution(user)

    await findBanner('alert', TOO_MANY)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(getPrayerCardsStatus).toHaveBeenCalledTimes(1)
    expect(pageDistributeButton()).toBeEnabled()
    await waitFor(() => expect(pageDistributeButton()).toHaveFocus())
  })

  it.each([
    ['500 com mensagem', apiError(500, 'Erro interno.'), 'Erro interno.'],
    ['erro de rede', new AxiosError('Network Error', AxiosError.ERR_NETWORK), 'Não foi possível contactar o servidor.'],
  ])('%s mostra a mensagem do erro sem recarregar o estado', async (_, error, message) => {
    distributePrayerCards.mockRejectedValue(error)
    const user = userEvent.setup({ delay: null })
    show()

    await confirmDistribution(user)

    await findBanner('alert', message)
    expect(getPrayerCardsStatus).toHaveBeenCalledTimes(1)
    expect(pageDistributeButton()).toBeEnabled()
  })

  it('404 ao distribuir mostra o erro e recarrega o evento, que pode já não ter cartões', async () => {
    distributePrayerCards.mockRejectedValue(apiError(404, 'Este evento não tem cartões de oração.'))
    getAdminEvent.mockResolvedValueOnce(baseEvent).mockResolvedValueOnce(eventWith({ prayer_cards_enabled: false }))
    const user = userEvent.setup({ delay: null })
    show()

    await confirmDistribution(user)

    await findBanner('alert', 'Este evento não tem cartões de oração.')
    await waitFor(() => expect(getAdminEvent).toHaveBeenCalledTimes(2))
    expect(await screen.findByText(DISABLED_NOTE)).toBeInTheDocument()
  })

  it('evento inexistente mostra que não foi encontrado, com o regresso à lista, e não pede os cartões', async () => {
    getAdminEvent.mockRejectedValue(apiError(404, 'Recurso não encontrado.'))
    show()

    expect(await screen.findByRole('heading', { level: 1, name: 'Evento não encontrado.' })).toBeInTheDocument()
    expect(screen.getByText('O evento pedido não existe ou foi apagado.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar aos eventos' })).toHaveAttribute('href', '/admin/eventos')
    expect(getPrayerCardsStatus).not.toHaveBeenCalled()
  })

  it('um erro do servidor ao carregar o evento mostra a mensagem e recupera com Tentar novamente', async () => {
    getAdminEvent.mockRejectedValueOnce(apiError(500, 'Erro interno.')).mockResolvedValueOnce(baseEvent)
    const user = userEvent.setup({ delay: null })
    show()

    await findBanner('alert', 'Erro interno.')
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    await loaded()
    expect(getAdminEvent).toHaveBeenCalledTimes(2)
  })

  it('uma resposta do evento fora do formato mostra a mensagem genérica e nunca a interna', async () => {
    getAdminEvent.mockRejectedValue(new Error('A resposta do evento tem um formato inesperado.'))
    show()

    await findBanner('alert', 'Não foi possível carregar o evento.')
    expect(screen.queryByText(/formato inesperado/)).not.toBeInTheDocument()
  })

  it('um erro ao carregar os cartões mantém a informação do evento e Tentar novamente só pede o estado', async () => {
    getPrayerCardsStatus.mockRejectedValueOnce(apiError(500, 'Erro interno.')).mockResolvedValueOnce(baseStatus)
    const user = userEvent.setup({ delay: null })
    show()

    await findBanner('alert', /Não foi possível carregar os cartões de oração\.|Erro interno\./)
    expect(screen.getByRole('region', { name: 'Informação do evento' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await cardsRegion()).toBeInTheDocument()
    expect(getPrayerCardsStatus).toHaveBeenCalledTimes(2)
    expect(getAdminEvent).toHaveBeenCalledTimes(1)
  })

  it('se os cartões forem desligados entretanto mostra a nota sem alerta', async () => {
    getPrayerCardsStatus.mockRejectedValue(apiError(404, 'Este evento não tem cartões de oração.'))
    show()

    expect(await screen.findByText(DISABLED_NOTE)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('um sucesso sem estado legível na resposta mostra a faixa verde e volta a pedir o estado', async () => {
    distributePrayerCards.mockResolvedValue({ message: DISTRIBUTED_MESSAGE, status: null })
    getPrayerCardsStatus.mockResolvedValueOnce(baseStatus).mockResolvedValueOnce(distributedStatus)
    const user = userEvent.setup({ delay: null })
    show()

    await confirmDistribution(user)

    await findBanner('status', DISTRIBUTED_MESSAGE)
    await waitFor(() => expect(getPrayerCardsStatus).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Distribuídos em 03/02 às 12:05')).toBeInTheDocument()
  })

  it('não mostra o versículo nem campos fora da lista branca', async () => {
    getAdminEvent.mockResolvedValue(eventWith({ prayer_verse: 'Versículo secreto', organizer_notes: 'Notas secretas do organizador' }))
    show()
    await cardsRegion()

    expect(screen.queryByText(/Versículo secreto/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Notas secretas do organizador/)).not.toBeInTheDocument()
  })
})
