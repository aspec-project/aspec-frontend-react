import { api } from './api'

/*
 * Obtém a subscrição e os dados de faturação do membro autenticado.
 *
 * A API responde no formato { success, message, data }, por isso o
 * serviço devolve apenas o objeto útil para a página.
 */
export async function getSubscription() {
  const response = await api.get('/subscription')

  return response.data.data
}

/*
 * Cria uma sessão do portal de faturação do Stripe.
 *
 * O cartão nunca passa pelo frontend: recebemos apenas um URL temporário
 * e o browser é redirecionado para o portal seguro do Stripe.
 */
export async function createBillingPortalSession() {
  const response = await api.post('/subscription/billing-portal')

  return response.data.data.url
}

/*
 * Agenda o cancelamento para o fim do período já pago.
 *
 * A página volta a pedir a subscrição depois desta ação para refletir
 * o estado devolvido e a data de fim atualizada.
 */
export async function cancelSubscription() {
  const response = await api.post('/subscription/cancel')

  return response.data
}

/*
 * Retoma uma subscrição cujo cancelamento foi agendado, desde que ainda
 * não tenha chegado ao fim do período atual.
 */
export async function resumeSubscription() {
  const response = await api.post('/subscription/resume')

  return response.data
}