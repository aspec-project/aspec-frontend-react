import { useId } from 'react'
import { MapPin, Video } from 'lucide-react'
import AddressGeocodeCheck from './AddressGeocodeCheck'
import EventField from './EventField'
import { EVENT_FORM_LIMITS, EVENT_FORM_MESSAGES, getLisbonNow } from '../../../utils/adminEventForm'

const controlClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] aria-invalid:border-red-400 disabled:cursor-not-allowed disabled:bg-gray-100'

const FORMATS = [
  { isOnline: false, label: 'Presencial', icon: MapPin },
  { isOnline: true, label: 'Online', icon: Video },
]

const HINTS = {
  registrationDeadline: 'Fecha às 23:59 (hora de Lisboa) desse dia.',
  onlineUrl: 'Só os inscritos veem o link, depois do fecho das inscrições.',
  description: 'Visível na página pública do evento para todos os visitantes.',
  organizerNotes: 'Visíveis a todos na página do evento, incluindo visitantes. Não inclua informação confidencial nem o link do evento online.',
}

/**
 * Ids do hint, contador e erro de um campo, para o `aria-describedby` do controlo.
 *
 * @param {string} id Id do controlo.
 * @param {{hint?: string, counter?: string, error?: string}} parts Partes presentes.
 * @returns {string|undefined}
 */
function describedBy(id, { hint, counter, error }) {
  const ids = [hint && `${id}-hint`, counter && `${id}-counter`, error && `${id}-error`].filter(Boolean)

  return ids.length > 0 ? ids.join(' ') : undefined
}

/**
 * Campos do formulário de evento do backoffice (formato, dados, local ou link, capacidade e textos), pela
 * ordem do design. Não sabe se está a criar ou a editar: recebe os valores e avisa as alterações.
 * Cada controlo tem `name` igual à chave do formulário, para o modal o poder focar.
 *
 * @param {{
 *   values: object,
 *   errors: Record<string, string>,
 *   options: {categories: object[], locations: object[], loading: boolean, error: string, retry: () => void},
 *   onFieldChange: (name: string, value: string) => void,
 *   onFormatChange: (isOnline: boolean) => void,
 *   geocode: {status: 'idle'|'loading'|'found'|'error', result: object|null, message: string},
 *   onVerifyAddress: () => void,
 *   disabled?: boolean,
 * }} props
 * @returns {JSX.Element}
 */
