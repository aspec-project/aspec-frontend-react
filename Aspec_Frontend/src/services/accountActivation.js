import axios from 'axios'
import { API_URL } from './api'

/*
 * Estes pedidos são públicos: a autorização é feita pela assinatura
 * presente no URL, não por sessão, cookies ou token.
 */
const activationApi = axios.create({
  headers: {
    Accept: 'application/json',
  },
})

/*
 * Usa a query recebida sem a interpretar nem reconstruir.
 * A assinatura depende exatamente dos valores do URL enviado no email.
 */
function buildActivationUrl(userId, rawSearch) {
  return `${API_URL}/api/account-activations/${encodeURIComponent(userId)}${rawSearch}`
}

/*
 * Valida o link e obtém os dados necessários para mostrar a página.
 */
export async function getAccountActivation(userId, rawSearch) {
  const response = await activationApi.get(
    buildActivationUrl(userId, rawSearch),
  )

  return response.data.data
}

/*
 * Inicia o checkout Stripe. Em ativação recebe os dados de faturação;
 * em reativação recebe um objeto vazio.
 */
export async function startAccountActivation(userId, rawSearch, payload = {}) {
  const response = await activationApi.post(
    buildActivationUrl(userId, rawSearch),
    payload,
  )

  return response.data.data
}

/*
 * Pede outro link de ativação ou reativação. O endpoint é público e a
 * página apresenta sempre a mesma confirmação, mesmo que o backend
 * responda com erro, para não revelar se o email pertence a uma conta.
 */
export async function resendAccountActivationLink(email) {
  await activationApi.post(`${API_URL}/api/account-activations/resend`, {
    email,
  })
}