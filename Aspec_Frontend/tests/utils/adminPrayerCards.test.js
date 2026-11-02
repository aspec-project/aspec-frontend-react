import { describe, expect, it } from 'vitest'
import {
  canDistributePrayerCards,
  formatCardsSummary,
  getCardsProgress,
  getPrayerCardsBadge,
  getPrayerCardsPhase,
} from '../../src/utils/adminPrayerCards'

const OPENS_AT = '2025-02-03T08:00:00+00:00'
const CLOSES_AT = '2025-02-03T23:59:59+00:00'

function status(overrides = {}) {
  return {
    window: { status: 'open', opens_at: OPENS_AT, closes_at: CLOSES_AT },
    registrations_count: 18,
    cards_count: 6,
    distributed_at: null,
    participants: [],
    ...overrides,
  }
}

describe('getPrayerCardsPhase', () => {
  it('com a data de distribuição preenchida está distribuído, mesmo antes do fim do prazo', () => {
    const distributed = status({ distributed_at: '2025-02-03T12:05:00+00:00' })

    expect(getPrayerCardsPhase(distributed, Date.parse('2025-02-03T12:10:00+00:00'))).toBe('distributed')
  })

  it('antes da abertura ainda não abriu e no instante exato da abertura já está aberto', () => {
    const opensAt = Date.parse(OPENS_AT)

    expect(getPrayerCardsPhase(status(), opensAt - 1)).toBe('not_open')
    expect(getPrayerCardsPhase(status(), opensAt)).toBe('open')
  })

  it('às 23:59:59 ainda está aberto e um segundo depois o prazo terminou', () => {
    const closesAt = Date.parse(CLOSES_AT)

    expect(getPrayerCardsPhase(status(), closesAt)).toBe('open')
    expect(getPrayerCardsPhase(status(), closesAt + 1000)).toBe('closed')
  })

  it('compara instantes na hora de verão de Lisboa', () => {
    const summer = status({
      window: { status: 'not_open', opens_at: '2027-06-10T19:30:00+01:00', closes_at: '2027-06-10T23:59:59+01:00' },
    })

    expect(getPrayerCardsPhase(summer, Date.UTC(2027, 5, 10, 18, 29))).toBe('not_open')
    expect(getPrayerCardsPhase(summer, Date.UTC(2027, 5, 10, 18, 30))).toBe('open')
  })
})

describe('getPrayerCardsBadge', () => {
  it('dá o texto exato de cada fase', () => {
    expect(getPrayerCardsBadge(status(), Date.parse('2025-01-20T12:00:00+00:00')).text).toBe('Abre a 3 Fev 2025')
    expect(getPrayerCardsBadge(status(), Date.parse('2025-02-03T12:00:00+00:00')).text).toBe('A aguardar o fim do prazo (23h59)')
    expect(getPrayerCardsBadge(status(), Date.parse('2025-02-04T00:30:00+00:00')).text).toBe('Prazo terminado · distribuição automática em breve')
    expect(getPrayerCardsBadge(status({ distributed_at: '2025-02-04T18:18:00+00:00' }), Date.parse('2025-02-05T09:00:00+00:00')).text).toBe('Distribuídos em 04/02 às 18:18')
  })

  it('mostra o dia e a hora de Lisboa da distribuição no verão, mesmo quando muda de dia', () => {
    const summer = status({
      window: { status: 'closed', opens_at: '2027-06-10T19:30:00+01:00', closes_at: '2027-06-10T23:59:59+01:00' },
      distributed_at: '2027-06-10T23:30:00+00:00',
    })

    expect(getPrayerCardsBadge(summer, Date.UTC(2027, 5, 11, 9)).text).toBe('Distribuídos em 11/06 às 00:30')
  })

  it('a fase distribuída e a de prazo terminado têm tons próprios', () => {
    const notOpen = getPrayerCardsBadge(status(), Date.parse('2025-01-20T12:00:00+00:00'))
    const open = getPrayerCardsBadge(status(), Date.parse('2025-02-03T12:00:00+00:00'))
    const closed = getPrayerCardsBadge(status(), Date.parse('2025-02-04T00:30:00+00:00'))
    const distributed = getPrayerCardsBadge(status({ distributed_at: '2025-02-04T18:18:00+00:00' }), Date.parse('2025-02-05T09:00:00+00:00'))

    expect(open.tone).toBe(notOpen.tone)
    expect(closed.tone).not.toBe(open.tone)
    expect(distributed.tone).not.toBe(open.tone)
    expect(distributed.tone).not.toBe(closed.tone)
  })
})

describe('canDistributePrayerCards', () => {
  it('só permite distribuir com o prazo aberto ou terminado e ainda sem distribuição', () => {
    expect(canDistributePrayerCards('open')).toBe(true)
    expect(canDistributePrayerCards('closed')).toBe(true)
    expect(canDistributePrayerCards('not_open')).toBe(false)
    expect(canDistributePrayerCards('distributed')).toBe(false)
  })
})

describe('getCardsProgress e formatCardsSummary', () => {
  it('calcula a percentagem arredondada, 0 sem inscritos e nunca mais de 100', () => {
    expect(getCardsProgress(6, 18)).toBe(33)
    expect(getCardsProgress(0, 0)).toBe(0)
    expect(getCardsProgress(20, 18)).toBe(100)
  })

  it('resume quantos inscritos preencheram o cartão', () => {
    expect(formatCardsSummary(6, 18)).toBe('6 de 18 inscritos preencheram o cartão.')
  })
})
