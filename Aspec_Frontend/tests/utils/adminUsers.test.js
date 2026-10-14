import { describe, expect, it } from 'vitest'
import {
  USER_STATUS_TABS,
  formatFullDate,
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
