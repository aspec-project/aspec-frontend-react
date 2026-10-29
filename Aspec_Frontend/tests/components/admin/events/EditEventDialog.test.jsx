import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, CanceledError } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EditEventDialog from '../../../../src/components/admin/events/EditEventDialog'
import { geocodeAddress, updateAdminEvent } from '../../../../src/services/adminEvents'

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

const OPEN_DEADLINE = '2099-01-19T23:59:00+00:00'
const CLOSED_DEADLINE = '2020-01-14T23:59:00+00:00'

const NO_CHANGES = 'Ainda não fez nenhuma alteração.'
const SAVED_HINT = 'Mantém-se a localização guardada do evento enquanto não mudar a morada nem a delegação.'
const EDIT_GEOCODE_HINT = 'Se não verificar, a morada é localizada automaticamente ao guardar as alterações.'
const CONFIRM_TITLE = 'Confirmar alterações?'
const NOTICE_22 = 'Será enviado um email aos 22 inscritos a avisar que o evento foi alterado.'
const NOTICE_UNKNOWN = 'Será enviado um email aos inscritos a avisar que o evento foi alterado.'
const NO_REGISTRANTS = 'Não há inscritos, por isso ninguém será notificado.'
const JUSTIFICATION = 'Justificação (opcional)'
const JUSTIFICATION_PLACEHOLDER = 'Se quiser, explique o motivo da alteração.'
const JUSTIFICATION_TOO_LONG = 'A justificação não pode ter mais de 2000 caracteres.'
const INVALID = 'Os dados enviados são inválidos.'
const CAPACITY_HINT_22 = 'Já há 22 inscritos: a capacidade não pode ser inferior.'
const BELOW_REGISTRATIONS = 'A lotação máxima não pode ser inferior ao número de inscrições existentes.'
const DEADLINE_PAST = 'O prazo de inscrição tem de ser posterior à data e hora atuais.'
const ADDRESS_NOT_FOUND = 'Não foi possível encontrar esta morada no mapa. Verifique a morada e tente novamente.'
const UNAVAILABLE = 'O serviço de localização não está disponível de momento. Tente novamente dentro de instantes.'
const PASSED = 'Não é possível alterar um evento que já decorreu.'
const SUCCESS = 'Evento atualizado com sucesso.'
const END_TIME_ERROR = 'A hora de fim deve ser posterior à hora de início.'

const FOUND = {
  latitude: 41.15,
  longitude: -8.61,
  display_name: 'Rua Nova, Porto',
  attribution: '© OpenStreetMap contributors',
}

function event(id, name, overrides = {}) {
  return {
    id,
    name,
    category: categories[0],
    location: locations[0],
    event_date: '2099-01-21',
    event_start_time: '08:00',
    event_end_time: '10:00',
    description: 'Descrição pública.',
    address: 'Rua Castilho 39, 1250-068 Lisboa',
    venue_name: 'Centro de Congressos',
    latitude: 38.7223,
    longitude: -9.1533,
    max_attendees: 30,
    registration_deadline: OPEN_DEADLINE,
    organizer_notes: 'Notas do organizador.',
    registrations_count: 22,
    available_spots: 8,
    registration_open: true,
    is_online: false,
    ...overrides,
  }
}

const workshop = event('e1', 'Workshop de Liderança')
const onlineWorkshop = event('e1', 'Workshop de Liderança', {
  is_online: true,
  online_url: 'https://meet.example.pt/sala',
  venue_name: null,
  address: null,
  latitude: null,
  longitude: null,
})

const IN_PERSON_PAYLOAD = {
  category_id: 'c1',
  location_id: 'l1',
  name: 'Workshop de Liderança',
  event_date: '2099-01-21',
  event_start_time: '08:00',
  event_end_time: '10:00',
  registration_deadline: '2099-01-19',
  is_online: false,
  venue_name: 'Centro de Congressos',
  address: 'Rua Castilho 39, 1250-068 Lisboa',
  latitude: 38.7223,
  longitude: -9.1533,
  max_attendees: 30,
  description: 'Descrição pública.',
  organizer_notes: 'Notas do organizador.',
}

function readyOptions() {
  return { categories, locations, loading: false, error: '', retry: vi.fn() }
}

