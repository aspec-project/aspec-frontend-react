import { describe, expect, it } from 'vitest'
import {
  EMPTY_EVENT_FORM,
  buildEventPayload,
  buildEventUpdatePayload,
  eventToFormValues,
  formatMissingFields,
  getCapacityHint,
  getChangeNotice,
  getChangedEventFields,
  getDeadlineMax,
  getEventChangeSummary,
  getEventFormErrors,
  getLisbonNow,
  getMissingEventFields,
  getSavedGeocode,
  isSafeMeetingUrl,
  mapEventServerErrors,
  parseTime,
} from '../../src/utils/adminEventForm'

const NOW = new Date('2030-06-10T10:00:00Z')

const validInPerson = {
  ...EMPTY_EVENT_FORM,
  isOnline: false,
  name: 'Jantar de Networking Lisboa',
  categoryId: 'c3',
  locationId: 'l1',
  eventDate: '2099-03-20',
  startTime: '19:30',
  endTime: '21:30',
  registrationDeadline: '2099-03-18',
  venueName: 'Restaurante Estrela do Norte',
  address: 'Rua das Flores 42',
  maxAttendees: '40',
  description: 'Encontro mensal de networking entre membros.',
  organizerNotes: '',
}

const validOnline = {
  ...validInPerson,
  isOnline: true,
  venueName: '',
  address: '',
  onlineUrl: 'https://meet.example.com/aspec',
}

const NO_GEOCODE = { result: null, query: null }

describe('getLisbonNow', () => {
  it('devolve a data e a hora de Lisboa no verão e no inverno', () => {
    expect(getLisbonNow(new Date('2026-07-01T22:30:00Z'))).toEqual({ date: '2026-07-01', time: '23:30' })
    expect(getLisbonNow(new Date('2026-07-01T23:30:00Z'))).toEqual({ date: '2026-07-02', time: '00:30' })
    expect(getLisbonNow(new Date('2026-12-31T23:30:00Z'))).toEqual({ date: '2026-12-31', time: '23:30' })
  })
})

describe('getMissingEventFields', () => {
  it('lista os campos obrigatórios em falta pela ordem do formulário, conforme o formato', () => {
    expect(getMissingEventFields(EMPTY_EVENT_FORM)).toEqual([
      'título', 'tipo de evento', 'delegação', 'data', 'hora de início', 'hora de fim',
      'data limite de inscrição', 'nome do local', 'morada', 'capacidade máxima', 'descrição',
    ])
    expect(getMissingEventFields({ ...EMPTY_EVENT_FORM, isOnline: true })).toEqual([
      'título', 'tipo de evento', 'delegação', 'data', 'hora de início', 'hora de fim',
      'data limite de inscrição', 'link do evento', 'capacidade máxima', 'descrição',
    ])
  })

  it('um campo só com espaços conta como vazio e as notas nunca são obrigatórias', () => {
    expect(getMissingEventFields({ ...validInPerson, name: '   ' })).toEqual(['título'])
    expect(getMissingEventFields(validInPerson)).toEqual([])
    expect(getMissingEventFields(validOnline)).toEqual([])
  })
})

describe('formatMissingFields', () => {
  it('junta os campos numa frase ou devolve vazio', () => {
    expect(formatMissingFields(['título', 'data'])).toBe('Falta preencher: título, data.')
    expect(formatMissingFields([])).toBe('')
  })
})

