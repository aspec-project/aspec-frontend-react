import { useRef, useState } from 'react'
import axios from 'axios'
import { normalizeError } from '../services/api'
import { deleteAdminEvent } from '../services/adminEvents'
import { DELETE_EVENT_TEXTS, needsDeleteJustification } from '../utils/adminEvents'

/**
 * Ciclo de apagar um evento no backoffice: abrir o diálogo (com justificação obrigatória quando há inscritos),
 * apagar e tratar as respostas. Evento passado (409), inexistente (404) ou que entretanto ganhou inscritos (422
 * no diálogo sem campo) fecham o diálogo e pedem para recarregar a lista. Nos outros erros, o diálogo com
 * justificação fica aberto com o erro e o texto escrito; o diálogo sem campo fecha e mostra o erro.
 *
 * @param {{onSuccess: (message: string) => void, onStale: (message: string) => void, onError: (message: string) => void}} callbacks
 *   onSuccess recebe a mensagem da API; onStale e onError recebem a mensagem de erro a mostrar (onStale também
 *   deve recarregar a lista).
 * @returns {{
 *   deleting: object|null,
 *   needsJustification: boolean,
 *   pending: boolean,
 *   error: string,
 *   requestDelete: (event: object) => void,
 *   cancel: () => void,
 *   confirm: (input?: unknown) => Promise<void>,
 * }}
 */
export default function useEventDeletion({ onSuccess, onStale, onError }) {
  const [deleting, setDeleting] = useState(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const pendingRef = useRef(false)

  const needsJustification = deleting ? needsDeleteJustification(deleting) : false

  /**
   * Abre o diálogo de apagar o evento da linha.
   *
   * @param {object} event Evento da lista.
   */
  const requestDelete = (event) => {
    if (pendingRef.current) return
    setError('')
    setDeleting(event)
  }

  /**
   * Fecha o diálogo sem apagar.
   */
  const cancel = () => {
    if (pendingRef.current) return
    setDeleting(null)
    setError('')
  }

  /**
   * Apaga o evento do diálogo. Com justificação necessária só continua com texto (o ConfirmDialog passa o
   * evento do clique, que nunca é enviado ao serviço).
   *
   * @param {unknown} [input] Justificação escrita (ReasonDialog) ou evento do clique (ConfirmDialog).
   * @returns {Promise<void>}
   */
  const confirm = async (input) => {
    if (!deleting || pendingRef.current) return

    const withJustification = needsDeleteJustification(deleting)

    if (withJustification && (typeof input !== 'string' || input.trim() === '')) return

    pendingRef.current = true
    setPending(true)
    setError('')

    try {
      const result = withJustification
        ? await deleteAdminEvent(deleting.id, input)
        : await deleteAdminEvent(deleting.id)

      setDeleting(null)
      onSuccess(result.message)
    } catch (err) {
      if (!axios.isCancel(err)) {
        const { status, message } = normalizeError(err)

        if (status === 409) {
          setDeleting(null)
          onStale(message)
        } else if (status === 404) {
          setDeleting(null)
          onStale(DELETE_EVENT_TEXTS.notFound)
        } else if (status === 422 && !withJustification) {
          setDeleting(null)
          onStale(DELETE_EVENT_TEXTS.registrantsChanged)
        } else if (withJustification) {
          setError(message)
        } else {
          setDeleting(null)
          onError(message)
        }
      }
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }

  return {
    deleting,
    needsJustification,
    pending,
    error,
    requestDelete,
    cancel,
    confirm,
  }
}