function show(eventData = workshop) {
  const onClose = vi.fn()
  const onSuccess = vi.fn()
  const onStale = vi.fn()
  const view = render(
    <EditEventDialog event={eventData} options={readyOptions()} onClose={onClose} onSuccess={onSuccess} onStale={onStale} />,
  )

  return { ...view, onClose, onSuccess, onStale }
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function labelled(text) {
  return screen.getByLabelText(new RegExp(`^${escapeRegExp(text)}\\s*\\*?$`))
}

function queryLabelled(text) {
  return screen.queryByLabelText(new RegExp(`^${escapeRegExp(text)}\\s*\\*?$`))
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
  return screen.getByRole('button', { name: 'Guardar alterações' })
}

function confirmDialog() {
  return screen.getByRole('dialog', { name: CONFIRM_TITLE })
}

function queryConfirmDialog() {
  return screen.queryByRole('dialog', { name: CONFIRM_TITLE })
}

function confirmButton(name) {
  return within(confirmDialog()).getByRole('button', { name })
}

function justificationBox() {
  return within(confirmDialog()).getByRole('textbox', { name: JUSTIFICATION })
}

function changeItems() {
  return within(within(confirmDialog()).getByRole('list', { name: 'Alterações' })).getAllByRole('listitem')
}

function expectChange(item, label, before, after) {
  expect(item.querySelector('del').textContent).toBe(before)
  expect(item).toHaveTextContent(new RegExp(`^${escapeRegExp(label)}:\\s*${escapeRegExp(before)}\\s*→\\s*passa a\\s*${escapeRegExp(after)}$`))
}

function headingIcon(name) {
  return within(confirmDialog()).getByRole('heading', { name: CONFIRM_TITLE }).querySelector(`svg.lucide-${name}`)
}

async function saveAndConfirm(user) {
  await user.click(submitButton())
  await user.click(confirmButton(/^Guardar( e notificar)?$/))
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

async function chooseOption(user, combobox, optionName) {
  await user.click(combobox)
  await user.click(screen.getByRole('option', { name: optionName }))
}

function useFakeToday() {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2099, 0, 10, 12))
}

async function editTitle(user, text = 'Workshop de Liderança — nova data') {
  await typeInto(user, field.title(), text)
}

