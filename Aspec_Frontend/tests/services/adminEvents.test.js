import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../src/services/api'
import { getAdminEvents } from '../../src/services/adminEvents'

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
