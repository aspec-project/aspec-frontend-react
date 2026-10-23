import { describe, expect, it } from 'vitest'
import * as adminEventsUtils from '../../src/utils/adminEvents'
import {
  ATTENDEES_EXPORT_TEXTS,
  countActiveFilters,
  formatDeadline,
  formatEventDate,
  formatResultsRange,
  formatSession,
  formatTimeRange,
  getAttendeesExportDescription,
  getAttendeesFallbackFilename,
  getDateRangeError,
  getEventSeries,
  getFilenameFromContentDisposition,
  getOccupancy,
  getRegistrationState,
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
