import EventListFilters from '../../components/admin/events/EventListFilters'
import EventPeriodTabs from '../../components/admin/events/EventPeriodTabs'
import EventsTable from '../../components/admin/events/EventsTable'
import Pagination from '../../components/ui/Pagination'
import useAdminEvents from '../../hooks/useAdminEvents'
import useEventFilterOptions from '../../hooks/useEventFilterOptions'
import { EVENT_PERIOD_TABS, NO_RESULTS_MESSAGE, formatResultsRange } from '../../utils/adminEvents'

const buttonClass = 'rounded-lg bg-[#0d1f35] px-4 py-2 text-sm font-semibold text-white hover:bg-[#183650] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Página Gestão de Eventos do backoffice: separadores Agendados/Passados com contagens, filtros de datas,
 * tipo e distrito, tabela com 6 eventos por página e paginação numerada.
 * A lógica vive nos hooks useAdminEvents (lista) e useEventFilterOptions (opções dos filtros).
 *
 * @returns {JSX.Element}
 */
export default function AdminEventsPage() {
  const {
    filters,
    selectPeriod,
    changeFilter,
    clearFilters,
    activeFiltersCount,
    dateRangeError,
    goToPage,
    retry,
    data,
    loading,
    error,
  } = useAdminEvents()
  const options = useEventFilterOptions()

  const tab = EVENT_PERIOD_TABS.find((item) => item.key === filters.period) ?? EVENT_PERIOD_TABS[0]
  const pagination = data?.pagination

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-[#0d1f35]">{tab.title}</h2>

      <EventPeriodTabs activePeriod={filters.period} counts={data?.counts} onSelect={selectPeriod} />

      <EventListFilters
        filters={filters}
        onChange={changeFilter}
        onClear={clearFilters}
        activeCount={activeFiltersCount}
        dateRangeError={dateRangeError}
        options={options}
      />

      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p>{error}</p>
          <button type="button" onClick={retry} className={`${buttonClass} mt-4`}>Tentar novamente</button>
        </div>
      ) : !data ? (
        loading && <p role="status" className="py-12 text-center text-gray-600">A carregar eventos...</p>
      ) : data.items.length === 0 ? (
        <p className="rounded-xl bg-white py-12 text-center text-gray-600 shadow-sm">
          {activeFiltersCount > 0 ? NO_RESULTS_MESSAGE : tab.emptyMessage}
        </p>
      ) : (
        <>
          <EventsTable events={data.items} period={filters.period} busy={loading} />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <p role="status" className="text-sm text-gray-500">{formatResultsRange(pagination, data.items.length)}</p>
            <Pagination
              currentPage={pagination.current_page}
              lastPage={pagination.last_page}
              onChange={goToPage}
              disabled={loading}
              label="Paginação de eventos"
            />
          </div>
        </>
      )}
    </div>
  )
}
