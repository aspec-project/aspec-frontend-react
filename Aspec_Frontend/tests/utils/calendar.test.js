import { describe, expect, it } from 'vitest'
import {
  WEEKDAY_HEADERS,
  addDays,
  addMonths,
  endOfWeek,
  formatDayLabel,
  formatMonthTitle,
  formatShortDate,
  getMonthGrid,
  isWithinRange,
  parseIsoDate,
  startOfWeek,
  todayIso,
} from '../../src/utils/calendar'

describe('parseIsoDate', () => {
  it('lê uma data AAAA-MM-DD', () => {
    expect(parseIsoDate('2025-01-20')).toEqual({ year: 2025, month: 1, day: 20 })
  })

  it('recusa datas que não existem, mal formatadas, vazias ou nulas', () => {
    for (const value of ['2025-02-30', '2025-1-2', '', null]) {
      expect(parseIsoDate(value)).toBeNull()
    }
  })
})

describe('addDays e addMonths', () => {
  it('soma dias atravessando o fim do ano, o fim de fevereiro e a mudança de hora', () => {
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01')
    expect(addDays('2025-03-01', -1)).toBe('2025-02-28')
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(addDays('2026-03-28', 7)).toBe('2026-04-04')
  })

  it('soma meses limitando o dia ao fim do mês', () => {
    expect(addMonths('2025-01-31', 1)).toBe('2025-02-28')
    expect(addMonths('2025-03-31', -1)).toBe('2025-02-28')
    expect(addMonths('2025-12-15', 1)).toBe('2026-01-15')
  })
})

describe('startOfWeek e endOfWeek', () => {
  it('a semana vai de segunda a domingo', () => {
    expect(startOfWeek('2025-01-22')).toBe('2025-01-20')
    expect(endOfWeek('2025-01-22')).toBe('2025-01-26')
    expect(startOfWeek('2026-11-15')).toBe('2026-11-09')
  })
})

describe('getMonthGrid', () => {
  it('janeiro de 2025 tem 5 semanas a começar à segunda, com espaços vazios antes e depois', () => {
    const grid = getMonthGrid(2025, 1)

    expect(grid).toHaveLength(5)
    expect(grid[0]).toEqual([null, null, '2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04', '2025-01-05'])
    expect(grid[4]).toEqual(['2025-01-27', '2025-01-28', '2025-01-29', '2025-01-30', '2025-01-31', null, null])
    for (const week of grid) {
      expect(week).toHaveLength(7)
    }
  })

  it('março de 2025 começa ao sábado e ocupa 6 semanas', () => {
    expect(getMonthGrid(2025, 3)).toHaveLength(6)
  })

  it('fevereiro de 2026 começa ao domingo', () => {
    expect(getMonthGrid(2026, 2)[0]).toEqual([null, null, null, null, null, null, '2026-02-01'])
  })
})

describe('formatação e limites', () => {
  it('formata o título do mês, o nome do dia e a data curta em português', () => {
    expect(formatMonthTitle(2025, 1)).toBe('Janeiro 2025')
    expect(formatMonthTitle(2026, 11)).toBe('Novembro 2026')
    expect(formatDayLabel('2025-01-20')).toBe('20 de janeiro de 2025')
    expect(formatShortDate('2025-01-21')).toBe('21 Jan 2025')
    expect(formatShortDate('2025-02-30')).toBe('')
  })

  it('os cabeçalhos da semana vão de SEG a DOM', () => {
    expect(WEEKDAY_HEADERS.map((day) => day.short)).toEqual(['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'])
    expect(WEEKDAY_HEADERS[0].long).toBe('segunda-feira')
    expect(WEEKDAY_HEADERS[6].long).toBe('domingo')
  })

  it('hoje é a data local do browser', () => {
    expect(todayIso(new Date(2026, 10, 15, 23, 30))).toBe('2026-11-15')
  })

  it('verifica se uma data está dentro dos limites, ignorando os vazios', () => {
    expect(isWithinRange('2026-11-10', '2026-11-10', '')).toBe(true)
    expect(isWithinRange('2026-11-09', '2026-11-10')).toBe(false)
    expect(isWithinRange('2026-12-01', '', '2026-11-30')).toBe(false)
  })
})
