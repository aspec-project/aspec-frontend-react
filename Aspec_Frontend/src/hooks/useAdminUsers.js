import { useEffect, useState } from 'react'
import { normalizeError } from '../services/api'
import { getAdminUsers } from '../services/adminUsers'
import { USER_STATUS_TABS } from '../utils/adminUsers'

const SEARCH_DEBOUNCE_MS = 300

const initialFilters = { tab: 'all', search: '', includeAdmins: false, page: 1 }

/**
 * Estado e pedidos da lista de utilizadores do backoffice: separador, pesquisa com debounce,
 * "Mostrar admins" e paginação. Cancela o pedido anterior sempre que os filtros mudam.
 *
 * @returns {{
 *   filters: {tab: string, search: string, includeAdmins: boolean, page: number},
 *   searchInput: string,
 *   setSearchInput: (value: string) => void,
 *   selectTab: (key: string) => void,
 *   toggleIncludeAdmins: () => void,
 *   goToPage: (page: number) => void,
 *   retry: () => void,
 *   data: {items: object[], pagination: object, counts: object}|null,
 *   loading: boolean,
 *   error: string,
 * }}
 */
export default function useAdminUsers() {
  const [filters, setFilters] = useState(initialFilters)
  const [searchInput, setSearchInput] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

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
    const search = searchInput.trim()

    if (search === filters.search) {
      return undefined
    }

    const timer = setTimeout(() => {
      changeFilters((current) => ({ ...current, search, page: 1 }))
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [searchInput, filters.search])

  useEffect(() => {
    const controller = new AbortController()
    const tab = USER_STATUS_TABS.find((item) => item.key === filters.tab) ?? USER_STATUS_TABS[0]

    getAdminUsers(
      { ...tab.filters, search: filters.search, includeAdmins: filters.includeAdmins, page: filters.page },
      controller.signal
    )
      .then((result) => {
        if (controller.signal.aborted) return
        setData(result)
        setLoading(false)
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        setError(normalizeError(err).message)
        setLoading(false)
      })

    return () => controller.abort()
  }, [filters, retryKey])

  return {
    filters,
    searchInput,
    setSearchInput,
    selectTab: (key) => changeFilters((current) => ({ ...current, tab: key, page: 1 })),
    toggleIncludeAdmins: () => changeFilters((current) => ({ ...current, includeAdmins: !current.includeAdmins, page: 1 })),
    goToPage: (page) => changeFilters((current) => ({ ...current, page })),
    retry: () => {
      setLoading(true)
      setError('')
      setRetryKey((value) => value + 1)
    },
    data,
    loading,
    error,
  }
}
