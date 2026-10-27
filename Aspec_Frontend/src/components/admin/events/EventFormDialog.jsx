import { useEffect, useId, useLayoutEffect, useRef } from 'react'
import { Info, Mail, Save, Send, X } from 'lucide-react'
import EventChangesList from './EventChangesList'
import EventFormFields from './EventFormFields'
import ReasonDialog from '../../ui/ReasonDialog'
import useEventForm from '../../../hooks/useEventForm'
import { EVENT_EDIT_TEXTS, EVENT_FORM_LIMITS, getChangeNotice, getEventChangeSummary } from '../../../utils/adminEventForm'

const FOCUSABLE = 'input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled)'

const buttonBase = 'rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50'

const MODE_TEXTS = {
  create: { title: 'Criar Novo Evento', submit: 'Criar evento', pending: 'A criar...', icon: Send },
  edit: { title: 'Editar Evento', submit: 'Guardar alterações', pending: 'A guardar...', icon: Save },
}

/**
 * Nomes por id a partir das opções carregadas e do item do evento (para a lista de alterações).
 *
 * @param {object[]} list Opções carregadas ({id, name}).
 * @param {{id: string, name: string}|null|undefined} current Opção guardada no evento.
 * @returns {Record<string, string>}
 */
function namesById(list, current) {
  const entries = (list ?? []).map((item) => [item.id, item.name])

  return Object.fromEntries(current?.id ? [[current.id, current.name], ...entries] : entries)
}

/**
 * Modal do formulário de evento do backoffice, para criar ou editar. Foco inicial no título, Escape e
 * "Fechar" fecham (exceto durante o pedido), o clique fora não fecha, Tab preso nos elementos ativos e foco
 * devolvido ao elemento que o tinha antes de abrir. Só existe enquanto está aberto, por isso cada abertura
 * começa com o formulário vazio (criação) ou com os dados do evento (edição). Na edição, "Guardar alterações"
 * abre sempre o diálogo "Confirmar alterações?" com a lista do que mudou; com inscritos (ou com o número
 * desconhecido) avisa do email e aceita uma justificação opcional, sem inscritos só pede para guardar.
 * O diálogo fica fora do modal para o Escape e o Tab dele não chegarem ao modal.
 *
 * @param {{
 *   mode: 'create'|'edit',
 *   event?: object|null,
 *   options: {categories: object[], locations: object[], loading: boolean, error: string, retry: () => void},
 *   onClose: () => void,
 *   onSuccess: (message: string) => void,
 *   onStale?: (message: string) => void,
 * }} props
 * @returns {JSX.Element}
 */
export default function EventFormDialog({ mode, event = null, options, onClose, onSuccess, onStale }) {
  const titleId = useId()
  const footerId = useId()
  const dialogRef = useRef(null)
  const form = useEventForm({ onSuccess, onStale, event: mode === 'edit' ? event : null })
  const { submitting, focusField } = form
  const texts = MODE_TEXTS[mode] ?? MODE_TEXTS.create
  const SubmitIcon = texts.icon

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
   * Envia o formulário com as mensagens próprias (sem a validação do browser).
   *
   * @param {import('react').FormEvent} submitEvent
   */
  const handleSubmit = (submitEvent) => {
    submitEvent.preventDefault()
    form.requestSubmit()
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

  const notice = getChangeNotice(form.registrationsCount)
  const changes = form.isEditing && form.confirming
    ? getEventChangeSummary(form.initialValues, form.values, {
      categoryId: namesById(options.categories, event?.category),
      locationId: namesById(options.locations, event?.location),
    })
    : []

  return (
    <>
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
            <h2 id={titleId} className="text-lg font-semibold text-[#0d1f35]">{texts.title}</h2>
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
                  isEditing={form.isEditing}
                  registrationsCount={form.registrationsCount}
                />
              </fieldset>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-6 py-4">
              {form.footerMessage ? (
                <p id={footerId} className="flex min-w-0 flex-1 items-start gap-2 text-sm text-gray-600">
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
                  aria-describedby={form.footerMessage ? footerId : undefined}
                  className={`${buttonBase} flex items-center gap-2 bg-[#0d1f35] text-white hover:bg-[#183650]`}
                >
                  <SubmitIcon size={16} aria-hidden="true" />
                  {submitting ? texts.pending : texts.submit}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {form.isEditing && (
        <div className="relative z-[70]">
          <ReasonDialog
            open={form.confirming}
            title={EVENT_EDIT_TEXTS.confirmTitle}
            subtitle={form.initialValues.name}
            tone="primary"
            icon={notice.notify ? Mail : Save}
            description={(
              <>
                {notice.lead}
                {notice.emphasis && <strong>{notice.emphasis}</strong>}
                {notice.tail}
              </>
            )}
            withField={notice.notify}
            placeholder={EVENT_EDIT_TEXTS.justificationPlaceholder}
            maxLength={EVENT_FORM_LIMITS.justification}
            confirmLabel={notice.notify ? EVENT_EDIT_TEXTS.confirmNotify : EVENT_EDIT_TEXTS.confirmSave}
            cancelLabel={EVENT_EDIT_TEXTS.confirmCancel}
            pending={submitting}
            error={form.confirmError}
            onConfirm={form.confirmSubmit}
            onCancel={form.cancelConfirm}
          >
            <EventChangesList changes={changes} />
          </ReasonDialog>
        </div>
      )}
    </>
  )
}
