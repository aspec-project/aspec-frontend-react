import { afterEach, describe, expect, it, vi } from 'vitest'
import { AxiosError } from 'axios'
import { api, normalizeError } from '../../src/services/api'
import {
  createAdminEvent,
  deleteAdminEvent,
  distributePrayerCards,
  exportEventAttendees,
  geocodeAddress,
  getAdminEvent,
  getAdminEvents,
  getPrayerCardsStatus,
  updateAdminEvent,
} from '../../src/services/adminEvents'

const payload = {
  items: [{ id: 'e1', name: 'Jantar — Lisboa' }],
  pagination: { current_page: 1, per_page: 6, total: 1, last_page: 1 },
  counts: { upcoming: 1, past: 0 },
}

function mockGet() {
  return vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, message: 'ok', data: payload } })
}

describe('getAdminEvents', () => {
  afterEach(() => vi.restoreAllMocks())

  it('pede os agendados da primeira página com 6 por página, passa o signal e devolve os dados', async () => {
    const get = mockGet()
    const signal = new AbortController().signal

    const result = await getAdminEvents({}, signal)

    expect(get).toHaveBeenCalledWith('/admin/events', { params: { period: 'upcoming', page: 1, per_page: 6 }, signal })
    expect(result).toEqual(payload)
  })

  it('traduz os filtros para a query string e omite os vazios', async () => {
    const get = mockGet()

    await getAdminEvents({ period: 'past', page: 2, dateFrom: '2026-01-01', dateTo: '2026-01-31', categoryId: 'c1', locationId: 'l1' })
    await getAdminEvents({ period: 'past', page: 2, dateFrom: '', dateTo: '', categoryId: '', locationId: '' })

    expect(get.mock.calls[0][1].params).toEqual({
      period: 'past',
      page: 2,
      per_page: 6,
      date_from: '2026-01-01',
      date_to: '2026-01-31',
      category_id: 'c1',
      location_id: 'l1',
    })
    expect(get.mock.calls[1][1].params).toEqual({ period: 'past', page: 2, per_page: 6 })
  })
})

const EVENT_ID = 'e5a6b7c8-5555-4c55-8555-555555555555'
const OPEN_MESSAGE = 'As inscrições ainda estão abertas. A lista de presenças só pode ser exportada depois do prazo de inscrição.'

function blobError(status, data) {
  return new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    statusText: 'Error',
    headers: {},
    config: {},
    data,
  })
}

describe('exportEventAttendees', () => {
  afterEach(() => vi.restoreAllMocks())

  it('pede o CSV como blob e devolve-o com o nome do Content-Disposition', async () => {
    const blob = new Blob(['Nome;Empresa'], { type: 'text/csv' })
    const get = vi.spyOn(api, 'get')
      .mockResolvedValueOnce({ data: blob, headers: { 'content-disposition': 'attachment; filename=presencas_2030-11-15_jantar-lisboa.csv' } })
      .mockResolvedValueOnce({ data: blob, headers: {} })
      .mockResolvedValueOnce({ data: blob, headers: {} })

    const result = await exportEventAttendees(EVENT_ID)

    expect(get).toHaveBeenCalledWith(`/admin/events/${EVENT_ID}/attendees.csv`, { responseType: 'blob' })
    expect(result).toEqual({ blob, filename: 'presencas_2030-11-15_jantar-lisboa.csv' })
    expect(result.blob).toBe(blob)

    expect(await exportEventAttendees(EVENT_ID)).toEqual({ blob, filename: null })

    await exportEventAttendees('a/b')
    expect(get).toHaveBeenLastCalledWith('/admin/events/a%2Fb/attendees.csv', { responseType: 'blob' })
  })

  it('converte o erro JSON que chega dentro de um blob para o normalizeError dar a mensagem do backend', async () => {
    const error = blobError(409, new Blob([JSON.stringify({ success: false, message: OPEN_MESSAGE, data: null })], { type: 'application/json' }))
    vi.spyOn(api, 'get').mockRejectedValue(error)

    const caught = await exportEventAttendees(EVENT_ID).catch((err) => err)

    expect(caught).toBe(error)
    expect(caught.response.data).toEqual({ success: false, message: OPEN_MESSAGE, data: null })
    expect(normalizeError(caught)).toMatchObject({ status: 409, message: OPEN_MESSAGE })
  })

  it('mantém o erro intacto quando o corpo não é JSON ou não há resposta', async () => {
    const body = new Blob(['<html>erro</html>'], { type: 'text/html' })
    const serverError = blobError(500, body)
    const networkError = new AxiosError('Network Error', 'ERR_NETWORK')
    vi.spyOn(api, 'get').mockRejectedValueOnce(serverError).mockRejectedValueOnce(networkError)

    const caught = await exportEventAttendees(EVENT_ID).catch((err) => err)

    expect(caught).toBe(serverError)
    expect(caught.response.data).toBe(body)
    expect(normalizeError(caught).message).toBe('Erro do servidor (500).')

    await expect(exportEventAttendees(EVENT_ID)).rejects.toBe(networkError)
  })
})

