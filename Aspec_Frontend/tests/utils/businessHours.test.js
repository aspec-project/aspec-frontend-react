import { describe, expect, it } from 'vitest'
import { groupBusinessHours } from '../../src/utils/businessHours'

const days = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo']
const hour = (day, open_time = '09:00', close_time = '18:00') => ({ week_day: days[day], open_time, close_time })
const labels = (hours) => groupBusinessHours(hours).map((group) => group.label)

describe('Agrupamento do horário público', () => {
  it('agrupa uma semana inteira com horários iguais mesmo recebida fora de ordem', () => {
    const hours = days.map((_, index) => hour(index)).reverse()
    expect(groupBusinessHours(hours)).toEqual([{ label: 'Segunda a Domingo', intervals: [hour(0)] }])
  })

  it('agrupa dias úteis e o fim de semana encerrado', () => {
    const hours = days.slice(0, 5).map((_, index) => hour(index))
    expect(groupBusinessHours(hours)).toEqual([
      { label: 'Segunda a Sexta', intervals: [hour(0)] },
      { label: 'Sábado a Domingo', intervals: [] },
    ])
  })

  it('representa toda a semana encerrada quando não existem horários completos', () => {
    expect(groupBusinessHours()).toEqual([{ label: 'Segunda a Domingo', intervals: [] }])
    expect(groupBusinessHours([
      hour(0, null, null), hour(2, '09:00', null), hour(4, null, '18:00'),
    ])).toEqual([{ label: 'Segunda a Domingo', intervals: [] }])
  })

  it('mantém dias alternados separados, incluindo os dias encerrados entre eles', () => {
    expect(labels([hour(0), hour(2), hour(4), hour(6)])).toEqual(days)
  })

  it('não junta domingo com segunda-feira', () => {
    expect(labels([hour(0), hour(6)])).toEqual(['Segunda-feira', 'Terça a Sábado', 'Domingo'])
  })

  it('agrupa vários intervalos em ordem diferente sem alterar a ordem apresentada', () => {
    const hours = [hour(0, '14:00', '18:00'), hour(0, '09:00', '12:00'), hour(1, '09:00', '12:00'), hour(1, '14:00', '18:00')]
    expect(groupBusinessHours(hours)).toEqual([
      { label: 'Segunda a Terça', intervals: hours.slice(0, 2) },
      { label: 'Quarta a Domingo', intervals: [] },
    ])
  })

  it.each([
    ['abertura diferente', [hour(1, '08:00', '12:00'), hour(1, '14:00', '18:00')]],
    ['fecho diferente', [hour(1, '09:00', '12:00'), hour(1, '14:00', '19:00')]],
    ['menos intervalos', [hour(1, '09:00', '12:00')]],
    ['intervalo duplicado', [hour(1, '09:00', '12:00'), hour(1, '14:00', '18:00'), hour(1, '14:00', '18:00')]],
  ])('separa dias com %s', (_, tuesday) => {
    const monday = [hour(0, '09:00', '12:00'), hour(0, '14:00', '18:00')]
    const groups = groupBusinessHours([...monday, ...tuesday])
    expect(groups).toEqual([
      { label: 'Segunda-feira', intervals: monday },
      { label: 'Terça-feira', intervals: tuesday },
      { label: 'Quarta a Domingo', intervals: [] },
    ])
  })

  it('preserva intervalos duplicados quando os dias têm a mesma multiplicidade', () => {
    const hours = [hour(0), hour(0), hour(1), hour(1)]
    expect(groupBusinessHours(hours)[0]).toEqual({ label: 'Segunda a Terça', intervals: hours.slice(0, 2) })
  })

  it('não altera os dados recebidos ao ordenar ou agrupar', () => {
    const hours = [hour(1), hour(0, '14:00', '18:00'), hour(0, '09:00', '12:00')]
    const original = structuredClone(hours)
    hours.forEach(Object.freeze)
    Object.freeze(hours)
    groupBusinessHours(hours)
    expect(hours).toEqual(original)
  })
})
