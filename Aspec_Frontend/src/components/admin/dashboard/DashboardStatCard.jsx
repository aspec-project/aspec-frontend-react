import { CalendarDays, Clock, CreditCard, Star, TriangleAlert, UserPlus, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

/**
 * Aspeto de cada cartão pela `key`: cor da borda de cima, ícone, cores do quadrado do ícone, cor da linha de
 * baixo e, nas quotas em atraso, um pequeno aviso no canto do ícone.
 */
const CARD_STYLES = {
  members: { border: 'border-t-[#0d1f35]', Icon: Users, icon: 'border-slate-200 bg-slate-50 text-[#0d1f35]' },
  pending: { border: 'border-t-[#8a7043]', Icon: Clock, icon: 'border-amber-200 bg-amber-50 text-[#8a7043]' },
  events: { border: 'border-t-emerald-600', Icon: CalendarDays, icon: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  reviews: { border: 'border-t-rose-600', Icon: Star, icon: 'border-rose-200 bg-rose-50 text-rose-600', hint: 'text-rose-600' },
  overdue: { border: 'border-t-amber-600', Icon: CreditCard, icon: 'border-amber-300 bg-amber-100 text-amber-700', warning: true },
  registrations: { border: 'border-t-blue-700', Icon: UserPlus, icon: 'border-blue-200 bg-blue-50 text-blue-700' },
}

/**
 * Cartão de um total do painel, item da lista "Resumo": borda colorida em cima, rótulo pequeno em maiúsculas,
 * ícone num quadrado arredondado à direita, número grande com uma linha divisória por baixo e a linha de baixo.
 * Com `to`, o cartão inteiro é uma ligação com o nome acessível `linkLabel`; sem `to` (inscrições da semana)
 * é só informativo.
 *
 * @param {{card: {key: string, label: string, value: string, hint: string, to: string|null, linkLabel: string|null}}} props
 *   Cartão já formatado (ver getDashboardStatCards).
 * @returns {JSX.Element}
 */
export default function DashboardStatCard({ card }) {
  const style = CARD_STYLES[card.key] ?? {}
  const boxClass = `block h-full rounded-xl border-t-4 bg-white p-6 shadow-sm ${style.border ?? 'border-t-gray-200'}`

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">{card.label}</p>
        {style.Icon && (
          <span aria-hidden="true" className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${style.icon}`}>
            <style.Icon size={18} />
            {style.warning && (
              <TriangleAlert size={12} className="absolute -right-1 -bottom-1 rounded-full bg-white text-amber-600" />
            )}
          </span>
        )}
      </div>
      <p className="mt-2 border-b border-gray-100 pb-3 text-4xl font-bold text-[#0d1f35]">{card.value}</p>
      <p className={`mt-3 text-sm ${style.hint ?? 'text-gray-500'}`}>{card.hint}</p>
    </>
  )

  return (
    <li>
      {card.to ? (
        <Link
          to={card.to}
          aria-label={card.linkLabel}
          className={`${boxClass} transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79]`}
        >
          {content}
        </Link>
      ) : (
        <div className={boxClass}>{content}</div>
      )}
    </li>
  )
}
