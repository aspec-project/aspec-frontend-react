import { useEffect, useState } from 'react'
import { getEventCategories, getLocations } from '../services/referenceLists'

const OPTIONS_ERROR = 'Não foi possível carregar as opções dos filtros.'

/**
 * Opções dos filtros da lista de eventos do backoffice: tipos de evento e distritos (listas públicas em cache).
 * Falha de forma independente da lista: com erro, a página desativa os selects e permite tentar de novo.
 *
 * @returns {{categories: object[], locations: object[], loading: boolean, error: string, retry: () => void}}
 */
export default function useEventFilterOptions() {
  const [options, setOptions] = useState({ categories: [], locations: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    Promise.all([getEventCategories(controller.signal), getLocations(controller.signal)])
      .then(([categories, locations]) => {
        if (controller.signal.aborted) return
        setOptions({ categories, locations })
        setLoading(false)
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setError(OPTIONS_ERROR)
        setLoading(false)
      })

    return () => controller.abort()
  }, [retryKey])

  return {
    ...options,
    loading,
    error,
    retry: () => {
      setLoading(true)
      setError('')
      setRetryKey((value) => value + 1)
    },
  }
}
