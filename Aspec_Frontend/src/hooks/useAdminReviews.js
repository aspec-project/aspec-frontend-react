import { useEffect, useState } from 'react'
import { normalizeError } from '../services/api'
import { getAdminReviews } from '../services/adminReviews'
import { parseReviewFilter } from '../utils/adminReviews'

/**
 * Estado e pedidos da lista de avaliações da moderação: filtro por estado e paginação. Cancela o pedido
 * anterior sempre que o filtro ou a página mudam (ou a página é desmontada) e, se a página atual ficar vazia
 * (ex.: depois de uma ação), passa para a última página. Durante uma recarga a lista anterior continua em `data`.
 *
 * @param {{initialFilter?: string|null}} [options] `initialFilter` é o filtro inicial (ex.: vindo do URL); um
 *   valor desconhecido abre em "Todas".
 * @returns {{
 *   filter: string,
 *   page: number,
 *   data: {items: object[], pagination: object, counts: object}|null,
 *   loading: boolean,
 *   error: string,
 *   selectFilter: (key: string) => void,
 *   goToPage: (page: number) => void,
 *   retry: () => void,
 *   refresh: () => void,
 * }}
 */
export default function useAdminReviews({ initialFilter } = {}) {
  const [query, setQuery] = useState(() => ({ filter: parseReviewFilter(initialFilter), page: 1 }))
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    /**
     * Pede a página atual e guarda o resultado, a menos que o pedido tenha sido cancelado.
     *
     * @returns {Promise<void>}
     */
    const load = async () => {
      try {
        const result = await getAdminReviews({ status: query.filter, page: query.page }, controller.signal)

        if (controller.signal.aborted) return

        const lastPage = Math.max(1, result.pagination.last_page)

        if (result.items.length === 0 && query.page > lastPage) {
          setQuery((current) => ({ ...current, page: lastPage }))
          return
        }

        setData(result)
        setLoading(false)
      } catch (err) {
        if (controller.signal.aborted) return
        setError(normalizeError(err).message)
        setLoading(false)
      }
    }

    load()

    return () => controller.abort()
  }, [query, retryKey])

  /**
   * Marca o início de um novo pedido e aplica a mudança ao filtro ou à página.
   *
   * @param {(current: {filter: string, page: number}) => {filter: string, page: number}} updater
   */
  const changeQuery = (updater) => {
    setLoading(true)
    setError('')
    setQuery(updater)
  }

  /**
   * Repete o pedido com o filtro e a página atuais, mantendo a lista anterior visível enquanto carrega.
   */
  const reload = () => {
    setLoading(true)
    setError('')
    setRetryKey((value) => value + 1)
  }

  return {
    filter: query.filter,
    page: query.page,
    data,
    loading,
    error,
    selectFilter: (key) => changeQuery(() => ({ filter: parseReviewFilter(key), page: 1 })),
    goToPage: (page) => changeQuery((current) => ({ ...current, page })),
    retry: reload,
    refresh: reload,
  }
}
