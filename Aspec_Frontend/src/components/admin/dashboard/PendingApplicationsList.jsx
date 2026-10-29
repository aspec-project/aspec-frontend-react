import { Link } from 'react-router-dom'
import { DASHBOARD_TEXTS } from '../../../utils/adminDashboard'
import { formatRelativeDateTime } from '../../../utils/dateFormat'

/**
 * Linha "negócio · setor", só com as partes que existem.
 *
 * @param {{business_name?: string|null, sector?: {name?: string}|null}|null} profile Perfil da candidatura.
 * @returns {string} Texto da linha, ou '' se não houver negócio nem setor.
 */
function getBusinessLine(profile) {
  return [profile?.business_name, profile?.sector?.name]
    .filter((part) => typeof part === 'string' && part !== '')
    .join(' · ')
}

/**
 * Lista das candidaturas pendentes do painel, pela ordem da API: inicial, nome (ligação ao detalhe do
 * utilizador), "negócio · setor" e data relativa em Lisboa. O email nunca é mostrado.
 *
 * @param {{applications: {id: string, created_at: string, member_profile: object|null}[]}} props
 * @returns {JSX.Element}
 */
export default function PendingApplicationsList({ applications }) {
  return (
    <ul className="divide-y divide-gray-100">
      {applications.map((application) => {
        const name = application.member_profile?.name
        const hasName = typeof name === 'string' && name.trim() !== ''
        const businessLine = getBusinessLine(application.member_profile)

        return (
          <li key={application.id} className="flex items-center gap-3 py-4">
            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0d1f35] text-sm font-semibold text-white">
              {hasName ? name.trim().charAt(0).toUpperCase() : '?'}
            </span>
            <div className="min-w-0 flex-1">
              <Link
                to={`/admin/utilizadores/${encodeURIComponent(application.id)}`}
                className="block truncate font-medium text-[#0d1f35] hover:underline focus-visible:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79]"
              >
                {hasName ? name : DASHBOARD_TEXTS.unknownName}
              </Link>
              {businessLine && <p className="truncate text-sm text-gray-500">{businessLine}</p>}
              <p className="text-xs text-gray-400">
                <time dateTime={application.created_at}>{formatRelativeDateTime(application.created_at)}</time>
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
