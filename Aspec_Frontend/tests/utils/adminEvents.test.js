import { describe, expect, it } from 'vitest'
import * as adminEventsUtils from '../../src/utils/adminEvents'
import {
  ATTENDEES_EXPORT_TEXTS,
  ATTENDEES_LIST_TEXTS,
  DELETE_EVENT_TEXTS,
  DELETE_JUSTIFICATION_MAX_LENGTH,
  countActiveFilters,
  formatAttendeesCount,
  formatDeadline,
  formatEventDate,
  formatRegisteredAt,
  formatResultsRange,
  formatSession,
  formatTimeRange,
  getAttendeesDialogDescription,
  getAttendeesExportDescription,
  getAttendeesFallbackFilename,
  getDateRangeError,
  getDeleteEventDescription,
  getEventSeries,
  getFilenameFromContentDisposition,
  getOccupancy,
  getRegistrationState,
  needsDeleteJustification,
} from '../../src/utils/adminEvents'

describe('formatEventDate', () => {
  it('formata a data do evento com o mês abreviado em português', () => {
    expect(formatEventDate('2026-01-21')).toBe('21 Jan 2026')
    expect(formatEventDate('2026-12-05')).toBe('5 Dez 2026')
  })

  it('devolve um travessão para datas vazias, inválidas ou noutro formato', () => {
    for (const value of ['', null, '2026-13-01', '2026-02-30', '21/01/2026']) {
      expect(formatEventDate(value)).toBe('—')
    }
  })
})

describe('formatTimeRange', () => {
  it('junta as horas de início e fim com um travessão', () => {
    expect(formatTimeRange('08:00', '10:00')).toBe('08:00–10:00')
  })

  it('mostra só o início quando o fim falta e nada quando ambas são inválidas', () => {
    expect(formatTimeRange('08:00', '')).toBe('08:00')
    expect(formatTimeRange('x', 'y')).toBe('')
  })
})

describe('formatDeadline', () => {
  it('mostra o prazo na hora de Lisboa, no inverno e no verão', () => {
    expect(formatDeadline('2030-11-14T23:59:00+00:00')).toBe('14 Nov 2030, 23:59')
    expect(formatDeadline('2026-10-14T23:59:00+01:00')).toBe('14 Out 2026, 23:59')
    expect(formatDeadline('2030-11-14T23:59:00Z')).toBe('14 Nov 2030, 23:59')
  })

  it('devolve um travessão para prazos vazios ou inválidos', () => {
    for (const value of ['', null, 'abc']) {
      expect(formatDeadline(value)).toBe('—')
    }
  })
})

describe('getRegistrationState', () => {
  const deadline = '2030-11-14T23:59:00+00:00'
  const deadlineMs = Date.parse(deadline)

  it('as inscrições estão abertas até ao prazo, inclusive, e encerradas depois', () => {
    expect(getRegistrationState(deadline, deadlineMs - 1)).toBe('open')
    expect(getRegistrationState(deadline, deadlineMs)).toBe('open')
    expect(getRegistrationState(deadline, deadlineMs + 1)).toBe('closed')
  })

  it('sem prazo válido não há estado', () => {
    expect(getRegistrationState(null, deadlineMs)).toBeNull()
    expect(getRegistrationState('abc', deadlineMs)).toBeNull()
  })
})

describe('getOccupancy', () => {
  it('calcula a percentagem arredondada e marca quase esgotado a partir de 90%', () => {
    expect(getOccupancy(22, 30)).toEqual({ percent: 73, nearlyFull: false })
    expect(getOccupancy(45, 50)).toEqual({ percent: 90, nearlyFull: true })
    expect(getOccupancy(44, 50)).toEqual({ percent: 88, nearlyFull: false })
    expect(getOccupancy(47, 50)).toEqual({ percent: 94, nearlyFull: true })
    expect(getOccupancy(0, 40)).toEqual({ percent: 0, nearlyFull: false })
  })

  it('devolve null sem lotação válida ou com inscritos negativos', () => {
    expect(getOccupancy(5, 0)).toBeNull()
    expect(getOccupancy(5, null)).toBeNull()
    expect(getOccupancy(-1, 10)).toBeNull()
  })
})

describe('countActiveFilters', () => {
  it('conta só os filtros preenchidos', () => {
    expect(countActiveFilters({ dateFrom: '2026-01-01', dateTo: '', categoryId: 'c1', locationId: '' })).toBe(2)
    expect(countActiveFilters({ dateFrom: '', dateTo: '', categoryId: '', locationId: '' })).toBe(0)
    expect(countActiveFilters({ dateFrom: '2026-01-01', dateTo: '2026-01-31', categoryId: 'c1', locationId: 'l1' })).toBe(4)
  })
})

