import { ShieldCheck, ShieldOff } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import {
  USER_ACTION_LABELS,
  USER_STATUS_TABS,
  formatFullDate,
  formatMonthYear,
  getActionConfirmation,
  getAvailableActions,
  getLockedActions,
  formatRegistrationDate,
  getDisplayName,
  getInitial,
  getRoleLabel,
  getStatusBadge,
  groupBusinessHours,
  isAnonymizationConfirmed,
} from '../../src/utils/adminUsers'

const user = (status, reason = null) => ({ account_status: { name: status }, inactive_reason: reason })

describe('utilitários da lista de utilizadores do backoffice', () => {
  it('dá a etiqueta certa a cada estado e motivo e define os separadores por ordem', () => {
    expect(getStatusBadge(user('Pending')).label).toBe('Pendente')
    expect(getStatusBadge(user('Approved'))).toMatchObject({ label: 'Aprovado', title: 'Aprovado, a aguardar pagamento' })
    expect(getStatusBadge(user('Active')).label).toBe('Ativo')
    expect(getStatusBadge(user('Inactive', 'blocked')).label).toBe('Bloqueado')
    expect(getStatusBadge(user('Inactive', 'rejected')).label).toBe('Recusado')
    expect(getStatusBadge(user('Inactive', 'unpaid')).label).toBe('Pagamento em falta')
    expect(getStatusBadge(user('Inactive', 'cancelled')).label).toBe('Cancelado')
    expect(getStatusBadge(user('Inactive', null)).label).toBe('Inativo')
    expect(getStatusBadge(user('Inactive', 'deleted')).label).toBe('Inativo')

    expect(USER_STATUS_TABS.map((tab) => tab.label)).toEqual(['Todos', 'Ativos', 'Pendentes', 'Aprovados', 'Bloqueados', 'Inativos'])
  })

  it('formata a data de registo como Hoje, Ontem ou mês e ano, e a data completa', () => {
    const now = new Date(2026, 9, 14, 15)

    expect(formatRegistrationDate(new Date(2026, 9, 14, 8).toISOString(), now)).toBe('Hoje')
    expect(formatRegistrationDate(new Date(2026, 9, 13, 23).toISOString(), now)).toBe('Ontem')
    expect(formatRegistrationDate('2024-01-15T09:30:00+00:00', now)).toBe('Jan 2024')
    expect(formatRegistrationDate('2023-11-02T14:00:00+00:00', now)).toBe('Nov 2023')
    expect(formatRegistrationDate(null, now)).toBe('—')
    expect(formatRegistrationDate('lixo', now)).toBe('—')
    expect(formatFullDate('2024-01-15T09:30:00+00:00')).toBe('15/01/2024')
  })

  it('formata só o mês e o ano', () => {
    expect(formatMonthYear('2024-01-15T09:30:00+00:00')).toBe('Jan 2024')
    expect(formatMonthYear('2023-11-02T14:00:00+00:00')).toBe('Nov 2023')
    expect(formatMonthYear(null)).toBe('')
    expect(formatMonthYear('lixo')).toBe('')
  })

  it('usa o estado da subscrição no badge quando a API o envia', () => {
    const withState = (value, label) => ({ ...user('Active'), subscription_state: { value, label } })

    expect(getStatusBadge(withState('trial', 'Em trial'))).toEqual({ label: 'Em trial', className: 'bg-indigo-50 text-indigo-800' })
    expect(getStatusBadge(withState('grace', 'Em carência'))).toEqual({ label: 'Em carência', className: 'bg-orange-50 text-orange-800' })
    expect(getStatusBadge(withState('lapsed', 'Subscrição caída'))).toEqual({ label: 'Subscrição caída', className: 'bg-slate-100 text-slate-700' })
    expect(getStatusBadge(withState('exempt', 'Isento'))).toEqual({ label: 'Isento', className: 'bg-amber-50 text-[#8a7043]' })
    expect(getStatusBadge(withState('novo', 'Novo'))).toEqual({ label: 'Novo', className: 'bg-slate-100 text-slate-700' })

    expect(getStatusBadge({ ...user('Approved'), subscription_state: null }))
      .toEqual({ label: 'Aprovado', className: 'bg-sky-50 text-sky-800', title: 'Aprovado, a aguardar pagamento' })
    expect(getStatusBadge({ ...user('Pending'), subscription_state: { value: 'pending', label: '' } }).label).toBe('Pendente')
    expect(getStatusBadge(user('Inactive', 'rejected')).label).toBe('Recusado')
  })

  it('usa o nome profissional ou, sem perfil, o email como nome e inicial', () => {
    const withProfile = { email: 'manuel@x.pt', member_profile: { name: 'manuel Silva' } }
    const withoutProfile = { email: 'jose@x.pt', member_profile: null }

    expect(getDisplayName(withProfile)).toBe('manuel Silva')
    expect(getInitial(withProfile)).toBe('M')
    expect(getDisplayName(withoutProfile)).toBe('jose@x.pt')
    expect(getInitial(withoutProfile)).toBe('J')
  })
})

