import { useEffect, useId, useRef } from 'react'

const TONE_CLASSES = {
  primary: 'bg-[#0d1f35] hover:bg-[#183650]',
  danger: 'bg-red-600 hover:bg-red-700',
}

const buttonBase = 'rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Diálogo de confirmação acessível: foco inicial em Cancelar, Escape cancela, Tab preso nos
 * botões e foco devolvido ao elemento que o tinha antes de abrir.
 *
 * @param {{
 *   open: boolean,
 *   title?: string,
 *   description?: string,
 *   confirmLabel?: string,
 *   cancelLabel?: string,
 *   tone?: 'primary'|'danger',
 *   pending?: boolean,
 *   onConfirm: () => void,
 *   onCancel: () => void,
 * }} props
 * @returns {JSX.Element|null}
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancelar',
  tone = 'primary',
  pending = false,
  onConfirm,
  onCancel,
}) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef(null)
  const cancelRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const previous = document.activeElement
    cancelRef.current?.focus()

    return () => {
      if (previous?.isConnected) previous.focus()
    }
  }, [open])

  if (!open) {
    return null
  }

  /**
   * Escape cancela (exceto durante o pedido) e Tab/Shift+Tab circulam só entre os botões do diálogo.
   *
   * @param {import('react').KeyboardEvent} event
   */
  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      if (!pending) onCancel()
      return
    }

    if (event.key !== 'Tab') return

    const buttons = Array.from(dialogRef.current.querySelectorAll('button:not([disabled])'))

    if (buttons.length === 0) {
      event.preventDefault()
      return
    }

    const first = buttons[0]
    const last = buttons[buttons.length - 1]

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
        aria-describedby={descriptionId}
        onKeyDown={handleKeyDown}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 id={titleId} className="text-lg font-semibold text-[#0d1f35]">{title}</h2>
        <p id={descriptionId} className="mt-3 text-sm text-gray-600">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={pending}
            className={`${buttonBase} border border-gray-200 bg-white text-gray-700 hover:bg-gray-50`}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`${buttonBase} text-white ${TONE_CLASSES[tone] ?? TONE_CLASSES.primary}`}
          >
            {pending ? 'A processar...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
