import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { normalizeError } from '../services/api'
import { getEventAttendees } from '../services/adminEvents'
import { ATTENDEES_LIST_TEXTS } from '../utils/adminEvents'

/**
 * Pede a lista de inscritos de um evento quando o diálogo abre e cancela o pedido quando fecha.
 * Num 404 avisa a página (onStale) para recarregar a lista de eventos; nos outros erros permite tentar de novo.
 *
 * @param {string} eventId Id do evento.
 * @param {{onStale: () => void}} options onStale recarrega a lista de eventos quando o evento já não existe.
 * @returns {{
 *   attendees: {id: string, name: string|null, business_name: string|null, registered_at: string|null}[]|null,
 *   loading: boolean,
 *   error: string,
 *   canRetry: boolean,
 *   retry: () => void,
 * }}
 */
export default function useEventAttendees(eventId, { onStale }) {
  const [attendees, setAttendees] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [canRetry, setCanRetry] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const onStaleRef = useRef(onStale)

  useEffect(() => {
    onStaleRef.current = onStale
  })

  useEffect(() => {
    const controller = new AbortController()

    getEventAttendees(eventId, controller.signal)
      .then((list) => {
        if (controller.signal.aborted) return
        setAttendees(list)
        setLoading(false)
      })
      .catch((err) => {
        if (controller.signal.aborted || axios.isCancel(err)) return

        if (!axios.isAxiosError(err)) {
          setError(ATTENDEES_LIST_TEXTS.loadError)
          setCanRetry(true)
        } else {
          const { status, message } = normalizeError(err)

          if (status === 404) {
            setError(ATTENDEES_LIST_TEXTS.notFound)
            setCanRetry(false)
            onStaleRef.current()
          } else {
            setError(message)
            setCanRetry(true)
          }
        }
        setLoading(false)
      })

    return () => controller.abort()
  }, [eventId, attempt])

  return {
    attendees,
    loading,
    error,
    canRetry,
    retry: () => {
      setLoading(true)
      setError('')
      setCanRetry(false)
      setAttempt((value) => value + 1)
    },
  }
}