describe('ações disponíveis e textos de confirmação', () => {
  const member = (id, status, reason = null) => ({ id, role: { name: 'Member' }, account_status: { name: status }, inactive_reason: reason })

  it('mostra as ações certas para cada estado, promover em ativos e despromover em admins', () => {
    const admin = (id, state = 'active') => ({ ...member(id, 'Active'), role: { name: 'Admin' }, subscription_state: { value: state, label: 'X' } })
    const cases = [
      [member('m1', 'Pending'), ['approve', 'reject']],
      [member('m2', 'Approved'), ['block']],
      [member('m3', 'Active'), ['block', 'promote']],
      [member('m4', 'Inactive', 'blocked'), ['unblock']],
      [member('m5', 'Inactive', 'unpaid'), ['block']],
      [member('m6', 'Inactive', 'cancelled'), ['block']],
      [member('m7', 'Inactive', 'rejected'), []],
      [member('m8', 'Inactive', 'deleted'), []],
      [member('m9', 'Inactive', null), []],
      [member('m10', 'Desconhecido'), []],
      [admin('admin-2'), ['demote']],
      [{ ...member('admin-3', 'Active'), role: { name: 'Admin' } }, ['demote']],
      [admin('admin-1'), ['demote']],
      [admin('admin-tec', 'exempt'), []],
      [member('admin-1', 'Active'), []],
    ]

    for (const [target, expected] of cases) {
      expect(getAvailableActions(target, 'admin-1')).toEqual(expected)
    }

    expect(getLockedActions(admin('admin-1'), 'admin-1')).toEqual(['demote'])
    expect(getLockedActions(admin('admin-2'), 'admin-1')).toEqual([])
    expect(getLockedActions(member('m3', 'Active'), 'admin-1')).toEqual([])
    expect(getLockedActions(member('admin-1', 'Active'), 'admin-1')).toEqual([])
    expect(getLockedActions(admin('admin-1', 'exempt'), 'admin-1')).toEqual([])
    expect(getLockedActions(admin('admin-tec', 'exempt'), 'admin-1')).toEqual([])

    expect(USER_ACTION_LABELS).toEqual({
      approve: 'Aprovar',
      reject: 'Recusar',
      block: 'Bloquear',
      unblock: 'Desbloquear',
      promote: 'Promover a administrador',
      demote: 'Despromover',
      paymentLink: 'Enviar email',
      anonymize: 'Anonimizar',
    })
  })

  it('explica o efeito de cada ação com o nome e o email do membro', () => {
    const maria = { email: 'maria@santos.pt', member_profile: { name: 'Maria Santos' } }
    const who = 'Maria Santos (maria@santos.pt)'

    expect(getActionConfirmation('approve', maria)).toEqual({
      title: 'Aprovar candidatura',
      description: `Aprovar a candidatura de ${who}? A conta passa a Aprovada e é enviado um email com o link para pagar a quota. Só fica ativa depois do pagamento.`,
      confirmLabel: 'Aprovar',
      tone: 'primary',
    })
    expect(getActionConfirmation('reject', maria)).toEqual({
      title: 'Recusar candidatura',
      description: `Recusar a candidatura de ${who}? A conta fica inativa e não é enviado nenhum email.`,
      confirmLabel: 'Recusar',
      tone: 'danger',
    })
    expect(getActionConfirmation('block', maria)).toEqual({
      title: 'Bloquear membro',
      description: `Bloquear ${who}? A conta fica inativa, as sessões abertas terminam e a subscrição ou o pagamento pendente são cancelados. Não é enviado nenhum email.`,
      confirmLabel: 'Bloquear',
      tone: 'danger',
    })
    expect(getActionConfirmation('unblock', maria)).toEqual({
      title: 'Desbloquear membro',
      description: `Desbloquear ${who}? A conta não fica logo ativa: é enviado um email com o link para pagar a quota e só fica ativa depois do pagamento.`,
      confirmLabel: 'Desbloquear',
      tone: 'primary',
    })

    const { description } = getActionConfirmation('block', { email: 'x@y.pt', member_profile: null })
    expect(description).toContain('x@y.pt?')
    expect(description).not.toContain('(')
  })

  it('explica a promoção a administrador com o nome e o email do membro', () => {
    const maria = { email: 'maria@santos.pt', member_profile: { name: 'Maria Santos' } }

    expect(getActionConfirmation('promote', maria)).toEqual({
      title: 'Promover a administrador',
      description: 'Maria Santos (maria@santos.pt) passa a ter acesso total ao backoffice: aprovar e bloquear membros, gerir eventos, moderar avaliações e promover ou despromover outros administradores.',
      confirmLabel: 'Promover a administrador',
      tone: 'primary',
      icon: ShieldCheck,
    })
  })

  it('explica a despromoção com contagem decrescente e o número de administradores', () => {
    const helena = { id: 'admin-2', email: 'helena@brandao.pt', role: { name: 'Admin' }, member_profile: { name: 'Helena Brandão' } }
    const fallbackNote = 'A plataforma tem sempre de ter pelo menos um administrador.'

    expect(getActionConfirmation('demote', helena, { adminsCount: 2 })).toEqual({
      title: 'Despromover administrador',
      description: 'Helena Brandão deixa de ter acesso ao backoffice, à gestão de utilizadores, eventos e moderação. Continua a ser membro e só então pode ser gerido(a) como tal. Esta é uma decisão importante: só outro administrador a poderá reverter, promovendo-o(a) de novo.',
      confirmLabel: 'Despromover',
      tone: 'danger',
      icon: ShieldOff,
      confirmDelay: 2,
      note: 'Existem 2 administradores. Depois desta ação ficam 1. A plataforma tem sempre de ter pelo menos um.',
    })
    expect(getActionConfirmation('demote', helena, { adminsCount: 5 }).note)
      .toBe('Existem 5 administradores. Depois desta ação ficam 4. A plataforma tem sempre de ter pelo menos um.')
    expect(getActionConfirmation('demote', helena).note).toBe(fallbackNote)

    for (const adminsCount of [1, '2', null, Number.NaN]) {
      expect(getActionConfirmation('demote', helena, { adminsCount }).note).toBe(fallbackNote)
    }
  })
})

