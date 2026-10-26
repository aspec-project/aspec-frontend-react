import { useRef, useState } from 'react'
import axios from 'axios'
import { normalizeError } from '../services/api'
import { deleteEventCategory } from '../services/adminEventCategories'
import { EVENT_CATEGORY_TEXTS } from '../utils/eventCategories'

/**
 * Ciclo de apagar um tipo de evento: abrir a confirmação, apagar e tratar as respostas. A confirmação fecha
 * sempre que o pedido termina. Se o tipo entretanto ganhou eventos (409) ou já não existe (404), chama
 * `onStale` (que também deve recarregar a lista); nos outros erros chama `onError`.
 *
 * @param {{onSuccess: (message: string) => void, onStale: (message: string) => void, onError: (message: string) => void}} callbacks
 *   onSuccess recebe a mensagem da API; onStale e onError recebem a mensagem de erro a mostrar.
 * @returns {{
 *   deleting: object|null,
 *   pending: boolean,
 *   requestDelete: (category: object) => void,
 *   cancel: () => void,
 *   confirm: () => Promise<void>,
 * }}
 */
export default function useEventCategoryDeletion({ onSuccess, onStale, onError }) {
  const [deleting, setDeleting] = useState(null)
  const [pending, setPending] = useState(false)
  const pendingRef = useRef(false)

  /**
   * Abre a confirmação de apagar o tipo da linha.
   *
   * @param {object} category Tipo de evento.
   */
  const requestDelete = (category) => {
    if (pendingRef.current) return
    setDeleting(category)
  }

  /**
   * Fecha a confirmação sem apagar.
   */
  const cancel = () => {
    if (pendingRef.current) return
    setDeleting(null)
  }

  /**
   * Apaga o tipo confirmado (um só pedido de cada vez).
   *
   * @returns {Promise<void>}
   */
  const confirm = async () => {
    if (!deleting || pendingRef.current) return

    pendingRef.current = true
    setPending(true)

    try {
      const result = await deleteEventCategory(deleting.id)

      setDeleting(null)
      onSuccess(result.message)
    } catch (err) {
      setDeleting(null)

      if (!axios.isCancel(err)) {
        const { status, message } = normalizeError(err)

        if (status === 409) onStale(message)
        else if (status === 404) onStale(EVENT_CATEGORY_TEXTS.notFound)
        else onError(message)
      }
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }

  return { deleting, pending, requestDelete, cancel, confirm }
}