describe('getDateRangeError', () => {
  it('dá a mensagem do backend quando a data final é anterior à inicial', () => {
    expect(getDateRangeError('2026-11-20', '2026-11-19')).toBe('A data final tem de ser igual ou posterior à data inicial.')
  })

  it('não dá erro com datas iguais ou com uma delas vazia', () => {
    expect(getDateRangeError('2026-11-20', '2026-11-20')).toBe('')
    expect(getDateRangeError('2026-11-20', '')).toBe('')
    expect(getDateRangeError('', '2026-11-19')).toBe('')
  })
})

describe('formatResultsRange', () => {
  it('mostra o intervalo de eventos da página e o total', () => {
    expect(formatResultsRange({ current_page: 1, per_page: 6, total: 13 }, 6)).toBe('1–6 de 13 eventos')
    expect(formatResultsRange({ current_page: 3, per_page: 6, total: 13 }, 1)).toBe('13 de 13 eventos')
    expect(formatResultsRange({ current_page: 1, per_page: 6, total: 1 }, 1)).toBe('1 de 1 evento')
  })

  it('não mostra nada sem eventos', () => {
    expect(formatResultsRange({ current_page: 1, per_page: 6, total: 0 }, 0)).toBe('')
  })
})

describe('getEventSeries', () => {
  it('devolve a posição e o total da série quando são válidos', () => {
    expect(getEventSeries({ series: { position: 2, total: 5 } })).toEqual({ position: 2, total: 5 })
  })

  it('devolve null sem série ou com valores inválidos', () => {
    const invalid = [
      {},
      { series: null },
      { series: { position: 0, total: 5 } },
      { series: { position: 6, total: 5 } },
      { series: { position: 2.5, total: 5 } },
      { series: { position: '2', total: 5 } },
    ]

    for (const event of invalid) {
      expect(getEventSeries(event)).toBeNull()
    }
  })
})

describe('formatSession', () => {
  it('mostra Sessão X/Y só quando o evento pertence a uma série', () => {
    expect(formatSession({ series: { position: 2, total: 5 } })).toBe('Sessão 2/5')
    expect(formatSession({})).toBeNull()
  })
})

describe('getFilenameFromContentDisposition', () => {
  it('lê o nome do ficheiro com e sem aspas', () => {
    expect(getFilenameFromContentDisposition('attachment; filename=presencas_2030-11-15_jantar-lisboa.csv')).toBe('presencas_2030-11-15_jantar-lisboa.csv')
    expect(getFilenameFromContentDisposition('attachment; filename="presencas_2030-11-15.csv"')).toBe('presencas_2030-11-15.csv')
  })

  it('dá prioridade ao filename* e cai no filename quando a codificação é inválida', () => {
    expect(getFilenameFromContentDisposition("attachment; filename=x.csv; filename*=UTF-8''presen%C3%A7as.csv")).toBe('presenças.csv')
    expect(getFilenameFromContentDisposition("attachment; filename*=UTF-8''%E0%A4%A; filename=ok.csv")).toBe('ok.csv')
  })

  it('fica só com o nome-base, sem caminhos', () => {
    expect(getFilenameFromContentDisposition('attachment; filename="../../etc/passwd"')).toBe('passwd')
    expect(getFilenameFromContentDisposition('attachment; filename="..\\pasta\\a.csv"')).toBe('a.csv')
  })

  it('devolve null sem nome de ficheiro', () => {
    for (const header of ['attachment', '', null, undefined, 'attachment; filename=""']) {
      expect(getFilenameFromContentDisposition(header)).toBeNull()
    }
  })
})

describe('getAttendeesFallbackFilename', () => {
  it('usa a data do evento quando é válida', () => {
    expect(getAttendeesFallbackFilename({ event_date: '2030-11-15' })).toBe('presencas_2030-11-15.csv')
  })

  it('usa um nome genérico sem data válida', () => {
    for (const event of [{ event_date: null }, { event_date: '15/11/2030' }, {}]) {
      expect(getAttendeesFallbackFilename(event)).toBe('presencas.csv')
    }
  })
})