describe('envio do email de pagamento e anonimização', () => {
  const member = (id, status, reason, state) => ({
    id,
    role: { name: 'Member' },
    account_status: { name: status },
    inactive_reason: reason,
    ...(state ? { subscription_state: { value: state, label: 'X' } } : {}),
  })
  const admin = (id, state) => ({ ...member(id, 'Active', null, state), role: { name: 'Admin' } })
  const sara = { email: 'sara@floresdovale.pt', member_profile: { name: 'Sara Antunes' } }
  const withState = (value) => ({ ...sara, subscription_state: { value, label: 'X' } })

  it('só aceita a palavra ANONIMIZAR em maiúsculas, ignorando os espaços nas pontas', () => {
    expect(isAnonymizationConfirmed('ANONIMIZAR')).toBe(true)
    expect(isAnonymizationConfirmed('  ANONIMIZAR ')).toBe(true)

    for (const value of ['anonimizar', 'Anonimizar', 'ANONIMIZA', 'ANONIMIZAR!', '', null, undefined]) {
      expect(isAnonymizationConfirmed(value)).toBe(false)
    }
  })

  it('mostra Enviar email primeiro nos membros por ativar, com subscrição caída ou em carência', () => {
    const cases = [
      [member('m1', 'Approved', null, 'awaiting_activation'), ['paymentLink', 'block']],
      [member('m2', 'Inactive', 'unpaid', 'lapsed'), ['paymentLink', 'block']],
      [member('m3', 'Inactive', 'cancelled', 'lapsed'), ['paymentLink', 'block']],
      [member('m4', 'Active', null, 'grace'), ['paymentLink', 'block', 'promote']],
      [member('m5', 'Active', null, 'active'), ['block', 'promote']],
      [member('m6', 'Active', null, 'trial'), ['block', 'promote']],
      [member('m7', 'Pending', null, 'pending'), ['approve', 'reject']],
      [member('m8', 'Inactive', 'blocked', 'blocked'), ['unblock']],
    ]

    for (const [target, expected] of cases) {
      expect(getAvailableActions(target, 'admin-1')).toEqual(expected)
    }
  })

  it('sem o estado da subscrição não mostra Enviar email', () => {
    expect(getAvailableActions(member('m1', 'Approved', null), 'admin-1')).toEqual(['block'])
    expect(getAvailableActions(member('m2', 'Inactive', 'unpaid'), 'admin-1')).toEqual(['block'])
  })

  it('mostra Enviar email antes de despromover a admins em carência, mas nunca na própria conta nem ao isento', () => {
    expect(getAvailableActions(admin('admin-2', 'grace'), 'admin-1')).toEqual(['paymentLink', 'demote'])
    expect(getAvailableActions(admin('admin-2', 'active'), 'admin-1')).toEqual(['demote'])
    expect(getAvailableActions(admin('admin-tec', 'exempt'), 'admin-1')).toEqual([])
    expect(getAvailableActions(member('admin-1', 'Active', null, 'grace'), 'admin-1')).not.toContain('paymentLink')
    expect(getAvailableActions(admin('admin-1', 'grace'), 'admin-1')).not.toContain('paymentLink')
  })

  it('explica o email de reativação com o email pessoal e o nome do membro', () => {
    expect(getActionConfirmation('paymentLink', withState('lapsed'))).toEqual({
      title: 'Enviar email de reativação',
      description: 'Será enviado para sara@floresdovale.pt um email com uma ligação para Sara Antunes atualizar o método de pagamento e reativar a subscrição.',
      confirmLabel: 'Enviar email',
      tone: 'primary',
      icon: expect.anything(),
      showClose: true,
    })
  })

  it('explica o reenvio do email de ativação a quem está por ativar', () => {
    const confirmation = getActionConfirmation('paymentLink', withState('awaiting_activation'))

    expect(confirmation).toMatchObject({ title: 'Reenviar email de ativação', confirmLabel: 'Enviar email', tone: 'primary', showClose: true })
    expect(confirmation.description).toBe('Será enviado para sara@floresdovale.pt um email com uma ligação para Sara Antunes concluir a ativação da conta e pagar a quota.')
  })

  it('explica o lembrete de pagamento a quem está em carência', () => {
    const confirmation = getActionConfirmation('paymentLink', withState('grace'))

    expect(confirmation).toMatchObject({ title: 'Enviar lembrete de pagamento', confirmLabel: 'Enviar email', tone: 'primary', showClose: true })
    expect(confirmation.description).toBe('Será enviado para sara@floresdovale.pt um lembrete para Sara Antunes atualizar o cartão e pagar a quota antes do fim do período de carência.')
  })

  it('chama Enviar email à ação de pagamento', () => {
    expect(USER_ACTION_LABELS.paymentLink).toBe('Enviar email')
  })
})

