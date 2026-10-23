import { useRef } from 'react'
import { X } from 'lucide-react'

const fieldClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:bg-gray-100'
const labelClass = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500'

/**
 * Filtros da lista de eventos: datas De/Até, tipo de evento e distrito, e "Limpar (n)".
 * O erro de intervalo aparece junto ao "Até"; ao limpar, o foco passa para o "De".
 *
 * @param {{
 *   filters: {dateFrom: string, dateTo: string, categoryId: string, locationId: string},
 *   onChange: (name: 'dateFrom'|'dateTo'|'categoryId'|'locationId', value: string) => void,
 *   onClear: () => void,
 *   activeCount: number,
 *   dateRangeError: string,
 *   options: {categories: object[], locations: object[], loading: boolean, error: string, retry: () => void},
 * }} props
 * @returns {JSX.Element}
 */
export default function EventListFilters({ filters, onChange, onClear, activeCount, dateRangeError, options }) {
  const dateFromRef = useRef(null)
  const selectsDisabled = options.loading || Boolean(options.error)

  /**
   * Limpa os filtros e põe o foco no "De", porque o botão desaparece.
   */
  const handleClear = () => {
    onClear()
    dateFromRef.current?.focus()
  }

  return (
    <div role="group" aria-label="Filtros de eventos" className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start gap-4">
        <div className="w-40">
          <label htmlFor="event-filter-date-from" className={labelClass}>De</label>
          <input
            id="event-filter-date-from"
            ref={dateFromRef}
            type="date"
            value={filters.dateFrom}
            max={filters.dateTo || undefined}
            onChange={(event) => onChange('dateFrom', event.target.value)}
            className={fieldClass}
          />
        </div>

        <div className="w-40">
          <label htmlFor="event-filter-date-to" className={labelClass}>Até</label>
          <input
            id="event-filter-date-to"
            type="date"
            value={filters.dateTo}
            min={filters.dateFrom || undefined}
            aria-invalid={dateRangeError ? 'true' : undefined}
            aria-describedby={dateRangeError ? 'event-date-range-error' : undefined}
            onChange={(event) => onChange('dateTo', event.target.value)}
            className={`${fieldClass} ${dateRangeError ? 'border-red-400' : ''}`}
          />
        </div>

        <div className="min-w-[180px] flex-1">
          <label htmlFor="event-filter-category" className={labelClass}>Tipo de evento</label>
          <select
            id="event-filter-category"
            value={filters.categoryId}
            disabled={selectsDisabled}
            onChange={(event) => onChange('categoryId', event.target.value)}
            className={fieldClass}
          >
            <option value="">Todos os tipos</option>
            {options.categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>

        <div className="min-w-[180px] flex-1">
          <label htmlFor="event-filter-location" className={labelClass}>Distrito</label>
          <select
            id="event-filter-location"
            value={filters.locationId}
            disabled={selectsDisabled}
            onChange={(event) => onChange('locationId', event.target.value)}
            className={fieldClass}
          >
            <option value="">Todos os distritos</option>
            {options.locations.map((location) => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>
        </div>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="mt-5 flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-[#0d1f35] hover:border-[#0d1f35] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79]"
          >
            <X size={16} aria-hidden="true" />
            {`Limpar (${activeCount})`}
          </button>
        )}
      </div>

      {dateRangeError && (
        <p id="event-date-range-error" role="alert" className="mt-3 text-sm text-red-700">{dateRangeError}</p>
      )}

      {options.error && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-red-700">
          <p role="status">{options.error}</p>
          <button
            type="button"
            onClick={options.retry}
            className="font-semibold text-[#0d1f35] underline hover:text-[#8a7043] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79]"
          >
            Tentar carregar filtros novamente
          </button>
        </div>
      )}
    </div>
  )
}
