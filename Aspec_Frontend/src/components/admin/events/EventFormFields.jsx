import { useId } from 'react'
import { CalendarDays, LocateFixed, MapPin, Repeat, Video } from 'lucide-react'
import EventField from './EventField'
import EventMapPreview from './EventMapPreview'
import EventSeriesPreview from './EventSeriesPreview'
import DatePicker from '../../ui/DatePicker'
import SegmentedControl from '../../ui/SegmentedControl'
import SelectMenu from '../../ui/SelectMenu'
import TimeInput from '../../ui/TimeInput'
import { EVENT_EDIT_TEXTS, EVENT_FORM_LIMITS, EVENT_FORM_MESSAGES, getCapacityHint, getDeadlineMax, getLisbonNow } from '../../../utils/adminEventForm'
import { EVENT_SERIES_TEXTS, FREQUENCY_OPTIONS, getSeriesEndLimits } from '../../../utils/adminEventSeries'

const controlClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] aria-invalid:border-red-400 disabled:cursor-not-allowed disabled:bg-gray-100'

const inputClass = `${controlClass} h-11`

const FORMATS = [
  { value: false, label: 'Presencial', icon: MapPin },
  { value: true, label: 'Online', icon: Video },
]

const REPETITIONS = [
  { value: false, label: 'Pontual', icon: CalendarDays },
  { value: true, label: 'Recorrente', icon: Repeat },
]

/** Campos da série: um erro em qualquer um esconde a pré-visualização e o texto de espera. */
const SERIES_ERROR_FIELDS = ['frequency', 'seriesEndsOn', 'deadlineDaysBefore']

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
 * verificação da morada explica que o servidor a localiza ao guardar. No presencial, o botão de localizar
 * fica à direita da morada e, por baixo do nome do local e da morada, o mapa da Google mostra o local
 * encontrado ou a zona da delegação escolhida (com a confirmação dos locais aproximados). Só na criação há
 * o controlo "Repetição": em Recorrente, a data, as horas e a data limite saem do sítio de sempre e a caixa
 * "Recorrência" (logo a seguir ao tipo e à delegação) junta a frequência, o início, o fim, as horas e o fecho
 * das inscrições em dias; no fundo da caixa aparece a pré-visualização das sessões (1 a 52 sessões, sem erros
 * nos campos da série), nada quando há erros de série, ou um texto de espera. Cada controlo existe uma só
 * vez e tem `name` igual à chave do formulário, para o modal o poder focar.
 *
 * @param {{
 *   values: object,
 *   errors: Record<string, string>,
 *   options: {categories: object[], locations: object[], loading: boolean, error: string, retry: () => void},
 *   onFieldChange: (name: string, value: string) => void,
 *   onFormatChange: (isOnline: boolean) => void,
 *   onRepetitionChange?: (isRecurring: boolean) => void,
 *   seriesSessions?: {dates: string[], tooMany: boolean},
 *   geocode: {status: 'idle'|'saved'|'loading'|'found'|'error', result: object|null, message: string},
 *   onVerifyAddress: () => void,
 *   onConfirmLocation: () => void,
 *   disabled?: boolean,
 *   isEditing?: boolean,
 *   registrationsCount?: number|null,
 * }} props
 * @returns {JSX.Element}
 */
