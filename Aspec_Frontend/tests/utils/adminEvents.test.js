import { describe, expect, it } from 'vitest'
import {
  countActiveFilters,
  formatDeadline,
  formatEventDate,
  formatResultsRange,
  formatSession,
  formatTimeRange,
  getDateRangeError,
  getEventSeries,
  getOccupancy,
  getRegistrationState,
} from '../../src/utils/adminEvents'

describe('formatEventDate', () => {
  it('formata a data do evento com o mês abreviado em português', () => {
    expect(formatEventDate('2026-01-21')).toBe('21 Jan 2026')
    expect(formatEventDate('2026-12-05')).toBe('5 Dez 2026')
  })

  it('devolve um travessão para datas vazias, inválidas ou noutro formato', () => {
    for (const value of ['', null, '2026-13-01', '2026-02-30', '21/01/2026']) {
      expect(formatEventDate(value)).toBe('—')
    }
  })
})

describe('formatTimeRange', () => {
  it('junta as horas de início e fim com um travessão', () => {
    expect(formatTimeRange('08:00', '10:00')).toBe('08:00–10:00')
  })

  it('mostra só o início quando o fim falta e nada quando ambas são inválidas', () => {
    expect(formatTimeRange('08:00', '')).toBe('08:00')
    expect(formatTimeRange('x', 'y')).toBe('')
  })
})

describe('formatDeadline', () => {
  it('mostra o prazo na hora de Lisboa, no inverno e no verão', () => {
    expect(formatDeadline('2030-11-14T23:59:00+00:00')).toBe('14 Nov 2030, 23:59')
    expect(formatDeadline('2026-10-14T23:59:00+01:00')).toBe('14 Out 2026, 23:59')
    expect(formatDeadline('2030-11-14T23:59:00Z')).toBe('14 Nov 2030, 23:59')
  })

  it('devolve um travessão para prazos vazios ou inválidos', () => {
    for (const value of ['', null, 'abc']) {
      expect(formatDeadline(value)).toBe('—')
    }
  })
})

describe('getRegistrationState', () => {
  const deadline = '2030-11-14T23:59:00+00:00'
  const deadlineMs = Date.parse(deadline)

  it('as inscrições estão abertas até ao prazo, inclusive, e encerradas depois', () => {
    expect(getRegistrationState(deadline, deadlineMs - 1)).toBe('open')
    expect(getRegistrationState(deadline, deadlineMs)).toBe('open')
    expect(getRegistrationState(deadline, deadlineMs + 1)).toBe('closed')
  })

  it('sem prazo válido não há estado', () => {
    expect(getRegistrationState(null, deadlineMs)).toBeNull()
    expect(getRegistrationState('abc', deadlineMs)).toBeNull()
  })
})

describe('getOccupancy', () => {
  it('calcula a percentagem arredondada e marca quase esgotado a partir de 90%', () => {
    expect(getOccupancy(22, 30)).toEqual({ percent: 73, nearlyFull: false })
    expect(getOccupancy(45, 50)).toEqual({ percent: 90, nearlyFull: true })
    expect(getOccupancy(44, 50)).toEqual({ percent: 88, nearlyFull: false })
    expect(getOccupancy(47, 50)).toEqual({ percent: 94, nearlyFull: true })
    expect(getOccupancy(0, 40)).toEqual({ percent: 0, nearlyFull: false })
  })

  it('devolve null sem lotação válida ou com inscritos negativos', () => {
    expect(getOccupancy(5, 0)).toBeNull()
    expect(getOccupancy(5, null)).toBeNull()
    expect(getOccupancy(-1, 10)).toBeNull()
  })
})

describe('countActiveFilters', () => {
  it('conta só os filtros preenchidos', () => {
    expect(countActiveFilters({ dateFrom: '2026-01-01', dateTo: '', categoryId: 'c1', locationId: '' })).toBe(2)
    expect(countActiveFilters({ dateFrom: '', dateTo: '', categoryId: '', locationId: '' })).toBe(0)
    expect(countActiveFilters({ dateFrom: '2026-01-01', dateTo: '2026-01-31', categoryId: 'c1', locationId: 'l1' })).toBe(4)
  })
})

describe('getDateRangeError', () => {
  it('dá a mensagem do backend quando a data final é anterior à inicial', () => {
    expect(getDateRangeError('2026-11-20', '2026-11-19')).toBe('A data final tem de ser igual ou posterior à data inicial.')
  })

  it('não dá erro com datas iguais ou com uma delas vazia', () => {
    expect(getDateRangeError('2026-11-20', '2026-11-20')).toBe('')
    expect(getDateRangeError('2026-11-20', '')).toBe('')
    expect(getDateRangeError('', '2026-11-19')).toBe('')
  })
})

describe('formatResultsRange', () => {
  it('mostra o intervalo de eventos da página e o total', () => {
    expect(formatResultsRange({ current_page: 1, per_page: 6, total: 13 }, 6)).toBe('1–6 de 13 eventos')
    expect(formatResultsRange({ current_page: 3, per_page: 6, total: 13 }, 1)).toBe('13 de 13 eventos')
    expect(formatResultsRange({ current_page: 1, per_page: 6, total: 1 }, 1)).toBe('1 de 1 evento')
  })

  it('não mostra nada sem eventos', () => {
    expect(formatResultsRange({ current_page: 1, per_page: 6, total: 0 }, 0)).toBe('')
  })
})

describe('getEventSeries', () => {
  it('devolve a posição e o total da série quando são válidos', () => {
    expect(getEventSeries({ series: { position: 2, total: 5 } })).toEqual({ position: 2, total: 5 })
  })

  it('devolve null sem série ou com valores inválidos', () => {
    const invalid = [
      {},
      { series: null },
      { series: { position: 0, total: 5 } },
      { series: { position: 6, total: 5 } },
      { series: { position: 2.5, total: 5 } },
      { series: { position: '2', total: 5 } },
    ]

    for (const event of invalid) {
      expect(getEventSeries(event)).toBeNull()
    }
  })
})

describe('formatSession', () => {
  it('mostra Sessão X/Y só quando o evento pertence a uma série', () => {
    expect(formatSession({ series: { position: 2, total: 5 } })).toBe('Sessão 2/5')
    expect(formatSession({})).toBeNull()
  })
})
