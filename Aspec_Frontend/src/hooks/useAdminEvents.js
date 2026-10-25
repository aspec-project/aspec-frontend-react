import { useEffect, useState } from 'react'
import { normalizeError } from '../services/api'
import { getAdminEvents } from '../services/adminEvents'
import { countActiveFilters, getDateRangeError } from '../utils/adminEvents'

const EMPTY_FILTERS = { dateFrom: '', dateTo: '', categoryId: '', locationId: '' }

const initialFilters = { period: 'upcoming', ...EMPTY_FILTERS, page: 1 }

/**
 * Estado e pedidos da lista de eventos do backoffice: separador (agendados/passados), filtros de datas,
 * tipo e distrito, e paginação. Cada mudança faz um pedido novo e cancela o anterior; com um intervalo
 * de datas invertido não faz o pedido. Se a página pedida já não existir (ficou vazia, ex.: depois de apagar
 * o único evento da última página), passa para a última.
 *
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
export default function useAdminEvents() {
  const [filters, setFilters] = useState(initialFilters)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  const dateRangeError = getDateRangeError(filters.dateFrom, filters.dateTo)

  /**
   * Marca o início de um novo pedido e aplica a mudança aos filtros.
   *
   * @param {(current: typeof initialFilters) => typeof initialFilters} updater
   */
  const changeFilters = (updater) => {
    setLoading(true)
    setError('')
    setFilters(updater)
  }

  useEffect(() => {
    if (dateRangeError) return undefined

    const controller = new AbortController()

    getAdminEvents(filters, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        const lastPage = result?.pagination?.last_page
        if (result?.items?.length === 0 && filters.page > 1 && Number.isInteger(lastPage) && lastPage < filters.page) {
          setFilters((current) => ({ ...current, page: Math.max(1, lastPage) }))
          return
        }
        setData(result)
        setLoading(false)
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        setError(normalizeError(err).message)
        setLoading(false)
      })

    return () => controller.abort()
  }, [filters, retryKey, dateRangeError])

  return {
    filters,
    selectPeriod: (key) => changeFilters((current) => ({ ...current, period: key, page: 1 })),
    changeFilter: (name, value) => changeFilters((current) => ({ ...current, [name]: value, page: 1 })),
    clearFilters: () => changeFilters((current) => ({ ...current, ...EMPTY_FILTERS, page: 1 })),
    activeFiltersCount: countActiveFilters(filters),
    dateRangeError,
    goToPage: (page) => changeFilters((current) => ({ ...current, page })),
    retry: () => {
      setLoading(true)
      setError('')
      setRetryKey((value) => value + 1)
    },
    data,
    loading: loading && !dateRangeError,
    error,
  }
}
