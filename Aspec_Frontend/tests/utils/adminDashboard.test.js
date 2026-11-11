import { describe, expect, it } from 'vitest'
import { formatCount, getBusinessName, getDashboardStatCards } from '../../src/utils/adminDashboard'

function stats({
  activeTotal = 320,
  newThisMonth = 12,
  trial = 300,
  active = 20,
  admins = 0,
  pendingTotal = 3,
  eventsThisMonth = 8,
  eventsThisWeek = 2,
  flagged = 2,
  newThisWeek = 5,
  overdueTotal = 7,
  grace = 4,
  unpaid = 3,
  registrationsThisWeek = 23,
  eventsWithRegistrations = 2,
} = {}) {
  return {
    active_members: { total: activeTotal, new_this_month: newThisMonth, trial, active, admins },
    pending_applications: { total: pendingTotal },
    events: { this_month: eventsThisMonth, this_week: eventsThisWeek },
    reviews: { flagged, new_this_week: newThisWeek },
    overdue_payments: { total: overdueTotal, grace, unpaid },
    event_registrations: { this_week: registrationsThisWeek, events_with_registrations: eventsWithRegistrations },
  }
}

function cardOf(cards, key) {
  return cards.find((card) => card.key === key)
}

function hintOf(cards, key) {
  return cardOf(cards, key).hint
}