describe('createAdminEvent', () => {
  afterEach(() => vi.restoreAllMocks())

  it('envia o corpo para /admin/events e devolve a resposta inteira da API', async () => {
    const body = { name: 'Jantar de Networking Lisboa', is_online: false, max_attendees: 40 }
    const response = { success: true, message: 'Evento criado com sucesso.', data: { id: EVENT_ID, name: 'Jantar de Networking Lisboa' } }
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: response })

    const result = await createAdminEvent(body)

    expect(post).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledWith('/admin/events', body)
    expect(result).toEqual(response)
  })

  it('relança o erro do pedido tal como está', async () => {
    const error = blobError(422, { success: false, message: 'Os dados enviados são inválidos.', errors: {} })
    vi.spyOn(api, 'post').mockRejectedValue(error)

    await expect(createAdminEvent({})).rejects.toBe(error)
  })
})

describe('geocodeAddress', () => {
  afterEach(() => vi.restoreAllMocks())

  it('pede a morada com o distrito e o signal e devolve os dados encontrados', async () => {
    const found = { latitude: 38.71, longitude: -9.14, display_name: 'Rua Augusta, Lisboa', attribution: '© OpenStreetMap contributors' }
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, message: 'Morada localizada com sucesso.', data: found } })
    const signal = new AbortController().signal

    const result = await geocodeAddress('Rua Augusta 1', 'l1', signal)

    expect(get).toHaveBeenCalledWith('/admin/geocode', { params: { address: 'Rua Augusta 1', location_id: 'l1' }, signal })
    expect(result).toEqual(found)
  })

  it('sem delegação envia só a morada', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, message: 'ok', data: {} } })
    const signal = new AbortController().signal

    await geocodeAddress('Rua Augusta 1', '', signal)

    expect(get).toHaveBeenCalledWith('/admin/geocode', { params: { address: 'Rua Augusta 1' }, signal })
  })
})

describe('updateAdminEvent', () => {
  afterEach(() => vi.restoreAllMocks())

  it('envia o corpo completo por PUT para /admin/events/{id} e devolve a resposta inteira da API', async () => {
    const body = { name: 'Workshop de Liderança — nova data', is_online: false, max_attendees: 30, organizer_notes: null }
    const response = { success: true, message: 'Evento atualizado com sucesso.', data: { id: 'e1', name: 'Workshop de Liderança — nova data' } }
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: response })

    const result = await updateAdminEvent('e1', body)

    expect(put).toHaveBeenCalledTimes(1)
    expect(put).toHaveBeenCalledWith('/admin/events/e1', body)
    expect(result).toEqual(response)

    await updateAdminEvent('a/b', body)
    expect(put).toHaveBeenLastCalledWith('/admin/events/a%2Fb', body)
  })

  it('relança o erro do pedido tal como está', async () => {
    const error = blobError(409, { success: false, message: 'Não é possível alterar um evento que já decorreu.', data: null })
    vi.spyOn(api, 'put').mockRejectedValue(error)

    await expect(updateAdminEvent('e1', {})).rejects.toBe(error)
  })
})

