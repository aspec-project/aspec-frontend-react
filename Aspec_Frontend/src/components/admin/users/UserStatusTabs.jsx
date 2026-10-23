import { USER_STATUS_TABS } from '../../../utils/adminUsers'

/**
 * Chips de estado da subscrição da lista de utilizadores, com a contagem de cada um.
 *
 * @param {{activeTab: string, counts?: Record<string, number>|null, onSelect: (key: string) => void}} props
 * @returns {JSX.Element}
 */
export default function UserStatusTabs({ activeTab, counts, onSelect }) {
  return (
    <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-3">
      {USER_STATUS_TABS.map((tab) => {
        const active = tab.key === activeTab
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
