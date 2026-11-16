import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { normalizeError } from '../services/api'
import { getAdminEvents } from '../services/adminEvents'
import useSearchParamsUpdater from './useSearchParamsUpdater'
import { EVENT_PERIOD_TABS, countActiveFilters, getDateRangeError } from '../utils/adminEvents'
import { parseAllowedValue, parseDateOnly, parsePositiveInteger } from '../utils/queryParams'

const EMPTY_FILTERS = { dateFrom: '', dateTo: '', categoryId: '', locationId: '' }

const initialFilters = { period: 'upcoming', ...EMPTY_FILTERS, page: 1 }

const PERIODS = EVENT_PERIOD_TABS.map((tab) => tab.key)

/**
 * Lê e valida os filtros da lista no endereço (`period`, `date_from`, `date_to`, `category_id`, `location_id`,
 * `page`). Um tipo ou distrito que não exista nas opções carregadas é ignorado; enquanto as opções não chegam,
 * fica guardado e o pedido espera (`waiting`).
 *
 * @param {URLSearchParams} searchParams Parâmetros do endereço.
 * @param {{categories: object[], locations: object[], loading: boolean, error: string}} options Opções dos filtros.
 * @returns {{filters: typeof initialFilters, waiting: boolean}}
 */
function readAdminEventsQuery(searchParams, options) {
  let waiting = false
  const readOption = (name, list) => {
    const value = searchParams.get(name) ?? ''
    if (value === '' || options.error) return ''
    if (options.loading) {
      waiting = true
      return value
    }
    return list.some((item) => item.id === value) ? value : ''
  }

  return {
    filters: {
      period: parseAllowedValue(searchParams.get('period'), PERIODS, initialFilters.period),
      dateFrom: parseDateOnly(searchParams.get('date_from')),
      dateTo: parseDateOnly(searchParams.get('date_to')),
      categoryId: readOption('category_id', options.categories),
      locationId: readOption('location_id', options.locations),
      page: parsePositiveInteger(searchParams.get('page'), initialFilters.page),
    },
    waiting,
  }
}

/**
 * Converte os filtros em parâmetros do endereço, só com os valores diferentes do padrão.
 *
 * @param {typeof initialFilters} filters Filtros da lista.
 * @returns {URLSearchParams}
 */
function adminEventsSearchParams(filters) {
  const params = new URLSearchParams()

  if (filters.period !== initialFilters.period) params.set('period', filters.period)
  if (filters.dateFrom) params.set('date_from', filters.dateFrom)
  if (filters.dateTo) params.set('date_to', filters.dateTo)
  if (filters.categoryId) params.set('category_id', filters.categoryId)
  if (filters.locationId) params.set('location_id', filters.locationId)
  if (filters.page !== initialFilters.page) params.set('page', String(filters.page))

  return params
}

/**
 * Estado e pedidos da lista de eventos do backoffice: separador (agendados/passados), filtros de datas,
 * tipo e distrito, e paginação. Os filtros e a página ficam no endereço, para sobreviverem a recarregar a
 * página e ao botão Voltar; valores inválidos no endereço são ignorados. Cada mudança faz um pedido novo e
 * cancela o anterior; com um intervalo de datas invertido não faz o pedido. Se a página pedida já não existir
 * (ficou vazia, ex.: depois de apagar o único evento da última página), passa para a última.
 *
 * @param {{categories: object[], locations: object[], loading: boolean, error: string}} options Opções dos
 *   filtros (useEventFilterOptions), para validar o tipo e o distrito vindos do endereço.
 * @returns {{
 *   filters: {period: 'upcoming'|'past', dateFrom: string, dateTo: string, categoryId: string, locationId: string, page: number},
 *   selectPeriod: (key: 'upcoming'|'past') => void,
 *   changeFilter: (name: 'dateFrom'|'dateTo'|'categoryId'|'locationId', value: string) => void,
 *   clearFilters: () => void,
 *   activeFiltersCount: number,
 *   dateRangeError: string,
 *   goToPage: (page: number) => void,
 *   retry: () => void,
 *   data: {items: object[], pagination: object, counts: {upcoming: number, past: number}}|null,
 *   loading: boolean,
 *   error: string,
 * }}
 */
export default function useAdminEvents(options) {
  const [searchParams, setSearchParams] = useSearchParams()
  const updateSearchParams = useSearchParamsUpdater()
  const { filters, waiting } = readAdminEventsQuery(searchParams, options)
  const [data, setData] = useState(null)
  const [outcome, setOutcome] = useState({ key: '', error: '' })
  const [retryKey, setRetryKey] = useState(0)

  const dateRangeError = getDateRangeError(filters.dateFrom, filters.dateTo)
  const requestKey = JSON.stringify([filters, retryKey])
  /* Um resultado pertence ao pedido que o originou; até chegar, a lista está a carregar. */
  const loading = waiting || outcome.key !== requestKey

  /**
   * Aplica mudanças aos filtros guardados no endereço, partindo do endereço atual.
   *
   * @param {Partial<typeof initialFilters>} changes Mudanças a aplicar.
   */
  const updateFilters = (changes) => {
    setSearchParams((currentParams) => {
      const current = readAdminEventsQuery(currentParams, options).filters
      return adminEventsSearchParams({ ...current, ...changes })
    })
  }

  useEffect(() => {
    if (dateRangeError || waiting) return undefined

    const controller = new AbortController()
    const [requestFilters] = JSON.parse(requestKey)

    getAdminEvents(requestFilters, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        const lastPage = result?.pagination?.last_page
        if (result?.items?.length === 0 && requestFilters.page > 1 && Number.isInteger(lastPage) && lastPage < requestFilters.page) {
          updateSearchParams((currentParams) => {
            const params = new URLSearchParams(currentParams)
            if (lastPage > 1) params.set('page', String(lastPage))
            else params.delete('page')
            return params
          }, { replace: true })
          return
        }
        setData(result)
        setOutcome({ key: requestKey, error: '' })
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        setOutcome({ key: requestKey, error: normalizeError(err).message })
      })

    return () => controller.abort()
  }, [requestKey, dateRangeError, waiting, updateSearchParams])

  return {
    filters,
    selectPeriod: (key) => updateFilters({ period: key, page: 1 }),
    changeFilter: (name, value) => updateFilters({ [name]: value, page: 1 }),
    clearFilters: () => updateFilters({ ...EMPTY_FILTERS, page: 1 }),
    activeFiltersCount: countActiveFilters(filters),
    dateRangeError,
    goToPage: (page) => updateFilters({ page }),
    retry: () => setRetryKey((value) => value + 1),
    data,
    loading: loading && !dateRangeError,
    error: loading ? '' : outcome.error,
  }
}
