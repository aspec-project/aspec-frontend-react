import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, CanceledError } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CreateEventDialog from '../../../../src/components/admin/events/CreateEventDialog'
import { createAdminEvent, geocodeAddress } from '../../../../src/services/adminEvents'

vi.mock('../../../../src/services/adminEvents', () => ({
  getAdminEvents: vi.fn(),
  exportEventAttendees: vi.fn(),
  createAdminEvent: vi.fn(),
  geocodeAddress: vi.fn(),
  updateAdminEvent: vi.fn(),
  deleteAdminEvent: vi.fn(),
}))

const categories = [
  { id: 'c1', name: 'Workshop', color: '#6A1B9A' },
  { id: 'c2', name: 'Formação', color: '#1565C0' },
  { id: 'c3', name: 'Jantar', color: '#C62828' },
]

const locations = [
  { id: 'l1', name: 'Lisboa' },
  { id: 'l2', name: 'Porto' },
  { id: 'l3', name: 'Braga' },
]

const ALL_MISSING = 'Falta preencher: título, tipo de evento, delegação, data, hora de início, hora de fim, data limite de inscrição, nome do local, morada, capacidade máxima, descrição.'
const DEADLINE_HINT = 'Fecha às 23:59 (hora de Lisboa) desse dia.'
const ONLINE_HINT = 'Só os inscritos veem o link, depois do fecho das inscrições.'
const GEOCODE_HINT = 'Se não verificar, a morada é localizada automaticamente ao criar o evento.'
const END_TIME_ERROR = 'A hora de fim deve ser posterior à hora de início.'
const NOT_FOUND = 'Não foi possível encontrar esta morada no mapa. Verifique a morada e tente novamente.'
const UNAVAILABLE = 'O serviço de localização não está disponível de momento. Tente novamente dentro de instantes.'
const SUCCESS = 'Evento criado com sucesso.'
const FORMAT_ERROR = 'Indique uma hora entre 00:00 e 23:59 (ex.: 19:30).'
const APPROXIMATE_HINT = 'Confirme se é o local certo. Se não for, corrija a morada (sem andar, lote ou loja) e verifique outra vez.'

const IN_PERSON_PAYLOAD = {
  category_id: 'c3',
  location_id: 'l1',
  name: 'Jantar de Networking Lisboa',
  event_date: '2099-03-20',
  event_start_time: '19:30',
  event_end_time: '21:30',
  registration_deadline: '2099-03-18',
  is_online: false,
  venue_name: 'Restaurante Estrela do Norte',
  address: 'Rua das Flores 42',
  max_attendees: 40,
  description: 'Encontro mensal de networking entre membros.',
}

const FOUND = {
  latitude: 38.71,
  longitude: -9.14,
  display_name: '<img src=x onerror=alert(1)> Rua das Flores, Lisboa',
  attribution: '© OpenStreetMap contributors',
}

function readyOptions(overrides = {}) {
  return { categories, locations, loading: false, error: '', retry: vi.fn(), ...overrides }
}

function show(props = {}) {
  const onClose = vi.fn()
  const onSuccess = vi.fn()
  const view = render(<CreateEventDialog options={readyOptions()} onClose={onClose} onSuccess={onSuccess} {...props} />)

  return { ...view, onClose, onSuccess }
}

function labelled(text) {
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  return screen.getByLabelText(new RegExp(`^${escaped}\\s*\\*?$`))
}

const field = {
  title: () => labelled('Título do evento'),
  category: () => labelled('Tipo de evento'),
  location: () => labelled('Delegação / Localidade'),
  date: () => labelled('Data'),
  start: () => labelled('Hora de início'),
  end: () => labelled('Hora de fim'),
  deadline: () => labelled('Data limite de inscrição'),
  venue: () => labelled('Nome do local'),
  address: () => labelled('Morada completa'),
  onlineUrl: () => labelled('Link do evento online'),
  capacity: () => labelled('Capacidade máxima'),
  description: () => labelled('Sobre o evento'),
  notes: () => labelled('Notas do organizador (visíveis a todos)'),
}

