import { Users } from 'lucide-react'
import { getOccupancy } from '../../../utils/adminEvents'

/**
 * Lotação de um evento: "inscritos / máx", percentagem e barra. Nos agendados fica vermelho a partir de 90%
 * ("quase esgotado"); nos passados (participação) a barra é sempre azul-marinho. A informação da cor também
 * vai em texto para leitores de ecrã.
 *
 * @param {{registrations: number, max: number, period: 'upcoming'|'past'}} props
 * @returns {JSX.Element}
 */
export default function EventOccupancy({ registrations, max, period }) {
  const occupancy = getOccupancy(registrations, max)

  if (!occupancy) {
    return <span className="text-gray-400">—</span>
  }

  const warning = period === 'upcoming' && occupancy.nearlyFull
  const barColor = period === 'past' ? '#0d1f35' : warning ? '#c62828' : '#2e7d32'
  const badgeClass = period === 'past'
    ? 'bg-gray-100 text-gray-700'
    : warning ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
  const description = `${registrations} inscritos de ${max} lugares (${occupancy.percent}%)${warning ? ', quase esgotado' : ''}`

  return (
    <div className="w-28">
      <span className="sr-only">{description}</span>
      <div aria-hidden="true">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-gray-400" />
          <span className="font-semibold text-[#0d1f35]">{`${registrations} / ${max}`}</span>
          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${badgeClass}`}>{`${occupancy.percent}%`}</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-200">
          <div className="h-1.5 rounded-full" style={{ width: `${Math.min(occupancy.percent, 100)}%`, backgroundColor: barColor }} />
        </div>
      </div>
    </div>
  )
}
