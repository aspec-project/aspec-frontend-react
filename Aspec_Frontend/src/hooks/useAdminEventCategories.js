import { useEffect, useState } from 'react'
import axios from 'axios'
import { normalizeError } from '../services/api'
import { getAdminEventCategories } from '../services/adminEventCategories'
import { EVENT_CATEGORY_TEXTS } from '../utils/eventCategories'

/**
 * Lista de tipos de evento do backoffice. No primeiro carregamento ainda não há lista; ao recarregar (retry,
 * também usado depois de gravar ou apagar) a lista atual continua visível com `loading` a true, para a tabela
 * ficar ocupada e as ações desativadas. Uma resposta com formato inesperado mostra uma frase própria; os erros
 * do servidor mostram a mensagem da API; um pedido cancelado não mostra nada.
 *
 * @returns {{
 *   categories: {id: string, name: string, color: string|null, events_count: number|null}[]|null,
 *   loading: boolean,
 *   error: string,
 *   retry: () => void,
 * }}
 */
export default function useAdminEventCategories() {
  const [categories, setCategories] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    getAdminEventCategories(controller.signal)
      .then((items) => {
        if (controller.signal.aborted) return
        setCategories(items)
        setLoading(false)
      })
      .catch((err) => {
        if (controller.signal.aborted || axios.isCancel(err)) return
        setError(axios.isAxiosError(err) ? normalizeError(err).message : EVENT_CATEGORY_TEXTS.loadError)
        setLoading(false)
      })

    return () => controller.abort()
  }, [retryKey])

  return {
    categories,
    loading,
    error,
    retry: () => {
      setLoading(true)
      setError('')
      setRetryKey((value) => value + 1)
    },
  }
}