describe('getDashboardStatCards', () => {
  it('devolve os seis cartões por ordem com destino e nome acessível', () => {
    expect(getDashboardStatCards(stats())).toEqual([
      {
        key: 'members',
        label: 'Membros Ativos',
        value: '320',
        delta: '+12 este mês',
        hint: '300 em trial · 20 ativos',
        to: '/admin/utilizadores?estado=active',
        linkLabel: 'Membros Ativos: 320, +12 este mês (300 em trial, 20 ativos). Ver utilizadores ativos',
      },
      {
        key: 'pending',
        label: 'Candidaturas Pendentes',
        value: '3',
        hint: 'Requerem ação',
        to: '/admin/utilizadores?estado=pending',
        linkLabel: 'Candidaturas Pendentes: 3 (Requerem ação). Ver candidaturas pendentes',
      },
      {
        key: 'events',
        label: 'Eventos este mês',
        value: '8',
        hint: '2 esta semana',
        to: '/admin/eventos',
        linkLabel: 'Eventos este mês: 8 (2 esta semana). Ver eventos agendados',
      },
      {
        key: 'reviews',
        label: 'Avaliações para moderar',
        value: '2',
        hint: '5 novas esta semana',
        to: '/admin/moderacao?estado=flagged',
        linkLabel: 'Avaliações para moderar: 2 (5 novas esta semana). Ver avaliações sinalizadas',
      },
      {
        key: 'overdue',
        label: 'Quotas em atraso',
        value: '7',
        hint: '4 em carência · 3 inativas por falta de pagamento',
        to: '/admin/utilizadores?estado=grace',
        linkLabel: 'Quotas em atraso: 7 (4 em carência, 3 inativas por falta de pagamento). Ver utilizadores em carência',
      },
      {
        key: 'registrations',
        label: 'Inscrições esta semana',
        value: '23',
        hint: 'Em 2 eventos',
        to: null,
        linkLabel: null,
      },
    ])
  })

  it('trata os zeros e os plurais das candidaturas e das avaliações novas', () => {
    const zeros = getDashboardStatCards(stats({
      activeTotal: 0,
      newThisMonth: 0,
      trial: 0,
      active: 0,
      admins: 0,
      pendingTotal: 0,
      eventsThisMonth: 0,
      eventsThisWeek: 0,
      flagged: 0,
      newThisWeek: 0,
      overdueTotal: 0,
      grace: 0,
      unpaid: 0,
      registrationsThisWeek: 0,
      eventsWithRegistrations: 0,
    }))

    expect(zeros.map((card) => card.value)).toEqual(['0', '0', '0', '0', '0', '0'])
    expect(zeros.map((card) => card.hint)).toEqual([
      'Nenhum membro ativo',
      'Nenhuma por analisar',
      '0 esta semana',
      '0 novas esta semana',
      'Nenhuma em atraso',
      'Nenhum evento com inscrições',
    ])

    expect(hintOf(getDashboardStatCards(stats({ pendingTotal: 1 })), 'pending')).toBe('Requer ação')
    expect(hintOf(getDashboardStatCards(stats({ newThisWeek: 1 })), 'reviews')).toBe('1 nova esta semana')
    expect(hintOf(getDashboardStatCards(stats({ newThisWeek: 2 })), 'reviews')).toBe('2 novas esta semana')
  })

  it('cartão Membros Ativos mostra a divisão, o +N ao lado do número e inclui administradores', () => {
    const cards = getDashboardStatCards(stats({ activeTotal: 15, newThisMonth: 3, trial: 10, active: 5, admins: 2 }))

    expect(cardOf(cards, 'members')).toEqual({
      key: 'members',
      label: 'Membros Ativos',
      value: '15',
      delta: '+3 este mês',
      hint: '10 em trial · 5 ativos (inclui administradores)',
      to: '/admin/utilizadores?estado=active',
      linkLabel: 'Membros Ativos: 15, +3 este mês (10 em trial, 5 ativos (inclui administradores)). Ver utilizadores ativos',
    })
  })

  it('sem admins não diz que inclui administradores e usa o singular', () => {
    const members = (activeTotal, trial, active, admins) =>
      cardOf(getDashboardStatCards(stats({ activeTotal, trial, active, admins })), 'members')

    const plural = members(15, 10, 5, 0)
    const singular = members(2, 1, 1, 0)

    expect(plural.hint).toBe('10 em trial · 5 ativos')
    expect(singular.hint).toBe('1 em trial · 1 ativo')
    expect(members(1, 0, 1, 1).hint).toBe('0 em trial · 1 ativo (inclui administradores)')
    expect(plural.hint).not.toContain('administradores')
    expect(singular.hint).not.toContain('administradores')
  })

  it('sem membros ativos mostra Nenhum membro ativo e +0 este mês', () => {
    const members = cardOf(getDashboardStatCards(stats({
      activeTotal: 0,
      newThisMonth: 0,
      trial: 0,
      active: 0,
      admins: 0,
    })), 'members')

    expect(members.hint).toBe('Nenhum membro ativo')
    expect(members.delta).toBe('+0 este mês')
    expect(members.linkLabel).toBe('Membros Ativos: 0, +0 este mês (Nenhum membro ativo). Ver utilizadores ativos')
  })

  it('mostra as quotas em atraso com as duas partes, os plurais e Nenhuma em atraso', () => {
    const overdue = (overdueTotal, grace, unpaid) => cardOf(getDashboardStatCards(stats({ overdueTotal, grace, unpaid })), 'overdue')

    expect(overdue(7, 4, 3).value).toBe('7')
    expect(overdue(7, 4, 3).hint).toBe('4 em carência · 3 inativas por falta de pagamento')
    expect(overdue(2, 1, 1).hint).toBe('1 em carência · 1 inativa por falta de pagamento')
    expect(overdue(3, 0, 3).hint).toBe('0 em carência · 3 inativas por falta de pagamento')
    expect(overdue(1, 1, 0).hint).toBe('1 em carência · 0 inativas por falta de pagamento')
    expect(overdue(0, 0, 0).value).toBe('0')
    expect(overdue(0, 0, 0).hint).toBe('Nenhuma em atraso')

    const big = overdue(12345, 12345, 0)
    expect(big.value).toBe(formatCount(12345))
    expect(big.hint).toBe(`${formatCount(12345)} em carência · 0 inativas por falta de pagamento`)
  })

  it('mostra as inscrições da semana com o número de eventos e Nenhum evento com inscrições', () => {
    const registrations = (registrationsThisWeek, eventsWithRegistrations) =>
      cardOf(getDashboardStatCards(stats({ registrationsThisWeek, eventsWithRegistrations })), 'registrations')

    expect(registrations(23, 2).value).toBe('23')
    expect(registrations(23, 2).hint).toBe('Em 2 eventos')
    expect(registrations(1, 1).hint).toBe('Em 1 evento')
    expect(registrations(0, 0).value).toBe('0')
    expect(registrations(0, 0).hint).toBe('Nenhum evento com inscrições')
  })

  it('cada cartão tem o seu destino e um nome acessível que começa pelo rótulo, exceto as inscrições', () => {
    const cards = getDashboardStatCards(stats())

    expect(Object.fromEntries(cards.map((card) => [card.key, card.to]))).toEqual({
      members: '/admin/utilizadores?estado=active',
      pending: '/admin/utilizadores?estado=pending',
      events: '/admin/eventos',
      reviews: '/admin/moderacao?estado=flagged',
      overdue: '/admin/utilizadores?estado=grace',
      registrations: null,
    })

    const registrations = cardOf(cards, 'registrations')
    expect(registrations.to).toBeNull()
    expect(registrations.linkLabel).toBeNull()

    const overdue = cardOf(cards, 'overdue')
    expect(overdue.linkLabel).toBe('Quotas em atraso: 7 (4 em carência, 3 inativas por falta de pagamento). Ver utilizadores em carência')
    expect(overdue.linkLabel).not.toContain('·')

    for (const card of cards.filter((item) => item.key !== 'registrations')) {
      expect(card.linkLabel.startsWith(card.label)).toBe(true)
    }
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
    expect(members.delta).toBe(`+${formatCount(12345)} este mês`)

    const withTrial = getDashboardStatCards(stats({ activeTotal: 12365, trial: 12345, active: 20 }))[0]
    expect(withTrial.hint.startsWith(`${formatCount(12345)} em trial`)).toBe(true)
  })

  it('devolve o nome do negócio ou Empresa desconhecida', () => {
    expect(getBusinessName('Padaria')).toBe('Padaria')

    for (const value of [null, '', undefined]) {
      expect(getBusinessName(value)).toBe('Empresa desconhecida')
    }
  })
})
