import { afterEach, describe, expect, it, vi } from 'vitest'
import { AxiosError } from 'axios'
import { api, normalizeError } from '../../src/services/api'
import { exportEventAttendees, getAdminEvents } from '../../src/services/adminEvents'

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
