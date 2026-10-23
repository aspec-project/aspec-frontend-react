import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, CanceledError } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import EditEventDialog from '../../../../src/components/admin/events/EditEventDialog'
import { geocodeAddress, updateAdminEvent } from '../../../../src/services/adminEvents'

vi.mock('../../../../src/services/adminEvents', () => ({
  getAdminEvents: vi.fn(),
  exportEventAttendees: vi.fn(),
  createAdminEvent: vi.fn(),
  geocodeAddress: vi.fn(),
  updateAdminEvent: vi.fn(),
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
const JUSTIFICATION_HINT = 'Opcional. Segue no email aos inscritos: explique o que mudou (ex.: nova hora ou novo local).'
const NOTICE_22 = 'Os 22 inscritos vão receber um email a avisar que o evento foi alterado.'
const CAPACITY_HINT_22 = 'Já há 22 inscritos: a capacidade não pode ser inferior.'
const BELOW_REGISTRATIONS = 'A lotação máxima não pode ser inferior ao número de inscrições existentes.'
const DEADLINE_PAST = 'O prazo de inscrição tem de ser posterior à data e hora atuais.'
const ADDRESS_NOT_FOUND = 'Não foi possível encontrar esta morada no mapa. Verifique a morada e tente novamente.'
const UNAVAILABLE = 'O serviço de localização não está disponível de momento. Tente novamente dentro de instantes.'
const PASSED = 'Não é possível alterar um evento que já decorreu.'
const SUCCESS = 'Evento atualizado com sucesso.'

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

function labelled(text) {
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  return screen.getByLabelText(new RegExp(`^${escaped}\\s*\\*?$`))
}

function queryLabelled(text) {
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  return screen.queryByLabelText(new RegExp(`^${escaped}\\s*\\*?$`))
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
  justification: () => labelled('Justificação da alteração'),
}

function formatButton(name) {
  return within(screen.getByRole('group', { name: 'Formato' })).getByRole('button', { name })
}

function submitButton() {
  return screen.getByRole('button', { name: 'Guardar alterações' })
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
    vi.clearAllMocks()
  })

  it('abre com os dados do evento, o formato do evento, sem repetição e sem alterações', () => {
    show()

    expect(screen.getByRole('dialog', { name: 'Editar Evento' })).toHaveAttribute('aria-modal', 'true')
    expect(field.title()).toHaveFocus()
    expect(field.title()).toHaveValue('Workshop de Liderança')
    expect(field.category()).toHaveValue('c1')
    expect(field.location()).toHaveValue('l1')
    expect(field.date()).toHaveValue('2099-01-21')
    expect(field.start()).toHaveValue('08:00')
    expect(field.end()).toHaveValue('10:00')
    expect(field.deadline()).toHaveValue('2099-01-19')
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

  it('com inscritos avisa do email e mostra a justificação opcional, que não conta como alteração', async () => {
    const user = userEvent.setup()
    const { unmount } = show()

    expect(screen.getByText(NOTICE_22)).toBeInTheDocument()
    expect(field.justification()).not.toHaveAttribute('aria-required')
    expect(field.justification()).toHaveAttribute('maxlength', '2000')
    expect(screen.getByText('0/2000 caracteres')).toBeInTheDocument()
    expect(screen.getByText(JUSTIFICATION_HINT)).toBeInTheDocument()

    await user.type(field.justification(), 'Só a justificação.')

    expect(submitButton()).toBeDisabled()
    expect(screen.getByText(NO_CHANGES)).toBeInTheDocument()
    unmount()

    show(event('e1', 'Workshop de Liderança', { registrations_count: 0 }))

    expect(screen.queryByText(/vão receber um email|vai receber um email/)).not.toBeInTheDocument()
    expect(queryLabelled('Justificação da alteração')).not.toBeInTheDocument()
  })

  it('guarda com o payload completo e a justificação e bloqueia o modal durante o pedido', async () => {
    const pending = deferred()
    updateAdminEvent.mockImplementationOnce(() => pending.promise)
    const user = userEvent.setup()
    const { onClose, onSuccess } = show()

    await editTitle(user)
    await user.type(field.justification(), 'A sessão passou para a sala 2.')
    await user.click(submitButton())

    expect(updateAdminEvent).toHaveBeenCalledTimes(1)
    expect(updateAdminEvent).toHaveBeenCalledWith('e1', {
      ...IN_PERSON_PAYLOAD,
      name: 'Workshop de Liderança — nova data',
      justification: 'A sessão passou para a sala 2.',
    })
    expect(screen.getByRole('button', { name: 'A guardar...' })).toBeDisabled()
    expect(field.title()).toBeDisabled()
    expect(field.justification()).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeDisabled()

    await user.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()

    await act(async () => { pending.resolve({ success: true, message: SUCCESS, data: { id: 'e1' } }) })

    expect(onSuccess).toHaveBeenCalledWith(SUCCESS)
  })

  it('mudar a morada ou a delegação larga a localização guardada e a verificação envia as novas coordenadas', async () => {
    updateAdminEvent.mockResolvedValue({ success: true, message: SUCCESS, data: {} })
    geocodeAddress.mockResolvedValue(FOUND)
    const user = userEvent.setup()
    const first = show()

    await user.type(field.address(), ' A')

    expect(screen.queryByText(SAVED_HINT)).not.toBeInTheDocument()
    expect(screen.getByText(EDIT_GEOCODE_HINT)).toBeInTheDocument()

    await user.click(submitButton())

    expect(lastPayload()).toMatchObject({ address: 'Rua Castilho 39, 1250-068 Lisboa A' })
    expect(lastPayload()).not.toHaveProperty('latitude')
    expect(lastPayload()).not.toHaveProperty('longitude')
    first.unmount()

    const second = show()
    await user.selectOptions(field.location(), 'l2')

    expect(screen.queryByText(SAVED_HINT)).not.toBeInTheDocument()
    expect(screen.getByText(EDIT_GEOCODE_HINT)).toBeInTheDocument()

    await user.click(submitButton())

    expect(lastPayload()).toMatchObject({ location_id: 'l2' })
    expect(lastPayload()).not.toHaveProperty('latitude')
    expect(lastPayload()).not.toHaveProperty('longitude')
    second.unmount()

    show()
    await typeInto(user, field.address(), 'Rua Nova 1, Porto')
    await user.click(screen.getByRole('button', { name: 'Verificar no mapa' }))
    await screen.findByText(`Morada encontrada: ${FOUND.display_name}`)
    await user.click(submitButton())

    expect(lastPayload()).toMatchObject({ address: 'Rua Nova 1, Porto', latitude: 41.15, longitude: -8.61 })
  })

  it('apagar as notas do organizador envia organizer_notes a null', async () => {
    updateAdminEvent.mockResolvedValue({ success: true, message: SUCCESS, data: {} })
    const user = userEvent.setup()
    show()

    await user.clear(field.notes())
    await user.click(submitButton())

    expect(lastPayload()).toHaveProperty('organizer_notes', null)
  })

  it('a capacidade mostra os inscritos e não pode ficar abaixo deles', () => {
    show()

    const hint = screen.getByText(CAPACITY_HINT_22)
    expect(describedIds(field.capacity())).toContain(hint.id)

    change(field.capacity(), '20')

    expect(screen.getByText(BELOW_REGISTRATIONS)).toBeInTheDocument()
    expect(field.capacity()).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Corrija os campos assinalados.')).toBeInTheDocument()
    expect(submitButton()).toBeDisabled()
  })

  it('um prazo já encerrado que não muda não bloqueia, mas não se escolhe um prazo no passado', async () => {
    const user = userEvent.setup()
    show(event('e1', 'Workshop de Liderança', { registration_deadline: CLOSED_DEADLINE }))

    await editTitle(user)

    expect(submitButton()).toBeEnabled()
    expect(screen.queryByText(DEADLINE_PAST)).not.toBeInTheDocument()

    change(field.deadline(), '2020-01-10')

    expect(screen.getByText(DEADLINE_PAST)).toBeInTheDocument()
    expect(submitButton()).toBeDisabled()
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
    await user.click(submitButton())

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

  it('um 422 assinala a capacidade ou a justificação e foca o campo', async () => {
    updateAdminEvent
      .mockRejectedValueOnce(apiError(422, 'Os dados enviados são inválidos.', { max_attendees: [BELOW_REGISTRATIONS] }))
      .mockRejectedValueOnce(apiError(422, 'Os dados enviados são inválidos.', {
        justification: ['A justificação não pode ter mais de 2000 caracteres.'],
      }))
    const user = userEvent.setup()
    const { onSuccess, onStale } = show()
    await editTitle(user)

    await user.click(submitButton())

    await waitFor(() => expectAlert('Os dados enviados são inválidos.'))
    expect(screen.getByText(BELOW_REGISTRATIONS)).toBeInTheDocument()
    expect(field.capacity()).toHaveAttribute('aria-invalid', 'true')
    await waitFor(() => expect(field.capacity()).toHaveFocus())

    await user.click(submitButton())

    const error = await screen.findByText('A justificação não pode ter mais de 2000 caracteres.')
    expect(describedIds(field.justification())).toContain(error.id)
    expect(field.justification()).toHaveAttribute('aria-invalid', 'true')
    await waitFor(() => expect(field.justification()).toHaveFocus())
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onStale).not.toHaveBeenCalled()
  })

  it('um 409 ou um 404 do evento chamam onStale, o 404 da morada assinala a morada e o 503 fica no modal', async () => {
    const user = userEvent.setup()

    updateAdminEvent.mockRejectedValueOnce(apiError(409, PASSED))
    const passed = show()
    await editTitle(user)
    await user.click(submitButton())

    await waitFor(() => expect(passed.onStale).toHaveBeenCalledWith(PASSED))
    expect(passed.onSuccess).not.toHaveBeenCalled()
    passed.unmount()

    updateAdminEvent.mockRejectedValueOnce(apiError(404, 'Recurso não encontrado.'))
    const deleted = show()
    await editTitle(user)
    await user.click(submitButton())

    await waitFor(() => expect(deleted.onStale).toHaveBeenCalledWith('O evento já não existe. A lista foi atualizada.'))
    deleted.unmount()

    updateAdminEvent.mockRejectedValueOnce(apiError(404, ADDRESS_NOT_FOUND))
    const notFound = show()
    await user.type(field.address(), ' A')
    await user.click(submitButton())

    expect(await screen.findByText(ADDRESS_NOT_FOUND)).toBeInTheDocument()
    expect(field.address()).toHaveAttribute('aria-invalid', 'true')
    await waitFor(() => expect(field.address()).toHaveFocus())
    expect(notFound.onStale).not.toHaveBeenCalled()
    notFound.unmount()

    updateAdminEvent.mockRejectedValueOnce(apiError(503, UNAVAILABLE))
    const unavailable = show()
    await editTitle(user)
    await user.click(submitButton())

    await waitFor(() => expectAlert(UNAVAILABLE))
    expect(screen.getByRole('dialog', { name: 'Editar Evento' })).toBeInTheDocument()
    expect(unavailable.onStale).not.toHaveBeenCalled()
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

    await user.click(submitButton())

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
    await user.click(submitButton())

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
    await user.click(submitButton())

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
    await user.click(submitButton())

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
    const button = submitButton()

    await user.dblClick(button)
    fireEvent.submit(button.closest('form'))

    expect(updateAdminEvent).toHaveBeenCalledTimes(1)
    second.unmount()

    updateAdminEvent.mockReset()
    updateAdminEvent.mockRejectedValueOnce(new CanceledError())
    const third = show()
    await editTitle(user)
    await user.click(submitButton())

    await waitFor(() => expect(updateAdminEvent).toHaveBeenCalledTimes(1))
    await act(async () => {})
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(third.onSuccess).not.toHaveBeenCalled()
    expect(third.onStale).not.toHaveBeenCalled()
  })
})
