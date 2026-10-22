import { Briefcase, Calendar, MapPin } from 'lucide-react'
import UserActions from './UserActions'
import UserStatusBadge from './UserStatusBadge'
import { AdminBadge } from './UsersTable'
import { safeMemberUrl } from '../../../services/members'
import { formatMonthYear, getDisplayName, getInitial } from '../../../utils/adminUsers'

/**
 * Identificação do membro na banda escura do detalhe: logótipo (ou inicial do negócio), nome como
 * título da página, estado, badge "Admin", nome do negócio, setor, núcleo, mês de registo e ações.
 * O logótipo é decorativo (alt vazio): o nome já está no título e o logótipo aparece em "Imagens".
 *
 * @param {{
 *   user: object,
 *   actions: ('approve'|'reject'|'block'|'unblock'|'promote'|'demote')[],
 *   locked?: 'demote'[],
 *   actionsDisabled?: boolean,
 *   onAction: (action: string, user: object) => void,
 * }} props
 * @returns {JSX.Element}
 */
export default function UserDetailHeader({ user, actions, locked = [], actionsDisabled = false, onAction }) {
  const profile = user.member_profile
  const logoUrl = safeMemberUrl(profile?.logo_url, true)
  const initial = profile?.business_name ? profile.business_name.charAt(0).toUpperCase() : getInitial(user)
  const registered = formatMonthYear(user.created_at)

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-center gap-4">
        {logoUrl ? (
          <img src={logoUrl} alt="" referrerPolicy="no-referrer" className="h-16 w-16 shrink-0 rounded-xl bg-white object-cover" />
        ) : (
          <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#8a7043] text-2xl font-semibold text-white">
            {initial}
          </span>
        )}
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="break-words text-2xl font-semibold text-white">{getDisplayName(user)}</h1>
            <UserStatusBadge user={user} />
            {user.role?.name === 'Admin' && <AdminBadge />}
          </div>
          {profile?.business_name && <p className="text-gray-300">{profile.business_name}</p>}
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400">
            {profile?.sector?.name && (
              <li className="flex items-center gap-1">
                <Briefcase size={14} aria-hidden="true" />
                {profile.sector.name}
              </li>
            )}
            {profile?.location?.name && (
              <li className="flex items-center gap-1">
                <MapPin size={14} aria-hidden="true" />
                {profile.location.name}
              </li>
            )}
            {registered && (
              <li className="flex items-center gap-1">
                <Calendar size={14} aria-hidden="true" />
                <span>Registo: {registered}</span>
              </li>
            )}
          </ul>
        </div>
      </div>
      {actions.length > 0 && (
        <UserActions user={user} actions={actions} locked={locked} disabled={actionsDisabled} onAction={onAction} />
      )}
    </div>
  )
}