describe('getAttendeesExportDescription', () => {
  const dinner = (registrations) => ({ name: 'Jantar — Lisboa', event_date: '2030-11-15', registrations_count: registrations })

  it('diz as colunas do ficheiro e o número de inscritos', () => {
    expect(getAttendeesExportDescription(dinner(28))).toBe('Vai descarregar a lista de presenças de «Jantar — Lisboa» (15 Nov 2030) com o nome, a empresa e o email e telefone pessoais dos 28 inscritos.')
    expect(getAttendeesExportDescription(dinner(1))).toBe('Vai descarregar a lista de presenças de «Jantar — Lisboa» (15 Nov 2030) com o nome, a empresa e o email e telefone pessoais do 1 inscrito.')
  })

  it('avisa que sem inscritos o ficheiro só tem os cabeçalhos', () => {
    expect(getAttendeesExportDescription(dinner(0))).toBe('Vai descarregar a lista de presenças de «Jantar — Lisboa» (15 Nov 2030). O evento não tem inscritos: o ficheiro terá só os cabeçalhos.')
  })

  it('sem um número de inscritos válido não mostra o número', () => {
    for (const registrations of [undefined, -1, 2.5]) {
      expect(getAttendeesExportDescription(dinner(registrations))).toBe('Vai descarregar a lista de presenças de «Jantar — Lisboa» (15 Nov 2030) com o nome, a empresa e o email e telefone pessoais dos inscritos.')
    }
  })
})

describe('ATTENDEES_EXPORT_TEXTS', () => {
  it('tem os textos do botão e do diálogo com o aviso do art. 9.º do RGPD', () => {
    expect(ATTENDEES_EXPORT_TEXTS).toEqual({
      buttonLabel: 'Exportar lista de presenças',
      unavailableHint: 'Disponível depois do prazo de inscrição',
      title: 'Exportar lista de presenças',
      note: 'Dados sensíveis (art. 9.º do RGPD): numa associação cristã, estar inscrito num evento pode revelar convicções religiosas. Use a lista só dentro da ASPEC, não a envie a terceiros (ao local do evento indique só o número de inscritos) e apague o ficheiro depois de usado.',
      confirmLabel: 'Descarregar CSV',
      notFound: 'O evento já não existe. A lista foi atualizada.',
    })
  })

  it('não há mensagem de sucesso da exportação', () => {
    expect(adminEventsUtils).not.toHaveProperty('getExportSuccessMessage')
  })
})

describe('DELETE_EVENT_TEXTS', () => {
  it('tem os textos do botão e dos diálogos de apagar e o limite da justificação', () => {
    expect(DELETE_EVENT_TEXTS).toEqual({
      buttonTitle: 'Apagar evento',
      title: 'Apagar evento?',
      label: 'Justificação',
      placeholder: 'Explique aos inscritos o motivo do cancelamento.',
      hint: 'A justificação é obrigatória para apagar o evento.',
      confirmLabel: 'Apagar e notificar',
      confirmLabelNoRegistrants: 'Apagar evento',
      cancelLabel: 'Voltar',
      notFound: 'O evento já não existe. A lista foi atualizada.',
      registrantsChanged: 'Entretanto houve inscrições neste evento e a justificação passou a ser obrigatória. A lista foi atualizada: carregue de novo em Apagar para a escrever.',
    })
    expect(DELETE_JUSTIFICATION_MAX_LENGTH).toBe(2000)
  })
})

describe('needsDeleteJustification', () => {
  it('pede a justificação quando há inscritos', () => {
    expect(needsDeleteJustification({ registrations_count: 22 })).toBe(true)
    expect(needsDeleteJustification({ registrations_count: 1 })).toBe(true)
  })

  it('não pede a justificação só quando não há inscritos', () => {
    expect(needsDeleteJustification({ registrations_count: 0 })).toBe(false)
  })

  it('com uma contagem inválida ou em falta pede a justificação', () => {
    for (const registrations of [null, undefined, '0', -1, 2.5]) {
      expect(needsDeleteJustification({ registrations_count: registrations })).toBe(true)
    }
    expect(needsDeleteJustification({})).toBe(true)
  })
})

