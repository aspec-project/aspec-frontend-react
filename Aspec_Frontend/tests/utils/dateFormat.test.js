import { afterEach, describe, expect, it } from 'vitest'
import { formatDate, formatShortDate, formatShortDateTime } from '../../src/utils/dateFormat'

describe('formatDate', () => {
  it('formata datas de calendário como dd/mm/aaaa', () => {
    expect(formatDate('2026-01-21')).toBe('21/01/2026')
    expect(formatDate('2026-12-05')).toBe('05/12/2026')
    expect(formatDate('2024-02-29')).toBe('29/02/2024')
  })

  it('mostra o dia de Lisboa nas datas e horas com desvio', () => {
    expect(formatDate('2024-01-15T09:30:00+00:00')).toBe('15/01/2024')
    expect(formatDate('2026-07-14T23:30:00+00:00')).toBe('15/07/2026')
    expect(formatDate('2026-01-14T23:30:00+00:00')).toBe('14/01/2026')
    expect(formatDate('2026-10-14T00:30:00+02:00')).toBe('13/10/2026')
    expect(formatDate('2026-10-14T09:30:00.000000Z')).toBe('14/10/2026')
  })

  it('devolve texto vazio para valores inválidos', () => {
    const invalid = [
      '',
      null,
      undefined,
      42,
      'lixo',
      '2026-13-01',
      '2026-02-30',
      '2026-02-30T10:00:00Z',
      '21/01/2026',
      '2026-1-5',
      '2026-10-14T09:30:00',
      ' 2026-01-21',
    ]

    for (const value of invalid) {
      expect(formatDate(value)).toBe('')
    }
  })
})

describe('formatShortDate', () => {
  it('formata a data com o mês abreviado, o dia sem zero e o dia de Lisboa nas datas e horas', () => {
    expect(formatShortDate('2026-01-21')).toBe('21 Jan 2026')
    expect(formatShortDate('2026-12-05')).toBe('5 Dez 2026')
    expect(formatShortDate('2025-02-05')).toBe('5 Fev 2025')
    expect(formatShortDate('2026-07-14T23:30:00+00:00')).toBe('15 Jul 2026')
    expect(formatShortDate('2026-10-14T00:30:00+02:00')).toBe('13 Out 2026')
  })

  it('devolve texto vazio para valores inválidos', () => {
    for (const value of ['', null, 42, '2026-02-30', '2026-02-30T10:00:00Z', '21/01/2026', '2026-10-14T09:30:00']) {
      expect(formatShortDate(value)).toBe('')
    }
  })
})

describe('formatShortDateTime', () => {
  it('formata a data com o mês abreviado e a hora de Lisboa', () => {
    expect(formatShortDateTime('2099-01-19T23:59:00+00:00')).toBe('19 Jan 2099, 23:59')
    expect(formatShortDateTime('2026-10-14T23:59:00+01:00')).toBe('14 Out 2026, 23:59')
    expect(formatShortDateTime('2030-11-14T23:59:00Z')).toBe('14 Nov 2030, 23:59')
    expect(formatShortDateTime('2026-03-29T01:30:00Z')).toBe('29 Mar 2026, 02:30')
    expect(formatShortDateTime('2026-07-05T08:05:00+00:00')).toBe('5 Jul 2026, 09:05')
  })

  it('devolve texto vazio para valores inválidos ou sem hora e desvio', () => {
    for (const value of ['', null, 'abc', '2026-01-21', '2026-02-30T10:00:00Z', '2026-10-14T09:30:00']) {
      expect(formatShortDateTime(value)).toBe('')
    }
  })
})

describe('fuso do computador', () => {
  const originalTz = process.env.TZ

  afterEach(() => {
    if (originalTz === undefined) {
      delete process.env.TZ
    } else {
      process.env.TZ = originalTz
    }
  })

  it('dá o mesmo resultado com o computador noutro fuso', () => {
    process.env.TZ = 'America/New_York'
    expect(new Date(0).getTimezoneOffset()).toBe(300)

    expect(formatDate('2026-07-14T23:30:00+00:00')).toBe('15/07/2026')
    expect(formatShortDateTime('2099-01-19T23:59:00+00:00')).toBe('19 Jan 2099, 23:59')
    expect(formatShortDate('2026-07-14T23:30:00+00:00')).toBe('15 Jul 2026')
    expect(formatDate('2026-01-21')).toBe('21/01/2026')
  })
})
