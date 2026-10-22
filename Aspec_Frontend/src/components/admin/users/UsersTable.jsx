import { Eye, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'
import UserActions from './UserActions'
import UserStatusBadge from './UserStatusBadge'
import { formatFullDate, formatRegistrationDate, getAvailableActions, getDisplayName, getInitial, getLockedActions } from '../../../utils/adminUsers'

const HEADERS = ['Nome / Negócio', 'Setor', 'Localidade', 'Email', 'Data registo', 'Estado', 'Ações']

/**
 * Badge "Admin" (fundo navy, ícone de escudo), usado na lista e no detalhe.
 *
 * @returns {JSX.Element}
 */
export function AdminBadge() {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[#0d1f35] px-2 py-0.5 text-xs font-semibold text-white">
      <Shield size={12} aria-hidden="true" />
      Admin
    </span>
  )
}

/**
 * Tabela da lista de utilizadores do backoffice. Mostra os itens pela ordem recebida do servidor,
 * com a ligação "Ver detalhe" (👁) em todas as linhas e as ações disponíveis para cada utilizador.
 * Os admins têm o badge "Admin" e a linha do admin com sessão iniciada é marcada com "(você)".
 *
 * @param {{
 *   users: object[],
 *   busy?: boolean,
 *   currentUserId?: string,
 *   onAction: (action: string, user: object) => void,
 *   actionsDisabled?: boolean,
 * }} props
 * @returns {JSX.Element}
 */
export default function UsersTable({ users, busy = false, currentUserId, onAction, actionsDisabled = false }) {
  return (
    <div aria-busy={busy} className={`overflow-x-auto rounded-xl bg-white shadow-sm transition-opacity ${busy ? 'opacity-60' : ''}`}>
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-gray-50">
          <tr>
            {HEADERS.map((header) => (
              <th key={header} scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {users.map((user) => {
            const profile = user.member_profile

            return (
              <tr key={user.id}>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0d1f35] text-sm font-semibold text-white">
                      {getInitial(user)}
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-semibold text-[#0d1f35]">
                        <span>{getDisplayName(user)}</span>
                        {user.role?.name === 'Admin' && <AdminBadge />}
                        {user.id === currentUserId && <span className="text-xs font-normal text-gray-400">(você)</span>}
                      </p>
                      {profile?.business_name && <p className="text-xs text-gray-500">{profile.business_name}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-gray-700">{profile?.sector?.name ?? '—'}</td>
                <td className="px-5 py-4 text-gray-700">{profile?.location?.name ?? '—'}</td>
                <td className="px-5 py-4 text-gray-500">{user.email}</td>
                <td className="px-5 py-4 text-gray-500">
                  <span title={formatFullDate(user.created_at)}>{formatRegistrationDate(user.created_at)}</span>
                </td>
                <td className="px-5 py-4"><UserStatusBadge user={user} /></td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/admin/utilizadores/${encodeURIComponent(user.id)}`}
                      aria-label={`Ver detalhe de ${getDisplayName(user)}`}
                      title="Ver detalhe"
                      className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79]"
                    >
                      <Eye size={16} aria-hidden="true" />
                    </Link>
                    <UserActions
                      user={user}
                      actions={getAvailableActions(user, currentUserId)}
                      locked={getLockedActions(user, currentUserId)}
                      disabled={actionsDisabled}
                      onAction={onAction}
                    />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
