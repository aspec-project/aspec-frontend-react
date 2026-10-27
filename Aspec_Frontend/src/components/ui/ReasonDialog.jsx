import { useEffect, useId, useRef, useState } from 'react'
import { X } from 'lucide-react'

const TONE_CLASSES = {
  primary: 'bg-[#0d1f35] hover:bg-[#183650]',
  danger: 'bg-red-600 hover:bg-red-700',
}

const buttonBase = 'rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Diálogo de confirmação com um campo de texto opcional ou obrigatório (ex.: justificação ao recusar,
 * bloquear ou apagar um evento). Por omissão o botão de confirmar nunca fica desativado por o campo estar
 * vazio; com `required` só confirma com texto que não seja só espaços. Entrega sempre o texto tal como foi
 * escrito. Opcionalmente mostra um ícone antes do título, uma ajuda por baixo do campo e um erro por cima
 * dos botões (o erro não apaga o texto escrito). Foco inicial no campo, Enter no campo faz nova linha, Escape e "Fechar" cancelam (exceto
 * durante o pedido), Tab preso entre o campo e os botões ativos e foco devolvido ao elemento que o
 * tinha antes de abrir. O texto recomeça vazio sempre que o diálogo abre.
 *
 * @param {{
 *   open: boolean,
 *   title?: string,
 *   description?: string,
 *   note?: string,
 *   confirmLabel?: string,
 *   cancelLabel?: string,
 *   tone?: 'primary'|'danger',
 *   label?: string,
 *   placeholder?: string,
 *   maxLength?: number,
 *   pending?: boolean,
 *   required?: boolean,
 *   hint?: string,
 *   icon?: import('react').ComponentType,
 *   error?: string,
 *   onConfirm: (reason: string) => void,
 *   onCancel: () => void,
 * }} props
 * @returns {JSX.Element|null}
 */
export default function ReasonDialog({
  open,
  title,
  description,
  note,
  confirmLabel,
  cancelLabel = 'Cancelar',
  tone = 'danger',
  label = 'Justificação (opcional)',
  placeholder = 'Explique o motivo da decisão...',
  maxLength = 2000,
  pending = false,
  required = false,
  hint,
  icon: Icon,
  error,
  onConfirm,
  onCancel,
}) {
  const titleId = useId()
  const descriptionId = useId()
  const noteId = useId()
  const fieldId = useId()
  const counterId = useId()
  const hintId = useId()
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

  const blocked = required && value.trim() === ''

  /**
   * Confirma com o texto escrito, sem pedido em curso.
   *
   * @param {import('react').FormEvent} event
   */
  const handleSubmit = (event) => {
    event.preventDefault()
    if (!pending && !blocked) onConfirm(value)
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

    const focusable = Array.from(dialogRef.current.querySelectorAll('textarea:not([disabled]), button:not([disabled])'))

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
        aria-describedby={note ? `${descriptionId} ${noteId}` : descriptionId}
        onKeyDown={handleKeyDown}
        className="relative w-full max-w-lg rounded-xl bg-white p-6 text-left shadow-xl"
      >
        <button
          type="button"
          aria-label="Fechar"
          disabled={pending}
          onClick={onCancel}
          className="absolute right-4 top-4 rounded p-1 text-gray-500 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X size={18} aria-hidden="true" />
        </button>
        <h2 id={titleId} className={`pr-7 text-lg font-semibold ${Icon && tone === 'danger' ? 'text-red-600' : 'text-[#0d1f35]'} ${Icon ? 'flex items-center gap-2' : ''}`}>
          {Icon && <Icon size={20} aria-hidden="true" className="shrink-0" />}
          {title}
        </h2>
        <p id={descriptionId} className="mt-3 text-sm text-gray-600">{description}</p>
        {note && <p id={noteId} role="note" className="mt-4 rounded-lg bg-[#f5f1e8] px-4 py-3 text-sm text-[#6b5631]">{note}</p>}

        <form onSubmit={handleSubmit} className="mt-4">
          <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700">
            {label}
            {required && <span aria-hidden="true" className="text-red-600"> *</span>}
          </label>
          <textarea
            ref={fieldRef}
            id={fieldId}
            rows={4}
            maxLength={maxLength}
            placeholder={placeholder}
            aria-describedby={hint ? `${hintId} ${counterId}` : counterId}
            required={required}
            value={value}
            disabled={pending}
            onChange={(event) => setValue(event.target.value)}
            className="mt-2 w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50"
          />
          <div className="mt-1 flex justify-between gap-3">
            {hint && <p id={hintId} className="text-xs text-gray-500">{hint}</p>}
            <p id={counterId} className="ml-auto text-right text-xs text-gray-500">{value.length}/{maxLength} caracteres</p>
          </div>

          {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className={`${buttonBase} border border-gray-200 bg-white text-gray-700 hover:bg-gray-50`}
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              disabled={pending || blocked}
              className={`${buttonBase} text-white ${TONE_CLASSES[tone] ?? TONE_CLASSES.danger}`}
            >
              {pending ? 'A processar...' : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
