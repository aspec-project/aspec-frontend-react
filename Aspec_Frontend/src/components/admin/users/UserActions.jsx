import { CircleCheck, CircleX, ShieldCheck, ShieldOff, TriangleAlert } from 'lucide-react'
import { USER_ACTION_LABELS, getDisplayName } from '../../../utils/adminUsers'

const ACTION_STYLES = {
  approve: { Icon: CircleCheck, className: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
  reject: { Icon: CircleX, className: 'bg-red-50 text-red-600 hover:bg-red-100' },
  block: { Icon: TriangleAlert, className: 'bg-amber-50 text-[#8a7043] hover:bg-amber-100' },
  unblock: { Icon: CircleCheck, className: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
  promote: { Icon: ShieldCheck, className: 'bg-slate-100 text-[#0d1f35] hover:bg-slate-200' },
  demote: { Icon: ShieldOff, className: 'bg-red-50 text-red-600 hover:bg-red-100' },
}

const LOCKED_CLASS = 'bg-gray-50 text-gray-300'

/**
 * Botões de ícone das ações disponíveis para um utilizador (linha da tabela ou cabeçalho do detalhe).
 * As ações que também estão em `locked` aparecem desativadas com a explicação (ex.: despromover a própria conta).
 * Sem nenhuma ação mostra "—" (só visual) e "Sem ações" para leitores de ecrã.
 *
 * @param {{
 *   user: object,
 *   actions: ('approve'|'reject'|'block'|'unblock'|'promote'|'demote')[],
 *   locked?: 'demote'[],
 *   disabled?: boolean,
 *   onAction: (action: string, user: object) => void,
 * }} props
 * @returns {JSX.Element}
 */
export default function UserActions({ user, actions, locked = [], disabled = false, onAction }) {
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
        if (locked.includes(action)) {
          return (
            <button
              key={action}
              type="button"
              aria-label={`${USER_ACTION_LABELS[action]} ${getDisplayName(user)} (indisponível na própria conta)`}
              title="Não pode despromover a sua própria conta"
              disabled
              className={`flex h-8 w-8 items-center justify-center rounded-md cursor-not-allowed ${LOCKED_CLASS}`}
            >
              <Icon size={16} aria-hidden="true" />
            </button>
          )
        }

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
