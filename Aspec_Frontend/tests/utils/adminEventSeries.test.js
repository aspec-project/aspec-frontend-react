import { describe, expect, it } from 'vitest'
import {
  FREQUENCY_OPTIONS,
  SERIES_MAX_SESSIONS,
  formatSeriesSessionLine,
  getSeriesConfirmDescription,
  getSeriesConfirmLabel,
  getSeriesEndLimits,
  getSeriesSessions,
  getSeriesSummary,
} from '../../src/utils/adminEventSeries'

const NO_SESSIONS = { dates: [], tooMany: false }

describe('getSeriesSessions', () => {
  it('gera as sessões semanais e quinzenais incluindo a data final, como o backend', () => {
    expect(getSeriesSessions('2027-01-04', '2027-01-18', 'weekly')).toEqual({
      dates: ['2027-01-04', '2027-01-11', '2027-01-18'],
      tooMany: false,
    })
    expect(getSeriesSessions('2027-01-01', '2027-01-29', 'biweekly')).toEqual({
      dates: ['2027-01-01', '2027-01-15', '2027-01-29'],
      tooMany: false,
    })
  })

  it('no mensal usa o último dia dos meses mais curtos e volta ao dia original', () => {
    expect(getSeriesSessions('2027-01-31', '2027-04-30', 'monthly')).toEqual({
      dates: ['2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30'],
      tooMany: false,
    })
  })

  it('aceita exatamente 52 sessões e assinala quando passariam de 52', () => {
    const exact = getSeriesSessions('2027-01-04', '2027-12-27', 'weekly')

    expect(SERIES_MAX_SESSIONS).toBe(52)
    expect(exact.dates).toHaveLength(52)
    expect(exact.dates.at(-1)).toBe('2027-12-27')
    expect(exact.tooMany).toBe(false)

    const over = getSeriesSessions('2027-01-04', '2028-01-03', 'weekly')

    expect(over.tooMany).toBe(true)
    expect(over.dates).toHaveLength(52)
  })

  it('com a data final igual à primeira gera uma só sessão', () => {
    expect(getSeriesSessions('2027-01-04', '2027-01-04', 'weekly')).toEqual({ dates: ['2027-01-04'], tooMany: false })
  })

  it('não gera sessões com a data final antes da primeira, frequência desconhecida ou datas inválidas', () => {
    expect(getSeriesSessions('2027-01-11', '2027-01-10', 'weekly')).toEqual(NO_SESSIONS)
    expect(getSeriesSessions('2027-01-04', '2027-01-18', 'daily')).toEqual(NO_SESSIONS)
    expect(getSeriesSessions('2027-01-04', '2027-01-18', '')).toEqual(NO_SESSIONS)
    expect(getSeriesSessions('2027-02-30', '2027-03-30', 'weekly')).toEqual(NO_SESSIONS)
    expect(getSeriesSessions('2027-01-04', '2027-02-30', 'weekly')).toEqual(NO_SESSIONS)
  })
})

describe('getSeriesEndLimits', () => {
  it('o mínimo é a primeira sessão e o máximo é a 52.ª ocorrência de cada frequência', () => {
    expect(getSeriesEndLimits('2027-01-04', 'weekly')).toEqual({ min: '2027-01-04', max: '2027-12-27' })
    expect(getSeriesEndLimits('2027-01-01', 'biweekly')).toEqual({ min: '2027-01-01', max: '2028-12-15' })
    expect(getSeriesEndLimits('2027-01-31', 'monthly')).toEqual({ min: '2027-01-31', max: '2031-04-30' })
  })

  it('sem frequência não há máximo e sem data não há limites', () => {
    expect(getSeriesEndLimits('2027-01-04', '')).toEqual({ min: '2027-01-04', max: undefined })
    expect(getSeriesEndLimits('', 'weekly')).toEqual({ min: undefined, max: undefined })
  })
})

describe('textos da série', () => {
  const THREE = ['2099-03-20', '2099-03-27', '2099-04-03']

  it('o resumo diz a frequência e o intervalo, ou a sessão única', () => {
    expect(getSeriesSummary('weekly', THREE)).toBe('Semanal, de 20 Mar 2099 a 3 Abr 2099.')
    expect(getSeriesSummary('weekly', ['2099-03-20'])).toBe('Semanal, com uma só sessão a 20 Mar 2099.')
  })

  it('a descrição da confirmação diz quantas sessões são criadas e que se editam à parte', () => {
    expect(getSeriesConfirmDescription('Grupo de Oração', THREE)).toBe('Vão ser criadas 3 sessões de «Grupo de Oração», de 20 Mar 2099 a 3 Abr 2099. Depois de criadas, cada sessão edita-se e apaga-se à parte.')
    expect(getSeriesConfirmDescription('Grupo de Oração', ['2099-03-20'])).toBe('Vai ser criada 1 sessão de «Grupo de Oração», a 20 Mar 2099. Depois de criada, edita-se e apaga-se como um evento.')
  })

  it('o botão da confirmação usa o singular com uma sessão', () => {
    expect(getSeriesConfirmLabel(1)).toBe('Criar 1 sessão')
    expect(getSeriesConfirmLabel(3)).toBe('Criar 3 sessões')
  })

  it('cada sessão mostra a data e o prazo calculado, ou só a data sem um número de dias válido', () => {
    expect(formatSeriesSessionLine('2099-03-20', '3')).toBe('20 Mar 2099 · inscrições até 17 Mar 2099, 23:59')
    expect(formatSeriesSessionLine('2099-03-20', '')).toBe('20 Mar 2099')
    expect(formatSeriesSessionLine('2099-03-20', '0')).toBe('20 Mar 2099')
  })

  it('as frequências são as do backend', () => {
    expect(FREQUENCY_OPTIONS).toEqual([
      { value: 'weekly', label: 'Semanal' },
      { value: 'biweekly', label: 'Quinzenal' },
      { value: 'monthly', label: 'Mensal' },
    ])
  })
})