describe('getEventFormErrors', () => {
  const base = { ...EMPTY_EVENT_FORM }

  it('valida a data do evento contra hoje em Lisboa e a hora de fim contra a de início', () => {
    expect(getEventFormErrors({ ...base, eventDate: '2030-06-09' }, NOW))
      .toEqual({ eventDate: 'A data do evento não pode ser anterior a hoje.' })
    expect(getEventFormErrors({ ...base, eventDate: '2030-06-10' }, NOW)).toEqual({})

    for (const endTime of ['19:30', '19:00']) {
      expect(getEventFormErrors({ ...base, startTime: '19:30', endTime }, NOW))
        .toEqual({ endTime: 'A hora de fim deve ser posterior à hora de início.' })
    }
    expect(getEventFormErrors({ ...base, startTime: '19:30', endTime: '21:30' }, NOW)).toEqual({})
    expect(getEventFormErrors({ ...base, startTime: '19:30' }, NOW)).toEqual({})
    expect(getEventFormErrors({ ...base, endTime: '19:00' }, NOW)).toEqual({})
  })

  it('o prazo fecha às 23:59 de Lisboa: tem de ser futuro e anterior ou igual ao início do evento', () => {
    const event = { ...base, eventDate: '2030-06-15', startTime: '19:30' }
    const PAST = 'O prazo de inscrição tem de ser posterior à data e hora atuais.'
    const AFTER_START = 'O prazo de inscrição tem de ser anterior ou igual ao início do evento.'

    expect(getEventFormErrors({ ...event, registrationDeadline: '2030-06-09' }, NOW)).toEqual({ registrationDeadline: PAST })
    expect(getEventFormErrors({ ...event, registrationDeadline: '2030-06-10' }, NOW)).toEqual({})
    expect(getEventFormErrors({ ...event, registrationDeadline: '2030-06-15' }, NOW)).toEqual({ registrationDeadline: AFTER_START })
    expect(getEventFormErrors({ ...event, registrationDeadline: '2030-06-15', startTime: '23:59' }, NOW)).toEqual({})
    expect(getEventFormErrors({ ...event, registrationDeadline: '2030-06-16' }, NOW)).toEqual({ registrationDeadline: AFTER_START })

    expect(getEventFormErrors({ ...base, eventDate: '', startTime: '19:30', registrationDeadline: '2030-06-09' }, NOW))
      .toEqual({ registrationDeadline: PAST })
    expect(getEventFormErrors({ ...base, eventDate: '', startTime: '19:30', registrationDeadline: '2030-06-20' }, NOW)).toEqual({})
  })

  it('a capacidade máxima tem de ser um inteiro entre 1 e 100000', () => {
    const MESSAGE = 'A capacidade máxima tem de ser um número inteiro entre 1 e 100000.'

    for (const maxAttendees of ['0', '-3', '2.5', 'abc', '100001']) {
      expect(getEventFormErrors({ ...base, maxAttendees }, NOW)).toEqual({ maxAttendees: MESSAGE })
    }
    for (const maxAttendees of ['1', '40', '100000', '']) {
      expect(getEventFormErrors({ ...base, maxAttendees }, NOW)).toEqual({})
    }
  })

  it('o link online só aceita http ou https sem credenciais, e só nos eventos online', () => {
    expect(getEventFormErrors({ ...validOnline, onlineUrl: 'ftp://x.pt' }, NOW))
      .toEqual({ onlineUrl: 'Indique um link válido que comece por http:// ou https://.' })
    expect(getEventFormErrors({ ...validOnline, isOnline: false, onlineUrl: 'ftp://x.pt' }, NOW)).toEqual({})
  })
})

describe('isSafeMeetingUrl', () => {
  it('aceita só URLs absolutos http ou https sem utilizador nem palavra-passe', () => {
    expect(isSafeMeetingUrl('https://meet.example.com/x')).toBe(true)
    expect(isSafeMeetingUrl('http://example.pt')).toBe(true)

    for (const value of ['ftp://example.pt', 'javascript:alert(1)', 'https://user:pass@example.pt', 'meet.example.com', '', null]) {
      expect(isSafeMeetingUrl(value)).toBe(false)
    }
  })
})