describe('detalhe do membro', () => {
  const hour = (week_day_id, open_time, close_time) => ({ week_day_id, open_time, close_time })

  it('junta os dias consecutivos com o mesmo horário e os dias sem horas como Encerrado', () => {
    const weekdays = [1, 2, 3, 4, 5].map((day) => hour(day, '09:00', '18:00'))

    expect(groupBusinessHours(weekdays)).toEqual([
      { label: 'Segunda — Sexta', value: '09:00 — 18:00', closed: false },
      { label: 'Sábado — Domingo', value: 'Encerrado', closed: true },
    ])
  })

  it('não junta dias com horários diferentes nem dias não consecutivos', () => {
    const hours = [hour(1, '09:00', '18:00'), hour(2, '09:00', '13:00'), hour(3, '09:00', '18:00')]

    expect(groupBusinessHours(hours)).toEqual([
      { label: 'Segunda', value: '09:00 — 18:00', closed: false },
      { label: 'Terça', value: '09:00 — 13:00', closed: false },
      { label: 'Quarta', value: '09:00 — 18:00', closed: false },
      { label: 'Quinta — Domingo', value: 'Encerrado', closed: true },
    ])
  })

  it('sem horário devolve uma lista vazia e trata dias inválidos ou sem horas como fechados', () => {
    expect(groupBusinessHours()).toEqual([])
    expect(groupBusinessHours([])).toEqual([])

    const hours = [
      hour(0, '09:00', '18:00'),
      hour(8, '09:00', '18:00'),
      { week_day_id: 2, open_time: '09:00' },
      hour(4, '10:00', '12:00'),
    ]

    expect(groupBusinessHours(hours)).toEqual([
      { label: 'Segunda — Quarta', value: 'Encerrado', closed: true },
      { label: 'Quinta', value: '10:00 — 12:00', closed: false },
      { label: 'Sexta — Domingo', value: 'Encerrado', closed: true },
    ])
  })

  it('mostra o papel em português', () => {
    expect(getRoleLabel({ role: { name: 'Admin' } })).toBe('Administrador')
    expect(getRoleLabel({ role: { name: 'Member' } })).toBe('Membro')
    expect(getRoleLabel({})).toBe('Não indicado')
  })
})
