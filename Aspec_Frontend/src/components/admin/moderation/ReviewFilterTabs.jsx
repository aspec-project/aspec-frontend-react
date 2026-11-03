import { Flag } from 'lucide-react'
import { REVIEW_FILTERS } from '../../../utils/adminReviews'

/**
 * Chips de estado da moderação (Todas, Sinalizadas, Visíveis e Ocultas), com a contagem de cada um.
 * O chip ativo fica azul-escuro e tem `aria-pressed`.
 *
 * @param {{activeFilter: string, counts?: Record<string, number>|null, onSelect: (key: string) => void}} props
 * @returns {JSX.Element}
 */
export default function ReviewFilterTabs({ activeFilter, counts, onSelect }) {
  return (
    <div role="group" aria-label="Filtrar avaliações por estado" className="flex flex-wrap gap-3">
      {REVIEW_FILTERS.map((filter) => {
        const active = filter.key === activeFilter
        const count = counts?.[filter.key]

        return (
          <button
            key={filter.key}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(filter.key)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] ${active ? 'border-[#0d1f35] bg-[#0d1f35] text-white' : 'border-gray-200 bg-white text-[#0d1f35] hover:border-[#0d1f35]'}`}
          >
            {filter.key === 'flagged' && <Flag size={14} aria-hidden="true" />}
            {filter.label}
            {typeof count === 'number' && (
              <span className={`rounded-full px-2 py-0.5 text-xs ${active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