describe('buildEventPayload', () => {
  const inPerson = { ...validInPerson, name: '  Jantar  ', maxAttendees: '40', organizerNotes: '' }
  const verified = { result: { latitude: 38.71, longitude: -9.14 }, query: { address: 'Rua das Flores 42', locationId: 'l1' } }

  it('constrói o corpo de um presencial campo a campo, sem coordenadas nem campos vazios opcionais', () => {
    expect(buildEventPayload(inPerson, NO_GEOCODE)).toEqual({
      category_id: 'c3',
      location_id: 'l1',
      name: 'Jantar',
      event_date: '2099-03-20',
      event_start_time: '19:30',
      event_end_time: '21:30',
      registration_deadline: '2099-03-18',
      is_online: false,
      venue_name: 'Restaurante Estrela do Norte',
      address: 'Rua das Flores 42',
      max_attendees: 40,
      description: 'Encontro mensal de networking entre membros.',
    })
  })

  it('só envia as coordenadas quando a verificação corresponde à morada e à delegação atuais', () => {
    expect(buildEventPayload(inPerson, verified)).toMatchObject({ latitude: 38.71, longitude: -9.14 })

    const otherAddress = { ...verified, query: { address: 'Rua Augusta 1', locationId: 'l1' } }
    const otherLocation = { ...verified, query: { address: 'Rua das Flores 42', locationId: 'l2' } }

    for (const geocode of [otherAddress, otherLocation]) {
      const payload = buildEventPayload(inPerson, geocode)
      expect(payload).not.toHaveProperty('latitude')
      expect(payload).not.toHaveProperty('longitude')
    }
  })

  it('num online envia o link e nunca a morada, o local ou as coordenadas', () => {
    const values = {
      ...validInPerson,
      isOnline: true,
      onlineUrl: '  https://meet.example.com/aspec  ',
      organizerNotes: ' Levar portátil ',
    }

    const payload = buildEventPayload(values, verified)

    expect(payload).toMatchObject({
      is_online: true,
      online_url: 'https://meet.example.com/aspec',
      organizer_notes: 'Levar portátil',
    })
    for (const key of ['address', 'venue_name', 'latitude', 'longitude']) {
      expect(payload).not.toHaveProperty(key)
    }
  })
})

describe('mapEventServerErrors', () => {
  it('mapeia os erros da API para os campos do formulário e junta os restantes', () => {
    expect(mapEventServerErrors({
      event_end_time: ['A'],
      registration_deadline: ['B'],
      latitude: ['C'],
      longitude: ['C'],
      online_url: ['D'],
      is_online: ['E'],
    })).toEqual({
      fieldErrors: { endTime: 'A', registrationDeadline: 'B', address: 'C', onlineUrl: 'D' },
      unmatched: ['E'],
    })
  })

  it('aceita o formato já normalizado e a ausência de erros', () => {
    expect(mapEventServerErrors({ name: 'X' })).toEqual({ fieldErrors: { name: 'X' }, unmatched: [] })
    expect(mapEventServerErrors(undefined)).toEqual({ fieldErrors: {}, unmatched: [] })
  })
})

function event(overrides = {}) {
  return {
    id: 'e1',
    name: 'Workshop de Liderança',
    category: { id: 'c1', name: 'Workshop', color: '#6A1B9A' },
    location: { id: 'l1', name: 'Lisboa' },
    event_date: '2099-01-21',
    event_start_time: '08:00',
    event_end_time: '10:00',
    description: 'Descrição pública.',
    address: 'Rua Castilho 39, 1250-068 Lisboa',
    venue_name: 'Centro de Congressos',
    latitude: 38.7223,
    longitude: -9.1533,
    max_attendees: 30,
    registration_deadline: '2099-01-19T23:59:00+00:00',
    organizer_notes: 'Notas do organizador.',
    registrations_count: 22,
    is_online: false,
    ...overrides,
  }
}

const onlineEvent = event({
  is_online: true,
  online_url: 'https://meet.example.pt/sala',
  address: null,
  latitude: null,
  longitude: null,
})

const EDIT_VALUES = {
  isOnline: false,
  name: 'Workshop de Liderança',
  categoryId: 'c1',
  locationId: 'l1',
  eventDate: '2099-01-21',
  startTime: '08:00',
  endTime: '10:00',
  registrationDeadline: '2099-01-19',
  venueName: 'Centro de Congressos',
  address: 'Rua Castilho 39, 1250-068 Lisboa',
  onlineUrl: '',
  maxAttendees: '30',
  description: 'Descrição pública.',
  organizerNotes: 'Notas do organizador.',
}

