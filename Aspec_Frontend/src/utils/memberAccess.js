/**
 * Indica se a conta tem perfil de membro. Só `null` (enviado pela API) conta como "sem perfil".
 * @param {object|null} user Utilizador autenticado da store.
 * @returns {boolean}
 */
export function hasMemberProfile(user) {
  return Boolean(user) && user.member_profile !== null
}

/**
 * Indica se o utilizador pode agir como membro (inscrever-se em eventos, avaliar):
 * membro ou admin, com conta ativa e perfil de membro.
 * @param {object|null} user Utilizador autenticado da store.
 * @returns {boolean}
 */
export function canActAsMember(user) {
  return ['Member', 'Admin'].includes(user?.role?.name)
    && user.account_status?.name === 'Active'
    && hasMemberProfile(user)
}

/**
 * Indica se o utilizador pode sinalizar avaliações (hoje o backend só aceita membros).
 * @param {object|null} user Utilizador autenticado da store.
 * @returns {boolean}
 */
export function canReportReviews(user) {
  return canActAsMember(user) && user.role.name === 'Member'
}
