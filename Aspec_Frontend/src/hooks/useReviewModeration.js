import { useRef, useState } from 'react'
import axios from 'axios'
import { normalizeError } from '../services/api'
import { hideReview, showReview, unflagReview } from '../services/adminReviews'

const ACTION_SERVICES = {
  hide: hideReview,
  show: showReview,
  unflag: unflagReview,
}

/**
 * Ciclo das ações de moderação sobre uma avaliação (ocultar, mostrar e retirar a sinalização): pedir
 * confirmação, executar e mostrar o resultado. Sucesso → fecha o diálogo, mostra a mensagem da API e pede para
 * recarregar. 409/404 (outro admin já mudou a avaliação) → fecha, mostra o erro e pede para recarregar.
 * Ocultar com outro erro (422, 429, 5xx, rede) → o diálogo fica aberto com o erro e o texto escrito.
 * Mostrar ou retirar com outro erro → fecha e mostra o erro, sem recarregar.
 *
 * @param {{onChanged: (review: object) => void, onStale: (review: object) => void}} callbacks onChanged depois
 *   de uma ação com sucesso; onStale depois de 409/404. Ambos recebem a avaliação tratada e devem recarregar a lista.
 * @returns {{
 *   confirming: {action: 'hide'|'show'|'unflag', review: object}|null,
 *   pending: boolean,
 *   error: string,
 *   feedback: {type: 'success'|'error', message: string}|null,
 *   requestAction: (action: 'hide'|'show'|'unflag', review: object) => void,
 *   cancel: () => void,
 *   confirm: (input?: unknown) => Promise<void>,
 *   dismissFeedback: () => void,
 * }}
 */
export default function useReviewModeration({ onChanged, onStale }) {
  const [confirming, setConfirming] = useState(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState(null)
  const pendingRef = useRef(false)

  /**
   * Abre o diálogo de uma ação sobre a avaliação do cartão.
   *
   * @param {'hide'|'show'|'unflag'} action Ação pedida.
   * @param {object} review Avaliação do cartão.
   */
  const requestAction = (action, review) => {
    if (pendingRef.current) return
    setError('')
    setConfirming({ action, review })
  }

  /**
   * Fecha o diálogo sem executar a ação.
   */
  const cancel = () => {
    if (pendingRef.current) return
    setConfirming(null)
    setError('')
  }

  /**
   * Executa a ação confirmada. Só ocultar envia `input` ao serviço, e só quando é texto (o ConfirmDialog passa
   * o evento do clique, que nunca vai no pedido).
   *
   * @param {unknown} [input] Justificação escrita no diálogo de ocultar.
   * @returns {Promise<void>}
   */
  const confirm = async (input) => {
    if (!confirming || pendingRef.current) return

    const { action, review } = confirming

    pendingRef.current = true
    setPending(true)
    setError('')
    setFeedback(null)

    try {
      const service = ACTION_SERVICES[action]
      const { message } = action === 'hide' && typeof input === 'string'
        ? await service(review.id, input)
        : await service(review.id)

      setConfirming(null)
      setFeedback({ type: 'success', message })
      onChanged(review)
    } catch (err) {
      if (!axios.isCancel(err)) {
        const { status, message, fieldErrors } = normalizeError(err)

        if (status === 409 || status === 404) {
          setConfirming(null)
          setFeedback({ type: 'error', message })
          onStale(review)
        } else if (action === 'hide') {
          setError(status === 422 ? fieldErrors.justification ?? message : message)
        } else {
          setConfirming(null)
          setFeedback({ type: 'error', message })
        }
      }
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }

  return {
    confirming,
    pending,
    error,
    feedback,
    requestAction,
    cancel,
    confirm,
    dismissFeedback: () => setFeedback(null),
  }
}
