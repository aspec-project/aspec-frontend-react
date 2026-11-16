import { describe, expect, it } from 'vitest'
import {
  parseAllowedValue,
  parseDateOnly,
  parsePositiveInteger,
  updateSearchParams,
} from '../../src/utils/queryParams'

describe('parsePositiveInteger', () => {
  it('aceita inteiros positivos escritos só com algarismos', () => {
    expect(parsePositiveInteger('1', 9)).toBe(1)
    expect(parsePositiveInteger('42', 9)).toBe(42)
  })

  it.each([null, undefined, '', '0', '-1', 'abc', '1.5', '2e3', ' 2', '99999999999999999999'])(
    'devolve o valor padrão para %s',
    (value) => {
      expect(parsePositiveInteger(value, 7)).toBe(7)
    },
  )
})

describe('parseAllowedValue', () => {
  it('aceita só valores da lista fechada', () => {
    expect(parseAllowedValue('past', ['upcoming', 'past'], 'upcoming')).toBe('past')
    expect(parseAllowedValue('PAST', ['upcoming', 'past'], 'upcoming')).toBe('upcoming')
    expect(parseAllowedValue(null, ['upcoming', 'past'], 'upcoming')).toBe('upcoming')
    expect(parseAllowedValue('24', [12, 24, 48], 12)).toBe(24)
    expect(parseAllowedValue('25', [12, 24, 48], 12)).toBe(12)
  })
})

describe('parseDateOnly', () => {
  it('aceita só datas reais no formato AAAA-MM-DD', () => {
    expect(parseDateOnly('2026-11-20')).toBe('2026-11-20')
    expect(parseDateOnly('2028-02-29')).toBe('2028-02-29')
  })

  it.each([null, '', '2026-02-30', '2026-13-01', '20-11-2026', '2026-11-20T00:00', 'abc'])(
    'devolve texto vazio para %s',
    (value) => {
      expect(parseDateOnly(value)).toBe('')
    },
  )
})

describe('updateSearchParams', () => {
  it('mantém os outros parâmetros e remove os que voltam ao padrão', () => {
    const current = new URLSearchParams('reviews_page=3&outro=x&invoices_page=2')
    const next = updateSearchParams(current, { invoices_page: 1, reviews_page: 4 }, { invoices_page: 1, reviews_page: 1 })

    expect(next.toString()).toBe('reviews_page=4&outro=x')
    expect(current.toString()).toBe('reviews_page=3&outro=x&invoices_page=2')
  })

  it('remove valores vazios e escreve os restantes como texto', () => {
    const next = updateSearchParams(new URLSearchParams('reviews_rating=4'), { reviews_rating: '', reviews_sort: 'oldest' }, { reviews_sort: 'newest' })

    expect(next.toString()).toBe('reviews_sort=oldest')
  })
})
