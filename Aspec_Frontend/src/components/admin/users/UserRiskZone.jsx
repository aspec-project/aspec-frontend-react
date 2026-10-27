import { useId } from 'react'
import { ShieldAlert, Trash2 } from 'lucide-react'

const ADMIN_BLOCKED_TEXT = 'Não é possível anonimizar um administrador. Para isso, despromova-o primeiro.'

/**
 * Cartão "Zona de risco · RGPD" do detalhe do membro, com o botão "Anonimizar membro", separado
 * das ações do dia a dia. Num administrador o botão fica desativado com a explicação da regra
 * (o backend recusaria com 409).
 *
 * @param {{
 *   user: {role?: {name?: string}},
 *   disabled?: boolean,
 *   onAnonymize: (user: object) => void,
 * }} props
 * @returns {JSX.Element}
 */
export default function UserRiskZone({ user, disabled = false, onAnonymize }) {
  const titleId = useId()
  const reasonId = useId()
  const isAdmin = user?.role?.name === 'Admin'

  return (
    <section aria-labelledby={titleId} className="rounded-xl border border-red-200 bg-white p-6 shadow-sm">
      <h2 id={titleId} className="flex items-center gap-2 font-semibold text-red-600">
        <ShieldAlert size={18} aria-hidden="true" className="shrink-0" />
        Zona de risco · RGPD
      </h2>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2 text-sm">
          <p className="text-gray-600">Elimina de forma irreversível os dados pessoais do membro, a pedido do titular. Pede várias confirmações.</p>
          {isAdmin && <p id={reasonId} className="text-gray-500">{ADMIN_BLOCKED_TEXT}</p>}
        </div>
        <button
          type="button"
          disabled={disabled || isAdmin}
          aria-describedby={isAdmin ? reasonId : undefined}
          onClick={() => onAnonymize(user)}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 size={16} aria-hidden="true" />
          Anonimizar membro
        </button>
      </div>
    </section>
  )
}
