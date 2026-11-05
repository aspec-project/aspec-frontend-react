import { describe, expect, it } from 'vitest'
import { getAccountMenuSections } from '../../src/utils/accountMenu'

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
const profileSection = [
  expect.objectContaining({ id: 'public-profile', to: `/membros/${memberProfileId}` }),
  expect.objectContaining({ id: 'edit-profile', to: '/perfil' }),
  expect.objectContaining({ id: 'prayer-cards', to: '/perfil/cartoes-oracao' }),
]
const ids = (sections) => sections.flat().map((item) => item.id)

describe('Secções do menu de conta', () => {
  it('o membro ativo vê o bloco de perfil sem o dashboard', () => {
    const sections = getAccountMenuSections(member)
    expect(sections).toEqual([profileSection])
    expect(ids(sections)).not.toContain('admin-dashboard')
  })

  it('o admin com perfil vê o bloco de perfil e depois o dashboard', () => {
    expect(getAccountMenuSections(adminWithProfile)).toEqual([
      profileSection,
      [expect.objectContaining({ id: 'admin-dashboard', to: '/admin', tone: 'admin' })],
    ])
  })

  it('o admin técnico vê a sua conta e o dashboard, sem itens de perfil', () => {
    const sections = getAccountMenuSections(technicalAdmin)
    expect(sections).toEqual([
      [expect.objectContaining({ id: 'account', to: '/perfil/conta' })],
      [expect.objectContaining({ id: 'admin-dashboard', to: '/admin' })],
    ])
    for (const id of ['public-profile', 'edit-profile', 'prayer-cards']) expect(ids(sections)).not.toContain(id)
  })

  it.each(['Pending', 'Approved', 'Inactive'])('o membro com conta %s não vê secções', (status) => {
    expect(getAccountMenuSections({ ...member, account_status: { name: status } })).toEqual([])
  })

  it('codifica o id do perfil e usa o diretório quando o perfil não tem id', () => {
    const encoded = getAccountMenuSections({ ...member, member_profile: { ...member.member_profile, id: 'a/b?c' } })
    expect(encoded[0][0]).toMatchObject({ id: 'public-profile', to: '/membros/a%2Fb%3Fc' })
    const withoutId = getAccountMenuSections({ ...member, member_profile: { name: 'Maria Santos' } })
    expect(withoutId[0][0]).toMatchObject({ id: 'public-profile', to: '/membros' })
  })
})
