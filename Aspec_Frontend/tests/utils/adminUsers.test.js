import { describe, expect, it } from 'vitest'
import {
  USER_ACTION_LABELS,
  USER_STATUS_TABS,
  formatFullDate,
  getActionConfirmation,
  getAvailableActions,
  formatRegistrationDate,
  getDisplayName,
  getInitial,
  getStatusBadge,
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

  it('mostra as ações certas para cada estado e nenhuma para admins ou para a própria conta', () => {
    const cases = [
      [member('m1', 'Pending'), ['approve', 'reject']],
      [member('m2', 'Approved'), ['block']],
      [member('m3', 'Active'), ['block']],
      [member('m4', 'Inactive', 'blocked'), ['unblock']],
      [member('m5', 'Inactive', 'unpaid'), ['block']],
      [member('m6', 'Inactive', 'cancelled'), ['block']],
      [member('m7', 'Inactive', 'rejected'), []],
      [member('m8', 'Inactive', 'deleted'), []],
      [member('m9', 'Inactive', null), []],
      [member('m10', 'Desconhecido'), []],
      [{ ...member('admin-2', 'Active'), role: { name: 'Admin' } }, []],
      [member('admin-1', 'Active'), []],
    ]

    for (const [target, expected] of cases) {
      expect(getAvailableActions(target, 'admin-1')).toEqual(expected)
    }

    expect(USER_ACTION_LABELS).toEqual({ approve: 'Aprovar', reject: 'Recusar', block: 'Bloquear', unblock: 'Desbloquear' })
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
})
