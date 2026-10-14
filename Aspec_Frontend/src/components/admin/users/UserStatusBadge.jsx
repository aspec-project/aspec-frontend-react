import { getStatusBadge } from '../../../utils/adminUsers'

/**
 * Etiqueta colorida com o estado do utilizador (inclui o motivo, quando está inativo).
 *
 * @param {{user: object}} props
 * @returns {JSX.Element}
 */
export default function UserStatusBadge({ user }) {
  const badge = getStatusBadge(user)

  return (
    <span title={badge.title} className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
      {badge.label}
    </span>
  )
}
