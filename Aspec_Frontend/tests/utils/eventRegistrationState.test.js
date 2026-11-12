import { describe, expect, it } from 'vitest'
import { CLOSED_SPOTS_LABEL, REGISTRATION_STATE_LABELS, getRegistrationState } from '../../src/utils/eventRegistrationState'

const deadline = '2030-10-14T22:59:00Z'
const deadlineTime = Date.parse(deadline)
const afterDeadline = deadlineTime + 1
const beforeDeadline = deadlineTime - 60_000

describe('getRegistrationState', () => {
  it('devolve null quando registration_open não é booleano', () => {
    for (const registrationOpen of [undefined, null, 'true']) {
      const event = { registration_open: registrationOpen, available_spots: 10, registration_deadline: deadline }

      expect(getRegistrationState(event, beforeDeadline)).toBeNull()
    }
  })

  it('o prazo terminado manda: closed mesmo com vagas ou com registration_open true desatualizado', () => {
    expect(getRegistrationState({ registration_open: false, available_spots: 45, registration_deadline: deadline }, afterDeadline)).toBe('closed')
    expect(getRegistrationState({ registration_open: true, available_spots: 45, registration_deadline: deadline }, afterDeadline)).toBe('closed')
    expect(getRegistrationState({ registration_open: false, available_spots: 0, registration_deadline: deadline }, afterDeadline)).toBe('closed')
  })

  it('open quando a API diz aberto e o prazo não terminou', () => {
    const event = { registration_open: true, available_spots: 12, registration_deadline: deadline }

    expect(getRegistrationState(event, beforeDeadline)).toBe('open')
    expect(getRegistrationState(event, deadlineTime)).toBe('open')
  })

  it('full quando está fechado, sem vagas e o prazo está aberto ou em falta', () => {
    expect(getRegistrationState({ registration_open: false, available_spots: 0, registration_deadline: deadline }, beforeDeadline)).toBe('full')
    expect(getRegistrationState({ registration_open: false, available_spots: 0 }, beforeDeadline)).toBe('full')
  })

  it('closed quando está fechado com vagas e o prazo ainda não terminou no relógio local', () => {
    expect(getRegistrationState({ registration_open: false, available_spots: 3, registration_deadline: deadline }, beforeDeadline)).toBe('closed')
  })
})

describe('textos do estado das inscrições', () => {
  it('têm os textos combinados', () => {
    expect(REGISTRATION_STATE_LABELS).toEqual({
      open: 'Inscrições abertas',
      full: 'Lotação esgotada',
      closed: 'Inscrições encerradas',
    })
    expect(CLOSED_SPOTS_LABEL).toBe('Prazo de inscrição terminado')
  })
})
