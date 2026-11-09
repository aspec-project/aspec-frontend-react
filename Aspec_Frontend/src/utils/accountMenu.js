import { canActAsMember, hasMemberProfile } from './memberAccess'

/**
 * Devolve as secções do menu de conta do cabeçalho, pela ordem do design.
 * @param {object|null} user Utilizador autenticado da store.
 * @returns {Array<Array<{id: string, label: string, to: string, tone?: string}>>}
 */
export function getAccountMenuSections(user) {
  const sections = []
  const roleName = user?.role?.name
  const canUseMemberArea = ['Member', 'Admin'].includes(roleName) && user.account_status?.name === 'Active'

  if (canActAsMember(user)) {
    const profileId = user.member_profile?.id
    sections.push([
      {
        id: 'public-profile',
        label: 'O meu perfil',
        to: profileId ? `/membros/${encodeURIComponent(profileId)}` : '/membros',
      },
      { id: 'edit-profile', label: 'Editar perfil', to: '/perfil' },
      { id: 'prayer-cards', label: 'Cartões de oração', to: '/perfil/cartoes-oracao' },
    ])
  } else if (canUseMemberArea && !hasMemberProfile(user)) {
    sections.push([{ id: 'account', label: 'A minha conta', to: '/perfil/conta' }])
  }

  if (roleName === 'Admin') {
    sections.push([{ id: 'admin-dashboard', label: 'Dashboard admin', to: '/admin', tone: 'admin' }])
  }

  return sections
}
