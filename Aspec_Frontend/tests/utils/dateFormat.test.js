import { afterEach, describe, expect, it } from 'vitest'
import { formatDate, formatRelativeDateTime, formatShortDate, formatShortDateTime } from '../../src/utils/dateFormat'

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

const OCT_29 = new Date('2026-10-29T10:40:00Z')

describe('formatRelativeDateTime', () => {
  it('mostra Hoje e Ontem com a hora de Lisboa e a data curta nos outros dias', () => {
    expect(formatRelativeDateTime('2026-10-29T10:32:00+00:00', OCT_29)).toBe('Hoje, 10:32')
    expect(formatRelativeDateTime('2026-10-28T14:15:00+00:00', OCT_29)).toBe('Ontem, 14:15')
    expect(formatRelativeDateTime('2026-10-28T09:40:00+00:00', OCT_29)).toBe('Ontem, 09:40')
    expect(formatRelativeDateTime('2026-10-27T23:59:00+00:00', OCT_29)).toBe('27 Out 2026, 23:59')
  })

  it('conta os dias no calendário de Lisboa no verão, quando Lisboa e UTC estão em dias diferentes', () => {
    const now = new Date('2026-07-31T23:30:00Z')

    expect(formatRelativeDateTime('2026-07-31T23:10:00Z', now)).toBe('Hoje, 00:10')
    expect(formatRelativeDateTime('2026-07-31T22:50:00Z', now)).toBe('Ontem, 23:50')
    expect(formatRelativeDateTime('2026-07-30T22:59:00Z', now)).toBe('30 Jul 2026, 23:59')
    expect(formatRelativeDateTime('2026-08-01T00:30:00+01:00', now)).toBe('Hoje, 00:30')
  })

  it('reconhece ontem na mudança de ano, de mês e nos dias da mudança de hora', () => {
    expect(formatRelativeDateTime('2026-12-31T18:00:00Z', new Date('2027-01-01T10:00:00Z'))).toBe('Ontem, 18:00')
    expect(formatRelativeDateTime('2026-02-28T20:00:00Z', new Date('2026-03-01T09:00:00Z'))).toBe('Ontem, 20:00')
    expect(formatRelativeDateTime('2026-10-25T00:30:00Z', new Date('2026-10-26T08:00:00Z'))).toBe('Ontem, 01:30')
    expect(formatRelativeDateTime('2026-03-29T00:30:00Z', new Date('2026-03-30T08:00:00Z'))).toBe('Ontem, 00:30')
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

  it('formatRelativeDateTime dá o mesmo resultado noutro fuso e devolve texto vazio para valores inválidos', () => {
    process.env.TZ = 'America/New_York'
    expect(new Date(0).getTimezoneOffset()).toBe(300)

    expect(formatRelativeDateTime('2026-10-29T10:32:00+00:00', OCT_29)).toBe('Hoje, 10:32')
    expect(formatRelativeDateTime('2026-10-28T14:15:00+00:00', OCT_29)).toBe('Ontem, 14:15')
    expect(formatRelativeDateTime('2026-10-28T09:40:00+00:00', OCT_29)).toBe('Ontem, 09:40')
    expect(formatRelativeDateTime('2026-10-27T23:59:00+00:00', OCT_29)).toBe('27 Out 2026, 23:59')
    expect(formatRelativeDateTime('2026-10-29T10:45:00Z', OCT_29)).toBe('Hoje, 10:45')
    expect(formatRelativeDateTime('2026-10-30T09:00:00Z', OCT_29)).toBe('30 Out 2026, 09:00')

    for (const value of ['', null, undefined, 123, 'abc', '2026-10-29', '2026-02-30T10:00:00Z']) {
      expect(formatRelativeDateTime(value, OCT_29)).toBe('')
    }
  })
})
