import { useEffect, useState } from 'react'
import axios from 'axios'
import { normalizeError } from '../services/api'
import { getAdminUser } from '../services/adminUsers'

/**
 * Carrega o detalhe de um utilizador do backoffice e permite recarregá-lo (ex.: depois de uma ação).
 *
 * @param {string} id Id do utilizador (parâmetro da rota).
 * @returns {{user: object|null, loading: boolean, error: string, notFound: boolean, retry: () => void, refresh: () => void}}
 */
export default function useAdminUser(id) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    getAdminUser(id, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return

        setUser(result)
        setNotFound(false)
        setLoading(false)
      })
      .catch((err) => {
        if (controller.signal.aborted || axios.isCancel(err)) return

        const { status, message } = normalizeError(err)

        if (status === 404) {
          setNotFound(true)
          setUser(null)
        } else {
          setError(message)
        }

        setLoading(false)
      })

    return () => controller.abort()
  }, [id, reloadKey])

  /**
   * Repete o pedido, mantendo o detalhe anterior visível enquanto carrega.
   */
  const reload = () => {
    setLoading(true)
    setError('')
    setReloadKey((value) => value + 1)
  }

  return { user, loading, error, notFound, retry: reload, refresh: reload }
}
