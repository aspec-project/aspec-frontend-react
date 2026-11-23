import { describe, expect, it } from 'vitest'
import { normalizeError } from '../../src/services/api'

describe('normalizeError', () => {
  it('preserva o estado estruturado da conta devolvido pela API', () => {
    const error = normalizeError({
      response: {
        status: 403,
        data: {
          message: 'Mensagem que pode mudar.',
          account_state: 'pending',
        },
      },
    })

    expect(error).toMatchObject({
      status: 403,
      accountState: 'pending',
    })
  })
})