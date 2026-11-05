import { describe, expect, it } from 'vitest'
import { canActAsMember, canReportReviews, hasMemberProfile } from '../../src/utils/memberAccess'

const memberProfileId = '9d2f1c3a-5b7e-4a1c-9f2d-3e4b5a6c7d8e'
const member = {
  id: 'membro-1',
  email: 'maria@example.pt',
  role: { name: 'Member' },
  account_status: { name: 'Active' },
  member_profile: { id: memberProfileId, name: 'Maria Santos', business_name: 'Santos Lda' },
}
const adminWithProfile = {
  ...member,
  id: 'admin-1',
  role: { name: 'Admin' },
  member_profile: { ...member.member_profile, name: 'Admin' },
}
const technicalAdmin = {
  id: 'tecnico-1',
  email: 'tecnico@example.pt',
  phone: null,
  role: { name: 'Admin' },
  account_status: { name: 'Active' },
  member_profile: null,
}

describe('Acesso de membro', () => {
  it('só considera sem perfil quando a API envia member_profile null', () => {
    expect(hasMemberProfile(null)).toBe(false)
    expect(hasMemberProfile({ member_profile: null })).toBe(false)
    expect(hasMemberProfile({ member_profile: { id: memberProfileId } })).toBe(true)
    expect(hasMemberProfile({})).toBe(true)
  })

  it('membro e admin ativos com perfil podem agir como membro', () => {
    expect(canActAsMember(member)).toBe(true)
    expect(canActAsMember(adminWithProfile)).toBe(true)
  })

  it('o admin técnico sem perfil não age como membro', () => {
    expect(canActAsMember(technicalAdmin)).toBe(false)
  })

  it.each(['Pending', 'Approved', 'Inactive'])('membro e admin com perfil no estado %s não agem como membro', (status) => {
    expect(canActAsMember({ ...member, account_status: { name: status } })).toBe(false)
    expect(canActAsMember({ ...adminWithProfile, account_status: { name: status } })).toBe(false)
  })

  it('papel em falta ou utilizador nulo não agem como membro', () => {
    expect(canActAsMember({ ...member, role: undefined })).toBe(false)
    expect(canActAsMember(null)).toBe(false)
  })

  it('utilizador ativo sem a chave member_profile conta como tendo perfil', () => {
    const withoutKey = { ...member }
    delete withoutKey.member_profile
    expect(canActAsMember(withoutKey)).toBe(true)
  })

  it('só o membro ativo com perfil pode sinalizar avaliações', () => {
    expect(canReportReviews(member)).toBe(true)
    expect(canReportReviews(adminWithProfile)).toBe(false)
    expect(canReportReviews(technicalAdmin)).toBe(false)
    expect(canReportReviews({ ...member, account_status: { name: 'Inactive' } })).toBe(false)
  })
})