const SAVED_GEOCODE = {
  status: 'saved',
  result: { latitude: 38.7223, longitude: -9.1533 },
  message: '',
  query: { address: 'Rua Castilho 39, 1250-068 Lisboa', locationId: 'l1' },
}

const IDLE = { status: 'idle', result: null, message: '', query: null }

describe('eventToFormValues', () => {
  it('converte o evento da lista nos valores do formulário', () => {
    expect(eventToFormValues(event())).toEqual(EDIT_VALUES)
  })

  it('converte o prazo para a data de Lisboa e devolve vazio quando é inválido', () => {
    expect(eventToFormValues(event({ registration_deadline: '2026-10-14T23:59:00+01:00' })).registrationDeadline).toBe('2026-10-14')

    for (const registration_deadline of [null, 'abc']) {
      expect(eventToFormValues(event({ registration_deadline })).registrationDeadline).toBe('')
    }
  })

  it('num online preenche o link e deixa a morada vazia; nulos passam a texto vazio e as horas a HH:MM', () => {
    expect(eventToFormValues(onlineEvent)).toMatchObject({
      isOnline: true,
      onlineUrl: 'https://meet.example.pt/sala',
      address: '',
    })

    expect(eventToFormValues(event({ venue_name: null, organizer_notes: null, event_start_time: '19:30:00', max_attendees: null })))
      .toMatchObject({ venueName: '', organizerNotes: '', startTime: '19:30', maxAttendees: '' })
  })
})

describe('getSavedGeocode', () => {
  it('num presencial com coordenadas devolve a localização guardada com a morada sem espaços', () => {
    expect(getSavedGeocode(event({ address: '  Rua Castilho 39  ' }))).toEqual({
      status: 'saved',
      result: { latitude: 38.7223, longitude: -9.1533 },
      message: '',
      query: { address: 'Rua Castilho 39', locationId: 'l1' },
    })
  })

  it('sem coordenadas ou num online fica por verificar', () => {
    expect(getSavedGeocode(event({ latitude: null }))).toEqual(IDLE)
    expect(getSavedGeocode(onlineEvent)).toEqual(IDLE)
  })

  it('as coordenadas guardadas seguem no payload enquanto a morada não muda', () => {
    const saved = event()

    expect(buildEventPayload(eventToFormValues(saved), getSavedGeocode(saved)))
      .toMatchObject({ latitude: 38.7223, longitude: -9.1533 })
  })
})

describe('getChangedEventFields', () => {
  it('ignora espaços nas pontas, quebras de linha e zeros à esquerda', () => {
    expect(getChangedEventFields(EDIT_VALUES, { ...EDIT_VALUES })).toEqual([])
    expect(getChangedEventFields(EDIT_VALUES, { ...EDIT_VALUES, name: '  Workshop de Liderança  ' })).toEqual([])
    expect(getChangedEventFields({ ...EDIT_VALUES, description: 'a\r\nb' }, { ...EDIT_VALUES, description: 'a\nb' })).toEqual([])
    expect(getChangedEventFields(EDIT_VALUES, { ...EDIT_VALUES, maxAttendees: '030' })).toEqual([])
  })

  it('devolve os campos mudados pela ordem do formulário, só os do formato atual', () => {
    expect(getChangedEventFields(EDIT_VALUES, { ...EDIT_VALUES, maxAttendees: '40', name: 'Outro' })).toEqual(['name', 'maxAttendees'])
    expect(getChangedEventFields(EDIT_VALUES, { ...EDIT_VALUES, onlineUrl: 'https://meet.example.pt/x' })).toEqual([])

    const online = { ...EDIT_VALUES, isOnline: true, onlineUrl: 'https://meet.example.pt/sala' }
    expect(getChangedEventFields(online, { ...online, address: 'Rua Nova', venueName: 'Outro local' })).toEqual([])

    expect(getChangedEventFields({ ...EDIT_VALUES, organizerNotes: 'x' }, { ...EDIT_VALUES, organizerNotes: '' })).toEqual(['organizerNotes'])
  })

  it('mudar o formato conta como alteração e repô-lo desfaz a alteração', () => {
    const toOnline = { ...EDIT_VALUES, isOnline: true, onlineUrl: 'https://meet.example.pt/x' }

    expect(getChangedEventFields(EDIT_VALUES, toOnline)).toEqual(['isOnline', 'onlineUrl'])
    expect(getChangedEventFields(EDIT_VALUES, { ...toOnline, name: 'Outro' })).toEqual(['isOnline', 'name', 'onlineUrl'])
    expect(getChangedEventFields(EDIT_VALUES, { ...toOnline, isOnline: false })).toEqual([])
  })
})

