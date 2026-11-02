import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { normalizeError } from '../services/api'
import { distributePrayerCards, getPrayerCardsStatus } from '../services/adminEvents'
import { PRAYER_CARDS_TEXTS } from '../utils/adminPrayerCards'

/**
 * Estado dos cartões de oração de um evento e a distribuição antecipada ("Distribuir agora").
 * O estado só é pedido com os cartões ativos e volta a ser pedido sempre que `version` muda (o evento foi
 * recarregado). Um 404 no pedido do estado quer dizer que os cartões foram desligados entretanto (`unavailable`).
 * Ao recarregar, o estado anterior continua visível.
 * Distribuir: o diálogo fecha sempre; 200 usa o estado da resposta (ou volta a pedi-lo se vier fora do formato);
 * 409 volta a pedir o estado; 404 chama `onStale` para a página recarregar o evento; 429/5xx/rede só mostram a
 * mensagem. Depois do 200 e do 409, `focusRequest` aumenta para a página pôr o foco no título da secção.
 *
 * @param {string} eventId Id do evento.
 * @param {boolean} enabled Se o evento tem os cartões ativos.
 * @param {{version?: unknown, onStale?: () => void}} [options] `version` muda quando o evento é recarregado;
 *   `onStale` é chamado quando o evento pode ter sido apagado ou os cartões desligados.
 * @returns {{
 *   status: object|null,
 *   loading: boolean,
 *   error: string,
 *   unavailable: boolean,
 *   retry: () => void,
 *   confirming: boolean,
 *   pending: boolean,
 *   feedback: {type: 'success'|'error', message: string}|null,
 *   focusRequest: number,
 *   requestDistribute: () => void,
 *   confirm: () => Promise<void>,
 *   cancel: () => void,
 *   dismissFeedback: () => void,
 * }}
 */
export default function usePrayerCards(eventId, enabled, { version, onStale } = {}) {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [unavailable, setUnavailable] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [focusRequest, setFocusRequest] = useState(0)
  const pendingRef = useRef(false)

  useEffect(() => {
    if (!enabled) return undefined

    const controller = new AbortController()

    getPrayerCardsStatus(eventId, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return

        setStatus(result)
        setUnavailable(false)
        setLoading(false)
      })
      .catch((err) => {
        if (controller.signal.aborted || axios.isCancel(err)) return

        if (!axios.isAxiosError(err)) {
          setError(PRAYER_CARDS_TEXTS.loadError)
        } else if (err.response?.status === 404) {
          setUnavailable(true)
          setStatus(null)
        } else {
          setError(normalizeError(err).message)
        }

        setLoading(false)
      })

    return () => controller.abort()
  }, [eventId, enabled, version, reloadKey])

  /**
   * Volta a pedir o estado dos cartões, mantendo o anterior visível enquanto carrega.
   */
  const reload = () => {
    setLoading(true)
    setError('')
    setReloadKey((value) => value + 1)
  }

  /**
   * Abre a confirmação da distribuição.
   */
  const requestDistribute = () => {
    if (pendingRef.current) return
    setConfirming(true)
  }

  /**
   * Fecha a confirmação sem distribuir.
   */
  const cancel = () => {
    if (pendingRef.current) return
    setConfirming(false)
  }

  /**
   * Distribui os cartões e mostra a mensagem da API. O `ref` impede um segundo pedido com o primeiro pendente.
   *
   * @returns {Promise<void>}
   */
  const confirm = async () => {
    if (!confirming || pendingRef.current) return

    pendingRef.current = true
    setPending(true)
    setFeedback(null)

    try {
      const result = await distributePrayerCards(eventId)

      setFeedback({ type: 'success', message: result.message })
      if (result.status) {
        setStatus(result.status)
      } else {
        reload()
      }
      setFocusRequest((value) => value + 1)
    } catch (err) {
      if (!axios.isCancel(err)) {
        const { status: code, message } = normalizeError(err)
        setFeedback({ type: 'error', message })

        if (code === 409) {
          reload()
          setFocusRequest((value) => value + 1)
        } else if (code === 404) {
          onStale?.()
        }
      }
    } finally {
      pendingRef.current = false
      setPending(false)
      setConfirming(false)
    }
  }

  return {
    status,
    loading,
    error,
    unavailable,
    retry: reload,
    confirming,
    pending,
    feedback,
    focusRequest,
    requestDistribute,
    confirm,
    cancel,
    dismissFeedback: () => setFeedback(null),
  }
}
