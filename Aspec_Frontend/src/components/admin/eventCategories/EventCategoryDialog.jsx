import { useEffect, useId, useLayoutEffect, useRef } from 'react'
import { Info, X } from 'lucide-react'
import CategoryColorPicker from './CategoryColorPicker'
import CategoryPreview from './CategoryPreview'
import useEventCategoryForm from '../../../hooks/useEventCategoryForm'
import { CATEGORY_NAME_MAX_LENGTH, EVENT_CATEGORY_TEXTS } from '../../../utils/eventCategories'

const FOCUSABLE = 'input:not(:disabled), button:not(:disabled), [tabindex="0"]'

const buttonBase = 'rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Diálogo de criar ou editar um tipo de evento, em duas colunas: nome e pré-visualização à esquerda, cor
 * (roda, Luminosidade, Hexadecimal e RGB) à direita. Foco inicial no nome, Escape e "Fechar"/"Cancelar"
 * fecham (exceto durante o pedido), o clique fora não fecha, Tab preso nos elementos ativos e foco devolvido
 * ao elemento que o tinha antes de abrir. Só existe enquanto está aberto, por isso cada abertura começa limpa.
 * Na edição, "Guardar alterações" só fica ativo com uma alteração real.
 *
 * @param {{
 *   category: object|null,
 *   categories: object[],
 *   onClose: () => void,
 *   onSuccess: (message: string) => void,
 *   onStale: (message: string) => void,
 * }} props category é null ao criar.
 * @returns {JSX.Element}
 */
export default function EventCategoryDialog({ category, categories, onClose, onSuccess, onStale }) {
  const titleId = useId()
  const nameId = useId()
  const nameErrorId = useId()
  const counterId = useId()
  const footerId = useId()
  const dialogRef = useRef(null)
  const form = useEventCategoryForm({ category, categories, onSuccess, onStale })
  const { submitting, focusField } = form
  const isEditing = Boolean(category)
  const showNoChanges = isEditing && !form.changed

  // useLayoutEffect: ao fechar, o foco volta ao botão antes de a página o desativar (a lista recarrega).
  useLayoutEffect(() => {
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
   * Envia o formulário sem a validação do browser (as mensagens são as do backend).
   *
   * @param {import('react').FormEvent} submitEvent
   */
  const handleSubmit = (submitEvent) => {
    submitEvent.preventDefault()
    form.submit()
  }

  /**
   * Fecha, exceto durante o pedido.
   */
  const handleClose = () => {
    if (!submitting) onClose()
  }

  /**
   * Escape fecha (exceto durante o pedido) e Tab/Shift+Tab mantêm o foco no diálogo.
   *
   * @param {import('react').KeyboardEvent} keyEvent
   */
  const handleKeyDown = (keyEvent) => {
    if (keyEvent.key === 'Escape') {
      keyEvent.preventDefault()
      handleClose()
      return
    }

    if (keyEvent.key !== 'Tab') return

    const focusable = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE))

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

  const nameDescribedBy = [form.errors.name ? nameErrorId : null, counterId].filter(Boolean).join(' ')

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col rounded-xl bg-white text-left shadow-xl"
      >
        <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-6 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-[#0d1f35]">
            {isEditing ? EVENT_CATEGORY_TEXTS.editTitle : EVENT_CATEGORY_TEXTS.createTitle}
          </h2>
          <button
            type="button"
            aria-label={EVENT_CATEGORY_TEXTS.close}
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
            <fieldset disabled={submitting} className="grid min-w-0 gap-6 md:grid-cols-2">
              <div className="space-y-5">
                <div>
                  <label htmlFor={nameId} className="mb-1 block text-sm font-medium text-gray-700">{EVENT_CATEGORY_TEXTS.nameLabel}</label>
                  <input
                    id={nameId}
                    name="name"
                    type="text"
                    value={form.name}
                    maxLength={CATEGORY_NAME_MAX_LENGTH}
                    placeholder={EVENT_CATEGORY_TEXTS.namePlaceholder}
                    autoComplete="off"
                    aria-invalid={form.errors.name ? 'true' : undefined}
                    aria-describedby={nameDescribedBy}
                    onChange={(event) => form.setName(event.target.value)}
                    onBlur={() => form.touch('name')}
                    className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:bg-gray-100 ${form.errors.name ? 'border-red-400' : 'border-gray-200'}`}
                  />
                  <div className="mt-1 flex items-start justify-between gap-3">
                    {form.errors.name ? <p id={nameErrorId} className="text-sm text-red-700">{form.errors.name}</p> : <span />}
                    <p id={counterId} className="shrink-0 text-xs text-gray-500">
                      {`${Array.from(form.name).length}/${CATEGORY_NAME_MAX_LENGTH}`}
                    </p>
                  </div>
                </div>

                <CategoryPreview name={form.name} color={form.color} />
              </div>

              <CategoryColorPicker
                hsv={form.hsv}
                hexInput={form.hexInput}
                rgbInputs={form.rgbInputs}
                usedColors={form.usedColors}
                onHsvChange={form.setHsv}
                onHexChange={form.setHexInput}
                onRgbChange={form.setRgbInput}
                errors={{ color: form.errors.color, rgb: form.errors.rgb }}
              />
            </fieldset>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-6 py-4">
            {showNoChanges ? (
              <p id={footerId} className="flex min-w-0 flex-1 items-start gap-2 text-sm text-gray-600">
                <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
                {EVENT_CATEGORY_TEXTS.noChanges}
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
                {EVENT_CATEGORY_TEXTS.cancel}
              </button>
              <button
                type="submit"
                disabled={!form.canSubmit}
                aria-describedby={showNoChanges ? footerId : undefined}
                className={`${buttonBase} bg-[#0d1f35] text-white hover:bg-[#183650]`}
              >
                {isEditing
                  ? (submitting ? EVENT_CATEGORY_TEXTS.editPending : EVENT_CATEGORY_TEXTS.editSubmit)
                  : (submitting ? EVENT_CATEGORY_TEXTS.createPending : EVENT_CATEGORY_TEXTS.createSubmit)}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
