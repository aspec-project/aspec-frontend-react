import { useEffect, useId, useRef, useState } from 'react'
import { X } from 'lucide-react'

const TONE_CLASSES = {
  primary: 'bg-[#0d1f35] hover:bg-[#183650]',
  danger: 'bg-red-600 hover:bg-red-700',
  gold: 'bg-[#8A7043] hover:bg-[#796038]',
}

const buttonBase = 'rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Diálogo de confirmação acessível: foco inicial em Cancelar, Escape cancela, Tab preso nos
 * botões e foco devolvido ao elemento que o tinha antes de abrir. Opcionalmente mostra um ícone
 * antes do título, uma nota destacada e uma contagem decrescente (confirmDelay, em segundos) durante
 * a qual o botão de confirmar fica desativado; a contagem recomeça sempre que o diálogo abre.
 *
 * @param {{
 *   open: boolean,
 *   title?: string,
 *   description?: string,
 *   confirmLabel?: string,
 *   cancelLabel?: string,
 *   tone?: 'primary'|'danger'|'gold',
 *   pending?: boolean,
 *   onConfirm: () => void,
 *   onCancel: () => void,
 *   children?: import('react').ReactNode,
 *   showClose?: boolean,
 *   icon?: import('react').ComponentType,
 *   note?: string,
 *   confirmDelay?: number,
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
  children,
  showClose = false,
  icon: Icon,
  note,
  confirmDelay = 0,
}) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef(null)
  const cancelRef = useRef(null)
  const [remaining, setRemaining] = useState(confirmDelay)
  const [wasOpen, setWasOpen] = useState(open)

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setRemaining(confirmDelay)
  }

  useEffect(() => {
    if (!open || confirmDelay <= 0) return undefined

    let left = confirmDelay
    const timer = setInterval(() => {
      left -= 1
      setRemaining(left)
      if (left <= 0) clearInterval(timer)
    }, 1000)

    return () => clearInterval(timer)
  }, [open, confirmDelay])

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

  const waiting = remaining > 0

  /**
   * Escape cancela (exceto durante o pedido) e Tab/Shift+Tab mantêm o foco no diálogo.
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

    const focusable = Array.from(dialogRef.current.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
    ))

    if (focusable.length === 0) {
      event.preventDefault()
      return
    }

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
        aria-describedby={descriptionId}
        onKeyDown={handleKeyDown}
        className={`relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl ${children ? 'flex max-h-[calc(100dvh-2rem)] flex-col' : ''} ${showClose ? 'text-left' : ''}`}
      >
        {showClose && (
          <button
            type="button"
            aria-label="Fechar"
            disabled={pending}
            onClick={onCancel}
            className="absolute right-4 top-4 rounded p-1 text-gray-500 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
        <h2 id={titleId} className={`shrink-0 text-lg font-semibold ${Icon && tone === 'danger' ? 'text-red-600' : 'text-[#0d1f35]'} ${Icon ? 'flex items-center gap-2' : ''} ${showClose ? 'pr-7' : ''}`}>
          {Icon && <Icon size={20} aria-hidden="true" className="shrink-0" />}
          {title}
        </h2>
        <p id={descriptionId} className="mt-3 shrink-0 text-sm text-gray-600">{description}</p>
        {note && <p role="note" className="mt-4 shrink-0 rounded-lg bg-[#f5f1e8] px-4 py-3 text-sm text-[#6b5631]">{note}</p>}
        {children && <div tabIndex={0} role="region" aria-label="Resumo da confirmação" className="min-h-0 overflow-y-auto">{children}</div>}
        <div className={`mt-6 flex shrink-0 justify-end gap-3 ${showClose ? 'flex-col-reverse sm:flex-row' : ''}`}>
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
            disabled={pending || waiting}
            className={`${buttonBase} text-white ${TONE_CLASSES[tone] ?? TONE_CLASSES.primary}`}
          >
            {pending ? 'A processar...' : waiting ? `${confirmLabel} (${remaining}s)` : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
