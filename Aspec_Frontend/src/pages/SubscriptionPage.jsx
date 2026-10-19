import { useCallback, useEffect, useState } from 'react'
import { normalizeError } from '../services/api'
import {
  cancelSubscription,
  createBillingPortalSession,
  getSubscription,
  resumeSubscription,
} from '../services/subscription'
import InvoiceList from '../components/subscription/InvoiceList'

/*
 * Tradução dos estados técnicos devolvidos pelo Stripe para texto legível
 * para o membro autenticado.
 */
const statusLabels = {
  active: 'Subscrição ativa',
  trialing: 'Período experimental',
  past_due: 'Pagamento em atraso',
  canceled: 'Subscrição cancelada',
  incomplete: 'Pagamento pendente',
  incomplete_expired: 'Pagamento expirado',
}

/*
 * O backend devolve o intervalo técnico da subscrição. Esta lista permite
 * apresentar uma descrição adaptada à interface em português.
 */
const intervalLabels = {
  day: 'dia',
  week: 'semana',
  month: 'mês',
  year: 'ano',
}

/*
 * Formata datas ISO 8601 devolvidas pela API para o formato usado em Portugal.
 */
function formatDate(dateValue) {
  if (!dateValue) {
    return null
  }

  const date = new Date(dateValue)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/*
 * Formata o valor configurado no backend como preço mensal ou anual.
 */
function formatPrice(price) {
  if (!price?.currency || typeof price.amount !== 'number') {
    return 'Valor indisponível'
  }

  const amount = new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: price.currency.toUpperCase(),
  }).format(price.amount)

  const interval = intervalLabels[price.interval] ?? price.interval

  return `${amount}/${interval}`
}

/*
 * Página privada onde o membro consulta e gere a própria subscrição.
 *
 * Não usamos o layout da montra, porque subscrição é uma área da conta,
 * não uma secção de configuração da montra digital.
 */