describe('getDeleteEventDescription', () => {
  const workshop = (overrides = {}) => ({ name: 'Workshop de Liderança', event_date: '2099-01-21', registrations_count: 22, ...overrides })
  const INTRO = 'Vai apagar «Workshop de Liderança» (21 Jan 2099).'

  it('diz o evento, a data e o número de inscritos que recebem o email', () => {
    expect(getDeleteEventDescription(workshop())).toBe(`${INTRO} Será enviado um email aos 22 inscritos a informar que o evento foi cancelado, com a justificação abaixo. O evento e as inscrições são apagados definitivamente.`)
  })

  it('com um só inscrito fala no inscrito e na inscrição', () => {
    expect(getDeleteEventDescription(workshop({ registrations_count: 1 }))).toBe(`${INTRO} Será enviado um email ao inscrito a informar que o evento foi cancelado, com a justificação abaixo. O evento e a inscrição são apagados definitivamente.`)
  })

  it('sem inscritos avisa que ninguém é notificado', () => {
    expect(getDeleteEventDescription(workshop({ registrations_count: 0 }))).toBe(`${INTRO} O evento não tem inscritos, por isso ninguém é notificado. O evento é apagado definitivamente.`)
  })

  it('sem um número de inscritos válido não mostra o número', () => {
    expect(getDeleteEventDescription(workshop({ registrations_count: null }))).toBe(`${INTRO} Será enviado um email aos inscritos a informar que o evento foi cancelado, com a justificação abaixo. O evento e as inscrições são apagados definitivamente.`)
  })

  it('com uma data inválida mostra um travessão', () => {
    expect(getDeleteEventDescription(workshop({ event_date: 'x' }))).toMatch(/^Vai apagar «Workshop de Liderança» \(—\)\./)
  })
})

describe('ATTENDEES_LIST_TEXTS', () => {
  it('tem os textos do botão e do diálogo da lista de inscritos com o aviso do art. 9.º do RGPD', () => {
    expect(ATTENDEES_LIST_TEXTS).toEqual({
      buttonLabel: 'Ver inscritos',
      title: 'Inscritos',
      tableCaption: 'Inscritos do evento',
      regionLabel: 'Lista de inscritos',
      note: 'Dados sensíveis (art. 9.º do RGPD): numa associação cristã, estar inscrito num evento pode revelar convicções religiosas. Use esta lista só dentro da ASPEC e não a partilhe com terceiros (ao local do evento indique só o número de inscritos).',
      loading: 'A carregar inscritos...',
      empty: 'Este evento não tem inscritos.',
      noProfile: 'Conta sem perfil',
      loadError: 'Não foi possível carregar os inscritos. Tente novamente.',
      notFound: 'O evento já não existe. A lista foi atualizada.',
      retryLabel: 'Tentar novamente',
      closeLabel: 'Fechar',
    })
  })
})

describe('formatRegisteredAt', () => {
  it('mostra a data de inscrição na hora de Lisboa, no verão e no inverno', () => {
    expect(formatRegisteredAt('2026-07-15T13:05:00+00:00')).toBe('15 Jul 2026, 14:05')
    expect(formatRegisteredAt('2026-12-01T09:30:00+00:00')).toBe('1 Dez 2026, 09:30')
  })

  it('devolve um travessão para datas vazias, inválidas ou que não são texto', () => {
    for (const value of [null, '', 'x', 42]) {
      expect(formatRegisteredAt(value)).toBe('—')
    }
  })
})

describe('formatAttendeesCount', () => {
  it('diz o número de inscritos e de lugares, no singular e no plural', () => {
    expect(formatAttendeesCount(22, 30)).toBe('22 inscritos de 30 lugares')
    expect(formatAttendeesCount(1, 30)).toBe('1 inscrito de 30 lugares')
    expect(formatAttendeesCount(0, 30)).toBe('0 inscritos de 30 lugares')
  })

  it('sem uma lotação válida mostra só o número de inscritos', () => {
    for (const max of [null, 0, '30']) {
      expect(formatAttendeesCount(5, max)).toBe('5 inscritos')
    }
  })
})

describe('getAttendeesDialogDescription', () => {
  const workshop = { name: 'Workshop de Liderança', event_date: '2099-01-21', max_attendees: 30 }

  it('enquanto não há lista mostra só o evento e a data', () => {
    expect(getAttendeesDialogDescription(workshop, null)).toBe('«Workshop de Liderança» (21 Jan 2099)')
  })

  it('com a lista carregada acrescenta a contagem de inscritos e lugares', () => {
    expect(getAttendeesDialogDescription(workshop, 4)).toBe('«Workshop de Liderança» (21 Jan 2099) · 4 inscritos de 30 lugares')
  })

  it('com uma data inválida mostra um travessão', () => {
    expect(getAttendeesDialogDescription({ ...workshop, event_date: 'x' }, null)).toBe('«Workshop de Liderança» (—)')
  })
})
