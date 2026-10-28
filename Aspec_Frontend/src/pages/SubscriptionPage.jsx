import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  CreditCard,
  ExternalLink,
  Info,
  RefreshCw,
} from 'lucide-react'
import { normalizeError } from '../services/api'
import {
  cancelSubscription,
  createBillingPortalSession,
  getSubscription,
  resumeSubscription,
} from '../services/subscription'
import InvoiceList from '../components/subscription/InvoiceList'
import ConfirmDialog from '../components/ui/ConfirmDialog'

const monthNames = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
]

const intervalLabels = {
  day: { unit: 'dia', periodicity: 'Diária' },
  week: { unit: 'semana', periodicity: 'Semanal' },
  month: { unit: 'mês', periodicity: 'Mensal' },
  year: { unit: 'ano', periodicity: 'Anual' },
}

/*
 * Mantemos o formato curto do protótipo (por exemplo, “15 Fev 2025”),
 * mas só usamos datas reais devolvidas pela API.
 */
function formatDate(dateValue) {
  if (!dateValue) return null

  const date = new Date(dateValue)

  if (Number.isNaN(date.getTime())) return null

  return `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`
}

function formatPrice(price) {
  if (!price?.currency || typeof price.amount !== 'number') {
    return 'Valor indisponível'
  }

  const amount = new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: price.currency.toUpperCase(),
  }).format(price.amount)
  const interval = intervalLabels[price.interval]?.unit ?? price.interval

  return `${amount} / ${interval}`
}

function formatPeriodicity(interval) {
  return intervalLabels[interval]?.periodicity ?? '—'
}

/*
 * O backend calcula trial_days a partir das datas reais. O dia atual é
 * limitado ao intervalo para não ultrapassar a barra caso o browser fique
 * aberto quando o trial termina.
 */
function getTrialProgress(subscription) {
  const totalDays = Number(subscription.trial_days) || 30

  if (!subscription.trial_starts_at) {
    return { currentDay: null, totalDays, percentage: null }
  }

  const startsAt = new Date(subscription.trial_starts_at)

  if (Number.isNaN(startsAt.getTime())) {
    return { currentDay: null, totalDays, percentage: null }
  }

  const elapsedDays = Math.floor(
    (Date.now() - startsAt.getTime()) / (1000 * 60 * 60 * 24),
  ) + 1
  const currentDay = Math.min(totalDays, Math.max(1, elapsedDays))

  return {
    currentDay,
    totalDays,
    percentage: Math.round((currentDay / totalDays) * 100),
  }
}

function getStatusPresentation(subscription) {
  if (subscription.status === 'trialing') {
    return {
      label: 'Período de trial',
      className: 'bg-[#f5f2e8] text-[#6b5427]',
    }
  }

  if (subscription.status === 'past_due') {
    return {
      label: 'Período de carência',
      className: 'bg-[#fee8ea] text-[#d4183d]',
    }
  }

  if (subscription.cancel_at_period_end) {
    return {
      label: 'Cancelamento agendado',
      className: 'bg-[#f5f2e8] text-[#6b5427]',
    }
  }

  if (subscription.status === 'active') {
    return {
      label: 'Ativa',
      className: 'bg-[#e8f5ee] text-[#2d8e5a]',
    }
  }

  if (subscription.status === 'canceled') {
    return {
      label: 'Subscrição cancelada',
      className: 'bg-slate-100 text-slate-600',
    }
  }

  return {
    label: 'Pagamento pendente',
    className: 'bg-[#f5f2e8] text-[#6b5427]',
  }
}

/*
 * Página privada da subscrição. A estrutura segue o separador “Subscrição”
 * do protótipo: dados e ações à esquerda, faturas à direita.
 */
