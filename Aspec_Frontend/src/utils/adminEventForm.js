import { addDays, parseIsoDate } from './calendar'
import { formatShortDate } from './dateFormat'
import { getSeriesSessions } from './adminEventSeries'

/**
 * Valores iniciais do formulário de evento: tudo vazio, formato presencial e repetição pontual. Os campos da
 * série (`frequency`, `seriesEndsOn`, `deadlineDaysBefore`) só se usam na criação de uma série.
 */
export const EMPTY_EVENT_FORM = {
  isOnline: false,
  isRecurring: false,
  name: '',
  categoryId: '',
  locationId: '',
  eventDate: '',
  startTime: '',
  endTime: '',
  registrationDeadline: '',
  venueName: '',
  address: '',
  onlineUrl: '',
  maxAttendees: '',
  description: '',
  organizerNotes: '',
  frequency: '',
  seriesEndsOn: '',
  deadlineDaysBefore: '',
}

/** Limites dos campos, iguais aos do EventInstanceRequest do backend. */
export const EVENT_FORM_LIMITS = {
  name: 255,
  venueName: 255,
  address: 255,
  onlineUrl: 255,
  description: 5000,
  organizerNotes: 2000,
  maxAttendees: 100000,
  justification: 2000,
}

/** Mensagens do formulário de evento (as regras partilhadas com o backend usam as frases dele). */
export const EVENT_FORM_MESSAGES = {
  endTime: 'A hora de fim deve ser posterior à hora de início.',
  eventDatePast: 'A data do evento não pode ser anterior a hoje.',
  deadlinePast: 'O prazo de inscrição tem de ser posterior à data e hora atuais.',
  deadlineAfterStart: 'O prazo de inscrição tem de ser anterior ou igual ao início do evento.',
  maxAttendees: 'A capacidade máxima tem de ser um número inteiro entre 1 e 100000.',
  onlineUrl: 'Indique um link válido que comece por http:// ou https://.',
  optionsError: 'Não foi possível carregar os tipos de evento e as delegações.',
  geocodeHint: 'Se não verificar, a morada é localizada automaticamente ao criar o evento.',
  geocodeApproximatePrefix: 'Local aproximado:',
  geocodeApproximateHint: 'Confirme se é o local certo. Se não for, corrija a morada (sem andar, lote ou loja) e verifique outra vez.',
  timeFormat: 'Indique uma hora entre 00:00 e 23:59 (ex.: 19:30).',
  deadlineDays: 'Indique um número inteiro de dias, a partir de 1.',
  firstDeadlinePast: 'O prazo calculado para a primeira sessão já passou.',
  seriesEndBeforeStart: 'A data de fim tem de ser igual ou posterior à data de início.',
  seriesTooLong: 'Uma série não pode exceder 52 sessões.',
}

/** Textos próprios do modal de edição de evento. */
export const EVENT_EDIT_TEXTS = {
  noChanges: 'Ainda não fez nenhuma alteração.',
  capacityBelowRegistrations: 'A lotação máxima não pode ser inferior ao número de inscrições existentes.',
  notFound: 'O evento já não existe. A lista foi atualizada.',
  addressNotFound: 'Não foi possível encontrar esta morada no mapa. Verifique a morada e tente novamente.',
  geocodeHint: 'Se não verificar, a morada é localizada automaticamente ao guardar as alterações.',
  geocodeSaved: 'Mantém-se a localização guardada do evento enquanto não mudar a morada nem a delegação.',
  confirmTitle: 'Confirmar alterações?',
  confirmNotify: 'Guardar e notificar',
  confirmSave: 'Guardar',
  confirmCancel: 'Voltar',
  justificationPlaceholder: 'Se quiser, explique o motivo da alteração.',
}

/** Atribuição obrigatória dos dados do OpenStreetMap (licença ODbL). */
export const GEOCODE_ATTRIBUTION = '© OpenStreetMap contributors'