describe('deleteAdminEvent', () => {
  afterEach(() => vi.restoreAllMocks())

  const response = { success: true, message: 'Evento eliminado com sucesso.', data: null }

  it('envia a justificação limpa no corpo do DELETE e devolve a resposta inteira da API', async () => {
    const remove = vi.spyOn(api, 'delete').mockResolvedValue({ data: response })

    const result = await deleteAdminEvent('e1', '  O orador adoeceu.\nPedimos desculpa.  ')

    expect(remove).toHaveBeenCalledTimes(1)
    expect(remove).toHaveBeenCalledWith('/admin/events/e1', { data: { justification: 'O orador adoeceu.\nPedimos desculpa.' } })
    expect(result).toEqual(response)
  })

  it('sem justificação válida faz o DELETE sem corpo', async () => {
    for (const justification of [undefined, '', '   ', null, { type: 'click' }]) {
      const remove = vi.spyOn(api, 'delete').mockResolvedValue({ data: response })

      await deleteAdminEvent('e1', justification)

      expect(remove.mock.calls).toEqual([['/admin/events/e1']])
      remove.mockRestore()
    }
  })

  it('codifica o id no URL', async () => {
    const remove = vi.spyOn(api, 'delete').mockResolvedValue({ data: response })

    await deleteAdminEvent('a/b')

    expect(remove).toHaveBeenCalledWith('/admin/events/a%2Fb')
  })

  it('relança o erro do pedido tal como está', async () => {
    const error = blobError(409, { success: false, message: 'Não é possível alterar um evento que já decorreu.', data: null })
    vi.spyOn(api, 'delete').mockRejectedValue(error)

    await expect(deleteAdminEvent('e1', 'Motivo')).rejects.toBe(error)
  })
})

const EVENT_FORMAT_ERROR = 'A resposta do evento tem um formato inesperado.'
const PRAYER_CARDS_FORMAT_ERROR = 'A resposta dos cartões de oração tem um formato inesperado.'

function apiEvent(overrides = {}) {
  return {
    id: 'ev-1',
    name: 'Pequeno-Almoço de Oração e Negócios — Porto',
    category: { id: 'c1', name: 'Pequeno-Almoço', color: '#2E7D32' },
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
    prayer_cards_count: 6,
    series_id: null,
    address: 'Rua de Santa Catarina 112, 4000-442 Porto',
    online_url: null,
    organizer_notes: 'Entrada pela porta lateral.',
    prayer_verse: 'Levai as cargas uns dos outros (Gálatas 6:2)',
    place_id: 'ChIJexemplo123',
    latitude: 41.1469,
    longitude: -8.6063,
    ...overrides,
  }
}

function apiStatus(overrides = {}) {
  return {
    enabled: true,
    prayer_verse: 'Levai as cargas uns dos outros (Gálatas 6:2)',
    window: { status: 'open', opens_at: '2025-02-03T08:00:00+00:00', closes_at: '2025-02-03T23:59:59+00:00' },
    registrations_count: 18,
    cards_count: 2,
    distributed_count: 0,
    unpaired_count: 0,
    distributed_at: null,
    participants: [
      { name: 'Rui Magalhães', business_name: 'Magalhães Engenharia', submitted_at: '2025-02-03T08:07:00+00:00', email: 'rui@example.pt' },
      { name: null, business_name: null, submitted_at: '2025-02-03T08:15:00+00:00' },
    ],
    ...overrides,
  }
}

const readStatus = {
  window: { status: 'open', opens_at: '2025-02-03T08:00:00+00:00', closes_at: '2025-02-03T23:59:59+00:00' },
  registrations_count: 18,
  cards_count: 2,
  distributed_at: null,
  participants: [
    { name: 'Rui Magalhães', business_name: 'Magalhães Engenharia', submitted_at: '2025-02-03T08:07:00+00:00' },
    { name: null, business_name: null, submitted_at: '2025-02-03T08:15:00+00:00' },
  ],
}

function ok(data, message = 'ok') {
  return { data: { success: true, message, data } }
}