describe('getEventFormErrors na edição', () => {
  const PAST = 'O prazo de inscrição tem de ser posterior à data e hora atuais.'
  const AFTER_START = 'O prazo de inscrição tem de ser anterior ou igual ao início do evento.'
  const initial = { ...EDIT_VALUES, eventDate: '2030-06-15', startTime: '19:30', endTime: '21:30', registrationDeadline: '2030-06-09' }

  it('as regras de datas no passado só se aplicam aos campos alterados', () => {
    expect(getEventFormErrors(initial, NOW, { initialValues: initial })).toEqual({})
    expect(getEventFormErrors({ ...initial, registrationDeadline: '2030-06-08' }, NOW, { initialValues: initial }))
      .toEqual({ registrationDeadline: PAST })

    const pastDate = { ...initial, eventDate: '2030-06-01', registrationDeadline: '2030-05-30' }
    expect(getEventFormErrors(pastDate, NOW, { initialValues: pastDate })).toEqual({})
    expect(getEventFormErrors({ ...pastDate, eventDate: '2030-06-02' }, NOW, { initialValues: pastDate }))
      .toEqual({ eventDate: 'A data do evento não pode ser anterior a hoje.' })
  })

  it('o prazo depois do início dá sempre erro e sem o 3.º parâmetro mantém-se a regra da criação', () => {
    const late = { ...initial, registrationDeadline: '2030-06-15' }

    expect(getEventFormErrors(late, NOW, { initialValues: late })).toEqual({ registrationDeadline: AFTER_START })
    expect(getEventFormErrors(initial, NOW)).toEqual({ registrationDeadline: PAST })
  })

  it('a capacidade não pode ser inferior aos inscritos, depois da regra do intervalo', () => {
    const options = { initialValues: EDIT_VALUES, registrationsCount: 22 }

    expect(getEventFormErrors({ ...EDIT_VALUES, maxAttendees: '21' }, NOW, options))
      .toEqual({ maxAttendees: 'A lotação máxima não pode ser inferior ao número de inscrições existentes.' })
    expect(getEventFormErrors({ ...EDIT_VALUES, maxAttendees: '22' }, NOW, options)).toEqual({})
    expect(getEventFormErrors({ ...EDIT_VALUES, maxAttendees: '0' }, NOW, options))
      .toEqual({ maxAttendees: 'A capacidade máxima tem de ser um número inteiro entre 1 e 100000.' })
    expect(getEventFormErrors({ ...EDIT_VALUES, maxAttendees: '5' }, NOW, { initialValues: EDIT_VALUES, registrationsCount: null })).toEqual({})
  })
})