/** Ordem dos campos no formulário (lista "Falta preencher" e foco no primeiro campo inválido). */
export const EVENT_FIELD_ORDER = [
  'name',
  'categoryId',
  'locationId',
  'frequency',
  'eventDate',
  'seriesEndsOn',
  'startTime',
  'endTime',
  'deadlineDaysBefore',
  'registrationDeadline',
  'venueName',
  'address',
  'onlineUrl',
  'maxAttendees',
  'description',
  'organizerNotes',
  'justification',
]

/** Nomes das datas de uma série na lista "Falta preencher" (as duas em falta juntam-se numa só entrada). */
const SERIES_START_LABEL = 'data de início'
const SERIES_END_LABEL = 'data de fim'

/** Campos que só existem na criação de uma série (não contam como alterações na edição). */
const SERIES_FIELDS = ['isRecurring', 'frequency', 'seriesEndsOn', 'deadlineDaysBefore']

/**
 * Campos obrigatórios pela ordem do formulário. `format` e `repetition` limitam o campo a um formato
 * (presencial/online) ou a uma repetição (pontual/recorrente).
 */
const REQUIRED_FIELDS = [
  { name: 'name', label: 'título' },
  { name: 'categoryId', label: 'tipo de evento' },
  { name: 'locationId', label: 'delegação' },
  { name: 'frequency', label: 'frequência', repetition: 'recurring' },
  { name: 'eventDate', label: 'data', repetition: 'single' },
  { name: 'eventDate', label: SERIES_START_LABEL, repetition: 'recurring' },
  { name: 'seriesEndsOn', label: SERIES_END_LABEL, repetition: 'recurring' },
  { name: 'startTime', label: 'hora de início' },
  { name: 'endTime', label: 'hora de fim' },
  { name: 'deadlineDaysBefore', label: 'fecho das inscrições (dias antes)', repetition: 'recurring' },
  { name: 'registrationDeadline', label: 'data limite de inscrição', repetition: 'single' },
  { name: 'venueName', label: 'nome do local', format: 'inPerson' },
  { name: 'address', label: 'morada', format: 'inPerson' },
  { name: 'onlineUrl', label: 'link do evento', format: 'online' },
  { name: 'maxAttendees', label: 'capacidade máxima' },
  { name: 'description', label: 'descrição' },
]

const SERVER_FIELD_MAP = {
  category_id: 'categoryId',
  location_id: 'locationId',
  name: 'name',
  event_date: 'eventDate',
  event_start_time: 'startTime',
  event_end_time: 'endTime',
  registration_deadline: 'registrationDeadline',
  venue_name: 'venueName',
  address: 'address',
  latitude: 'address',
  longitude: 'address',
  online_url: 'onlineUrl',
  max_attendees: 'maxAttendees',
  description: 'description',
  organizer_notes: 'organizerNotes',
  justification: 'justification',
  'recurrence.frequency': 'frequency',
  'recurrence.ends_on': 'seriesEndsOn',
  'recurrence.registration_deadline_days_before': 'deadlineDaysBefore',
  recurrence: 'frequency',
}

/** Hora a que o backend fecha as inscrições no dia do prazo (hora de Lisboa). */
const DEADLINE_TIME = '23:59'

