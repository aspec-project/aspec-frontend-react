import { useEffect, useState } from 'react'
import axios from 'axios'
import { normalizeError } from '../services/api'
import { getAdminDashboard } from '../services/adminDashboard'
import { DASHBOARD_TEXTS } from '../utils/adminDashboard'

/**
 * Dados do painel do backoffice, num só pedido. No primeiro carregamento ainda não há dados; ao recarregar
 * (retry) os dados atuais continuam visíveis com `loading` a true. Uma resposta com formato inesperado mostra
 * uma frase própria; os erros do servidor mostram a mensagem da API; um pedido cancelado não mostra nada.
 * O pedido é cancelado quando a página é desmontada.
 *
 * @returns {{
 *   data: {stats: object, pending_applications: object[], recent_reviews: object[]}|null,
 *   loading: boolean,
 *   error: string,
 *   retry: () => void,
 * }}
 */
export default function useAdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    getAdminDashboard(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setData(result)
        setLoading(false)
      })
      .catch((err) => {
        if (controller.signal.aborted || axios.isCancel(err)) return
        setError(axios.isAxiosError(err) ? normalizeError(err).message : DASHBOARD_TEXTS.loadError)
        setLoading(false)
      })

    return () => controller.abort()
  }, [retryKey])

  return {
    data,
    loading,
    error,
    retry: () => {
      setLoading(true)
      setError('')
      setRetryKey((value) => value + 1)
    },
  }
}