describe('buildEventUpdatePayload', () => {
  const FULL_IN_PERSON = {
    category_id: 'c1',
    location_id: 'l1',
    name: 'Workshop de Liderança',
    event_date: '2099-01-21',
    event_start_time: '08:00',
    event_end_time: '10:00',
    registration_deadline: '2099-01-19',
    is_online: false,
    venue_name: 'Centro de Congressos',
    address: 'Rua Castilho 39, 1250-068 Lisboa',
    latitude: 38.7223,
    longitude: -9.1533,
    max_attendees: 30,
    description: 'Descrição pública.',
    organizer_notes: null,
  }

  it('envia o corpo completo com as coordenadas guardadas, notas a null e sem justificação vazia', () => {
    expect(buildEventUpdatePayload({ ...EDIT_VALUES, organizerNotes: '' }, SAVED_GEOCODE, '   ')).toEqual(FULL_IN_PERSON)
  })

  it('envia a justificação sem espaços e larga as coordenadas quando a morada mudou', () => {
    expect(buildEventUpdatePayload(EDIT_VALUES, SAVED_GEOCODE, '  A sessão passou para a sala 2.  '))
      .toMatchObject({ justification: 'A sessão passou para a sala 2.' })

    const moved = buildEventUpdatePayload({ ...EDIT_VALUES, address: 'Rua Nova 1' }, SAVED_GEOCODE, '')
    expect(moved).not.toHaveProperty('latitude')
    expect(moved).not.toHaveProperty('longitude')
  })

  it('num online envia o link, venue_name a null e nunca a morada nem as coordenadas', () => {
    const payload = buildEventUpdatePayload(
      { ...EDIT_VALUES, isOnline: true, onlineUrl: 'https://meet.example.pt/sala', organizerNotes: ' Levar portátil ' },
      SAVED_GEOCODE,
      '',
    )

    expect(payload).toMatchObject({
      is_online: true,
      online_url: 'https://meet.example.pt/sala',
      venue_name: null,
      organizer_notes: 'Levar portátil',
    })
    for (const key of ['address', 'latitude', 'longitude', 'justification']) {
      expect(payload).not.toHaveProperty(key)
    }
  })

  it('num presencial vindo de online nunca envia o link', () => {
    const payload = buildEventUpdatePayload({ ...EDIT_VALUES, onlineUrl: 'https://meet.example.pt/sala' }, IDLE, '')

    expect(payload).not.toHaveProperty('online_url')
    expect(payload).toMatchObject({ is_online: false, venue_name: 'Centro de Congressos' })
  })
})

describe('textos da edição', () => {
  it('o hint da capacidade depende do número de inscritos', () => {
    expect(getCapacityHint(22)).toBe('Já há 22 inscritos: a capacidade não pode ser inferior.')
    expect(getCapacityHint(1)).toBe('Já há 1 inscrito: a capacidade não pode ser inferior.')
    expect(getCapacityHint(0)).toBe('')
  })

  it('o erro da justificação vai para o campo da justificação', () => {
    expect(mapEventServerErrors({ justification: ['J'] })).toEqual({ fieldErrors: { justification: 'J' }, unmatched: [] })
  })
})

describe('parseTime', () => {
  it('aceita H:MM, HH:MM, HMM e HHMM entre 00:00 e 23:59 e devolve HH:MM', () => {
    expect(parseTime('17:39')).toBe('17:39')
    expect(parseTime('9:05')).toBe('09:05')
    expect(parseTime('930')).toBe('09:30')
    expect(parseTime('1739')).toBe('17:39')
    expect(parseTime('00:00')).toBe('00:00')
    expect(parseTime('23:59')).toBe('23:59')
  })

  it('devolve null para horas fora dos limites, incompletas, vazias ou que não são texto', () => {
    for (const text of ['24:00', '17:60', '17:3', '17', '', 'ab:cd', null]) {
      expect(parseTime(text)).toBeNull()
    }
  })
})

describe('getDeadlineMax', () => {
  it('o último dia do prazo é a véspera do evento e sem data do evento não há máximo', () => {
    expect(getDeadlineMax('')).toBeUndefined()
    expect(getDeadlineMax('2099-03-20')).toBe('2099-03-19')
    expect(getDeadlineMax('2099-03-01')).toBe('2099-02-28')
    expect(getDeadlineMax('2100-01-01')).toBe('2099-12-31')
  })
})

