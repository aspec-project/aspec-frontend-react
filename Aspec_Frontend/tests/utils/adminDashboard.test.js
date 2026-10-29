import { describe, expect, it } from 'vitest'
import { formatCount, getBusinessName, getDashboardStatCards } from '../../src/utils/adminDashboard'

function stats({
  activeTotal = 320,
  newThisMonth = 12,
  pendingTotal = 3,
  eventsThisMonth = 8,
  eventsThisWeek = 2,
  flagged = 2,
  newThisWeek = 5,
} = {}) {
  return {
    active_members: { total: activeTotal, new_this_month: newThisMonth },
    pending_applications: { total: pendingTotal },
    events: { this_month: eventsThisMonth, this_week: eventsThisWeek },
    reviews: { flagged, new_this_week: newThisWeek },
  }
}

function hintOf(cards, key) {
  return cards.find((card) => card.key === key).hint
}

describe('getDashboardStatCards', () => {
  it('devolve os quatro cartões por ordem com rótulo, número e linha de baixo', () => {
    expect(getDashboardStatCards(stats())).toEqual([
      { key: 'members', label: 'Membros Ativos', value: '320', hint: '+12 este mês' },
      { key: 'pending', label: 'Candidaturas Pendentes', value: '3', hint: 'Requerem ação' },
      { key: 'events', label: 'Eventos este mês', value: '8', hint: '2 esta semana' },
      { key: 'reviews', label: 'Avaliações para moderar', value: '2', hint: '5 novas esta semana' },
    ])
  })

  it('trata os zeros e os plurais das candidaturas e das avaliações novas', () => {
    const zeros = getDashboardStatCards(stats({
      activeTotal: 0, newThisMonth: 0, pendingTotal: 0, eventsThisMonth: 0, eventsThisWeek: 0, flagged: 0, newThisWeek: 0,
    }))

    expect(zeros.map((card) => card.value)).toEqual(['0', '0', '0', '0'])
    expect(zeros.map((card) => card.hint)).toEqual(['+0 este mês', 'Nenhuma por analisar', '0 esta semana', '0 novas esta semana'])

    expect(hintOf(getDashboardStatCards(stats({ pendingTotal: 1 })), 'pending')).toBe('Requer ação')
    expect(hintOf(getDashboardStatCards(stats({ newThisWeek: 1 })), 'reviews')).toBe('1 nova esta semana')
    expect(hintOf(getDashboardStatCards(stats({ newThisWeek: 2 })), 'reviews')).toBe('2 novas esta semana')
  })
})

describe('formatCount e getBusinessName', () => {
  it('formata os números em pt-PT e usa o mesmo formato no número e na linha de baixo', () => {
    expect(formatCount(0)).toBe('0')
    expect(formatCount(320)).toBe('320')
    expect(formatCount(1234)).toBe('1234')
    expect(formatCount(12345)).toMatch(/^12\s345$/)

    const members = getDashboardStatCards(stats({ activeTotal: 12345, newThisMonth: 12345 }))[0]
    expect(members.value).toBe(formatCount(12345))
    expect(members.hint).toBe(`+${formatCount(12345)} este mês`)
  })

  it('devolve o nome do negócio ou Empresa desconhecida', () => {
    expect(getBusinessName('Padaria')).toBe('Padaria')

    for (const value of [null, '', undefined]) {
      expect(getBusinessName(value)).toBe('Empresa desconhecida')
    }
  })
})