describe('getAdminEvent', () => {
  afterEach(() => vi.restoreAllMocks())

  it('pede o evento com o signal e devolve só os campos que a página mostra', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue(ok(apiEvent({ series: { position: 1, total: 4 } })))
    const signal = new AbortController().signal

    const result = await getAdminEvent('ev-1', signal)

    expect(get).toHaveBeenCalledWith('/admin/events/ev-1', { signal })
    expect(result).toMatchObject({
      id: 'ev-1',
      name: 'Pequeno-Almoço de Oração e Negócios — Porto',
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
      series: { position: 1, total: 4 },
    })
    for (const field of ['address', 'online_url', 'organizer_notes', 'prayer_verse', 'place_id', 'latitude', 'longitude']) {
      expect(result).not.toHaveProperty(field)
    }
  })

  it('codifica o id no URL', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue(ok(apiEvent()))

    await getAdminEvent('a/b')

    expect(get.mock.calls[0][0]).toBe('/admin/events/a%2Fb')
  })

  it('rejeita uma resposta fora do formato', async () => {
    const withoutPrayerCardsFlag = apiEvent()
    delete withoutPrayerCardsFlag.prayer_cards_enabled
    const invalid = [apiEvent({ name: '' }), apiEvent({ registrations_count: '18' }), withoutPrayerCardsFlag]

    for (const data of invalid) {
      vi.spyOn(api, 'get').mockResolvedValueOnce(ok(data))

      await expect(getAdminEvent('ev-1')).rejects.toThrow(EVENT_FORMAT_ERROR)
    }
  })
})

describe('getPrayerCardsStatus', () => {
  afterEach(() => vi.restoreAllMocks())

  it('pede o estado com o signal e devolve só a lista branca, sem versículo, contagens extra nem campos a mais dos participantes', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue(ok(apiStatus(), 'Estado dos cartões de oração obtido com sucesso.'))
    const signal = new AbortController().signal

    const result = await getPrayerCardsStatus('ev-1', signal)

    expect(get).toHaveBeenCalledWith('/admin/events/ev-1/prayer-cards', { signal })
    expect(result).toEqual(readStatus)
  })

  it('rejeita uma resposta fora do formato', async () => {
    const window = apiStatus().window
    const invalid = [
      apiStatus({ window: { ...window, status: 'aberto' } }),
      apiStatus({ window: { ...window, opens_at: '2025-02-03' } }),
      apiStatus({ cards_count: -1 }),
      apiStatus({ participants: {} }),
    ]

    for (const data of invalid) {
      vi.spyOn(api, 'get').mockResolvedValueOnce(ok(data))

      await expect(getPrayerCardsStatus('ev-1')).rejects.toThrow(PRAYER_CARDS_FORMAT_ERROR)
    }
  })
})

describe('distributePrayerCards', () => {
  afterEach(() => vi.restoreAllMocks())

  it('faz o POST sem corpo e devolve a mensagem e o estado lido', async () => {
    const distributed = apiStatus({ window: { ...apiStatus().window, status: 'closed' }, distributed_at: '2025-02-03T12:05:00+00:00' })
    const post = vi.spyOn(api, 'post').mockResolvedValue(ok(distributed, 'Cartões de oração distribuídos.'))

    const result = await distributePrayerCards('ev-1')

    expect(post.mock.calls).toEqual([['/admin/events/ev-1/prayer-cards/distribute']])
    expect(result).toEqual({
      message: 'Cartões de oração distribuídos.',
      status: { ...readStatus, window: { ...readStatus.window, status: 'closed' }, distributed_at: '2025-02-03T12:05:00+00:00' },
    })
  })

  it('com o estado fora do formato devolve status null sem rejeitar', async () => {
    vi.spyOn(api, 'post').mockResolvedValue(ok({ enabled: true }, 'Cartões de oração distribuídos.'))

    await expect(distributePrayerCards('ev-1')).resolves.toEqual({ message: 'Cartões de oração distribuídos.', status: null })
  })

  it('relança o erro do pedido tal como está', async () => {
    const error = blobError(409, { success: false, message: 'Os cartões deste evento já foram distribuídos.', data: null })
    vi.spyOn(api, 'post').mockRejectedValue(error)

    await expect(distributePrayerCards('ev-1')).rejects.toBe(error)
  })
})