export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [pendingAction, setPendingAction] = useState(null)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)

  const loadSubscription = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true)

    setLoadError('')

    try {
      const subscriptionData = await getSubscription()

      setSubscription(subscriptionData)

      return true
    } catch (error) {
      setLoadError(normalizeError(error).message)

      return false
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSubscription()
  }, [loadSubscription])

  /*
   * Ao regressar do portal Stripe pelo histórico, a página pode ser
   * restaurada com o botão no estado “A abrir…”. O pageshow desbloqueia-o.
   */
  useEffect(() => {
    function resetBillingPortalAction() {
      setPendingAction((action) => (action === 'portal' ? null : action))
    }

    window.addEventListener('pageshow', resetBillingPortalAction)

    return () => window.removeEventListener('pageshow', resetBillingPortalAction)
  }, [])

  async function handleOpenBillingPortal() {
    setPendingAction('portal')
    setFeedback(null)

    try {
      const portalUrl = await createBillingPortalSession()

      window.location.assign(portalUrl)
    } catch (error) {
      setFeedback({ type: 'error', message: normalizeError(error).message })
      setPendingAction(null)
    }
  }

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
        setFeedback({ type: 'success', message: response.message })
      }
    } catch (error) {
      setFeedback({ type: 'error', message: normalizeError(error).message })
    } finally {
      setPendingAction(null)
    }
  }

  if (isLoading) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">A carregar a subscrição...</p>
      </section>
    )
  }

  if (loadError) {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-6" role="alert">
        <h1 className="text-xl font-semibold text-red-950">
          Não foi possível carregar a subscrição
        </h1>
        <p className="mt-2 text-sm text-red-800">{loadError}</p>
        <button
          type="button"
          onClick={() => void loadSubscription()}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0d1f35] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#193451]"
        >
          <RefreshCw size={15} aria-hidden="true" />
          Tentar novamente
        </button>
      </section>
    )
  }

  const isTrialing = subscription.status === 'trialing'
  const isPastDue = subscription.status === 'past_due'
  const isCancellationScheduled = subscription.cancel_at_period_end
  const canResume = isCancellationScheduled
  const canCancel =
    !isPastDue &&
    !isCancellationScheduled &&
    ['active', 'trialing'].includes(subscription.status)

  const nextPaymentAt = formatDate(
    subscription.next_payment_at ?? subscription.ends_at,
  )
  const trialEndsAt = formatDate(subscription.trial_ends_at)
  const graceEndsAt = formatDate(subscription.grace_ends_at)
  const periodEndsAt = formatDate(subscription.ends_at)
  const trial = getTrialProgress(subscription)
  const status = getStatusPresentation(subscription)

  let paymentValue = nextPaymentAt ?? '—'

  if (isTrialing && nextPaymentAt) {
    paymentValue = `${nextPaymentAt} (1.º pagamento)`
  } else if (isPastDue) {
    paymentValue = 'Nova tentativa pendente'
  } else if (isCancellationScheduled && periodEndsAt) {
    paymentValue = `Termina a ${periodEndsAt}`
  }

  const billingRows = [
    { label: 'Próximo pagamento', value: paymentValue },
    { label: 'Valor', value: formatPrice(subscription.price) },
    { label: 'Periodicidade', value: formatPeriodicity(subscription.price?.interval) },
    { label: 'Nome de faturação', value: subscription.billing?.billing_name ?? '—' },
    { label: 'NIF de faturação', value: subscription.billing?.nif ?? '—' },
    { label: 'Morada de faturação', value: subscription.billing?.billing_address ?? '—' },
    {
      label: 'Código postal e localidade',
      value:
        [
          subscription.billing?.billing_postal_code,
          subscription.billing?.billing_city,
        ]
          .filter(Boolean)
          .join(' ') || '—',
    },
  ]

  return (
    <section className="mx-auto max-w-6xl">
      <h1 className="mb-5 text-xl font-semibold text-[#0d1f35]">
        A Minha Subscrição
      </h1>

      {feedback && (
        <div
          className={`mb-5 rounded-xl border p-4 text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
          role={feedback.type === 'error' ? 'alert' : 'status'}
        >
          {feedback.message}
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-5">
        <div className="min-w-0 space-y-5 lg:col-span-3">
          {isTrialing && (
            <section
              className="rounded-xl border border-[#c9b87a] bg-[#f5f2e8] p-4 text-sm text-[#6b5427]"
              role="status"
            >
              <div className="flex items-start gap-3">
                <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
                <p>
                  Está no{' '}
                  <strong>
                    período de trial gratuito de {trial.totalDays} dias
                  </strong>
                  .
                  {trialEndsAt && ` O trial termina a ${trialEndsAt}.`}
                  {nextPaymentAt && (
                    <>
                      {' '}O primeiro pagamento de{' '}
                      <strong>{formatPrice(subscription.price).split(' / ')[0]}</strong>{' '}
                      será cobrado a <strong>{nextPaymentAt}</strong>.
                    </>
                  )}
                </p>
              </div>

              {trial.percentage !== null && (
                <>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/70">
                    <div
                      className="h-full rounded-full bg-[#8a7043]"
                      style={{ width: `${trial.percentage}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs opacity-80">
                    Dia {trial.currentDay} de {trial.totalDays}
                  </p>
                </>
              )}
            </section>
          )}

          {isPastDue && (
            <section
              className="flex items-start gap-3 rounded-xl border border-red-300 bg-[#fee8ea] p-4 text-sm text-[#a0001e]"
              role="alert"
            >
              <AlertTriangle
                size={16}
                aria-hidden="true"
                className="mt-0.5 shrink-0"
              />
              <p>
                Não foi possível processar o pagamento. Está no{' '}
                <strong>período de carência de 7 dias</strong>
                {graceEndsAt && (
                  <>
                    : mantém o acesso até <strong>{graceEndsAt}</strong>
                  </>
                )}
                . Atualize o método de pagamento para evitar a suspensão da
                conta.
              </p>
            </section>
          )}

          {isCancellationScheduled && periodEndsAt && (
            <section className="flex items-start gap-3 rounded-xl border border-[#c9b87a] bg-[#f5f2e8] p-4 text-sm text-[#6b5427]">
              <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
              <p>
                O cancelamento está agendado. Mantém o acesso até{' '}
                <strong>{periodEndsAt}</strong>.
              </p>
            </section>
          )}

          <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-[#0d1f35]">
                Plano de membro ASPEC
              </h2>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
              >
                {status.label}
              </span>
            </div>

            <dl className="text-sm">
              {billingRows.map((row) => (
                <div
                  key={row.label}
                  className="flex justify-between gap-6 border-b border-gray-50 py-3 last:border-0"
                >
                  <dt className="shrink-0 text-gray-500">{row.label}</dt>
                  <dd className="text-right font-medium text-[#0d1f35]">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleOpenBillingPortal}
              disabled={pendingAction === 'portal'}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0d1f35] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#193451] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CreditCard size={15} aria-hidden="true" />
              {pendingAction === 'portal'
                ? 'A abrir o portal...'
                : 'Atualizar o meu método de pagamento'}
              <ExternalLink size={13} aria-hidden="true" className="opacity-70" />
            </button>

            {canResume ? (
              <button
                type="button"
                onClick={() => void handleSubscriptionChange('resume')}
                disabled={pendingAction === 'resume'}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingAction === 'resume'
                  ? 'A retomar...'
                  : 'Retomar subscrição'}
              </button>
            ) : canCancel ? (
              <button
                type="button"
                onClick={() => setIsCancelDialogOpen(true)}
                disabled={pendingAction === 'cancel'}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingAction === 'cancel'
                  ? 'A agendar cancelamento...'
                  : 'Cancelar subscrição'}
              </button>
            ) : null}
          </div>
        </div>

        <InvoiceList />
      </div>

      <ConfirmDialog
        open={isCancelDialogOpen}
        title="Cancelar subscrição?"
        description="O cancelamento fica agendado para o fim do período atual. Manterá o acesso até essa data."
        confirmLabel="Confirmar cancelamento"
        tone="danger"
        pending={pendingAction === 'cancel'}
        showClose
        onCancel={() => setIsCancelDialogOpen(false)}
        onConfirm={() => {
          setIsCancelDialogOpen(false)
          void handleSubscriptionChange('cancel')
        }}
      />
    </section>
  )
}
