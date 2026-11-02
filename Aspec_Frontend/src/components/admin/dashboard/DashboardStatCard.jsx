import { CalendarDays, Clock, Star, Users } from 'lucide-react'

/** Ícone e cores do círculo de cada cartão, pela `key` do cartão. */
const CARD_ICONS = {
  members: { Icon: Users, className: 'bg-slate-100 text-[#0d1f35]' },
  pending: { Icon: Clock, className: 'bg-amber-50 text-[#8a7043]' },
  events: { Icon: CalendarDays, className: 'bg-emerald-50 text-emerald-700' },
  reviews: { Icon: Star, className: 'bg-rose-50 text-rose-600' },
}

/**
 * Cartão de um total do painel: rótulo em cima, ícone num círculo colorido à direita, número grande e linha
 * de baixo. É um item da lista "Resumo".
 *
 * @param {{card: {key: string, label: string, value: string, hint: string}}} props Cartão já formatado
 *   (ver getDashboardStatCards).
 * @returns {JSX.Element}
 */
export default function DashboardStatCard({ card }) {
  const icon = CARD_ICONS[card.key]

  return (
    <li className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-gray-600">{card.label}</p>
        {icon && (
          <span aria-hidden="true" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${icon.className}`}>
            <icon.Icon size={18} />
          </span>
        )}
      </div>
      <p className="mt-2 text-3xl font-bold text-[#0d1f35]">{card.value}</p>
      <p className="mt-1 text-sm text-gray-500">{card.hint}</p>
    </li>
  )
}
