import axios from 'axios'
import { API_URL } from './api'

/*
 * Cliente próprio para a recuperação de password.
 *
 * Estes pedidos são públicos e não dependem de uma sessão autenticada.
 * Ainda pedimos o cookie CSRF porque o frontend e a API estão em origens
 * diferentes durante o desenvolvimento.
 */
const passwordRecoveryApi = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: 'application/json',
  },
})

/*
 * Obtém o cookie XSRF antes dos pedidos POST públicos.
 */
async function ensurePasswordRecoveryCsrfCookie() {
  await axios.get(`${API_URL}/sanctum/csrf-cookie`, {
    withCredentials: true,
    withXSRFToken: true,
    headers: {
      Accept: 'application/json',
    },
  })
}

/*
 * Pede ao backend o envio do link de redefinição.
 *
 * O backend devolve sempre uma mensagem genérica, mesmo quando o email não
 * pertence a uma conta ativa, para não revelar informação sobre utilizadores.
 */
export async function requestPasswordResetLink(email) {
  await ensurePasswordRecoveryCsrfCookie()

  const response = await passwordRecoveryApi.post('/auth/forgot-password', {
    email,
  })

  return response.data
}

/*
 * Redefine a password através do token presente no link recebido por email.
 * O token e o email nunca são guardados no localStorage.
 */
export async function resetPassword({
  email,
  token,
  password,
  passwordConfirmation,
}) {
  await ensurePasswordRecoveryCsrfCookie()

  const response = await passwordRecoveryApi.post('/auth/reset-password', {
    email,
    token,
    password,
    password_confirmation: passwordConfirmation,
  })

  return response.data
}