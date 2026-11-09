import { describe, expect, it } from 'vitest'
import { joinTime, splitTime, stepSegment, typeDigit, typeText } from '../../src/utils/timeSegments'

const EMPTY = { hours: '', minutes: '' }

describe('splitTime e joinTime', () => {
  it('separa uma hora válida nas duas caixas e junta-as só quando estão as duas preenchidas', () => {
    expect(splitTime('19:30')).toEqual({ hours: '19', minutes: '30' })
    expect(splitTime('')).toEqual(EMPTY)
    expect(splitTime('25:00')).toEqual(EMPTY)
    expect(splitTime(null)).toEqual(EMPTY)

    expect(joinTime({ hours: '08', minutes: '05' })).toBe('08:05')
    expect(joinTime({ hours: '08', minutes: '' })).toBe('')
    expect(joinTime({ hours: '', minutes: '05' })).toBe('')
  })
})

describe('typeDigit', () => {
  it('nas horas espera o 2.º dígito depois de 0 a 2 e passa para os minutos nos restantes casos', () => {
    expect(typeDigit('', 'hours', false, '1')).toEqual({ value: '01', pending: true, advance: false })
    expect(typeDigit('', 'hours', false, '0')).toEqual({ value: '00', pending: true, advance: false })
    expect(typeDigit('', 'hours', false, '3')).toEqual({ value: '03', pending: false, advance: true })
    expect(typeDigit('', 'hours', false, '9')).toEqual({ value: '09', pending: false, advance: true })

    expect(typeDigit('01', 'hours', true, '5')).toEqual({ value: '15', pending: false, advance: true })
    expect(typeDigit('02', 'hours', true, '3')).toEqual({ value: '23', pending: false, advance: true })
    expect(typeDigit('02', 'hours', true, '5')).toEqual({ value: '05', pending: false, advance: true })
    expect(typeDigit('00', 'hours', true, '0')).toEqual({ value: '00', pending: false, advance: true })
  })

  it('nos minutos espera o 2.º dígito depois de 0 a 5 e nunca passa para outra caixa', () => {
    expect(typeDigit('', 'minutes', false, '3')).toEqual({ value: '03', pending: true, advance: false })
    expect(typeDigit('', 'minutes', false, '7')).toEqual({ value: '07', pending: false, advance: false })
    expect(typeDigit('03', 'minutes', true, '9')).toEqual({ value: '39', pending: false, advance: false })
    expect(typeDigit('05', 'minutes', true, '9')).toEqual({ value: '59', pending: false, advance: false })
  })
})

describe('stepSegment', () => {
  it('soma e subtrai 1 com volta e começa no mínimo ou no máximo quando a caixa está vazia', () => {
    expect(stepSegment('', 'hours', 1)).toBe('00')
    expect(stepSegment('', 'hours', -1)).toBe('23')
    expect(stepSegment('23', 'hours', 1)).toBe('00')
    expect(stepSegment('00', 'hours', -1)).toBe('23')
    expect(stepSegment('08', 'hours', 1)).toBe('09')

    expect(stepSegment('', 'minutes', -1)).toBe('59')
    expect(stepSegment('59', 'minutes', 1)).toBe('00')
    expect(stepSegment('05', 'minutes', -1)).toBe('04')
  })
})

describe('typeText', () => {
  it('aplica um texto colado carácter a carácter e o separador faz passar para os minutos', () => {
    expect(typeText(EMPTY, 'hours', false, '1930')).toEqual(
      expect.objectContaining({ segments: { hours: '19', minutes: '30' }, segment: 'minutes' }),
    )
    expect(typeText(EMPTY, 'hours', false, '9:30').segments).toEqual({ hours: '09', minutes: '30' })
    expect(typeText(EMPTY, 'hours', false, '17:39').segments).toEqual({ hours: '17', minutes: '39' })
    expect(typeText(EMPTY, 'hours', false, '1:30').segments).toEqual({ hours: '01', minutes: '30' })

    expect(typeText(EMPTY, 'hours', false, 'ab')).toEqual(expect.objectContaining({ segments: EMPTY, segment: 'hours' }))

    expect(typeText({ hours: '10', minutes: '' }, 'minutes', false, '45').segments).toEqual({ hours: '10', minutes: '45' })
  })
})
