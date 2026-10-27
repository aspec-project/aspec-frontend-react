import { useId } from 'react'
import { MapPin, Video } from 'lucide-react'
import AddressGeocodeCheck from './AddressGeocodeCheck'
import EventField from './EventField'
import DatePicker from '../../ui/DatePicker'
import SegmentedControl from '../../ui/SegmentedControl'
import SelectMenu from '../../ui/SelectMenu'
import TimeInput from '../../ui/TimeInput'
import { EVENT_EDIT_TEXTS, EVENT_FORM_LIMITS, EVENT_FORM_MESSAGES, getCapacityHint, getDeadlineMax, getLisbonNow } from '../../../utils/adminEventForm'

const controlClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] aria-invalid:border-red-400 disabled:cursor-not-allowed disabled:bg-gray-100'

const inputClass = `${controlClass} h-11`

const FORMATS = [
  { value: false, label: 'Presencial', icon: MapPin },
  { value: true, label: 'Online', icon: Video },
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
 * grelha do design: formato segmentado, listas próprias para o tipo e a delegação, calendários para as
 * datas (o prazo só até à véspera do evento) e campos de hora ao minuto. Recebe os valores e avisa as
 * alterações; na edição (`isEditing`) só muda os hints: a capacidade mostra o número de inscritos e a
 * verificação da morada explica que o servidor a localiza ao guardar. Cada controlo tem `name` igual à
 * chave do formulário, para o modal o poder focar.
 *
 * @param {{
 *   values: object,
 *   errors: Record<string, string>,
 *   options: {categories: object[], locations: object[], loading: boolean, error: string, retry: () => void},
 *   onFieldChange: (name: string, value: string) => void,
 *   onFormatChange: (isOnline: boolean) => void,
 *   geocode: {status: 'idle'|'saved'|'loading'|'found'|'error', result: object|null, message: string},
 *   onVerifyAddress: () => void,
 *   disabled?: boolean,
 *   isEditing?: boolean,
 *   registrationsCount?: number|null,
 * }} props
 * @returns {JSX.Element}
 */
export default function EventFormFields({ values, errors, options, onFieldChange, onFormatChange, geocode, onVerifyAddress, disabled = false, isEditing = false, registrationsCount = null }) {
  const prefix = useId()
  const today = getLisbonNow().date
  const selectsDisabled = options.loading || Boolean(options.error)

  /**
   * Atributos comuns de um input ou textarea: id, name, valor, alteração, erro e descrição.
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
      className: inputClass,
    }
  }

  /**
   * Propriedades comuns dos controlos próprios (SelectMenu, DatePicker, TimeInput), que devolvem o valor
   * já escolhido em vez do evento do browser.
   *
   * @param {string} name Chave do formulário.
   * @param {{hint?: string}} [parts] Hint do campo.
   * @returns {object}
   */
  const customProps = (name, parts = {}) => {
    const id = `${prefix}-${name}`
    const error = errors[name]

    return {
      id,
      name,
      value: values[name],
      onChange: (value) => onFieldChange(name, value),
      invalid: Boolean(error),
      describedBy: describedBy(id, { ...parts, error }),
    }
  }

  /**
   * Propriedades de EventField para um campo. A label tem id próprio para os controlos que se ligam a ela
   * por `aria-labelledby`.
   *
   * @param {string} name Chave do formulário.
   * @param {string} label Texto da label.
   * @param {{hint?: string, counter?: string, required?: boolean}} [parts] Hint, contador e obrigatoriedade.
   * @returns {object}
   */
  const fieldProps = (name, label, { required = true, ...parts } = {}) => ({
    id: `${prefix}-${name}`,
    labelId: `${prefix}-${name}-label`,
    label,
    required,
    error: errors[name],
    ...parts,
  })

  /**
   * Texto do botão das listas sem valor: "A carregar..." enquanto as opções carregam.
   *
   * @param {string} text Texto quando as opções já chegaram (ou falharam).
   * @returns {string}
   */
  const selectPlaceholder = (text) => (options.loading ? 'A carregar...' : text)

  const descriptionCounter = `${values.description.length}/${EVENT_FORM_LIMITS.description} caracteres`
  const notesCounter = `${values.organizerNotes.length}/${EVENT_FORM_LIMITS.organizerNotes} caracteres`
  const capacityHint = isEditing ? getCapacityHint(registrationsCount) : ''

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <SegmentedControl label="Formato" options={FORMATS} value={values.isOnline} onChange={onFormatChange} />
      </div>

      <EventField {...fieldProps('name', 'Título do evento')}>
        <input
          type="text"
          maxLength={EVENT_FORM_LIMITS.name}
          placeholder="Ex.: Jantar de Networking Lisboa — Março"
          {...controlProps('name')}
        />
      </EventField>

      <div className="space-y-3">
        <div className="grid gap-5 sm:grid-cols-2">
          <EventField {...fieldProps('categoryId', 'Tipo de evento')}>
            <SelectMenu
              {...customProps('categoryId')}
              label="Tipo de evento"
              labelId={`${prefix}-categoryId-label`}
              required
              disabled={selectsDisabled}
              placeholder={selectPlaceholder('Selecione o tipo de evento')}
              options={options.categories.map((category) => ({ value: category.id, label: category.name }))}
            />
          </EventField>

          <EventField {...fieldProps('locationId', 'Delegação / Localidade')}>
            <SelectMenu
              {...customProps('locationId')}
              label="Delegação / Localidade"
              labelId={`${prefix}-locationId-label`}
              required
              disabled={selectsDisabled}
              placeholder={selectPlaceholder('Selecione a delegação')}
              options={options.locations.map((location) => ({ value: location.id, label: location.name }))}
            />
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
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <EventField {...fieldProps('eventDate', 'Data')}>
          <DatePicker
            {...customProps('eventDate')}
            label="Data"
            labelId={`${prefix}-eventDate-label`}
            min={today}
            placeholder="Selecionar data"
          />
        </EventField>
        <EventField {...fieldProps('startTime', 'Hora de início')}>
          <TimeInput {...customProps('startTime')} required />
        </EventField>
        <EventField {...fieldProps('endTime', 'Hora de fim')}>
          <TimeInput {...customProps('endTime')} required />
        </EventField>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <EventField {...fieldProps('registrationDeadline', 'Data limite de inscrição', { hint: HINTS.registrationDeadline })}>
          <DatePicker
            {...customProps('registrationDeadline', { hint: HINTS.registrationDeadline })}
            label="Data limite de inscrição"
            labelId={`${prefix}-registrationDeadline-label`}
            min={today}
            max={getDeadlineMax(values.eventDate)}
            placeholder="Selecionar data"
          />
        </EventField>
      </div>

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
        <div>
          <div className="grid gap-5 sm:grid-cols-2">
            <EventField {...fieldProps('venueName', 'Nome do local')}>
              <input
                type="text"
                maxLength={EVENT_FORM_LIMITS.venueName}
                placeholder="Ex.: Restaurante Estrela do Norte"
                {...controlProps('venueName')}
              />
            </EventField>

            <EventField {...fieldProps('address', 'Morada completa')}>
              <input
                type="text"
                maxLength={EVENT_FORM_LIMITS.address}
                placeholder="Ex.: Rua das Flores, 42, 1200-001 Lisboa"
                {...controlProps('address')}
              />
            </EventField>
          </div>
          <AddressGeocodeCheck
            geocode={geocode}
            canVerify={values.address.trim() !== '' && geocode.status !== 'loading'}
            onVerify={onVerifyAddress}
            disabled={disabled}
            idleHint={isEditing ? EVENT_EDIT_TEXTS.geocodeHint : undefined}
          />
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <EventField {...fieldProps('maxAttendees', 'Capacidade máxima', { hint: capacityHint })}>
          <input
            type="number"
            min={1}
            max={EVENT_FORM_LIMITS.maxAttendees}
            step={1}
            inputMode="numeric"
            {...controlProps('maxAttendees', { hint: capacityHint })}
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
