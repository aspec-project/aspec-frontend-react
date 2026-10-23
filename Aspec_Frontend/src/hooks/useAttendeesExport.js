import { useRef, useState } from 'react'
import axios from 'axios'
import { normalizeError } from '../services/api'
import { exportEventAttendees } from '../services/adminEvents'
import { ATTENDEES_EXPORT_TEXTS, getAttendeesFallbackFilename } from '../utils/adminEvents'
import { saveBlob } from '../utils/download'

/**
 * Ciclo da exportação da lista de presenças de um evento: pedir confirmação (com o aviso do RGPD),
 * descarregar o CSV e mostrar os erros. O sucesso não tem mensagem: o browser já mostra o download.
 *
 * @param {{onStale: () => void}} options onStale recarrega a lista quando o evento já não existe (404).
 * @returns {{
 *   confirming: object|null,
 *   pending: boolean,
 *   feedback: {type: 'error', message: string}|null,
 *   requestExport: (event: object) => void,
 *   cancel: () => void,
 *   confirm: () => Promise<void>,
 *   dismissFeedback: () => void,
 * }}
 */
export default function useAttendeesExport({ onStale }) {
  const [confirming, setConfirming] = useState(null)
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const pendingRef = useRef(false)

  /**
   * Abre a confirmação da exportação de um evento.
   *
   * @param {object} event Evento da linha.
   */
  const requestExport = (event) => {
    if (pendingRef.current) return
    setConfirming(event)
  }

  /**
   * Fecha a confirmação sem descarregar.
   */
  const cancel = () => {
    if (pendingRef.current) return
    setConfirming(null)
  }

  /**
   * Descarrega o CSV do evento confirmado e guarda-o com o nome do backend (ou o nome de reserva).
   *
   * @returns {Promise<void>}
   */
  const confirm = async () => {
    if (!confirming || pendingRef.current) return

    pendingRef.current = true
    setPending(true)
    setFeedback(null)

    try {
      const { blob, filename } = await exportEventAttendees(confirming.id)
      saveBlob(blob, filename ?? getAttendeesFallbackFilename(confirming))
    } catch (err) {
      if (!axios.isCancel(err)) {
        const { status, message } = normalizeError(err)

        if (status === 404) {
          setFeedback({ type: 'error', message: ATTENDEES_EXPORT_TEXTS.notFound })
          onStale()
        } else {
          setFeedback({ type: 'error', message })
        }
      }
    } finally {
      pendingRef.current = false
      setPending(false)
      setConfirming(null)
    }
  }

  return {
    confirming,
    pending,
    feedback,
    requestExport,
    cancel,
    confirm,
    dismissFeedback: () => setFeedback(null),
  }
}