function formatButton(name) {
  return within(screen.getByRole('group', { name: 'Formato' })).getByRole('button', { name })
}

function submitButton() {
  return screen.getByRole('button', { name: 'Criar evento' })
}

function verifyButton() {
  return screen.getByRole('button', { name: 'Verificar no mapa' })
}

function describedIds(element) {
  return (element.getAttribute('aria-describedby') ?? '').split(/\s+/)
}

function expectAlert(message) {
  expect(screen.getAllByRole('alert').some((element) => element.textContent.includes(message))).toBe(true)
}

function change(element, value) {
  fireEvent.change(element, { target: { value } })
}

async function typeInto(user, element, text) {
  await user.clear(element)
  await user.type(element, text)
}

function calendar() {
  return screen.getByRole('dialog', { name: /^Escolher / })
}

function day(label) {
  return within(calendar()).getByRole('button', { name: label })
}

function missingText() {
  return screen.getByText(/^Falta preencher:/)
}

async function openOptions(user, combobox) {
  await user.click(combobox)

  return screen.getAllByRole('option').map((option) => option.textContent.trim())
}

async function chooseOption(user, combobox, optionName) {
  await user.click(combobox)
  await user.click(screen.getByRole('option', { name: optionName }))
}

async function pickDate(user, opener, dayLabel) {
  await user.click(opener)
  await user.click(day(dayLabel))
}

async function fillCommon(user) {
  await typeInto(user, field.title(), 'Jantar de Networking Lisboa')
  await chooseOption(user, field.category(), 'Jantar')
  await chooseOption(user, field.location(), 'Lisboa')
  await pickDate(user, field.date(), '20 de março de 2099')
  await typeInto(user, field.start(), '19:30')
  await typeInto(user, field.end(), '21:30')
  await pickDate(user, field.deadline(), '18 de março de 2099')
  change(field.capacity(), '40')
  await typeInto(user, field.description(), 'Encontro mensal de networking entre membros.')
}

async function fillValidInPerson(user) {
  await fillCommon(user)
  await typeInto(user, field.venue(), 'Restaurante Estrela do Norte')
  await typeInto(user, field.address(), 'Rua das Flores 42')
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
  return new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    statusText: 'Error',
    headers: {},
    config: {},
    data: { success: false, message, ...(errors ? { errors } : {}) },
  })
}

