import { EVENT_PERIOD_TABS } from '../../../utils/adminEvents'

/**
 * Separadores Agendados / Passados da lista de eventos, com a contagem de cada um (já com os filtros aplicados).
 *
 * @param {{activePeriod: 'upcoming'|'past', counts?: {upcoming?: number, past?: number}|null, onSelect: (key: 'upcoming'|'past') => void}} props
 * @returns {JSX.Element}
 */
export default function EventPeriodTabs({ activePeriod, counts, onSelect }) {
  return (
    <div role="group" aria-label="Período dos eventos" className="flex flex-wrap gap-3">
      {EVENT_PERIOD_TABS.map((tab) => {
        const active = tab.key === activePeriod
        const count = counts?.[tab.key]

        return (
          <button
            key={tab.key}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(tab.key)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] ${active ? 'border-[#0d1f35] bg-[#0d1f35] text-white' : 'border-gray-200 bg-white text-[#0d1f35] hover:border-[#0d1f35]'}`}
          >
            {tab.label}
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