describe('getChangeNotice', () => {
  const TAIL = ' a avisar que o evento foi alterado.'

  it('com inscritos diz a quantos chega o email, com a contagem à parte para ficar a negrito', () => {
    expect(getChangeNotice(22)).toEqual({ lead: 'Será enviado um email aos ', emphasis: '22 inscritos', tail: TAIL, notify: true })
    expect(getChangeNotice(1)).toEqual({ lead: 'Será enviado um email ao ', emphasis: '1 inscrito', tail: TAIL, notify: true })
  })

  it('com o número desconhecido usa a frase genérica e continua a notificar', () => {
    for (const count of [null, '3']) {
      expect(getChangeNotice(count)).toEqual({ lead: 'Será enviado um email aos ', emphasis: 'inscritos', tail: TAIL, notify: true })
    }
  })

  it('sem inscritos diz que ninguém será notificado', () => {
    expect(getChangeNotice(0)).toEqual({
      lead: 'Não há inscritos, por isso ninguém será notificado.',
      emphasis: '',
      tail: '',
      notify: false,
    })
  })
})

describe('getEventChangeSummary', () => {
  const NAMES = {
    categoryId: { c1: 'Workshop', c2: 'Formação', c3: 'Jantar' },
    locationId: { l1: 'Lisboa', l2: 'Porto' },
  }

  it('lista as alterações pela ordem do formulário com nomes, datas curtas, capacidade normalizada e textos numa linha', () => {
    const description = `${'A'.repeat(39)}
${'B'.repeat(80)}`
    const values = {
      ...EDIT_VALUES,
      name: 'Workshop de Liderança — nova data',
      categoryId: 'c3',
      eventDate: '2099-01-22',
      startTime: '17:39',
      maxAttendees: '040',
      description,
    }

    expect(description).toHaveLength(120)
    expect(getEventChangeSummary(EDIT_VALUES, values, NAMES)).toEqual([
      { field: 'name', label: 'Título', before: 'Workshop de Liderança', after: 'Workshop de Liderança — nova data' },
      { field: 'categoryId', label: 'Tipo de evento', before: 'Workshop', after: 'Jantar' },
      { field: 'eventDate', label: 'Data', before: '21 Jan 2099', after: '22 Jan 2099' },
      { field: 'startTime', label: 'Hora de início', before: '08:00', after: '17:39' },
      { field: 'maxAttendees', label: 'Capacidade máxima', before: '30', after: '40' },
      { field: 'description', label: 'Sobre o evento', before: 'Descrição pública.', after: `${'A'.repeat(39)} ${'B'.repeat(40)}…` },
    ])
  })

  it('um valor vazio aparece como (vazio)', () => {
    expect(getEventChangeSummary({ ...EDIT_VALUES, organizerNotes: '' }, { ...EDIT_VALUES, organizerNotes: 'Novas' }, NAMES)).toEqual([
      { field: 'organizerNotes', label: 'Notas do organizador', before: '(vazio)', after: 'Novas' },
    ])
  })

  it('mudar para online mostra o formato e o link, sem o local nem a morada', () => {
    const values = { ...EDIT_VALUES, isOnline: true, onlineUrl: 'https://meet.example.pt/nova' }

    expect(getEventChangeSummary(EDIT_VALUES, values, NAMES)).toEqual([
      { field: 'isOnline', label: 'Formato', before: 'Presencial', after: 'Online' },
      { field: 'onlineUrl', label: 'Link do evento online', before: '(vazio)', after: 'https://meet.example.pt/nova' },
    ])
  })

  it('um id sem nome conhecido aparece como travessão e sem alterações devolve uma lista vazia', () => {
    expect(getEventChangeSummary(EDIT_VALUES, { ...EDIT_VALUES, categoryId: 'c9' }, NAMES)).toEqual([
      { field: 'categoryId', label: 'Tipo de evento', before: 'Workshop', after: '—' },
    ])
    expect(getEventChangeSummary(EDIT_VALUES, { ...EDIT_VALUES }, NAMES)).toEqual([])
  })
})