describe('CreateEventDialog', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2099, 2, 10, 12))
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('abre vazio, com o foco no título, formato presencial, sem repetição e com tudo em falta no rodapé', () => {
    show()

    expect(screen.getByRole('dialog', { name: 'Criar Novo Evento' })).toHaveAttribute('aria-modal', 'true')
    expect(field.title()).toHaveFocus()
    expect(formatButton('Presencial')).toHaveAttribute('aria-pressed', 'true')
    expect(formatButton('Online')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByText(/Repetição|Pontual|Recorrente/)).not.toBeInTheDocument()
    expect(screen.getByText(ALL_MISSING)).toBeInTheDocument()
    expect(submitButton()).toBeDisabled()

    const hint = screen.getByText(DEADLINE_HINT)
    expect(hint).toBeVisible()
    expect(describedIds(field.deadline())).toContain(hint.id)
  })

  it('o tipo de evento e a delegação são listas próprias que começam em Selecione, sem essa opção na lista', async () => {
    const user = userEvent.setup()
    show()

    const expected = [
      { combobox: field.category, name: 'categoryId', placeholder: 'Selecione o tipo de evento', options: ['Workshop', 'Formação', 'Jantar'] },
      { combobox: field.location, name: 'locationId', placeholder: 'Selecione a delegação', options: ['Lisboa', 'Porto', 'Braga'] },
    ]

    for (const { combobox, name, placeholder } of expected) {
      expect(screen.getAllByRole('combobox')).toContain(combobox())
      expect(combobox()).toHaveAttribute('aria-haspopup', 'listbox')
      expect(combobox()).toHaveAttribute('aria-expanded', 'false')
      expect(combobox()).toHaveAttribute('name', name)
      expect(combobox()).toHaveAttribute('aria-required', 'true')
      expect(combobox()).toHaveTextContent(placeholder)
    }

    for (const { combobox, options } of expected) {
      expect(await openOptions(user, combobox())).toEqual(options)
      await user.keyboard('{Escape}')
    }

    await chooseOption(user, field.category(), 'Jantar')

    expect(field.category()).toHaveTextContent('Jantar')
    expect(missingText()).toHaveTextContent('Falta preencher: título, delegação, data, hora de início, hora de fim, data limite de inscrição, nome do local, morada, capacidade máxima, descrição.')

    await user.click(field.category())

    expect(screen.getByRole('option', { name: 'Jantar' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: 'Workshop' })).toHaveAttribute('aria-selected', 'false')

    for (const name of ['title', 'venue', 'address', 'capacity', 'description', 'notes']) {
      expect(field[name]().value).toBe('')
    }
  })

  it('a data abre um calendário que começa em hoje e não deixa escolher dias passados', async () => {
    const user = userEvent.setup()
    show()

    expect(field.date().tagName).toBe('BUTTON')
    expect(field.date()).toHaveAttribute('name', 'eventDate')
    expect(field.date()).toHaveTextContent('Selecionar data')

    await user.click(field.date())

    for (let dayNumber = 1; dayNumber <= 9; dayNumber += 1) {
      expect(day(`${dayNumber} de março de 2099`)).toHaveAttribute('aria-disabled', 'true')
    }

    await user.click(day('5 de março de 2099'))

    expect(field.date()).toHaveTextContent('Selecionar data')

    await user.click(day('20 de março de 2099'))

    expect(field.date()).toHaveTextContent('20 Mar 2099')
    expect(missingText()).toHaveTextContent('Falta preencher: título, tipo de evento, delegação, hora de início, hora de fim, data limite de inscrição, nome do local, morada, capacidade máxima, descrição.')
  })

  it('o calendário do prazo só deixa escolher de hoje até à véspera do evento e mantém o hint', async () => {
    const user = userEvent.setup()
    show()

    await user.click(field.deadline())

    for (let dayNumber = 11; dayNumber <= 31; dayNumber += 1) {
      expect(day(`${dayNumber} de março de 2099`)).not.toHaveAttribute('aria-disabled')
    }
    expect(within(calendar()).getByRole('button', { name: 'Mês seguinte' })).not.toHaveAttribute('aria-disabled')

    await user.keyboard('{Escape}')
    await pickDate(user, field.date(), '20 de março de 2099')
    await user.click(field.deadline())

    expect(day('19 de março de 2099')).not.toHaveAttribute('aria-disabled')
    expect(day('20 de março de 2099')).toHaveAttribute('aria-disabled', 'true')
    expect(day('21 de março de 2099')).toHaveAttribute('aria-disabled', 'true')
    expect(day('9 de março de 2099')).toHaveAttribute('aria-disabled', 'true')
    expect(within(calendar()).getByRole('button', { name: 'Mês seguinte' })).toHaveAttribute('aria-disabled', 'true')

    await user.click(day('18 de março de 2099'))

    expect(field.deadline()).toHaveTextContent('18 Mar 2099')
    expect(describedIds(field.deadline())).toContain(screen.getByText(DEADLINE_HINT).id)
  })

  it('as horas são campos de texto ao minuto e uma hora incompleta continua em falta', async () => {
    const user = userEvent.setup()
    show()

    for (const [element, name] of [[field.start(), 'startTime'], [field.end(), 'endTime']]) {
      expect(screen.getAllByRole('textbox')).toContain(element)
      expect(element).toHaveValue('')
      expect(element).toHaveAttribute('placeholder', 'hh:mm')
      expect(element).toHaveAttribute('name', name)
      expect(element).toHaveAttribute('aria-required', 'true')
    }

    await user.type(field.start(), '17:39')
    await user.type(field.end(), '19:28')

    expect(missingText()).not.toHaveTextContent('hora de início')
    expect(missingText()).not.toHaveTextContent('hora de fim')

    await fillValidInPerson(user)
    await typeInto(user, field.start(), '17:39')
    await typeInto(user, field.end(), '17:00')

    const error = screen.getByText(END_TIME_ERROR)
    expect(describedIds(field.end())).toContain(error.id)
    expect(submitButton()).toBeDisabled()

    await typeInto(user, field.start(), '17:3')

    expect(missingText()).toHaveTextContent('hora de início')
    expect(screen.queryByText(FORMAT_ERROR)).not.toBeInTheDocument()

    await user.tab()

    expect(screen.getByText(FORMAT_ERROR)).toBeInTheDocument()
  })

  it('as listas abertas do tipo e da delegação têm nome próprio', async () => {
    const user = userEvent.setup()
    show()

    await user.click(field.category())
    expect(screen.getByRole('listbox', { name: 'Opções de Tipo de evento' })).toBeInTheDocument()
    await user.keyboard('{Escape}')

    await user.click(field.location())
    expect(screen.getByRole('listbox', { name: 'Opções de Delegação / Localidade' })).toBeInTheDocument()
  })

  it('o formato tem a label visível e começa em Presencial', () => {
    show()

    expect(screen.getByText('Formato')).toBeVisible()
    expect(formatButton('Presencial')).toHaveAttribute('aria-pressed', 'true')
    expect(formatButton('Online')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByText(/Repetição|Pontual|Recorrente/)).not.toBeInTheDocument()
  })

  it('a lista em falta encolhe ao preencher e o botão fica ativo com o formulário completo', async () => {
    const user = userEvent.setup()
    show()

    await user.type(field.title(), 'Jantar')

    expect(screen.getByText(/^Falta preencher:/)).not.toHaveTextContent('título')

    await fillValidInPerson(user)

    expect(screen.queryByText(/Falta preencher/)).not.toBeInTheDocument()
    expect(submitButton()).toBeEnabled()
  })

  it('o formato Online troca a morada pelo link e voltar a Presencial recupera a morada', async () => {
    const user = userEvent.setup()
    show()
    await user.type(field.address(), 'Rua das Flores 42')

    await user.click(formatButton('Online'))

    expect(formatButton('Online')).toHaveAttribute('aria-pressed', 'true')
    expect(formatButton('Presencial')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByLabelText(/^Nome do local/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^Morada completa/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Verificar no mapa' })).not.toBeInTheDocument()
    const hint = screen.getByText(ONLINE_HINT)
    expect(describedIds(field.onlineUrl())).toContain(hint.id)
    expect(screen.getByText('Falta preencher: título, tipo de evento, delegação, data, hora de início, hora de fim, data limite de inscrição, link do evento, capacidade máxima, descrição.')).toBeInTheDocument()

    await user.click(formatButton('Presencial'))

    expect(field.address()).toHaveValue('Rua das Flores 42')
  })

  it('mostra os erros do browser junto ao campo e desativa o envio', async () => {
    const user = userEvent.setup()
    show()
    await fillValidInPerson(user)

    await typeInto(user, field.end(), '19:00')

    const error = screen.getByText(END_TIME_ERROR)
    expect(field.end()).toHaveAttribute('aria-invalid', 'true')
    expect(describedIds(field.end())).toContain(error.id)
    expect(submitButton()).toBeDisabled()
    expect(screen.getByText('Corrija os campos assinalados.')).toBeInTheDocument()

    await typeInto(user, field.end(), '21:30')
    await pickDate(user, field.date(), '17 de março de 2099')

    expect(screen.getByText('O prazo de inscrição tem de ser anterior ou igual ao início do evento.')).toBeInTheDocument()
    expect(field.deadline()).toHaveAttribute('aria-invalid', 'true')
  })

  it('cria um presencial sem verificação com o payload exato e bloqueia o modal durante o pedido', async () => {
    const pending = deferred()
    createAdminEvent.mockImplementationOnce(() => pending.promise)
    const user = userEvent.setup()
    const { onClose, onSuccess } = show()
    await fillValidInPerson(user)

    await user.click(submitButton())

    expect(createAdminEvent).toHaveBeenCalledTimes(1)
    expect(createAdminEvent).toHaveBeenCalledWith(IN_PERSON_PAYLOAD)
    expect(screen.getByRole('button', { name: 'A criar...' })).toBeDisabled()
    expect(field.title()).toBeDisabled()
    expect(field.description()).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeDisabled()

    await user.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()

    await act(async () => { pending.resolve({ success: true, message: SUCCESS, data: { id: 'e1' } }) })

    expect(onSuccess).toHaveBeenCalledWith(SUCCESS)
  })

  it('cria com horas ao minuto', async () => {
    createAdminEvent.mockResolvedValue({ success: true, message: SUCCESS, data: {} })
    const user = userEvent.setup()
    show()
    await fillValidInPerson(user)

    await typeInto(user, field.start(), '17:39')
    await typeInto(user, field.end(), '19:28')
    await user.click(submitButton())

    expect(createAdminEvent).toHaveBeenCalledWith({ ...IN_PERSON_PAYLOAD, event_start_time: '17:39', event_end_time: '19:28' })
  })

  it('dois cliques rápidos em Criar evento fazem um só pedido', async () => {
    createAdminEvent.mockImplementation(() => new Promise(() => {}))
    const user = userEvent.setup()
    show()
    await fillValidInPerson(user)
    const button = submitButton()

    await user.dblClick(button)
    fireEvent.submit(button.closest('form'))

    expect(createAdminEvent).toHaveBeenCalledTimes(1)
  })

  it('verifica a morada, mostra o resultado só como texto com a atribuição e envia as coordenadas', async () => {
    geocodeAddress.mockResolvedValue(FOUND)
    createAdminEvent.mockResolvedValue({ success: true, message: SUCCESS, data: {} })
    const user = userEvent.setup()
    show()
    await fillValidInPerson(user)

    await user.click(verifyButton())

    expect(geocodeAddress).toHaveBeenCalledWith('Rua das Flores 42', 'l1', expect.any(AbortSignal))
    expect(await screen.findByText(`Morada encontrada: ${FOUND.display_name}`)).toBeInTheDocument()
    expect(screen.getByText('© OpenStreetMap contributors')).toBeInTheDocument()
    expect(screen.getByRole('dialog').querySelector('img')).toBeNull()

    await user.click(submitButton())

    expect(createAdminEvent).toHaveBeenCalledWith({ ...IN_PERSON_PAYLOAD, latitude: 38.71, longitude: -9.14 })
  })

  it('mudar a morada ou a delegação descarta a verificação e cancela o pedido pendente', async () => {
    geocodeAddress.mockResolvedValue(FOUND)
    createAdminEvent.mockResolvedValue({ success: true, message: SUCCESS, data: {} })
    const user = userEvent.setup()
    show()
    await fillValidInPerson(user)

    await user.click(verifyButton())
    await screen.findByText(/^Morada encontrada:/)
    await user.type(field.address(), ' A')

    expect(screen.queryByText(/^Morada encontrada:/)).not.toBeInTheDocument()
    expect(screen.getByText(GEOCODE_HINT)).toBeInTheDocument()

    await user.click(verifyButton())
    await screen.findByText(/^Morada encontrada:/)
    await chooseOption(user, field.location(), 'Porto')

    expect(screen.queryByText(/^Morada encontrada:/)).not.toBeInTheDocument()
    expect(screen.getByText(GEOCODE_HINT)).toBeInTheDocument()

    await user.click(submitButton())

    const payload = createAdminEvent.mock.calls[0][0]
    expect(payload).toMatchObject({ address: 'Rua das Flores 42 A', location_id: 'l2' })
    expect(payload).not.toHaveProperty('latitude')
    expect(payload).not.toHaveProperty('longitude')

    const late = deferred()
    geocodeAddress.mockImplementationOnce(() => late.promise)
    await user.click(verifyButton())
    const signal = geocodeAddress.mock.calls.at(-1)[2]

    await user.type(field.address(), 'B')

    expect(signal.aborted).toBe(true)
    await act(async () => { late.resolve(FOUND) })
    expect(screen.queryByText(/^Morada encontrada:/)).not.toBeInTheDocument()
  }, 10000)

  it('avisa quando o local é aproximado, envia as coordenadas e o aviso desaparece ao mudar a morada', async () => {
    geocodeAddress.mockResolvedValue({
      latitude: 37.74,
      longitude: -25.67,
      display_name: 'Rua da Guiné, Ponta Delgada',
      attribution: '© OpenStreetMap contributors',
      approximate: true,
    })
    createAdminEvent.mockResolvedValue({ success: true, message: SUCCESS, data: {} })
    const user = userEvent.setup()
    show()
    await fillValidInPerson(user)

    await user.click(verifyButton())

    expect(await screen.findByText('Local aproximado: Rua da Guiné, Ponta Delgada')).toBeInTheDocument()
    expect(screen.getByText(APPROXIMATE_HINT)).toBeInTheDocument()
    expect(screen.queryByText(/^Morada encontrada:/)).not.toBeInTheDocument()

    await user.click(submitButton())

    expect(createAdminEvent).toHaveBeenLastCalledWith({ ...IN_PERSON_PAYLOAD, latitude: 37.74, longitude: -25.67 })

    await user.type(field.address(), ' A')

    expect(screen.queryByText(/^Local aproximado:/)).not.toBeInTheDocument()
    expect(screen.queryByText(APPROXIMATE_HINT)).not.toBeInTheDocument()

    await user.click(submitButton())

    const payload = createAdminEvent.mock.calls.at(-1)[0]
    expect(payload).toMatchObject({ address: 'Rua das Flores 42 A' })
    expect(payload).not.toHaveProperty('latitude')
    expect(payload).not.toHaveProperty('longitude')
  }, 10000)

  it('mostra junto à morada as mensagens de morada não encontrada e serviço indisponível sem bloquear o envio', async () => {
    geocodeAddress
      .mockRejectedValueOnce(apiError(404, NOT_FOUND))
      .mockRejectedValueOnce(apiError(503, UNAVAILABLE))
    const user = userEvent.setup()
    show()
    await fillValidInPerson(user)

    await user.click(verifyButton())

    expect(await screen.findByText(NOT_FOUND)).toBeInTheDocument()
    expect(submitButton()).toBeEnabled()

    await user.click(verifyButton())

    expect(await screen.findByText(UNAVAILABLE)).toBeInTheDocument()
    expect(screen.queryByText(NOT_FOUND)).not.toBeInTheDocument()
    expect(submitButton()).toBeEnabled()
  })

  it('Verificar no mapa só fica ativo com morada e desativa-se enquanto verifica', async () => {
    geocodeAddress.mockImplementation(() => new Promise(() => {}))
    const user = userEvent.setup()
    show()

    expect(verifyButton()).toBeDisabled()

    await user.type(field.address(), '   ')
    expect(verifyButton()).toBeDisabled()

    await user.type(field.address(), 'Rua das Flores 42')
    expect(verifyButton()).toBeEnabled()

    await user.click(verifyButton())

    expect(verifyButton()).toBeDisabled()
    expect(screen.getByText('A verificar a morada...')).toBeInTheDocument()
  })

  it('um 422 assinala cada campo, mostra a mensagem geral e foca o primeiro campo inválido', async () => {
    createAdminEvent.mockRejectedValueOnce(apiError(422, 'Os dados enviados são inválidos.', {
      name: ['O campo nome é obrigatório.'],
      event_end_time: [END_TIME_ERROR],
    }))
    const user = userEvent.setup()
    show()
    await fillValidInPerson(user)

    await user.click(submitButton())

    await waitFor(() => expectAlert('Os dados enviados são inválidos.'))
    expect(screen.getByText('O campo nome é obrigatório.')).toBeInTheDocument()
    expect(screen.getByText(END_TIME_ERROR)).toBeInTheDocument()
    expect(field.title()).toHaveAttribute('aria-invalid', 'true')
    expect(field.end()).toHaveAttribute('aria-invalid', 'true')
    await waitFor(() => expect(field.title()).toHaveFocus())
    expect(field.title()).toHaveValue('Jantar de Networking Lisboa')
    expect(field.address()).toHaveValue('Rua das Flores 42')

    await user.type(field.title(), '!')

    expect(screen.queryByText('O campo nome é obrigatório.')).not.toBeInTheDocument()
    expect(screen.getByText(END_TIME_ERROR)).toBeInTheDocument()
  })

  it('um 422 assinala as listas, as horas e as datas e foca o tipo de evento', async () => {
    const CATEGORY_ERROR = 'O tipo de evento selecionado é inválido.'
    const START_ERROR = 'A hora de início não é válida.'
    const DEADLINE_ERROR = 'O prazo de inscrição não é válido.'
    createAdminEvent.mockRejectedValueOnce(apiError(422, 'Os dados enviados são inválidos.', {
      category_id: [CATEGORY_ERROR],
      event_start_time: [START_ERROR],
      registration_deadline: [DEADLINE_ERROR],
    }))
    const user = userEvent.setup()
    show()
    await fillValidInPerson(user)

    await user.click(submitButton())

    await waitFor(() => expectAlert('Os dados enviados são inválidos.'))
    for (const [element, message] of [[field.category(), CATEGORY_ERROR], [field.start(), START_ERROR], [field.deadline(), DEADLINE_ERROR]]) {
      expect(element).toHaveAttribute('aria-invalid', 'true')
      expect(describedIds(element)).toContain(screen.getByText(message).id)
    }
    await waitFor(() => expect(field.category()).toHaveFocus())

    await chooseOption(user, field.category(), 'Formação')

    expect(screen.queryByText(CATEGORY_ERROR)).not.toBeInTheDocument()
    expect(field.category()).not.toHaveAttribute('aria-invalid')
    expect(screen.getByText(START_ERROR)).toBeInTheDocument()
  })

  it('o Escape fecha só a lista ou o calendário aberto e um segundo Escape fecha o modal', async () => {
    const user = userEvent.setup()
    const { onClose } = show()

    await user.click(field.category())
    await user.keyboard('{Escape}')

    expect(field.category()).toHaveAttribute('aria-expanded', 'false')
    expect(field.category()).toHaveFocus()
    expect(screen.getByRole('dialog', { name: 'Criar Novo Evento' })).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)

    await user.click(field.deadline())
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: /^Escolher / })).not.toBeInTheDocument()
    expect(field.deadline()).toHaveFocus()
    expect(onClose).toHaveBeenCalledTimes(1)

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('um 404 do servidor assinala a morada e um 503 mostra a mensagem geral, com o modal aberto', async () => {
    createAdminEvent
      .mockRejectedValueOnce(apiError(404, NOT_FOUND))
      .mockRejectedValueOnce(apiError(503, UNAVAILABLE))
    const user = userEvent.setup()
    const { onSuccess } = show()
    await fillValidInPerson(user)

    await user.click(submitButton())

    expect(await screen.findByText(NOT_FOUND)).toBeInTheDocument()
    expect(field.address()).toHaveAttribute('aria-invalid', 'true')
    await waitFor(() => expect(field.address()).toHaveFocus())

    await user.type(field.address(), ' A')
    await user.click(submitButton())

    await waitFor(() => expectAlert(UNAVAILABLE))
    expect(screen.getByRole('dialog', { name: 'Criar Novo Evento' })).toBeInTheDocument()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('um erro 500 mostra a mensagem geral e um pedido cancelado não mostra nada', async () => {
    createAdminEvent.mockRejectedValueOnce(apiError(500, 'Erro interno.'))
    const user = userEvent.setup()
    const first = show()
    await fillValidInPerson(user)

    await user.click(submitButton())

    await waitFor(() => expectAlert('Erro interno.'))
    expect(first.onSuccess).not.toHaveBeenCalled()
    first.unmount()

    createAdminEvent.mockRejectedValueOnce(new CanceledError())
    const second = show()
    await fillValidInPerson(user)

    await user.click(submitButton())

    await waitFor(() => expect(createAdminEvent).toHaveBeenCalledTimes(2))
    await act(async () => {})
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(second.onSuccess).not.toHaveBeenCalled()
  }, 10000)

  it('Cancelar, Fechar e Escape fecham, o clique no fundo não fecha e o Tab fica preso no modal', async () => {
    const user = userEvent.setup()
    const { onClose } = show()

    await user.click(screen.getByRole('dialog').parentElement)
    expect(onClose).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onClose).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(onClose).toHaveBeenCalledTimes(2)

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(3)

    await fillValidInPerson(user)
    submitButton().focus()

    await user.tab()
    expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus()

    await user.tab({ shift: true })
    expect(submitButton()).toHaveFocus()
    expect(createAdminEvent).not.toHaveBeenCalled()
  })

  it('desativa as listas enquanto as opções carregam e permite tentar de novo quando falham', async () => {
    const user = userEvent.setup()
    const { rerender, onClose, onSuccess } = show({ options: readyOptions({ categories: [], locations: [], loading: true }) })

    for (const combobox of [field.category(), field.location()]) {
      expect(combobox).toHaveAttribute('role', 'combobox')
      expect(combobox).toBeDisabled()
      expect(combobox).toHaveTextContent('A carregar...')
    }

    const retry = vi.fn()
    rerender(
      <CreateEventDialog
        options={readyOptions({ categories: [], locations: [], error: 'Não foi possível carregar as opções dos filtros.', retry })}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    )

    expect(field.category()).toBeDisabled()
    expect(field.location()).toBeDisabled()
    expect(screen.getByText('Não foi possível carregar os tipos de evento e as delegações.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Tentar carregar novamente' }))

    expect(retry).toHaveBeenCalledTimes(1)
  })

  it('aplica os limites de caracteres, de capacidade e de datas', async () => {
    const user = userEvent.setup()
    show()

    for (const name of ['title', 'venue', 'address']) {
      expect(field[name]()).toHaveAttribute('maxlength', '255')
    }
    expect(field.description()).toHaveAttribute('maxlength', '5000')
    expect(screen.getByText('0/5000 caracteres')).toBeInTheDocument()
    await user.type(field.description(), 'Olá!!')
    expect(screen.getByText('5/5000 caracteres')).toBeInTheDocument()
    expect(field.notes()).toHaveAttribute('maxlength', '2000')
    expect(field.capacity()).toHaveAttribute('type', 'number')
    expect(field.capacity()).toHaveAttribute('min', '1')
    expect(field.capacity()).toHaveAttribute('max', '100000')

    await user.click(formatButton('Online'))
    expect(field.onlineUrl()).toHaveAttribute('maxlength', '255')
  })

  it('com o Tab as listas, as datas e as horas vêm entre o título e o nome do local', async () => {
    const user = userEvent.setup()
    show()
    expect(field.title()).toHaveFocus()

    const sequence = []
    for (let step = 0; step < 15 && document.activeElement !== field.venue(); step += 1) {
      await user.tab()
      sequence.push(document.activeElement)
    }

    expect(sequence).toEqual([field.category(), field.location(), field.date(), field.start(), field.end(), field.deadline(), field.venue()])
  })

  it('cria um evento online só com o link e recusa links que não sejam http ou https', async () => {
    createAdminEvent.mockResolvedValue({ success: true, message: SUCCESS, data: {} })
    const user = userEvent.setup()
    show()
    await user.click(formatButton('Online'))
    await fillCommon(user)

    await user.type(field.onlineUrl(), 'ftp://meet.example.com')

    expect(screen.getByText('Indique um link válido que comece por http:// ou https://.')).toBeInTheDocument()
    expect(field.onlineUrl()).toHaveAttribute('aria-invalid', 'true')
    expect(submitButton()).toBeDisabled()

    await typeInto(user, field.onlineUrl(), 'https://meet.example.com/aspec')
    await user.click(submitButton())

    expect(createAdminEvent).toHaveBeenCalledWith({
      category_id: 'c3',
      location_id: 'l1',
      name: 'Jantar de Networking Lisboa',
      event_date: '2099-03-20',
      event_start_time: '19:30',
      event_end_time: '21:30',
      registration_deadline: '2099-03-18',
      is_online: true,
      online_url: 'https://meet.example.com/aspec',
      max_attendees: 40,
      description: 'Encontro mensal de networking entre membros.',
    })
  })
})
