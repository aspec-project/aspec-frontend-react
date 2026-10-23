import { useEffect, useId, useRef } from 'react'
import { Info, Send, X } from 'lucide-react'
import EventFormFields from './EventFormFields'
import useEventForm from '../../../hooks/useEventForm'

const FOCUSABLE = 'input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled)'

const buttonBase = 'rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Modal "Criar Novo Evento" do backoffice. Foco inicial no título, Escape e "Fechar" fecham (exceto durante
 * o pedido), o clique fora não fecha, Tab preso nos elementos ativos e foco devolvido ao elemento que o tinha
 * antes de abrir. Só existe enquanto está aberto, por isso cada abertura começa com o formulário vazio.
 *
 * @param {{
 *   options: {categories: object[], locations: object[], loading: boolean, error: string, retry: () => void},
 *   onClose: () => void,
 *   onSuccess: (message: string) => void,
 * }} props
 * @returns {JSX.Element}
 */
export default function CreateEventDialog({ options, onClose, onSuccess }) {
  const titleId = useId()
  const dialogRef = useRef(null)
  const form = useEventForm({ onSuccess })
  const { submitting, focusField } = form

  useEffect(() => {
    const previous = document.activeElement
    dialogRef.current?.querySelector('[name="name"]')?.focus()

    return () => {
      if (previous?.isConnected) previous.focus()
    }
  }, [])

  useEffect(() => {
    if (focusField) {
      dialogRef.current?.querySelector(`[name="${focusField.name}"]`)?.focus()
    }
  }, [focusField])

  /**
   * Envia o formulário com as mensagens próprias (sem a validação do browser).
   *
   * @param {import('react').FormEvent} event
   */
  const handleSubmit = (event) => {
    event.preventDefault()
    form.submit()
  }

  /**
   * Fecha, exceto durante o pedido.
   */
  const handleClose = () => {
    if (!submitting) onClose()
  }

  /**
   * Escape fecha (exceto durante o pedido) e Tab/Shift+Tab mantêm o foco no modal.
   *
   * @param {import('react').KeyboardEvent} event
   */
  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      handleClose()
      return
    }

    if (event.key !== 'Tab') return

    const focusable = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE))

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
        onKeyDown={handleKeyDown}
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col rounded-xl bg-white text-left shadow-xl"
      >
        <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-6 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-[#0d1f35]">Criar Novo Evento</h2>
          <button
            type="button"
            aria-label="Fechar"
            disabled={submitting}
            onClick={handleClose}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <form noValidate onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {form.formError && (
              <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {form.formError}
              </p>
            )}
            <fieldset disabled={submitting} className="min-w-0">
              <EventFormFields
                values={form.values}
                errors={form.errors}
                options={options}
                onFieldChange={form.setField}
                onFormatChange={form.setFormat}
                geocode={form.geocode}
                onVerifyAddress={form.verifyAddress}
                disabled={submitting}
              />
            </fieldset>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-6 py-4">
            {form.footerMessage ? (
              <p id="create-event-footer" className="flex min-w-0 flex-1 items-start gap-2 text-sm text-gray-600">
                <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
                {form.footerMessage}
              </p>
            ) : (
              <span className="flex-1" />
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className={`${buttonBase} border border-gray-200 bg-white text-gray-700 hover:bg-gray-50`}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!form.canSubmit}
                aria-describedby={form.footerMessage ? 'create-event-footer' : undefined}
                className={`${buttonBase} flex items-center gap-2 bg-[#0d1f35] text-white hover:bg-[#183650]`}
              >
                <Send size={16} aria-hidden="true" />
                {submitting ? 'A criar...' : 'Criar evento'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