function lastPayload() {
  return updateAdminEvent.mock.calls.at(-1)[1]
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

describe('EditEventDialog', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('abre com os dados do evento, o formato do evento, sem repetição e sem alterações', async () => {
    const user = userEvent.setup()
    show()

    expect(screen.getByRole('dialog', { name: 'Editar Evento' })).toHaveAttribute('aria-modal', 'true')
    expect(field.title()).toHaveFocus()
    expect(field.title()).toHaveValue('Workshop de Liderança')
    expect(field.category()).toHaveAttribute('role', 'combobox')
    expect(field.category()).toHaveTextContent('Workshop')
    expect(field.location()).toHaveAttribute('role', 'combobox')
    expect(field.location()).toHaveTextContent('Lisboa')
    expect(field.date().tagName).toBe('BUTTON')
    expect(field.date()).toHaveTextContent('21 Jan 2099')
    expect(field.start()).toHaveAttribute('placeholder', 'hh:mm')
    expect(field.start()).toHaveValue('08:00')
    expect(field.end()).toHaveValue('10:00')
    expect(field.deadline().tagName).toBe('BUTTON')
    expect(field.deadline()).toHaveTextContent('19 Jan 2099')
    expect(field.venue()).toHaveValue('Centro de Congressos')
    expect(field.address()).toHaveValue('Rua Castilho 39, 1250-068 Lisboa')
    expect(field.capacity()).toHaveValue(30)
    expect(field.description()).toHaveValue('Descrição pública.')
    expect(field.notes()).toHaveValue('Notas do organizador.')
    expect(formatButton('Presencial')).toHaveAttribute('aria-pressed', 'true')
    expect(formatButton('Online')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByText(/Repetição|Recorrente/)).not.toBeInTheDocument()
    expect(screen.getByText(NO_CHANGES)).toBeInTheDocument()
    expect(submitButton()).toBeDisabled()
    expect(screen.getByText(SAVED_HINT)).toBeInTheDocument()

    await user.click(field.category())

    expect(screen.getByRole('option', { name: 'Workshop' })).toHaveAttribute('aria-selected', 'true')
  })

  it('aceita horas ao minuto e uma hora antiga com segundos não conta como alteração', async () => {
    updateAdminEvent.mockResolvedValue({ success: true, message: SUCCESS, data: {} })
    const user = userEvent.setup()
    show(event('e1', 'Workshop de Liderança', { event_start_time: '18:45:00', event_end_time: '20:00:00' }))

    expect(screen.getAllByRole('textbox')).toContain(field.start())
    expect(field.start()).toHaveValue('18:45')
    expect(screen.getByText(NO_CHANGES)).toBeInTheDocument()

    await typeInto(user, field.start(), '17:39')

    expect(submitButton()).toBeEnabled()

    await typeInto(user, field.start(), '18:45')

    expect(screen.getByText(NO_CHANGES)).toBeInTheDocument()
    expect(submitButton()).toBeDisabled()

    await typeInto(user, field.start(), '17:39')
    await saveAndConfirm(user)

    expect(lastPayload()).toMatchObject({ event_start_time: '17:39', event_end_time: '20:00' })
  })

  it('uma hora de fim escrita sem zero fica no formato HH:MM e é validada contra a hora de início', async () => {
    const user = userEvent.setup()
    show(event('e1', 'Workshop de Liderança', { event_start_time: '18:45:00' }))

    expect(screen.getAllByRole('textbox')).toContain(field.end())
    await typeInto(user, field.end(), '8:00')
    await user.tab()

    expect(field.end()).toHaveValue('08:00')
    const error = screen.getByText(END_TIME_ERROR)
    expect(describedIds(field.end())).toContain(error.id)
    expect(submitButton()).toBeDisabled()
  })

  it('o botão só fica ativo com uma alteração real e desativa-se ao desfazê-la', async () => {
    const user = userEvent.setup()
    show()

    await user.type(field.title(), 'X')

    expect(submitButton()).toBeEnabled()
    expect(screen.queryByText(NO_CHANGES)).not.toBeInTheDocument()

    await user.type(field.title(), '{Backspace}')

    expect(submitButton()).toBeDisabled()
    expect(screen.getByText(NO_CHANGES)).toBeInTheDocument()

    await user.type(field.title(), '   ')
    expect(submitButton()).toBeDisabled()

    change(field.capacity(), '030')
    expect(submitButton()).toBeDisabled()
  })

  it('com inscritos o formulário já não tem justificação e Guardar alterações abre a confirmação sem fazer o pedido', async () => {
    const user = userEvent.setup()
    show()

    expect(within(screen.getByRole('dialog', { name: 'Editar Evento' })).queryByLabelText(/Justificação/)).not.toBeInTheDocument()
    expect(screen.queryByText(/vão receber um email|vai receber um email/)).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: JUSTIFICATION })).not.toBeInTheDocument()

    await editTitle(user)
    await user.click(submitButton())

    expect(updateAdminEvent).not.toHaveBeenCalled()
    const dialog = confirmDialog()
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(headingIcon('mail')).not.toBeNull()
    expect(within(dialog).getAllByText('Workshop de Liderança').some((element) => !element.closest('ul'))).toBe(true)
    const items = changeItems()
    expect(items).toHaveLength(1)
    expectChange(items[0], 'Título', 'Workshop de Liderança', 'Workshop de Liderança — nova data')
    expect(dialog).toHaveAccessibleDescription(NOTICE_22)
    expect(within(dialog).getByText('22 inscritos').tagName).toBe('STRONG')
    expect(justificationBox()).toHaveAttribute('placeholder', JUSTIFICATION_PLACEHOLDER)
    expect(justificationBox()).toHaveAttribute('maxlength', '2000')
    expect(justificationBox()).toHaveFocus()
    expect(confirmButton('Voltar')).toBeEnabled()
    expect(confirmButton('Guardar e notificar')).toBeEnabled()
  })

  it('sem inscritos a confirmação mostra as alterações, diz que ninguém será notificado e grava sem justificação', async () => {
    updateAdminEvent.mockResolvedValue({ success: true, message: SUCCESS, data: {} })
    const user = userEvent.setup()
    const { onSuccess } = show(event('e1', 'Workshop de Liderança', { registrations_count: 0 }))

    await editTitle(user)
    await user.click(submitButton())

    const dialog = confirmDialog()
    expect(updateAdminEvent).not.toHaveBeenCalled()
    expect(headingIcon('save')).not.toBeNull()
    expect(headingIcon('mail')).toBeNull()
    expectChange(changeItems()[0], 'Título', 'Workshop de Liderança', 'Workshop de Liderança — nova data')
    expect(dialog).toHaveAccessibleDescription(NO_REGISTRANTS)
    expect(within(dialog).queryByText(/Será enviado um email/)).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Guardar e notificar' })).not.toBeInTheDocument()
    expect(confirmButton('Voltar')).toHaveFocus()

    await user.click(confirmButton('Guardar'))

    expect(updateAdminEvent).toHaveBeenCalledTimes(1)
    expect(lastPayload()).toMatchObject({ name: 'Workshop de Liderança — nova data' })
    expect(lastPayload()).not.toHaveProperty('justification')
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(SUCCESS))
  })

  it('sem o número de inscritos a confirmação usa a frase genérica, a justificação e Guardar e notificar', async () => {
    const user = userEvent.setup()
    show(event('e1', 'Workshop de Liderança', { registrations_count: undefined }))

    await editTitle(user)
    await user.click(submitButton())

    const dialog = confirmDialog()
    expect(dialog).toHaveAccessibleDescription(NOTICE_UNKNOWN)
    expect(within(dialog).getByText('inscritos').tagName).toBe('STRONG')
    expect(headingIcon('mail')).not.toBeNull()
    expect(justificationBox()).toBeInTheDocument()
    expect(confirmButton('Guardar e notificar')).toBeEnabled()
  })

  it('Voltar, Escape e o Fechar da confirmação voltam ao formulário sem pedido e a justificação recomeça vazia', async () => {
    const user = userEvent.setup()
    const { onClose } = show()
    await editTitle(user)

    await user.click(submitButton())
    await user.type(justificationBox(), 'Mudou a sala.')
    await user.click(confirmButton('Voltar'))

    expect(queryConfirmDialog()).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Editar Evento' })).toBeInTheDocument()
    expect(field.title()).toHaveValue('Workshop de Liderança — nova data')
    expect(submitButton()).toHaveFocus()

    await user.click(submitButton())
    expect(justificationBox()).toHaveValue('')
    await user.type(justificationBox(), 'Mudou a sala.')
    await user.keyboard('{Escape}')

    expect(queryConfirmDialog()).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Editar Evento' })).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(submitButton()).toHaveFocus()

    await user.click(submitButton())
    expect(justificationBox()).toHaveValue('')
    await user.click(confirmButton('Fechar'))

    expect(queryConfirmDialog()).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Editar Evento' })).toBeInTheDocument()
    expect(submitButton()).toHaveFocus()
    expect(onClose).not.toHaveBeenCalled()
    expect(updateAdminEvent).not.toHaveBeenCalled()
  })

  it('Guardar e notificar envia a justificação sem espaços, bloqueia a confirmação durante o pedido e faz um só pedido', async () => {
    const pending = deferred()
    updateAdminEvent.mockImplementationOnce(() => pending.promise)
    const user = userEvent.setup()
    const { onClose, onSuccess } = show()

    await editTitle(user)
    await user.click(submitButton())
    await user.type(justificationBox(), '  A sessão passou para a sala 2.  ')
    await user.dblClick(confirmButton('Guardar e notificar'))

    expect(updateAdminEvent).toHaveBeenCalledTimes(1)
    expect(updateAdminEvent).toHaveBeenCalledWith('e1', {
      ...IN_PERSON_PAYLOAD,
      name: 'Workshop de Liderança — nova data',
      justification: 'A sessão passou para a sala 2.',
    })
    expect(confirmButton('A processar...')).toBeDisabled()
    expect(confirmButton('Voltar')).toBeDisabled()
    expect(confirmButton('Fechar')).toBeDisabled()

    await user.keyboard('{Escape}')
    fireEvent.keyDown(confirmDialog(), { key: 'Escape' })

    expect(confirmDialog()).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Editar Evento' })).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()

    await act(async () => { pending.resolve({ success: true, message: SUCCESS, data: { id: 'e1' } }) })

    expect(onSuccess).toHaveBeenCalledWith(SUCCESS)
  })

  it('sem texto na confirmação o pedido não leva justificação', async () => {
    updateAdminEvent.mockResolvedValue({ success: true, message: SUCCESS, data: {} })
    const user = userEvent.setup()
    const { onSuccess } = show()

    await editTitle(user)
    await saveAndConfirm(user)

    expect(updateAdminEvent).toHaveBeenCalledWith('e1', { ...IN_PERSON_PAYLOAD, name: 'Workshop de Liderança — nova data' })
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(SUCCESS))
  })

  it('mudar a morada ou a delegação larga a localização guardada e a verificação envia as novas coordenadas', async () => {
    updateAdminEvent.mockResolvedValue({ success: true, message: SUCCESS, data: {} })
    geocodeAddress.mockResolvedValue(FOUND)
    const user = userEvent.setup()
    const first = show()

    await user.type(field.address(), ' A')

    expect(screen.queryByText(SAVED_HINT)).not.toBeInTheDocument()
    expect(screen.getByText(EDIT_GEOCODE_HINT)).toBeInTheDocument()

    await saveAndConfirm(user)

    expect(lastPayload()).toMatchObject({ address: 'Rua Castilho 39, 1250-068 Lisboa A' })
    expect(lastPayload()).not.toHaveProperty('latitude')
    expect(lastPayload()).not.toHaveProperty('longitude')
    first.unmount()

    const second = show()
    await chooseOption(user, field.location(), 'Porto')

    expect(screen.queryByText(SAVED_HINT)).not.toBeInTheDocument()
    expect(screen.getByText(EDIT_GEOCODE_HINT)).toBeInTheDocument()

    await saveAndConfirm(user)

    expect(lastPayload()).toMatchObject({ location_id: 'l2' })
    expect(lastPayload()).not.toHaveProperty('latitude')
    expect(lastPayload()).not.toHaveProperty('longitude')
    second.unmount()

    show()
    await typeInto(user, field.address(), 'Rua Nova 1, Porto')
    await user.click(screen.getByRole('button', { name: 'Verificar no mapa' }))
    await screen.findByText(`Morada encontrada: ${FOUND.display_name}`)
    await saveAndConfirm(user)

    expect(lastPayload()).toMatchObject({ address: 'Rua Nova 1, Porto', latitude: 41.15, longitude: -8.61 })
  })

  it('apagar as notas do organizador envia organizer_notes a null', async () => {
    updateAdminEvent.mockResolvedValue({ success: true, message: SUCCESS, data: {} })
    const user = userEvent.setup()
    show()

    await user.clear(field.notes())
    await saveAndConfirm(user)

    expect(lastPayload()).toHaveProperty('organizer_notes', null)
  })

  it('a capacidade mostra os inscritos e não pode ficar abaixo deles', () => {
    show()

    const hint = screen.getByText(CAPACITY_HINT_22)
    expect(describedIds(field.capacity())).toContain(hint.id)

    change(field.capacity(), '20')

    expect(screen.getByText(BELOW_REGISTRATIONS)).toBeInTheDocument()
    expect(field.capacity()).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByText('Corrija os campos assinalados.')).not.toBeInTheDocument()
    expect(submitButton()).toBeDisabled()
  })

  it('um prazo já encerrado que não muda não bloqueia, mas não se escolhe um prazo no passado', async () => {
    useFakeToday()
    const user = userEvent.setup()
    show(event('e1', 'Workshop de Liderança', { registration_deadline: CLOSED_DEADLINE }))

    expect(field.deadline()).toHaveTextContent('14 Jan 2020')

    await editTitle(user)

    expect(submitButton()).toBeEnabled()
    expect(screen.queryByText(DEADLINE_PAST)).not.toBeInTheDocument()

    await user.click(field.deadline())

    expect(day('10 de janeiro de 2020')).toHaveAttribute('aria-disabled', 'true')
    expect(day('14 de janeiro de 2020')).toHaveAttribute('aria-disabled', 'true')

    await user.click(day('10 de janeiro de 2020'))

    expect(field.deadline()).toHaveTextContent('14 Jan 2020')
    expect(screen.queryByText(DEADLINE_PAST)).not.toBeInTheDocument()
    expect(submitButton()).toBeEnabled()
  })

  it('um evento sem nome do local mostra o campo em falta em vez de sem alterações', async () => {
    const user = userEvent.setup()
    show(event('e1', 'Workshop de Liderança', { venue_name: null }))

    expect(screen.getByText('Falta preencher: nome do local.')).toBeInTheDocument()
    expect(screen.queryByText(NO_CHANGES)).not.toBeInTheDocument()
    expect(submitButton()).toBeDisabled()

    await user.type(field.venue(), 'Centro de Congressos')

    expect(submitButton()).toBeEnabled()
  })

  it('um evento online abre com o link e guarda sem morada nem coordenadas', async () => {
    updateAdminEvent.mockResolvedValue({ success: true, message: SUCCESS, data: {} })
    const user = userEvent.setup()
    show(onlineWorkshop)

    expect(formatButton('Online')).toHaveAttribute('aria-pressed', 'true')
    expect(field.onlineUrl()).toHaveValue('https://meet.example.pt/sala')
    expect(queryLabelled('Morada completa')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Verificar no mapa' })).not.toBeInTheDocument()

    change(field.capacity(), '45')
    await saveAndConfirm(user)

    const payload = lastPayload()
    expect(payload).toMatchObject({
      is_online: true,
      online_url: 'https://meet.example.pt/sala',
      max_attendees: 45,
      organizer_notes: 'Notas do organizador.',
      venue_name: null,
    })
    for (const key of ['address', 'latitude', 'longitude']) {
      expect(payload).not.toHaveProperty(key)
    }
  })

  it('um 422 só da justificação deixa a confirmação aberta com o erro e o texto e pode tentar de novo', async () => {
    updateAdminEvent
      .mockRejectedValueOnce(apiError(422, INVALID, { justification: [JUSTIFICATION_TOO_LONG] }))
      .mockResolvedValueOnce({ success: true, message: SUCCESS, data: {} })
    const user = userEvent.setup()
    const { onSuccess, onStale } = show()

    await editTitle(user)
    await user.click(submitButton())
    await user.type(justificationBox(), 'A sala mudou.')
    await user.click(confirmButton('Guardar e notificar'))

    const alert = await within(confirmDialog()).findByRole('alert')
    expect(alert).toHaveTextContent(JUSTIFICATION_TOO_LONG)
    expect(justificationBox()).toHaveValue('A sala mudou.')
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onStale).not.toHaveBeenCalled()

    await user.click(confirmButton('Guardar e notificar'))

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(SUCCESS))
    expect(updateAdminEvent).toHaveBeenCalledTimes(2)
    expect(lastPayload()).toMatchObject({ justification: 'A sala mudou.' })
  })

  it('um 422 de outros campos fecha a confirmação, assinala a capacidade e foca-a', async () => {
    updateAdminEvent.mockRejectedValueOnce(apiError(422, INVALID, { max_attendees: [BELOW_REGISTRATIONS] }))
    const user = userEvent.setup()
    const { onSuccess, onStale } = show()

    await editTitle(user)
    await saveAndConfirm(user)

    await waitFor(() => expect(queryConfirmDialog()).not.toBeInTheDocument())
    expect(await screen.findByText(BELOW_REGISTRATIONS)).toBeInTheDocument()
    expect(screen.queryByText('Os dados enviados são inválidos.')).not.toBeInTheDocument()
    expect(field.capacity()).toHaveAttribute('aria-invalid', 'true')
    await waitFor(() => expect(field.capacity()).toHaveFocus())
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onStale).not.toHaveBeenCalled()
  })

  it('com a confirmação aberta, um 409 ou um 404 do evento chamam onStale', async () => {
    const user = userEvent.setup()

    updateAdminEvent.mockRejectedValueOnce(apiError(409, PASSED))
    const passed = show()
    await editTitle(user)
    await saveAndConfirm(user)

    await waitFor(() => expect(passed.onStale).toHaveBeenCalledWith(PASSED))
    expect(passed.onSuccess).not.toHaveBeenCalled()
    passed.unmount()

    updateAdminEvent.mockRejectedValueOnce(apiError(404, 'Recurso não encontrado.'))
    const deleted = show()
    await editTitle(user)
    await saveAndConfirm(user)

    await waitFor(() => expect(deleted.onStale).toHaveBeenCalledWith('O evento já não existe. A lista foi atualizada.'))
    expect(deleted.onSuccess).not.toHaveBeenCalled()
  })

  it('um 404 da morada fecha a confirmação, assinala a morada e foca-a', async () => {
    updateAdminEvent.mockRejectedValueOnce(apiError(404, ADDRESS_NOT_FOUND))
    const user = userEvent.setup()
    const { onStale } = show()

    await user.type(field.address(), ' A')
    await saveAndConfirm(user)

    await waitFor(() => expect(queryConfirmDialog()).not.toBeInTheDocument())
    expect(await screen.findByText(ADDRESS_NOT_FOUND)).toBeInTheDocument()
    expect(field.address()).toHaveAttribute('aria-invalid', 'true')
    await waitFor(() => expect(field.address()).toHaveFocus())
    expect(onStale).not.toHaveBeenCalled()
  })

  it('um 503, um 500 ou uma falha de rede deixam a confirmação aberta com a mensagem e o texto, e Voltar não a passa para o formulário', async () => {
    const user = userEvent.setup()
    const cases = [
      [apiError(503, UNAVAILABLE), UNAVAILABLE],
      [apiError(500, 'Erro interno do servidor.'), 'Erro interno do servidor.'],
      [new AxiosError('Network Error', 'ERR_NETWORK'), 'Não foi possível contactar o servidor.'],
    ]

    for (const [error, message] of cases) {
      updateAdminEvent.mockRejectedValueOnce(error)
      const view = show()
      await editTitle(user)
      await user.click(submitButton())
      await user.type(justificationBox(), 'A sala mudou.')
      await user.click(confirmButton('Guardar e notificar'))

      const alert = await within(confirmDialog()).findByRole('alert')
      expect(alert).toHaveTextContent(message)
      expect(justificationBox()).toHaveValue('A sala mudou.')
      expect(view.onStale).not.toHaveBeenCalled()
      expect(view.onSuccess).not.toHaveBeenCalled()

      await user.click(confirmButton('Voltar'))

      expect(queryConfirmDialog()).not.toBeInTheDocument()
      expect(screen.getByRole('dialog', { name: 'Editar Evento' })).toBeInTheDocument()
      expect(screen.queryByText(message)).not.toBeInTheDocument()
      view.unmount()
    }
  })

  it('a confirmação lista a mudança de formato, os nomes e as datas e grava como online', async () => {
    useFakeToday()
    updateAdminEvent.mockResolvedValue({ success: true, message: SUCCESS, data: {} })
    const user = userEvent.setup()
    show()

    await user.click(formatButton('Online'))
    await user.type(field.onlineUrl(), 'https://meet.example.pt/nova')
    await chooseOption(user, field.category(), 'Formação')
    await user.click(field.date())
    await user.click(day('22 de janeiro de 2099'))
    await user.click(submitButton())

    const items = changeItems()
    expect(items).toHaveLength(4)
    expectChange(items[0], 'Formato', 'Presencial', 'Online')
    expectChange(items[1], 'Tipo de evento', 'Workshop', 'Formação')
    expectChange(items[2], 'Data', '21 Jan 2099', '22 Jan 2099')
    expectChange(items[3], 'Link do evento online', '(vazio)', 'https://meet.example.pt/nova')

    await user.click(confirmButton('Guardar e notificar'))

    expect(updateAdminEvent).toHaveBeenCalledWith('e1', {
      category_id: 'c2',
      location_id: 'l1',
      name: 'Workshop de Liderança',
      event_date: '2099-01-22',
      event_start_time: '08:00',
      event_end_time: '10:00',
      registration_deadline: '2099-01-19',
      is_online: true,
      online_url: 'https://meet.example.pt/nova',
      venue_name: null,
      max_attendees: 30,
      description: 'Descrição pública.',
      organizer_notes: 'Notas do organizador.',
    })
  })

  it('passar um presencial a online pede o link e envia venue_name a null sem morada nem coordenadas', async () => {
    updateAdminEvent.mockResolvedValue({ success: true, message: SUCCESS, data: {} })
    const user = userEvent.setup()
    show()

    await user.click(formatButton('Online'))

    expect(submitButton()).toBeDisabled()
    expect(screen.getByText('Falta preencher: link do evento.')).toBeInTheDocument()
    expect(queryLabelled('Nome do local')).not.toBeInTheDocument()
    expect(queryLabelled('Morada completa')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Verificar no mapa' })).not.toBeInTheDocument()

    await user.type(field.onlineUrl(), 'https://meet.example.pt/lideranca')

    expect(submitButton()).toBeEnabled()

    await saveAndConfirm(user)

    expect(updateAdminEvent).toHaveBeenCalledWith('e1', {
      category_id: 'c1',
      location_id: 'l1',
      name: 'Workshop de Liderança',
      event_date: '2099-01-21',
      event_start_time: '08:00',
      event_end_time: '10:00',
      registration_deadline: '2099-01-19',
      is_online: true,
      online_url: 'https://meet.example.pt/lideranca',
      venue_name: null,
      max_attendees: 30,
      description: 'Descrição pública.',
      organizer_notes: 'Notas do organizador.',
    })
  })

  it('voltar ao formato original repõe os valores e a localização guardada', async () => {
    updateAdminEvent.mockResolvedValue({ success: true, message: SUCCESS, data: {} })
    const user = userEvent.setup()
    show()

    await user.click(formatButton('Online'))
    await user.type(field.onlineUrl(), 'https://meet.example.pt/lideranca')
    await user.click(formatButton('Presencial'))

    expect(field.address()).toHaveValue('Rua Castilho 39, 1250-068 Lisboa')
    expect(screen.getByText(SAVED_HINT)).toBeInTheDocument()
    expect(screen.getByText(NO_CHANGES)).toBeInTheDocument()
    expect(submitButton()).toBeDisabled()

    await editTitle(user)
    await saveAndConfirm(user)

    expect(lastPayload()).toMatchObject({ is_online: false, latitude: 38.7223, longitude: -9.1533 })
    expect(lastPayload()).not.toHaveProperty('online_url')
  })

  it('passar um online a presencial pede o local e a morada e envia sem link', async () => {
    updateAdminEvent.mockResolvedValue({ success: true, message: SUCCESS, data: {} })
    geocodeAddress.mockResolvedValue(FOUND)
    const user = userEvent.setup()
    const first = show(onlineWorkshop)

    await user.click(formatButton('Presencial'))

    expect(screen.getByText('Falta preencher: nome do local, morada.')).toBeInTheDocument()
    expect(screen.getByText(EDIT_GEOCODE_HINT)).toBeInTheDocument()
    expect(screen.queryByText(SAVED_HINT)).not.toBeInTheDocument()

    await user.type(field.venue(), 'Centro de Congressos')
    await user.type(field.address(), 'Rua Nova 1, Porto')
    await saveAndConfirm(user)

    expect(lastPayload()).toMatchObject({ is_online: false, venue_name: 'Centro de Congressos', address: 'Rua Nova 1, Porto' })
    for (const key of ['latitude', 'longitude', 'online_url']) {
      expect(lastPayload()).not.toHaveProperty(key)
    }
    first.unmount()

    show(onlineWorkshop)
    await user.click(formatButton('Presencial'))
    await user.type(field.venue(), 'Centro de Congressos')
    await user.type(field.address(), 'Rua Nova 1, Porto')
    await user.click(screen.getByRole('button', { name: 'Verificar no mapa' }))
    await screen.findByText(`Morada encontrada: ${FOUND.display_name}`)
    await saveAndConfirm(user)

    expect(lastPayload()).toMatchObject({ is_online: false, latitude: 41.15, longitude: -8.61 })
    expect(lastPayload()).not.toHaveProperty('online_url')
  })

  it('Cancelar, Fechar e Escape fecham sem guardar, dois cliques fazem um só pedido e um cancelamento não mostra nada', async () => {
    const user = userEvent.setup()
    const first = show()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await user.click(screen.getByRole('button', { name: 'Fechar' }))
    await user.keyboard('{Escape}')

    expect(first.onClose).toHaveBeenCalledTimes(3)
    expect(updateAdminEvent).not.toHaveBeenCalled()
    first.unmount()

    updateAdminEvent.mockImplementation(() => new Promise(() => {}))
    const second = show()
    await editTitle(user)
    await user.click(submitButton())
    const button = confirmButton('Guardar e notificar')

    await user.dblClick(button)
    fireEvent.submit(button.closest('form'))

    expect(updateAdminEvent).toHaveBeenCalledTimes(1)
    second.unmount()

    updateAdminEvent.mockReset()
    updateAdminEvent.mockRejectedValueOnce(new CanceledError())
    const third = show()
    await editTitle(user)
    await saveAndConfirm(user)

    await waitFor(() => expect(updateAdminEvent).toHaveBeenCalledTimes(1))
    await act(async () => {})
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(third.onSuccess).not.toHaveBeenCalled()
    expect(third.onStale).not.toHaveBeenCalled()
  })
})