export default function EventFormFields({ values, errors, options, onFieldChange, onFormatChange, onRepetitionChange, seriesSessions, geocode, onVerifyAddress, onConfirmLocation, disabled = false, isEditing = false, registrationsCount = null }) {
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
  const isRecurring = !isEditing && Boolean(values.isRecurring)
  const frequencyHint = values.frequency === 'monthly' ? EVENT_SERIES_TEXTS.monthlyHint : ''
  const endLimits = getSeriesEndLimits(values.eventDate, values.frequency)
  const sessionDates = seriesSessions?.dates ?? []
  const hasSeriesError = Boolean(seriesSessions?.tooMany) || SERIES_ERROR_FIELDS.some((name) => errors[name])
  const showPreview = isRecurring && sessionDates.length > 0 && !hasSeriesError
  const inclusiveSuffix = <span className="font-normal text-gray-400"> {EVENT_SERIES_TEXTS.inclusiveSuffix}</span>
  const canVerify = values.address.trim() !== '' && geocode.status !== 'loading'
  const zoneName = options.locations.find((location) => location.id === values.locationId)?.name ?? ''
  const timeFields = (
    <>
      <EventField {...fieldProps('startTime', 'Hora de início')}>
        <TimeInput {...customProps('startTime')} required />
      </EventField>
      <EventField {...fieldProps('endTime', 'Hora de fim')}>
        <TimeInput {...customProps('endTime')} required />
      </EventField>
    </>
  )

  return (
    <div className="space-y-5">
      <div>
        <div className="grid gap-5 sm:grid-cols-2">
          <SegmentedControl label="Formato" options={FORMATS} value={values.isOnline} onChange={onFormatChange} />
          {!isEditing && (
            <SegmentedControl
              label={EVENT_SERIES_TEXTS.repetitionLabel}
              options={REPETITIONS}
              value={isRecurring}
              onChange={onRepetitionChange}
            />
          )}
        </div>
        {isRecurring && <p className="mt-2 text-xs text-gray-500">{EVENT_SERIES_TEXTS.notAnnounced}</p>}
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

      {isRecurring ? (
        <div role="group" aria-labelledby={`${prefix}-recurrence-title`} className="space-y-5 rounded-xl border border-[#e7e2d6] bg-[#f5f3ee] p-5">
          <h3 id={`${prefix}-recurrence-title`} className="flex items-center gap-2 text-sm font-semibold text-[#0d1f35]">
            <Repeat size={16} aria-hidden="true" className="text-[#8a7043]" />
            {EVENT_SERIES_TEXTS.boxTitle}
          </h3>

          <div className="grid gap-5 sm:grid-cols-3">
            <EventField {...fieldProps('frequency', EVENT_SERIES_TEXTS.frequencyLabel, { hint: frequencyHint })}>
              <SelectMenu
                {...customProps('frequency', { hint: frequencyHint })}
                label={EVENT_SERIES_TEXTS.frequencyLabel}
                labelId={`${prefix}-frequency-label`}
                required
                placeholder={EVENT_SERIES_TEXTS.frequencyPlaceholder}
                options={FREQUENCY_OPTIONS}
              />
            </EventField>
            <EventField {...fieldProps('eventDate', EVENT_SERIES_TEXTS.firstDateLabel, { labelSuffix: inclusiveSuffix })}>
              <DatePicker
                {...customProps('eventDate')}
                label={EVENT_SERIES_TEXTS.firstDateLabel}
                labelId={`${prefix}-eventDate-label`}
                min={today}
                placeholder="Selecionar data"
              />
            </EventField>
            <EventField {...fieldProps('seriesEndsOn', EVENT_SERIES_TEXTS.endsOnLabel, { hint: EVENT_SERIES_TEXTS.endsOnHint, labelSuffix: inclusiveSuffix })}>
              <DatePicker
                {...customProps('seriesEndsOn', { hint: EVENT_SERIES_TEXTS.endsOnHint })}
                label={EVENT_SERIES_TEXTS.endsOnLabel}
                labelId={`${prefix}-seriesEndsOn-label`}
                min={endLimits.min ?? today}
                max={endLimits.max}
                placeholder="Selecionar data"
              />
            </EventField>
          </div>

          <div className="grid gap-5 sm:grid-cols-4">
            {timeFields}
            <div className="sm:col-span-2">
              <EventField {...fieldProps('deadlineDaysBefore', EVENT_SERIES_TEXTS.deadlineDaysLabel, { hint: EVENT_SERIES_TEXTS.deadlineDaysHint })}>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    {...controlProps('deadlineDaysBefore', { hint: EVENT_SERIES_TEXTS.deadlineDaysHint })}
                    aria-describedby={[`${prefix}-deadlineDaysBefore-unit`, describedBy(`${prefix}-deadlineDaysBefore`, { hint: EVENT_SERIES_TEXTS.deadlineDaysHint, error: errors.deadlineDaysBefore })].join(' ')}
                  />
                  <span id={`${prefix}-deadlineDaysBefore-unit`} className="shrink-0 text-sm text-gray-600">{EVENT_SERIES_TEXTS.deadlineDaysUnit}</span>
                </div>
              </EventField>
            </div>
          </div>

          {showPreview ? (
            <EventSeriesPreview dates={sessionDates} frequency={values.frequency} deadlineDaysBefore={values.deadlineDaysBefore} />
          ) : !hasSeriesError && (
            <p className="text-sm text-gray-500">{EVENT_SERIES_TEXTS.previewPlaceholder}</p>
          )}
        </div>
      ) : (
        <>
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
            {timeFields}
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
        </>
      )}

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
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={EVENT_FORM_LIMITS.address}
                  placeholder="Ex.: Rua das Flores, 42, 1200-001 Lisboa"
                  {...controlProps('address')}
                  className={`${inputClass} min-w-0 flex-1`}
                />
                <button
                  type="button"
                  onClick={onVerifyAddress}
                  disabled={!canVerify || disabled}
                  aria-label="Verificar no mapa"
                  title="Verificar no mapa"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-[#8a7043] hover:border-[#0d1f35] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <LocateFixed size={18} aria-hidden="true" />
                </button>
              </div>
            </EventField>
          </div>
          <div className="mt-5">
            <EventMapPreview
              geocode={geocode}
              zoneName={zoneName}
              onConfirmLocation={onConfirmLocation}
              disabled={disabled}
              idleHint={isEditing ? EVENT_EDIT_TEXTS.geocodeHint : undefined}
            />
          </div>
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
