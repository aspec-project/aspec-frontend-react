import { useEffect, useId, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { ANONYMIZE_CONFIRMATION_WORD, ANONYMIZE_TEXTS, getDisplayName, isAnonymizationConfirmed } from '../../../utils/adminUsers'

const buttonBase = 'rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Diálogo de anonimização de um membro: o admin tem de escrever ANONIMIZAR para ativar o botão
 * final (proteção contra engano, não controlo de acesso). Foco inicial no campo, Escape cancela
 * (exceto durante o pedido), Tab preso entre o campo e os botões ativos e foco devolvido ao
 * elemento que o tinha antes de abrir. O texto escrito recomeça sempre que o diálogo abre.
 *
 * @param {{
 *   open: boolean,
 *   user: {email?: string, member_profile?: {name?: string}|null}|null,
 *   pending?: boolean,
 *   onConfirm: () => void,
 *   onCancel: () => void,
 * }} props
 * @returns {JSX.Element|null}
 */
export default function AnonymizeUserDialog({ open, user, pending = false, onConfirm, onCancel }) {
  const titleId = useId()
  const descriptionId = useId()
  const fieldId = useId()
  const dialogRef = useRef(null)
  const fieldRef = useRef(null)
  const [value, setValue] = useState('')
  const [wasOpen, setWasOpen] = useState(open)

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setValue('')
  }

  useEffect(() => {
    if (!open) return undefined

    const previous = document.activeElement
    fieldRef.current?.focus()

    return () => {
      if (previous?.isConnected) previous.focus()
    }
  }, [open])

  if (!open) {
    return null
  }

  const confirmed = isAnonymizationConfirmed(value)

  /**
   * Confirma só com a palavra certa e sem pedido em curso (o Enter no campo não contorna o botão desativado).
   *
   * @param {import('react').FormEvent} event
   */
  const handleSubmit = (event) => {
    event.preventDefault()
    if (confirmed && !pending) onConfirm()
  }

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

    const focusable = Array.from(dialogRef.current.querySelectorAll('input:not([disabled]), button:not([disabled])'))

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
        className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 id={titleId} className="flex items-center gap-2 text-lg font-semibold text-red-600">
          <Trash2 size={20} aria-hidden="true" className="shrink-0" />
          {ANONYMIZE_TEXTS.title}
        </h2>
        <p id={descriptionId} className="mt-3 text-sm text-gray-600">{ANONYMIZE_TEXTS.description}</p>
        <p role="note" className="mt-4 rounded-lg bg-[#f5f1e8] px-4 py-3 text-sm text-[#6b5631]">{ANONYMIZE_TEXTS.note}</p>
        <p className="mt-4 text-sm text-gray-700">
          Membro: <span className="font-semibold text-[#0d1f35]">{getDisplayName(user)}</span> ({user?.email})
        </p>

        <form onSubmit={handleSubmit} className="mt-4">
          <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700">
            Para confirmar, escreva <strong className="font-semibold text-red-600">{ANONYMIZE_CONFIRMATION_WORD}</strong>
          </label>
          <input
            ref={fieldRef}
            id={fieldId}
            type="text"
            autoComplete="off"
            spellCheck={false}
            autoCapitalize="characters"
            value={value}
            disabled={pending}
            onChange={(event) => setValue(event.target.value)}
            className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50"
          />

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className={`${buttonBase} border border-gray-200 bg-white text-gray-700 hover:bg-gray-50`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!confirmed || pending}
              className={`${buttonBase} bg-red-600 text-white hover:bg-red-700`}
            >
              {pending ? 'A processar...' : ANONYMIZE_TEXTS.confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