export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [pendingAction, setPendingAction] = useState(null)

  /*
   * Obtém novamente o estado mais recente da subscrição. Esta atualização
   * é reutilizada depois de cancelar ou retomar, como definido pela API.
   */
  const loadSubscription = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true)
    }

    setLoadError('')

    try {
      const subscriptionData = await getSubscription()

      setSubscription(subscriptionData)

      return true
    } catch (error) {
      const normalisedError = normalizeError(error)

      setLoadError(normalisedError.message)

      return false
    } finally {
      if (showLoading) {
        setIsLoading(false)
      }
    }
  }, [])

  /*
   * Carrega a subscrição quando a rota é aberta.
   */
  useEffect(() => {
    loadSubscription()
  }, [loadSubscription])

  /*
   * Abre o portal seguro do Stripe para atualização do cartão.
   *
   * O frontend recebe apenas um URL temporário; os dados do cartão nunca
   * passam pela nossa aplicação.
   */
  async function handleOpenBillingPortal() {
    setPendingAction('portal')
    setFeedback(null)

    try {
      const portalUrl = await createBillingPortalSession()

      window.location.assign(portalUrl)
    } catch (error) {
      const normalisedError = normalizeError(error)

      setFeedback({
        type: 'error',
        message: normalisedError.message,
      })
      setPendingAction(null)
    }
  }

  /*
   * Cancela ou retoma e volta a pedir o estado à API, para apresentar de
   * imediato a data de fim e o botão correspondente ao novo estado.
   */
  async function handleSubscriptionChange(action) {
    setPendingAction(action)
    setFeedback(null)

    try {
      const response =
        action === 'cancel'
          ? await cancelSubscription()
          : await resumeSubscription()

      const wasRefreshed = await loadSubscription(false)

      if (wasRefreshed) {
        setFeedback({
          type: 'success',
          message: response.message,
        })
      }
    } catch (error) {
      const normalisedError = normalizeError(error)

      /*
       * Os erros 409 e 502 já trazem uma mensagem pronta no backend.
       * Mostramo-la e mantemos o botão disponível para nova tentativa.
       */
      setFeedback({
        type: 'error',
        message: normalisedError.message,
      })
    } finally {
      setPendingAction(null)
    }
  }

  /*
   * A confirmação evita agendar um cancelamento por engano. O backend
   * mantém o acesso até ao fim do período já pago.
   */
  function handleCancel() {
    const shouldCancel = window.confirm(
      'Pretende cancelar a subscrição no fim do período atual? Manterá o acesso até essa data.',
    )

    if (shouldCancel) {
      handleSubscriptionChange('cancel')
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f5f5f4] px-6 py-12">
        <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-slate-600">A carregar a subscrição...</p>
        </div>
      </main>
    )
  }

  if (loadError) {
    return (
      <main className="min-h-screen bg-[#f5f5f4] px-6 py-12">
        <section className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-8">
          <h1 className="text-2xl font-bold text-red-950">
            Não foi possível carregar a subscrição
          </h1>

          <p className="mt-3 text-red-800">{loadError}</p>

          <button
            type="button"
            onClick={() => loadSubscription()}
            className="mt-6 rounded-lg bg-[#0d1f35] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#193451]"
          >
            Tentar novamente
          </button>
        </section>
      </main>
    )
  }

  /*
   * ends_at representa o fim do período atual já pago.
   *
   * Numa subscrição ativa indica a próxima cobrança. Se existir um
   * cancelamento agendado, representa a data até à qual o membro mantém
   * o acesso à conta.
   */
  const periodEndsAt = formatDate(subscription.ends_at)

  const isPastDue = subscription.status === 'past_due'
  const canResume = subscription.cancel_at_period_end
  const canCancel =
    !isPastDue &&
    !subscription.cancel_at_period_end &&
    ['active', 'trialing'].includes(subscription.status)

  const trialEndsAt = formatDate(subscription.trial_ends_at)
  const graceEndsAt = formatDate(subscription.grace_ends_at)

  return (
    <main className="min-h-screen bg-[#f5f5f4] px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <header className="border-b border-slate-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a7043]">
            Área da conta
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[#0d1f35]">
            A minha subscrição
          </h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            Consulta o estado da tua subscrição, os dados de faturação e a
            gestão do método de pagamento.
          </p>
        </header>

        {feedback && (
          <div
            className={`mt-8 rounded-xl border p-4 text-sm ${
              feedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
            role={feedback.type === 'error' ? 'alert' : 'status'}
          >
            {feedback.message}
          </div>
        )}

        {isPastDue && (
          <section
            className="mt-8 rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-950"
            role="alert"
          >
            <h2 className="text-lg font-semibold">Pagamento em atraso</h2>
            <p className="mt-2 text-sm leading-relaxed">
              O pagamento da subscrição falhou.
              {graceEndsAt &&
                ` Atualiza o cartão até ${graceEndsAt} para manteres o acesso à conta.`}
            </p>

            <button
              type="button"
              onClick={handleOpenBillingPortal}
              disabled={pendingAction === 'portal'}
              className="mt-5 rounded-lg bg-[#0d1f35] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#193451] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pendingAction === 'portal'
                ? 'A abrir o portal...'
                : 'Atualizar cartão'}
            </button>
          </section>
        )}

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Estado atual
            </p>
            <p className="mt-2 text-2xl font-bold text-[#0d1f35]">
              {statusLabels[subscription.status] ?? subscription.status}
            </p>

            {trialEndsAt && (
              <p className="mt-5 text-sm text-slate-600">
                Período experimental termina a{' '}
                <strong className="text-slate-800">{trialEndsAt}</strong>.
              </p>
            )}

            {!subscription.cancel_at_period_end &&
              subscription.status !== 'trialing' &&
              periodEndsAt && (
                <p className="mt-5 text-sm text-slate-600">
                  Próxima cobrança a{' '}
                  <strong className="text-slate-800">{periodEndsAt}</strong>.
                </p>
              )}

            {subscription.cancel_at_period_end && periodEndsAt && (
              <p className="mt-5 text-sm text-amber-700">
                O cancelamento está agendado para{' '}
                <strong>{periodEndsAt}</strong>. Manténs o acesso até essa
                data.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Valor da subscrição
            </p>
            <p className="mt-2 text-2xl font-bold text-[#0d1f35]">
              {formatPrice(subscription.price)}
            </p>
            <p className="mt-5 text-sm text-slate-600">
              O valor e a periodicidade são definidos pela subscrição ativa.
            </p>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#0d1f35]">
            Dados de faturação
          </h2>

          <dl className="mt-6 grid gap-5 text-sm md:grid-cols-2">
            <div>
              <dt className="font-medium text-slate-500">Entidade</dt>
              <dd className="mt-1 text-slate-900">
                {subscription.billing?.billing_name ?? '—'}
              </dd>
            </div>

            <div>
              <dt className="font-medium text-slate-500">NIF</dt>
              <dd className="mt-1 text-slate-900">
                {subscription.billing?.nif ?? '—'}
              </dd>
            </div>

            <div>
              <dt className="font-medium text-slate-500">Morada</dt>
              <dd className="mt-1 text-slate-900">
                {subscription.billing?.billing_address ?? '—'}
              </dd>
            </div>

            <div>
              <dt className="font-medium text-slate-500">Código-postal e localidade</dt>
              <dd className="mt-1 text-slate-900">
                {[subscription.billing?.billing_postal_code, subscription.billing?.billing_city]
                  .filter(Boolean)
                  .join(' ') || '—'}
              </dd>
            </div>
          </dl>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#0d1f35]">
            Gestão de pagamento
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Atualiza o cartão através do portal seguro do Stripe.
          </p>

          <button
            type="button"
            onClick={handleOpenBillingPortal}
            disabled={pendingAction === 'portal'}
            className="mt-5 rounded-lg bg-[#0d1f35] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#193451] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pendingAction === 'portal'
              ? 'A abrir o portal...'
              : 'Atualizar cartão'}
          </button>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#0d1f35]">
            Gestão da subscrição
          </h2>

          {canResume ? (
            <>
              <p className="mt-2 text-sm text-slate-600">
                O cancelamento está agendado. Podes retomar a subscrição antes
                do fim do período atual.
              </p>

              <button
                type="button"
                onClick={() => handleSubscriptionChange('resume')}
                disabled={pendingAction === 'resume'}
                className="mt-5 rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingAction === 'resume'
                  ? 'A retomar...'
                  : 'Retomar subscrição'}
              </button>
            </>
          ) : canCancel ? (
            <>
              <p className="mt-2 text-sm text-slate-600">
                Ao cancelar, manténs o acesso até ao fim do período já pago.
              </p>

              <button
                type="button"
                onClick={handleCancel}
                disabled={pendingAction === 'cancel'}
                className="mt-5 rounded-lg border border-red-300 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingAction === 'cancel'
                  ? 'A agendar cancelamento...'
                  : 'Cancelar subscrição'}
              </button>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-600">
              Não existem ações de subscrição disponíveis neste estado.
            </p>
          )}
        </section>
        {/*
         * A lista gere o próprio carregamento, paginação e download de PDFs.
         * Mantemo-la separada da gestão da subscrição para cada responsabilidade
         * ficar isolada e para não recarregar o estado do pagamento sem necessidade.
         */}
        <InvoiceList />
      </div>
    </main>
  )
}