describe('EditEventDialog — sessão de uma série', () => {
  const SERIES_NOTE = 'Sessão 3/8 de uma série. As alterações aplicam-se só a esta sessão.'
  const seriesWorkshop = event('e1', 'Workshop de Liderança', { series: { position: 3, total: 8 } })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('mostra a nota da série sem os campos da repetição e o PUT não leva a recorrência', async () => {
    updateAdminEvent.mockResolvedValue({ success: true, message: SUCCESS, data: {} })
    const user = userEvent.setup()
    show(seriesWorkshop)

    expect(screen.getByText(SERIES_NOTE)).toBeInTheDocument()
    expect(screen.queryByText(/Repetição|Recorrente/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^Frequência/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^Fim/)).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Recorrência' })).not.toBeInTheDocument()

    await editTitle(user)
    await saveAndConfirm(user)

    expect(updateAdminEvent).toHaveBeenCalledTimes(1)
    expect(lastPayload()).not.toHaveProperty('recurrence')
  })

  it('sem série não mostra a nota', () => {
    show()

    expect(screen.queryByText(/de uma série/)).not.toBeInTheDocument()
  })
})

describe('EditEventDialog — mapa da Google', () => {
  const MAP_TITLE = 'Mapa da localização do evento'
  const CONFIRM_LOCATION = 'Confirmar localização'
  const CONFIRM_LOCATION_FOOTER = 'Confirme a localização no mapa antes de guardar.'
  const SAVED_PLACE_ID = 'ChIJTesteCoimbraRuaBrasil25_Aspec'
  const NEW_PLACE_ID = 'ChIJTesteLisboaRuaNova1_Aspec'
  const APPROXIMATE_PLACE_ID = 'ChIJTestePontaDelgadaCidade_Aspec'
  const withPlaceId = event('e1', 'Workshop de Liderança', { place_id: SAVED_PLACE_ID, latitude: null, longitude: null })

  function googleResult(overrides = {}) {
    return {
      latitude: null,
      longitude: null,
      display_name: 'R. Nova 1, Lisboa, Portugal',
      attribution: 'Google Maps',
      approximate: false,
      place_id: NEW_PLACE_ID,
      ...overrides,
    }
  }

  function mapQuery() {
    return new URL(screen.getByTitle(MAP_TITLE).getAttribute('src')).searchParams.get('q')
  }

  function expectNoCoordinates(payload) {
    expect(payload).not.toHaveProperty('latitude')
    expect(payload).not.toHaveProperty('longitude')
  }

  beforeEach(() => {
    vi.stubEnv('VITE_GOOGLE_MAPS_EMBED_KEY', 'chave-falsa-418')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('um evento com place_id mostra o local guardado no mapa e reenvia o place_id ao guardar', async () => {
    updateAdminEvent.mockResolvedValue({ success: true, message: SUCCESS, data: {} })
    const user = userEvent.setup()
    show(withPlaceId)

    expect(mapQuery()).toBe(`place_id:${SAVED_PLACE_ID}`)
    expect(screen.queryByText(/^A mostrar a zona de/)).not.toBeInTheDocument()
    expect(screen.getByText(SAVED_HINT)).toBeInTheDocument()

    await typeInto(user, field.description(), 'Nova descrição pública.')
    await saveAndConfirm(user)

    expect(lastPayload()).toMatchObject({ description: 'Nova descrição pública.', place_id: SAVED_PLACE_ID })
    expectNoCoordinates(lastPayload())
  })

  it('mudar a morada larga o place_id guardado e a nova verificação envia o place_id novo', async () => {
    updateAdminEvent.mockResolvedValue({ success: true, message: SUCCESS, data: {} })
    geocodeAddress.mockResolvedValue(googleResult())
    const user = userEvent.setup()
    const first = show(withPlaceId)

    await user.type(field.address(), ' A')

    expect(screen.getByText('A mostrar a zona de Lisboa')).toBeInTheDocument()

    await saveAndConfirm(user)

    expect(lastPayload()).not.toHaveProperty('place_id')
    expectNoCoordinates(lastPayload())
    first.unmount()

    show(withPlaceId)
    await typeInto(user, field.address(), 'Rua Nova 1, Lisboa')
    await user.click(screen.getByRole('button', { name: 'Verificar no mapa' }))
    await screen.findByText(/^Morada encontrada:/)
    await saveAndConfirm(user)

    expect(lastPayload()).toMatchObject({ address: 'Rua Nova 1, Lisboa', place_id: NEW_PLACE_ID })
    expectNoCoordinates(lastPayload())
  })

  it('um evento antigo só com coordenadas mostra a zona da delegação e continua a enviar as coordenadas', async () => {
    updateAdminEvent.mockResolvedValue({ success: true, message: SUCCESS, data: {} })
    const user = userEvent.setup()
    show(event('e1', 'Workshop de Liderança', { place_id: null }))

    expect(mapQuery()).toBe('Lisboa, Portugal')
    expect(screen.getByText('A mostrar a zona de Lisboa')).toBeInTheDocument()

    await editTitle(user)
    await saveAndConfirm(user)

    expect(lastPayload()).toMatchObject({ latitude: 38.7223, longitude: -9.1533 })
    expect(lastPayload()).not.toHaveProperty('place_id')
  })

  it('relocalizar com um resultado aproximado só deixa guardar depois de confirmar a localização', async () => {
    updateAdminEvent.mockResolvedValue({ success: true, message: SUCCESS, data: {} })
    geocodeAddress.mockResolvedValue(googleResult({ display_name: 'Lisboa, Portugal', approximate: true, place_id: APPROXIMATE_PLACE_ID }))
    const user = userEvent.setup()
    show(withPlaceId)

    await editTitle(user)
    await user.click(screen.getByRole('button', { name: 'Verificar no mapa' }))
    await screen.findByText(/^Local aproximado:/)

    expect(submitButton()).toBeDisabled()
    expect(screen.getByText(CONFIRM_LOCATION_FOOTER)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: CONFIRM_LOCATION }))

    expect(submitButton()).toBeEnabled()

    await user.click(submitButton())

    expect(confirmDialog()).toBeInTheDocument()

    await user.click(confirmButton(/^Guardar( e notificar)?$/))

    expect(lastPayload()).toMatchObject({ place_id: APPROXIMATE_PLACE_ID })
    expectNoCoordinates(lastPayload())
  })
})
