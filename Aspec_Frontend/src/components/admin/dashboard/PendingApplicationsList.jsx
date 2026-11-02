import { CircleCheck, CircleX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DASHBOARD_TEXTS } from '../../../utils/adminDashboard'
import { USER_ACTION_LABELS } from '../../../utils/adminUsers'
import { formatRelativeDateTime } from '../../../utils/dateFormat'

const ROW_ACTIONS = [
  { action: 'approve', Icon: CircleCheck, className: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
  { action: 'reject', Icon: CircleX, className: 'bg-red-50 text-red-600 hover:bg-red-100' },
]

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
 * utilizador), "negócio · setor", data relativa em Lisboa e os botões redondos Aprovar (✓) e Recusar (✗).
 * O nome acessível dos botões é a ação + o nome mostrado na linha; o email nunca é mostrado.
 *
 * @param {{
 *   applications: {id: string, created_at: string, member_profile: object|null}[],
 *   onAction: (action: 'approve'|'reject', application: object, index: number) => void,
 *   actionsDisabled: boolean,
 * }} props onAction recebe a ação, a candidatura e a posição da linha; actionsDisabled desativa os botões
 *   enquanto há um pedido em curso.
 * @returns {JSX.Element}
 */
export default function PendingApplicationsList({ applications, onAction, actionsDisabled }) {
  return (
    <ul className="divide-y divide-gray-100">
      {applications.map((application, index) => {
        const name = application.member_profile?.name
        const hasName = typeof name === 'string' && name.trim() !== ''
        const displayName = hasName ? name : DASHBOARD_TEXTS.unknownName
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
                {displayName}
              </Link>
              {businessLine && <p className="truncate text-sm text-gray-500">{businessLine}</p>}
              <p className="text-xs text-gray-400">
                <time dateTime={application.created_at}>{formatRelativeDateTime(application.created_at)}</time>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {ROW_ACTIONS.map(({ action, Icon, className }) => (
                <button
                  key={action}
                  type="button"
                  data-action={action}
                  aria-label={`${USER_ACTION_LABELS[action]} ${displayName}`}
                  title={USER_ACTION_LABELS[action]}
                  disabled={actionsDisabled}
                  onClick={() => onAction(action, application, index)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${className} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <Icon size={18} aria-hidden="true" />
                </button>
              ))}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
