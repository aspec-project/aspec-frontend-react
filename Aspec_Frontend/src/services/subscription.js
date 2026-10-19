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

/*
 * Obtém uma página das faturas do membro autenticado.
 *
 * A API fixa 10 resultados por página e devolve tanto os itens como os
 * metadados necessários para construir os controlos de paginação.
 */
export async function getInvoices(page = 1) {
  const response = await api.get('/invoices', {
    params: { page },
  })

  return response.data.data
}

/*
 * Os pedidos de PDF usam responseType blob. Quando a API devolve um erro,
 * também o recebemos como Blob; convertemo-lo novamente para JSON para que
 * normalizeError consiga mostrar a mensagem enviada pelo backend.
 */
async function rethrowInvoicePdfError(error) {
  const responseData = error.response?.data

  if (typeof Blob !== 'undefined' && responseData instanceof Blob) {
    try {
      error.response.data = JSON.parse(await responseData.text())
    } catch {
      /*
       * Se a resposta não for JSON, preservamos o erro original. O tratamento
       * global apresenta então a mensagem de reserva apropriada.
       */
    }
  }

  throw error
}

/*
 * Obtém o conteúdo binário do PDF de uma fatura emitida.
 *
 * A criação do download no browser fica a cargo do componente, que conhece
 * o número da fatura para lhe atribuir um nome legível.
 */
export async function downloadInvoicePdf(invoiceId) {
  try {
    const response = await api.get(`/invoices/${invoiceId}/pdf`, {
      responseType: 'blob',
    })

    return response.data
  } catch (error) {
    await rethrowInvoicePdfError(error)
  }
}
