import { afterEach, describe, expect, it, vi } from 'vitest'
import { AxiosError } from 'axios'
import { api, normalizeError } from '../../src/services/api'
import { createAdminEvent, deleteAdminEvent, exportEventAttendees, geocodeAddress, getAdminEvents, getEventAttendees, updateAdminEvent } from '../../src/services/adminEvents'

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

describe('getEventAttendees', () => {
  afterEach(() => vi.restoreAllMocks())

  const contractAttendees = [
    { id: 'c1a2b3c4-1111-4a11-8111-111111111111', user_id: '3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f', name: 'Álvaro Dias', business_name: 'Dias & Filhos, Lda.', email: 'alvaro.dias@example.pt', phone: '+351910000001', registered_at: '2026-07-15T13:05:00+00:00' },
    { id: 'c1a2b3c4-2222-4a22-8222-222222222222', user_id: null, name: 'Utilizador Anónimo', business_name: 'Empresa Removida', email: null, phone: null, registered_at: '2026-07-16T09:00:00+00:00' },
    { id: 'c1a2b3c4-3333-4a33-8333-333333333333', user_id: '9b8a7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d', name: null, business_name: null, email: 'admin@example.pt', phone: '+351210000003', registered_at: '2026-07-17T18:30:00+00:00' },
  ]

  function attendeesResponse(data, success = true) {
    return { data: { success, message: 'Inscritos do evento obtidos com sucesso.', data } }
  }

  it('pede os inscritos com o signal e devolve só o nome, a empresa e a data de inscrição', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue(attendeesResponse(contractAttendees))
    const signal = new AbortController().signal

    const result = await getEventAttendees('e1', signal)

    expect(get).toHaveBeenCalledTimes(1)
    expect(get).toHaveBeenCalledWith('/admin/events/e1/attendees', { signal })
    expect(result).toEqual([
      { id: 'c1a2b3c4-1111-4a11-8111-111111111111', name: 'Álvaro Dias', business_name: 'Dias & Filhos, Lda.', registered_at: '2026-07-15T13:05:00+00:00' },
      { id: 'c1a2b3c4-2222-4a22-8222-222222222222', name: 'Utilizador Anónimo', business_name: 'Empresa Removida', registered_at: '2026-07-16T09:00:00+00:00' },
      { id: 'c1a2b3c4-3333-4a33-8333-333333333333', name: null, business_name: null, registered_at: '2026-07-17T18:30:00+00:00' },
    ])
    for (const attendee of result) {
      expect(Object.keys(attendee)).toEqual(['id', 'name', 'business_name', 'registered_at'])
    }
  })

  it('valores que não são texto passam a null', async () => {
    vi.spyOn(api, 'get').mockResolvedValue(attendeesResponse([{ ...contractAttendees[0], name: 42 }]))

    const [attendee] = await getEventAttendees('e1')

    expect(attendee.name).toBeNull()
    expect(attendee.business_name).toBe('Dias & Filhos, Lda.')
  })

  it('codifica o id no URL e devolve uma lista vazia quando não há inscritos', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue(attendeesResponse([]))

    const result = await getEventAttendees('a/b')

    expect(get.mock.calls[0][0]).toBe('/admin/events/a%2Fb/attendees')
    expect(result).toEqual([])
  })

  it('rejeita respostas com um formato inesperado com um erro que não é do axios', async () => {
    const responses = [
      attendeesResponse([], false),
      attendeesResponse({}),
      attendeesResponse([null]),
    ]

    for (const response of responses) {
      vi.spyOn(api, 'get').mockResolvedValueOnce(response)

      const caught = await getEventAttendees('e1').catch((err) => err)

      expect(caught).toBeInstanceOf(Error)
      expect(caught).not.toBeInstanceOf(AxiosError)
      expect(caught.message).toBe('A resposta dos inscritos tem um formato inesperado.')
    }
  })

  it('relança o erro do pedido tal como está', async () => {
    const error = blobError(500, { success: false, message: 'Erro interno do servidor.', data: null })
    vi.spyOn(api, 'get').mockRejectedValue(error)

    await expect(getEventAttendees('e1')).rejects.toBe(error)
  })
})
