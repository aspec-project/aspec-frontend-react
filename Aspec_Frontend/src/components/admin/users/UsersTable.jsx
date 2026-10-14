import UserStatusBadge from './UserStatusBadge'
import { formatFullDate, formatRegistrationDate, getDisplayName, getInitial } from '../../../utils/adminUsers'

const HEADERS = ['Nome / Negócio', 'Setor', 'Localidade', 'Email', 'Data registo', 'Estado']

/**
 * Tabela da lista de utilizadores do backoffice. Mostra os itens pela ordem recebida do servidor.
 *
 * @param {{users: object[], busy?: boolean}} props
 * @returns {JSX.Element}
 */
export default function UsersTable({ users, busy = false }) {
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
                        {user.role?.name === 'Admin' && (
                          <span className="rounded-full bg-[#8a7043]/10 px-2 py-0.5 text-xs font-semibold text-[#8a7043]">Admin</span>
                        )}
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
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
