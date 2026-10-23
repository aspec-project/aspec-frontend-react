import { CanceledError } from 'axios'
import { api } from './api'
import { getSessionContext, isSessionCurrent } from './sessionContext'

/*
 * Garante que uma alteração de conta só continua enquanto pertence
 * à sessão que a iniciou.
 */
function requestConfig(context) {
  if (!isSessionCurrent(context)) {
    throw new CanceledError('O contexto da sessão já não está ativo.')
  }

  return {
    sessionGeneration: context.generation,
    signal: context.signal,
  }
}

/*
 * Atualiza a palavra-passe da conta autenticada.
 *
 * O backend recebe a palavra-passe atual, a nova palavra-passe e a
 * respetiva confirmação. Nunca guardamos qualquer uma delas no browser.
 */
export async function updateAccountPassword(
  passwordPayload,
  context = getSessionContext(),
) {
  const response = await api.put(
    '/account/password',
    passwordPayload,
    requestConfig(context),
  )

  requestConfig(context)

  return response.data.data
}