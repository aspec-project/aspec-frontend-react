import { useEffect, useState } from 'react'
import axios from 'axios'
import { normalizeError } from '../services/api'
import { getAdminEvent } from '../services/adminEvents'

const LOAD_ERROR = 'Não foi possível carregar o evento.'

/**
 * Carrega um evento do backoffice para a página do evento e permite recarregá-lo (ex.: depois de um 404 ao
 * distribuir os cartões). Ao recarregar, o evento anterior continua visível com `loading` a true. O 404 marca
 * `notFound`; os erros do servidor mostram a mensagem da API e uma resposta fora do formato mostra uma frase
 * própria. O pedido é cancelado quando a página é desmontada ou o id muda.
 *
 * @param {string} id Id do evento (parâmetro da rota).
 * @returns {{event: object|null, loading: boolean, error: string, notFound: boolean, retry: () => void, refresh: () => void}}
 */
export default function useAdminEvent(id) {
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    getAdminEvent(id, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return

        setEvent(result)
        setNotFound(false)
        setLoading(false)
      })
      .catch((err) => {
        if (controller.signal.aborted || axios.isCancel(err)) return

        if (!axios.isAxiosError(err)) {
          setError(LOAD_ERROR)
        } else if (err.response?.status === 404) {
          setNotFound(true)
          setEvent(null)
        } else {
          setError(normalizeError(err).message)
        }

        setLoading(false)
      })

    return () => controller.abort()
  }, [id, reloadKey])

  /**
   * Repete o pedido, mantendo o evento anterior visível enquanto carrega.
   */
  const reload = () => {
    setLoading(true)
    setError('')
    setReloadKey((value) => value + 1)
  }

  return { event, loading, error, notFound, retry: reload, refresh: reload }
}
