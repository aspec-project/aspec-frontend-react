import { useRef } from 'react'
import { X } from 'lucide-react'
import DatePicker from '../../ui/DatePicker'
import SelectMenu from '../../ui/SelectMenu'

/**
 * Filtros da lista de eventos no design v3: "Data de" e "Data até" (calendário DatePicker, "Qualquer data"
 * sem valor; cada uma limita os dias da outra), "Tipo de evento" e "Local" (listas SelectMenu) e o botão
 * "Limpar", sempre visível: desativado sem filtros e "Limpar (n)" com filtros. Ao limpar, o foco passa para a
 * "Data de", porque o botão fica desativado. O erro de intervalo continua a aparecer junto à "Data até".
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
   * Limpa os filtros e põe o foco na "Data de", porque o botão fica desativado.
   */
  const handleClear = () => {
    onClear()
    dateFromRef.current?.focus()
  }

  return (
    <div role="group" aria-label="Filtros de eventos" className="rounded-xl bg-white p-4 shadow-sm">
      <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
        <DatePicker
          ref={dateFromRef}
          id="event-filter-date-from"
          label="Data de"
          value={filters.dateFrom}
          max={filters.dateTo || undefined}
          placeholder="Qualquer data"
          onChange={(value) => onChange('dateFrom', value)}
        />

        <DatePicker
          id="event-filter-date-to"
          label="Data até"
          value={filters.dateTo}
          min={filters.dateFrom || undefined}
          placeholder="Qualquer data"
          invalid={Boolean(dateRangeError)}
          describedBy={dateRangeError ? 'event-date-range-error' : undefined}
          onChange={(value) => onChange('dateTo', value)}
        />

        <SelectMenu
          id="event-filter-category"
          label="Tipo de evento"
          value={filters.categoryId}
          disabled={selectsDisabled}
          options={[
            { value: '', label: 'Todos os tipos' },
            ...options.categories.map((category) => ({ value: category.id, label: category.name })),
          ]}
          onChange={(value) => onChange('categoryId', value)}
        />

        <SelectMenu
          id="event-filter-location"
          label="Local"
          value={filters.locationId}
          disabled={selectsDisabled}
          options={[
            { value: '', label: 'Todos os locais' },
            ...options.locations.map((location) => ({ value: location.id, label: location.name })),
          ]}
          onChange={(value) => onChange('locationId', value)}
        />

        <button
          type="button"
          onClick={handleClear}
          disabled={activeCount === 0}
          className="flex h-11 items-center justify-center gap-1 rounded-lg border border-gray-200 px-3 text-sm font-semibold text-[#0d1f35] hover:border-[#0d1f35] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:border-gray-100 disabled:text-gray-300 disabled:hover:border-gray-100"
        >
          <X size={16} aria-hidden="true" />
          {activeCount > 0 ? `Limpar (${activeCount})` : 'Limpar'}
        </button>
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
