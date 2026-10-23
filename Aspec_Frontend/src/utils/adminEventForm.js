/** Valores iniciais do formulário de evento: tudo vazio, formato presencial. */
export const EMPTY_EVENT_FORM = {
  isOnline: false,
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
}

/** Mensagens do formulário de evento (as regras partilhadas com o backend usam as frases dele). */
export const EVENT_FORM_MESSAGES = {
  endTime: 'A hora de fim deve ser posterior à hora de início.',
  eventDatePast: 'A data do evento não pode ser anterior a hoje.',
  deadlinePast: 'O prazo de inscrição tem de ser posterior à data e hora atuais.',
  deadlineAfterStart: 'O prazo de inscrição tem de ser anterior ou igual ao início do evento.',
  maxAttendees: 'A capacidade máxima tem de ser um número inteiro entre 1 e 100000.',
  onlineUrl: 'Indique um link válido que comece por http:// ou https://.',
  fixErrors: 'Corrija os campos assinalados.',
  optionsError: 'Não foi possível carregar os tipos de evento e as delegações.',
  geocodeHint: 'Se não verificar, a morada é localizada automaticamente ao criar o evento.',
}

/** Atribuição obrigatória dos dados do OpenStreetMap (licença ODbL). */
export const GEOCODE_ATTRIBUTION = '© OpenStreetMap contributors'

/** Ordem dos campos no formulário (lista "Falta preencher" e foco no primeiro campo inválido). */
export const EVENT_FIELD_ORDER = [
  'name',
  'categoryId',
  'locationId',
  'eventDate',
  'startTime',
  'endTime',
  'registrationDeadline',
  'venueName',
  'address',
  'onlineUrl',
  'maxAttendees',
  'description',
  'organizerNotes',
]

const REQUIRED_FIELDS = [
  { name: 'name', label: 'título' },
  { name: 'categoryId', label: 'tipo de evento' },
  { name: 'locationId', label: 'delegação' },
  { name: 'eventDate', label: 'data' },
  { name: 'startTime', label: 'hora de início' },
  { name: 'endTime', label: 'hora de fim' },
  { name: 'registrationDeadline', label: 'data limite de inscrição' },
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
 * Campos obrigatórios por preencher, pela ordem do formulário. Os do local dependem do formato.
 *
 * @param {typeof EMPTY_EVENT_FORM} values Valores do formulário.
 * @returns {string[]} Nomes dos campos em falta (em minúsculas).
 */
export function getMissingEventFields(values) {
  const format = values.isOnline ? 'online' : 'inPerson'

  return REQUIRED_FIELDS
    .filter((field) => !field.format || field.format === format)
    .filter((field) => clean(values[field.name]) === '')
    .map((field) => field.label)
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
 * @param {typeof EMPTY_EVENT_FORM} values Valores do formulário.
 * @param {Date} [now] Momento atual.
 * @returns {Record<string, string>} Mensagem de erro por campo.
 */
export function getEventFormErrors(values, now = new Date()) {
  const errors = {}
  const today = getLisbonNow(now)
  const { eventDate, startTime, endTime, registrationDeadline } = values

  if (eventDate && eventDate < today.date) {
    errors.eventDate = EVENT_FORM_MESSAGES.eventDatePast
  }

  if (startTime && endTime && endTime <= startTime) {
    errors.endTime = EVENT_FORM_MESSAGES.endTime
  }

  if (registrationDeadline) {
    const deadline = `${registrationDeadline} ${DEADLINE_TIME}`

    if (deadline <= `${today.date} ${today.time}`) {
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
    }
  }

  const onlineUrl = clean(values.onlineUrl)

  if (values.isOnline && onlineUrl !== '' && !isSafeMeetingUrl(onlineUrl)) {
    errors.onlineUrl = EVENT_FORM_MESSAGES.onlineUrl
  }

  return errors
}

/**
 * Corpo do POST construído campo a campo (só as chaves do contrato). Num presencial, as coordenadas só
 * seguem se a verificação foi feita com a morada e a delegação atuais; num online, nunca seguem a morada,
 * o local nem as coordenadas.
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
    registration_deadline: values.registrationDeadline,
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
