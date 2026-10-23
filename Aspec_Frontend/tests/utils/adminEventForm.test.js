import { describe, expect, it } from 'vitest'
import {
  EMPTY_EVENT_FORM,
  buildEventPayload,
  formatMissingFields,
  getEventFormErrors,
  getLisbonNow,
  getMissingEventFields,
  isSafeMeetingUrl,
  mapEventServerErrors,
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