const lisbonNowFormatter = new Intl.DateTimeFormat('pt-PT', {
  timeZone: 'Europe/Lisbon',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/**
 * Texto de um campo sem espaços nas pontas.
 *
 * @param {unknown} value Valor do campo.
 * @returns {string}
 */
function clean(value) {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Data e hora atuais em Lisboa, seja qual for o fuso do computador (o servidor decide com Europe/Lisbon).
 *
 * @param {Date} [now] Momento a converter.
 * @returns {{date: string, time: string}} Data `AAAA-MM-DD` e hora `HH:MM`.
 */
export function getLisbonNow(now = new Date()) {
  const parts = Object.fromEntries(lisbonNowFormatter.formatToParts(now).map((part) => [part.type, part.value]))

  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` }
}

/**
 * Campos obrigatórios por preencher, pela ordem do formulário. Os do local dependem do formato; a data
 * limite de inscrição (pontual) e os campos da série (recorrente) dependem da repetição. Numa série, com a
 * data de início e a de fim em falta, as duas aparecem juntas como "datas de início e fim".
 *
 * @param {typeof EMPTY_EVENT_FORM} values Valores do formulário.
 * @returns {string[]} Nomes dos campos em falta (em minúsculas).
 */
export function getMissingEventFields(values) {
  const format = values.isOnline ? 'online' : 'inPerson'
  const repetition = values.isRecurring ? 'recurring' : 'single'
  const labels = REQUIRED_FIELDS
    .filter((field) => !field.format || field.format === format)
    .filter((field) => !field.repetition || field.repetition === repetition)
    .filter((field) => clean(values[field.name]) === '')
    .map((field) => field.label)

  if (!labels.includes(SERIES_START_LABEL) || !labels.includes(SERIES_END_LABEL)) return labels

  return labels
    .filter((label) => label !== SERIES_END_LABEL)
    .map((label) => (label === SERIES_START_LABEL ? 'datas de início e fim' : label))
}

/**
 * Frase do rodapé com os campos em falta.
 *
 * @param {string[]} list Nomes dos campos em falta.
 * @returns {string} "Falta preencher: …." ou "" quando não falta nada.
 */
export function formatMissingFields(list) {
  return list.length === 0 ? '' : `Falta preencher: ${list.join(', ')}.`
}

/**
 * Indica se o link de um evento online pode ser mostrado aos inscritos: URL absoluto http/https sem
 * utilizador nem palavra-passe (a mesma regra da página do evento).
 *
 * @param {unknown} value Link escrito pelo admin.
 * @returns {boolean}
 */
export function isSafeMeetingUrl(value) {
  if (typeof value !== 'string' || value === '') return false

  try {
    const url = new URL(value)

    return (url.protocol === 'http:' || url.protocol === 'https:') && url.username === '' && url.password === ''
  } catch {
    return false
  }
}

/**
 * Regras previsíveis do backend validadas no browser. Cada regra só é avaliada quando os campos dela estão
 * preenchidos. As datas e horas comparam-se como texto (`AAAA-MM-DD HH:MM`) na hora de Lisboa.
 *
 * Na edição (3.º parâmetro), as regras "data no passado" e "prazo no passado" só se aplicam aos campos que
 * mudaram em relação aos valores iniciais, e a capacidade não pode ficar abaixo do número de inscritos.
 *
 * Numa série (`isRecurring`), as regras da data limite de inscrição não se aplicam (o campo não é enviado) e
 * validam-se o prazo em dias (inteiro ≥ 1 e prazo da 1.ª sessão no futuro) e a data da última sessão (não
 * antes da 1.ª sessão e no máximo 52 sessões).
 *
 * @param {typeof EMPTY_EVENT_FORM} values Valores do formulário.
 * @param {Date} [now] Momento atual.
 * @param {{initialValues?: typeof EMPTY_EVENT_FORM|null, registrationsCount?: number|null}} [edit] Dados da
 *   edição: valores iniciais do evento e número de inscritos.
 * @returns {Record<string, string>} Mensagem de erro por campo.
 */
export function getEventFormErrors(values, now = new Date(), { initialValues = null, registrationsCount = null } = {}) {
  const errors = {}
  const today = getLisbonNow(now)
  const { eventDate, startTime, endTime, registrationDeadline } = values
  const checkPastDate = !initialValues || eventDate !== initialValues.eventDate
  const checkPastDeadline = !initialValues || registrationDeadline !== initialValues.registrationDeadline

  if (checkPastDate && eventDate && eventDate < today.date) {
    errors.eventDate = EVENT_FORM_MESSAGES.eventDatePast
  }

  if (startTime && endTime && endTime <= startTime) {
    errors.endTime = EVENT_FORM_MESSAGES.endTime
  }

  if (values.isRecurring) {
    Object.assign(errors, getSeriesErrors(values, `${today.date} ${today.time}`))
  } else if (registrationDeadline) {
    const deadline = `${registrationDeadline} ${DEADLINE_TIME}`

    if (checkPastDeadline && deadline <= `${today.date} ${today.time}`) {
      errors.registrationDeadline = EVENT_FORM_MESSAGES.deadlinePast
    } else if (eventDate && startTime && deadline > `${eventDate} ${startTime}`) {
      errors.registrationDeadline = EVENT_FORM_MESSAGES.deadlineAfterStart
    }
  }

  const capacity = clean(values.maxAttendees)

  if (capacity !== '') {
    const number = Number(capacity)

    if (!/^\d+$/.test(capacity) || number < 1 || number > EVENT_FORM_LIMITS.maxAttendees) {
      errors.maxAttendees = EVENT_FORM_MESSAGES.maxAttendees
    } else if (Number.isInteger(registrationsCount) && registrationsCount >= 0 && number < registrationsCount) {
      errors.maxAttendees = EVENT_EDIT_TEXTS.capacityBelowRegistrations
    }
  }

  const onlineUrl = clean(values.onlineUrl)

  if (values.isOnline && onlineUrl !== '' && !isSafeMeetingUrl(onlineUrl)) {
    errors.onlineUrl = EVENT_FORM_MESSAGES.onlineUrl
  }

  return errors
}

/**
 * Erros dos campos de uma série. Cada regra só é avaliada quando os campos dela estão preenchidos.
 *
 * @param {typeof EMPTY_EVENT_FORM} values Valores do formulário.
 * @param {string} now Data e hora atuais em Lisboa (`AAAA-MM-DD HH:MM`).
 * @returns {Record<string, string>} Mensagem de erro por campo.
 */
function getSeriesErrors(values, now) {
  const errors = {}
  const { eventDate, seriesEndsOn, frequency } = values
  const days = clean(values.deadlineDaysBefore)

  if (days !== '') {
    if (!/^\d+$/.test(days) || Number(days) < 1) {
      errors.deadlineDaysBefore = EVENT_FORM_MESSAGES.deadlineDays
    } else if (parseIsoDate(eventDate) && `${addDays(eventDate, -Number(days))} ${DEADLINE_TIME}` <= now) {
      errors.deadlineDaysBefore = EVENT_FORM_MESSAGES.firstDeadlinePast
    }
  }

  if (eventDate && seriesEndsOn) {
    if (seriesEndsOn < eventDate) {
      errors.seriesEndsOn = EVENT_FORM_MESSAGES.seriesEndBeforeStart
    } else if (frequency && getSeriesSessions(eventDate, seriesEndsOn, frequency).tooMany) {
      errors.seriesEndsOn = EVENT_FORM_MESSAGES.seriesTooLong
    }
  }

  return errors
}

/**
 * Corpo do POST construído campo a campo (só as chaves do contrato). Num presencial, as coordenadas só
 * seguem se a verificação foi feita com a morada e a delegação atuais; num online, nunca seguem a morada,
 * o local nem as coordenadas. Numa série não segue a chave `registration_deadline` (o backend proíbe-a com a
 * `recurrence`) e segue a `recurrence` com as 3 chaves do contrato; num pontual a chave `recurrence` não
 * existe (o backend usa `has('recurrence')`).
 *
 * @param {typeof EMPTY_EVENT_FORM} values Valores do formulário.
 * @param {{result: {latitude: number, longitude: number}|null, query: {address: string, locationId: string}|null}} geocode
 *   Resultado da verificação da morada e os dados usados no pedido.
 * @returns {object} Corpo em snake_case.
 */
export function buildEventPayload(values, geocode) {
  const payload = {
    category_id: values.categoryId,
    location_id: values.locationId,
    name: clean(values.name),
    event_date: values.eventDate,
    event_start_time: values.startTime,
    event_end_time: values.endTime,
    ...(values.isRecurring ? {} : { registration_deadline: values.registrationDeadline }),
    is_online: values.isOnline,
  }

  if (values.isOnline) {
    payload.online_url = clean(values.onlineUrl)
  } else {
    const address = clean(values.address)
    payload.venue_name = clean(values.venueName)
    payload.address = address

    const { result, query } = geocode ?? {}

    if (result && query && query.address === address && query.locationId === values.locationId) {
      payload.latitude = result.latitude
      payload.longitude = result.longitude
    }
  }

  payload.max_attendees = Number(clean(values.maxAttendees))
  payload.description = clean(values.description)

  const notes = clean(values.organizerNotes)

  if (notes !== '') {
    payload.organizer_notes = notes
  }

  if (values.isRecurring) {
    payload.recurrence = {
      frequency: values.frequency,
      ends_on: values.seriesEndsOn,
      registration_deadline_days_before: Number(clean(values.deadlineDaysBefore)),
    }
  }

  return payload
}

/**
 * Converte os erros de validação da API nos campos do formulário. As coordenadas ficam na morada e as chaves
 * sem campo (ex.: is_online) vão para a mensagem geral.
 *
 * @param {Record<string, string|string[]>|undefined} errors Erros da API (arrays ou já normalizados).
 * @returns {{fieldErrors: Record<string, string>, unmatched: string[]}}
 */
export function mapEventServerErrors(errors) {
  const fieldErrors = {}
  const unmatched = []

  for (const [key, messages] of Object.entries(errors ?? {})) {
    const message = Array.isArray(messages) ? messages[0] : messages
    const field = SERVER_FIELD_MAP[key]

    if (!field) {
      unmatched.push(message)
    } else if (!(field in fieldErrors)) {
      fieldErrors[field] = message
    }
  }

  return { fieldErrors, unmatched }
}

/**
 * Texto de um campo do evento ou "" quando vem a null.
 *
 * @param {unknown} value Valor vindo da API.
 * @returns {string}
 */
function textOrEmpty(value) {
  return typeof value === 'string' ? value : ''
}

/**
 * Valores iniciais do formulário de edição a partir do evento da lista. O prazo passa à data de Lisboa,
 * seja qual for o desvio que venha no ISO.
 *
 * @param {object} event Evento devolvido por GET /api/admin/events.
 * @returns {typeof EMPTY_EVENT_FORM}
 */
export function eventToFormValues(event) {
  const deadline = event.registration_deadline ? new Date(event.registration_deadline) : null

  return {
    isOnline: Boolean(event.is_online),
    name: textOrEmpty(event.name),
    categoryId: event.category?.id ?? '',
    locationId: event.location?.id ?? '',
    eventDate: textOrEmpty(event.event_date),
    startTime: textOrEmpty(event.event_start_time).slice(0, 5),
    endTime: textOrEmpty(event.event_end_time).slice(0, 5),
    registrationDeadline: deadline && !Number.isNaN(deadline.getTime()) ? getLisbonNow(deadline).date : '',
    venueName: textOrEmpty(event.venue_name),
    address: textOrEmpty(event.address),
    onlineUrl: textOrEmpty(event.online_url),
    maxAttendees: Number.isInteger(event.max_attendees) ? String(event.max_attendees) : '',
    description: textOrEmpty(event.description),
    organizerNotes: textOrEmpty(event.organizer_notes),
  }
}

/**
 * Estado inicial da verificação da morada na edição: num presencial com morada e coordenadas, a localização
 * guardada (segue no payload enquanto a morada e a delegação não mudarem); senão, por verificar.
 *
 * @param {object} event Evento devolvido por GET /api/admin/events.
 * @returns {{status: 'saved'|'idle', result: {latitude: number, longitude: number}|null, message: string, query: {address: string, locationId: string}|null}}
 */
export function getSavedGeocode(event) {
  const address = clean(event.address)
  const { latitude, longitude } = event

  if (event.is_online || address === '' || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { status: 'idle', result: null, message: '', query: null }
  }

  return {
    status: 'saved',
    result: { latitude, longitude },
    message: '',
    query: { address, locationId: event.location?.id ?? '' },
  }
}

/**
 * Valor de um campo normalizado para comparar: quebras de linha iguais, sem espaços nas pontas e a
 * capacidade sem zeros à esquerda.
 *
 * @param {string} name Nome do campo.
 * @param {unknown} value Valor do campo.
 * @returns {string}
 */
function comparable(name, value) {
  const text = clean(typeof value === 'string' ? value.replace(/\r\n?/g, '\n') : value)

  return name === 'maxAttendees' && /^\d+$/.test(text) ? String(Number(text)) : text
}

/**
 * Campos que mudaram em relação aos valores iniciais. Mudar o formato conta como alteração e só se comparam
 * os campos de local do formato atual. A justificação não conta (não é um dado do evento), nem os campos da
 * série (só existem na criação).
 *
 * @param {typeof EMPTY_EVENT_FORM} initialValues Valores iniciais do evento.
 * @param {typeof EMPTY_EVENT_FORM} values Valores atuais do formulário.
 * @returns {string[]} Nomes dos campos, pela ordem `['isOnline', ...EVENT_FIELD_ORDER]`.
 */
export function getChangedEventFields(initialValues, values) {
  const hidden = values.isOnline ? ['venueName', 'address'] : ['onlineUrl']
  const changed = Boolean(initialValues.isOnline) !== Boolean(values.isOnline) ? ['isOnline'] : []

  for (const name of EVENT_FIELD_ORDER) {
    if (name === 'justification' || SERIES_FIELDS.includes(name) || hidden.includes(name)) continue

    if (comparable(name, initialValues[name]) !== comparable(name, values[name])) {
      changed.push(name)
    }
  }

  return changed
}

/**
 * Corpo do PUT: o corpo completo da criação, com as notas sempre presentes (null apaga-as; omitir mantinha
 * as antigas), `venue_name: null` nos online (o backend não o limpa) e a justificação só quando preenchida.
 *
 * @param {typeof EMPTY_EVENT_FORM} values Valores do formulário.
 * @param {{result: {latitude: number, longitude: number}|null, query: {address: string, locationId: string}|null}} geocode
 *   Verificação da morada (guardada ou feita no modal).
 * @param {string} justification Justificação escrita pelo admin.
 * @returns {object} Corpo em snake_case.
 */
export function buildEventUpdatePayload(values, geocode, justification) {
  const payload = { ...buildEventPayload(values, geocode), organizer_notes: clean(values.organizerNotes) || null }

  if (values.isOnline) {
    payload.venue_name = null
  }

  const reason = clean(justification)

  if (reason !== '') {
    payload.justification = reason
  }

  return payload
}

/**
 * Hint da capacidade na edição com o número de inscritos.
 *
 * @param {unknown} count Número de inscritos.
 * @returns {string} Frase ou "" quando não há inscritos.
 */
export function getCapacityHint(count) {
  if (!Number.isInteger(count) || count < 1) return ''

  return `Já há ${count} ${count === 1 ? 'inscrito' : 'inscritos'}: a capacidade não pode ser inferior.`
}

/**
 * Lê uma hora escrita pelo admin. Aceita H:MM, HH:MM, HMM e HHMM entre 00:00 e 23:59.
 *
 * @param {unknown} text Texto escrito.
 * @returns {string|null} Hora `HH:MM` ou null quando não é uma hora válida.
 */
export function parseTime(text) {
  if (typeof text !== 'string') return null

  const match = /^(\d{1,2}):?(\d{2})$/.exec(text)

  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])

  if (hours > 23 || minutes > 59) return null

  return `${String(hours).padStart(2, '0')}:${match[2]}`
}

/**
 * Último dia que se pode escolher para o prazo de inscrição: a véspera do evento, porque o prazo fecha às
 * 23:59 e tem de ser anterior ou igual ao início do evento.
 *
 * @param {string} eventDate Data do evento (AAAA-MM-DD ou '').
 * @returns {string|undefined} Data AAAA-MM-DD ou undefined sem data do evento.
 */
export function getDeadlineMax(eventDate) {
  return parseIsoDate(eventDate) ? addDays(eventDate, -1) : undefined
}

/** Labels dos campos na lista de alterações da confirmação. */
const CHANGE_LABELS = {
  isOnline: 'Formato',
  name: 'Título',
  categoryId: 'Tipo de evento',
  locationId: 'Delegação',
  eventDate: 'Data',
  startTime: 'Hora de início',
  endTime: 'Hora de fim',
  registrationDeadline: 'Data limite de inscrição',
  venueName: 'Nome do local',
  address: 'Morada',
  onlineUrl: 'Link do evento online',
  maxAttendees: 'Capacidade máxima',
  description: 'Sobre o evento',
  organizerNotes: 'Notas do organizador',
}

/** Número máximo de caracteres de um texto na lista de alterações (antes das reticências). */
const CHANGE_TEXT_LIMIT = 80

/**
 * Valor de um campo como aparece na lista de alterações: nomes em vez de ids, datas curtas, capacidade sem
 * zeros à esquerda e textos numa só linha, cortados aos 80 caracteres.
 *
 * @param {string} name Nome do campo.
 * @param {unknown} value Valor do campo.
 * @param {{categoryId?: Record<string, string>, locationId?: Record<string, string>}} names Nomes por id.
 * @returns {string}
 */
function changeValue(name, value, names) {
  if (name === 'isOnline') return value ? 'Online' : 'Presencial'

  const text = clean(typeof value === 'string' ? value.replace(/\s+/g, ' ') : value)

  if (text === '') return '(vazio)'

  if (name === 'categoryId' || name === 'locationId') return names?.[name]?.[text] ?? '—'

  if (name === 'eventDate' || name === 'registrationDeadline') return formatShortDate(text) || text

  if (name === 'maxAttendees') return comparable(name, text)

  return text.length > CHANGE_TEXT_LIMIT ? `${text.slice(0, CHANGE_TEXT_LIMIT)}…` : text
}

/**
 * Lista das alterações para o diálogo de confirmação, com a mesma deteção que ativa "Guardar alterações".
 *
 * @param {typeof EMPTY_EVENT_FORM} initialValues Valores iniciais do evento.
 * @param {typeof EMPTY_EVENT_FORM} values Valores atuais do formulário.
 * @param {{categoryId?: Record<string, string>, locationId?: Record<string, string>}} names Nomes dos tipos de
 *   evento e das delegações por id.
 * @returns {{field: string, label: string, before: string, after: string}[]} Pela ordem de getChangedEventFields.
 */
export function getEventChangeSummary(initialValues, values, names) {
  return getChangedEventFields(initialValues, values).map((field) => ({
    field,
    label: CHANGE_LABELS[field],
    before: changeValue(field, initialValues[field], names),
    after: changeValue(field, values[field], names),
  }))
}

/**
 * Frase da confirmação sobre o email aos inscritos, partida para a contagem poder ficar a negrito.
 *
 * @param {unknown} count Número de inscritos (null quando é desconhecido).
 * @returns {{lead: string, emphasis: string, tail: string, notify: boolean}} notify indica se vai um email
 *   (e se faz sentido pedir a justificação).
 */
export function getChangeNotice(count) {
  if (count === 0) {
    return { lead: 'Não há inscritos, por isso ninguém será notificado.', emphasis: '', tail: '', notify: false }
  }

  const tail = ' a avisar que o evento foi alterado.'

  if (count === 1) {
    return { lead: 'Será enviado um email ao ', emphasis: '1 inscrito', tail, notify: true }
  }

  const known = Number.isInteger(count) && count > 1

  return { lead: 'Será enviado um email aos ', emphasis: known ? `${count} inscritos` : 'inscritos', tail, notify: true }
}
