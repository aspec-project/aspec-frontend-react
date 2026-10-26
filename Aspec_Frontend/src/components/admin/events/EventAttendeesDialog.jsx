import { useEffect, useId, useRef } from 'react'
import { Users } from 'lucide-react'
import useEventAttendees from '../../../hooks/useEventAttendees'
import { ATTENDEES_LIST_TEXTS, formatRegisteredAt, getAttendeesDialogDescription } from '../../../utils/adminEvents'

const buttonBase = 'rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Diálogo só de leitura com o nome, a empresa e a data de inscrição dos inscritos de um evento, pela ordem
 * do backend, com o aviso do art. 9.º do RGPD. Foco inicial em "Fechar", Escape fecha, Tab preso no diálogo
 * e foco devolvido ao botão que o abriu.
 *
 * @param {{
 *   event: {id: string, name?: string, event_date?: string, max_attendees?: unknown},
 *   onClose: () => void,
 *   onStale: () => void,
 * }} props
 * @returns {JSX.Element}
 */
export default function EventAttendeesDialog({ event, onClose, onStale }) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef(null)
  const closeRef = useRef(null)
  const { attendees, loading, error, canRetry, retry } = useEventAttendees(event.id, { onStale })

  useEffect(() => {
    const previous = document.activeElement
    closeRef.current?.focus()

    return () => {
      if (previous?.isConnected) previous.focus()
    }
  }, [])

  /**
   * Escape fecha e Tab/Shift+Tab mantêm o foco no diálogo.
   *
   * @param {import('react').KeyboardEvent} keyEvent
   */
  const handleKeyDown = (keyEvent) => {
    if (keyEvent.key === 'Escape') {
      keyEvent.preventDefault()
      onClose()
      return
    }

    if (keyEvent.key !== 'Tab') return

    const focusable = Array.from(dialogRef.current.querySelectorAll('button:not([disabled]), [tabindex="0"]'))

    if (focusable.length === 0) {
      keyEvent.preventDefault()
      return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (keyEvent.shiftKey && document.activeElement === first) {
      keyEvent.preventDefault()
      last.focus()
    } else if (!keyEvent.shiftKey && document.activeElement === last) {
      keyEvent.preventDefault()
      first.focus()
    }
  }

  /**
   * Move o foco para "Fechar" antes de voltar a pedir, porque o botão "Tentar novamente" desaparece
   * durante o novo pedido e o foco cairia fora do diálogo.
   */
  const handleRetry = () => {
    closeRef.current?.focus()
    retry()
  }

  let body

  if (loading) {
    body = <p role="status" className="mt-4 text-sm text-gray-600">{ATTENDEES_LIST_TEXTS.loading}</p>
  } else if (error) {
    body = (
      <div className="mt-4">
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        {canRetry && (
          <button type="button" onClick={handleRetry} className={`${buttonBase} mt-3 bg-[#0d1f35] text-white hover:bg-[#183650]`}>
            {ATTENDEES_LIST_TEXTS.retryLabel}
          </button>
        )}
      </div>
    )
  } else if (attendees.length === 0) {
    body = <p role="status" className="mt-4 text-sm text-gray-600">{ATTENDEES_LIST_TEXTS.empty}</p>
  } else {
    body = (
      <div role="region" aria-label={ATTENDEES_LIST_TEXTS.regionLabel} tabIndex={0} className="mt-4 min-h-0 overflow-y-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{ATTENDEES_LIST_TEXTS.tableCaption}</caption>
          <thead className="bg-gray-50">
            <tr>
              {['Nome', 'Empresa', 'Data de inscrição'].map((header) => (
                <th key={header} scope="col" className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {attendees.map((attendee) => (
              <tr key={attendee.id}>
                <td className="px-4 py-2 text-[#0d1f35]">
                  {attendee.name ?? <span className="text-gray-400">{ATTENDEES_LIST_TEXTS.noProfile}</span>}
                </td>
                <td className="px-4 py-2 text-gray-700">{attendee.business_name ?? '—'}</td>
                <td className="px-4 py-2 text-gray-700">{formatRegisteredAt(attendee.registered_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={handleKeyDown}
        className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 id={titleId} className="flex shrink-0 items-center gap-2 text-lg font-semibold text-[#0d1f35]">
          <Users size={20} aria-hidden="true" className="shrink-0" />
          {ATTENDEES_LIST_TEXTS.title}
        </h2>
        <p id={descriptionId} className="mt-3 shrink-0 text-sm text-gray-600">
          {getAttendeesDialogDescription(event, attendees ? attendees.length : null)}
        </p>
        <p role="note" className="mt-4 shrink-0 rounded-lg bg-[#f5f1e8] px-4 py-3 text-sm text-[#6b5631]">{ATTENDEES_LIST_TEXTS.note}</p>
        {body}
        <div className="mt-6 flex shrink-0 justify-end gap-3">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className={`${buttonBase} border border-gray-200 bg-white text-gray-700 hover:bg-gray-50`}
          >
            {ATTENDEES_LIST_TEXTS.closeLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
