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

/*
 * Obtém as preferências pessoais de emails relacionados com eventos.
 */
export async function getNotificationPreferences(
  context = getSessionContext(),
) {
  const response = await api.get(
    '/account/notification-preferences',
    requestConfig(context),
  )

  requestConfig(context)

  return response.data.data
}

/*
 * O endpoint substitui o conjunto completo de preferências, por isso quem o
 * chama deve enviar sempre notify_new_events e notify_weekly_agenda.
 */
export async function updateNotificationPreferences(
  preferences,
  context = getSessionContext(),
) {
  const response = await api.put(
    '/account/notification-preferences',
    preferences,
    requestConfig(context),
  )

  requestConfig(context)

  return response.data.data
}
