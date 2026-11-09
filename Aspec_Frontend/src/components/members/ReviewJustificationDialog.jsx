import { useEffect, useId, useRef } from 'react'
import { ASPEC_CONTACT_EMAIL } from '../../utils/reviewReports'

/**
 * Modal com a justificação da ocultação ou o motivo da sinalização de uma avaliação. Tem um único botão, por isso
 * não usa o ConfirmDialog. Foco inicial em "Fechar", Escape fecha, Tab preso no modal e foco devolvido ao botão
 * que o abriu. O texto do admin é mostrado como texto simples.
 *
 * @param {{
 *   justification: {title: string, reason?: string, labels?: string[], footerBefore: string, footerAfter: string},
 *   onClose: () => void,
 * }} props
 * @returns {JSX.Element}
 */
export default function ReviewJustificationDialog({ justification, onClose }) {
  const titleId = useId()
  const dialogRef = useRef(null)
  const closeRef = useRef(null)

  useEffect(() => {
    const previous = document.activeElement
    closeRef.current?.focus()

    return () => {
      if (previous?.isConnected) previous.focus()
    }
  }, [])

  /**
   * Escape fecha e Tab/Shift+Tab mantêm o foco no modal.
   *
   * @param {import('react').KeyboardEvent} event
   */
  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }

    if (event.key !== 'Tab') return

    const focusable = Array.from(dialogRef.current.querySelectorAll('a[href], button:not([disabled])'))
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col rounded-xl bg-white p-6 text-left shadow-xl"
      >
        <h2 id={titleId} className="shrink-0 text-lg font-semibold text-[#0d1f35]">{justification.title}</h2>

        <div className="mt-4 min-h-0 overflow-y-auto rounded-lg border border-[#E5DFD3] bg-[#F6F4EF] px-4 py-3 text-sm leading-6 text-slate-700">
          {justification.labels ? (
            <ul className="list-disc space-y-1 pl-5">
              {justification.labels.map((label) => <li key={label}>{label}</li>)}
            </ul>
          ) : (
            <p className="whitespace-pre-wrap break-words">{justification.reason}</p>
          )}
        </div>

        <p className="mt-4 shrink-0 text-sm leading-6 text-slate-600">
          {justification.footerBefore}
          <a href={`mailto:${ASPEC_CONTACT_EMAIL}`} className="font-medium text-[#7A6238] underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79]">
            {ASPEC_CONTACT_EMAIL}
          </a>
          {justification.footerAfter}
        </p>

        <div className="mt-6 flex shrink-0 justify-end">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#0d1f35] px-4 py-2 text-sm font-semibold text-white hover:bg-[#183650] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315a79]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