export default function EventFormFields({ values, errors, options, onFieldChange, onFormatChange, geocode, onVerifyAddress, disabled = false }) {
  const prefix = useId()
  const today = getLisbonNow().date
  const selectsDisabled = options.loading || Boolean(options.error)

  /**
   * Atributos comuns de um controlo: id, name, valor, alteração, erro e descrição.
   *
   * @param {string} name Chave do formulário.
   * @param {{hint?: string, counter?: string}} [parts] Hint e contador do campo.
   * @returns {object}
   */
  const controlProps = (name, parts = {}) => {
    const id = `${prefix}-${name}`
    const error = errors[name]

    return {
      id,
      name,
      value: values[name],
      onChange: (event) => onFieldChange(name, event.target.value),
      'aria-invalid': error ? 'true' : undefined,
      'aria-required': name === 'organizerNotes' ? undefined : 'true',
      'aria-describedby': describedBy(id, { ...parts, error }),
      className: controlClass,
    }
  }

  /**
   * Propriedades de EventField para um campo.
   *
   * @param {string} name Chave do formulário.
   * @param {string} label Texto da label.
   * @param {{hint?: string, counter?: string, required?: boolean}} [parts]
   * @returns {object}
   */
  const fieldProps = (name, label, { required = true, ...parts } = {}) => ({
    id: `${prefix}-${name}`,
    label,
    required,
    error: errors[name],
    ...parts,
  })

  const descriptionCounter = `${values.description.length}/${EVENT_FORM_LIMITS.description} caracteres`
  const notesCounter = `${values.organizerNotes.length}/${EVENT_FORM_LIMITS.organizerNotes} caracteres`

  return (
    <div className="space-y-5">
      <div role="group" aria-label="Formato" className="grid grid-cols-2 gap-3">
        {FORMATS.map(({ isOnline, label, icon: Icon }) => {
          const active = values.isOnline === isOnline

          return (
            <button
              key={label}
              type="button"
              aria-pressed={active}
              onClick={() => onFormatChange(isOnline)}
              className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50 ${active ? 'border-[#0d1f35] bg-[#0d1f35] text-white' : 'border-gray-200 bg-white text-[#0d1f35] hover:border-[#0d1f35]'}`}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </button>
          )
        })}
      </div>

      <EventField {...fieldProps('name', 'Título do evento')}>
        <input
          type="text"
          maxLength={EVENT_FORM_LIMITS.name}
          placeholder="Ex.: Jantar de Networking Lisboa — Março"
          {...controlProps('name')}
        />
      </EventField>

      <div className="grid gap-5 sm:grid-cols-2">
        <EventField {...fieldProps('categoryId', 'Tipo de evento')}>
          <select disabled={selectsDisabled} {...controlProps('categoryId')}>
            {options.loading ? (
              <option value="">A carregar...</option>
            ) : (
              <>
                <option value="">Selecione o tipo de evento</option>
                {options.categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </>
            )}
          </select>
        </EventField>

        <EventField {...fieldProps('locationId', 'Delegação / Localidade')}>
          <select disabled={selectsDisabled} {...controlProps('locationId')}>
            {options.loading ? (
              <option value="">A carregar...</option>
            ) : (
              <>
                <option value="">Selecione a delegação</option>
                {options.locations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </>
            )}
          </select>
        </EventField>
      </div>

      {options.error && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-red-700">
          <p>{EVENT_FORM_MESSAGES.optionsError}</p>
          <button
            type="button"
            onClick={options.retry}
            className="font-semibold text-[#0d1f35] underline hover:text-[#8a7043] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79]"
          >
            Tentar carregar novamente
          </button>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-3">
        <EventField {...fieldProps('eventDate', 'Data')}>
          <input type="date" min={today} {...controlProps('eventDate')} />
        </EventField>
        <EventField {...fieldProps('startTime', 'Hora de início')}>
          <input type="time" {...controlProps('startTime')} />
        </EventField>
        <EventField {...fieldProps('endTime', 'Hora de fim')}>
          <input type="time" {...controlProps('endTime')} />
        </EventField>
      </div>

      <EventField {...fieldProps('registrationDeadline', 'Data limite de inscrição', { hint: HINTS.registrationDeadline })}>
        <input
          type="date"
          min={today}
          max={values.eventDate || undefined}
          {...controlProps('registrationDeadline', { hint: HINTS.registrationDeadline })}
        />
      </EventField>

      {values.isOnline ? (
        <EventField {...fieldProps('onlineUrl', 'Link do evento online', { hint: HINTS.onlineUrl })}>
          <input
            type="url"
            maxLength={EVENT_FORM_LIMITS.onlineUrl}
            placeholder="https://"
            {...controlProps('onlineUrl', { hint: HINTS.onlineUrl })}
          />
        </EventField>
      ) : (
        <>
          <EventField {...fieldProps('venueName', 'Nome do local')}>
            <input
              type="text"
              maxLength={EVENT_FORM_LIMITS.venueName}
              placeholder="Ex.: Restaurante Estrela do Norte"
              {...controlProps('venueName')}
            />
          </EventField>

          <div>
            <EventField {...fieldProps('address', 'Morada completa')}>
              <input
                type="text"
                maxLength={EVENT_FORM_LIMITS.address}
                placeholder="Ex.: Rua das Flores, 42, 1200-001 Lisboa"
                {...controlProps('address')}
              />
            </EventField>
            <AddressGeocodeCheck
              geocode={geocode}
              canVerify={values.address.trim() !== '' && geocode.status !== 'loading'}
              onVerify={onVerifyAddress}
              disabled={disabled}
            />
          </div>
        </>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <EventField {...fieldProps('maxAttendees', 'Capacidade máxima')}>
          <input
            type="number"
            min={1}
            max={EVENT_FORM_LIMITS.maxAttendees}
            step={1}
            inputMode="numeric"
            {...controlProps('maxAttendees')}
          />
        </EventField>
      </div>

      <hr className="border-gray-200" />

      <EventField {...fieldProps('description', 'Sobre o evento', { hint: HINTS.description, counter: descriptionCounter })}>
        <textarea
          rows={4}
          maxLength={EVENT_FORM_LIMITS.description}
          {...controlProps('description', { hint: HINTS.description, counter: descriptionCounter })}
          className={`${controlClass} resize-y`}
        />
      </EventField>

      <EventField {...fieldProps('organizerNotes', 'Notas do organizador (visíveis a todos)', { required: false, hint: HINTS.organizerNotes, counter: notesCounter })}>
        <textarea
          rows={3}
          maxLength={EVENT_FORM_LIMITS.organizerNotes}
          {...controlProps('organizerNotes', { hint: HINTS.organizerNotes, counter: notesCounter })}
          className={`${controlClass} resize-y`}
        />
      </EventField>
    </div>
  )
}
