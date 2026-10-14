import { CircleCheck, CircleX, TriangleAlert } from 'lucide-react'
import { USER_ACTION_LABELS, getDisplayName } from '../../../utils/adminUsers'

const ACTION_STYLES = {
  approve: { Icon: CircleCheck, className: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
  reject: { Icon: CircleX, className: 'bg-red-50 text-red-600 hover:bg-red-100' },
  block: { Icon: TriangleAlert, className: 'bg-amber-50 text-[#8a7043] hover:bg-amber-100' },
  unblock: { Icon: CircleCheck, className: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
}

/**
 * Botões de ícone das ações disponíveis numa linha da tabela de utilizadores.
 * Sem ações mostra "—" (só visual) e "Sem ações" para leitores de ecrã.
 *
 * @param {{
 *   user: object,
 *   actions: ('approve'|'reject'|'block'|'unblock')[],
 *   disabled?: boolean,
 *   onAction: (action: string, user: object) => void,
 * }} props
 * @returns {JSX.Element}
 */
export default function UserActions({ user, actions, disabled = false, onAction }) {
  if (actions.length === 0) {
    return (
      <>
        <span aria-hidden="true" className="text-gray-400">—</span>
        <span className="sr-only">Sem ações</span>
      </>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {actions.map((action) => {
        const { Icon, className } = ACTION_STYLES[action]

        return (
          <button
            key={action}
            type="button"
            aria-label={`${USER_ACTION_LABELS[action]} ${getDisplayName(user)}`}
            title={USER_ACTION_LABELS[action]}
            disabled={disabled}
            onClick={() => onAction(action, user)}
            className={`flex h-8 w-8 items-center justify-center rounded-md disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
          >
            <Icon size={16} aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}
