import { useEffect, useState } from 'react'
import { normalizeError } from '../services/api'
import { getAdminUsers } from '../services/adminUsers'
import { USER_STATUS_TABS } from '../utils/adminUsers'

const SEARCH_DEBOUNCE_MS = 300

const initialFilters = { tab: 'all', search: '', includeAdmins: false, page: 1 }

/**
 * Estado e pedidos da lista de utilizadores do backoffice: chip de estado da subscrição, pesquisa
 * com debounce, "Ver admins" e paginação. Cancela o pedido anterior sempre que os filtros mudam e, se a
 * página atual ficar vazia (ex.: depois de uma ação), passa para a última página.
 *
 * @param {{initialTab?: string|null}} [options] `initialTab` é o chip inicial (ex.: vindo do URL); só é usado
 *   se for uma `key` de USER_STATUS_TABS, senão começa em "Todos".
 * @returns {{
 *   filters: {tab: string, search: string, includeAdmins: boolean, page: number},
 *   searchInput: string,
 *   setSearchInput: (value: string) => void,
 *   selectTab: (key: string) => void,
 *   toggleIncludeAdmins: () => void,
 *   goToPage: (page: number) => void,
 *   retry: () => void,
 *   refresh: () => void,
 *   data: {items: object[], pagination: object, counts: object, subscription_state_counts: object, admins_count: number}|null,
 *   loading: boolean,
 *   error: string,
 * }}
 */
export default function useAdminUsers({ initialTab } = {}) {
  const [filters, setFilters] = useState(() => ({
    ...initialFilters,
    tab: USER_STATUS_TABS.some((item) => item.key === initialTab) ? initialTab : initialFilters.tab,
  }))
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
    const isStateTab = filters.tab !== 'all' && USER_STATUS_TABS.some((item) => item.key === filters.tab)

    getAdminUsers(
      {
        ...(isStateTab ? { subscriptionState: filters.tab } : {}),
        search: filters.search,
        includeAdmins: filters.includeAdmins,
        page: filters.page,
      },
      controller.signal
    )
      .then((result) => {
        if (controller.signal.aborted) return

        const lastPage = Math.max(1, result.pagination?.last_page ?? 1)

        if (result.items.length === 0 && filters.page > lastPage) {
          setFilters((current) => ({ ...current, page: lastPage }))
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
  }, [filters, retryKey])

  /**
   * Repete o pedido com os filtros atuais, mantendo a tabela anterior visível enquanto carrega.
   */
  const reload = () => {
    setLoading(true)
    setError('')
    setRetryKey((value) => value + 1)
  }

  return {
    filters,
    searchInput,
    setSearchInput,
    selectTab: (key) => changeFilters((current) => ({ ...current, tab: key, page: 1 })),
    toggleIncludeAdmins: () => changeFilters((current) => ({ ...current, includeAdmins: !current.includeAdmins, page: 1 })),
    goToPage: (page) => changeFilters((current) => ({ ...current, page })),
    retry: reload,
    refresh: reload,
    data,
    loading,
    error,
  }
}
