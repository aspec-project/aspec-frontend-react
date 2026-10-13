import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react'
import {
  getAccountActivation,
  startAccountActivation,
} from '../services/accountActivation'
import { normalizeError } from '../services/api'

const initialBillingData = {
  billing_name: '',
  nif: '',
  billing_address: '',
  billing_postal_code: '',
  billing_city: '',
}

/*
 * Replica a regra usada pela API: oito dígitos de base e um dígito de
 * controlo calculado pelo algoritmo do módulo 11. Espaços são permitidos
 * enquanto a pessoa escreve, mas não seguem para a API.
 */
function isValidPortugueseNif(value) {
  const nif = value.replace(/\s+/g, '')

  if (!/^\d{9}$/.test(nif)) {
    return false
  }

  const sum = [...nif.slice(0, 8)].reduce(
    (total, digit, index) => total + Number(digit) * (9 - index),
    0,
  )
  const remainder = sum % 11
  const checkDigit = remainder < 2 ? 0 : 11 - remainder

  return checkDigit === Number(nif[8])
}

function validateBillingData(data) {
  const errors = {}

  if (!data.billing_name.trim()) {
    errors.billing_name = 'Indica o nome para faturação.'
  }

  if (!data.nif.trim()) {
    errors.nif = 'Indica o NIF.'
  } else if (!isValidPortugueseNif(data.nif)) {
    errors.nif = 'Indica um NIF português válido.'
  }

  if (!data.billing_address.trim()) {
    errors.billing_address = 'Indica a morada de faturação.'
  }

  if (!data.billing_postal_code.trim()) {
    errors.billing_postal_code = 'Indica o código postal.'
  } else if (!/^\d{4}-\d{3}$/.test(data.billing_postal_code.trim())) {
    errors.billing_postal_code = 'Usa o formato 0000-000.'
  }

  if (!data.billing_city.trim()) {
    errors.billing_city = 'Indica a localidade.'
  }

  return errors
}

function formatPrice(price) {
  const currency = price?.currency?.toUpperCase() || 'EUR'
  const amount = Number(price?.amount ?? 0)
  const formattedAmount = new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency,
  }).format(amount)
  const interval = price?.interval === 'month' ? 'mês' : price?.interval

  return interval ? `${formattedAmount}/${interval}` : formattedAmount
}

function getLoadError(error) {
  const normalized = normalizeError(error)

  if (
    normalized.status === 403 ||
    normalized.status === 404 ||
    normalized.message === 'Este link já não é válido para esta conta.'
  ) {
    return {
      type: 'invalid-link',
      message: 'O link é inválido ou expirou.',
    }
  }

  if (normalized.message === 'A conta já está ativa.') {
    return {
      type: 'already-active',
      message: normalized.message,
    }
  }

  if (normalized.status === 429) {
    return {
      type: 'generic',
      message: 'Foram feitos demasiados pedidos. Tenta novamente dentro de um minuto.',
    }
  }

  return {
    type: 'generic',
    message: normalized.message,
  }
}

function BillingField({ label, name, error, ...inputProps }) {
  return (
    <label className="block text-sm font-medium text-slate-700" htmlFor={name}>
      {label}
      <input
        id={name}
        name={name}
        className={`mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#8a7043] focus:ring-2 focus:ring-[#8a7043]/20 ${
          error ? 'border-red-500' : 'border-slate-300'
        }`}
        aria-invalid={Boolean(error)}
        {...inputProps}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
}

function ActivationShell({ children }) {
  return (
    <section className="flex min-h-screen items-center justify-center bg-[#f8f7f2] px-5 py-12">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
        {children}
      </div>
    </section>
  )
}

function AccountActivationPage() {
  const { user: userId } = useParams()
  const location = useLocation()
  const rawSearch = location.search

  const [activation, setActivation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [requestAttempt, setRequestAttempt] = useState(0)
  const [billingData, setBillingData] = useState(initialBillingData)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitLoginLink, setSubmitLoginLink] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  /*
   * O link tem uma assinatura que funciona como credencial temporária.
   * Enquanto esta página está aberta, impede que a query seja enviada no
   * Referer quando o browser avança para o checkout externo do Stripe.
   */
  useEffect(() => {
    const existingMeta = document.querySelector('meta[name="referrer"]')
    const meta = existingMeta ?? document.createElement('meta')
    const previousContent = existingMeta?.getAttribute('content')

    meta.setAttribute('name', 'referrer')
    meta.setAttribute('content', 'no-referrer')

    if (!existingMeta) {
      document.head.append(meta)
    }

    return () => {
      if (existingMeta) {
        if (previousContent === null) {
          existingMeta.removeAttribute('content')
        } else {
          existingMeta.setAttribute('content', previousContent)
        }

        return
      }

      meta.remove()
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadActivation() {
      try {
        const activationData = await getAccountActivation(userId, rawSearch)

        if (!cancelled) {
          setActivation(activationData)
          setLoadError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(getLoadError(error))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadActivation()

    return () => {
      cancelled = true
    }
  }, [userId, rawSearch, requestAttempt])

  function retryLoading() {
    setLoading(true)
    setLoadError(null)
    setRequestAttempt((currentAttempt) => currentAttempt + 1)
  }

  function handleBillingChange(event) {
    const { name, value } = event.target

    setBillingData((currentData) => ({
      ...currentData,
      [name]: value,
    }))

    setFieldErrors((currentErrors) => {
      if (!currentErrors[name]) {
        return currentErrors
      }

      const { [name]: _removedError, ...remainingErrors } = currentErrors
      return remainingErrors
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitError('')
    setSubmitLoginLink(false)

    const payload = activation?.type === 'activation'
      ? {
          ...billingData,
          nif: billingData.nif.replace(/\s+/g, ''),
        }
      : {}

    if (activation?.type === 'activation') {
      const validationErrors = validateBillingData(billingData)

      if (Object.keys(validationErrors).length > 0) {
        setFieldErrors(validationErrors)
        return
      }
    }

    setSubmitting(true)

    try {
      const result = await startAccountActivation(userId, rawSearch, payload)

      if (!result?.checkout_url) {
        throw new Error('Não foi recebido um endereço para o pagamento.')
      }

      window.location.href = result.checkout_url
    } catch (error) {
      const normalized = normalizeError(error)

      if (normalized.status === 422) {
        setFieldErrors(normalized.fieldErrors)
      } else if (
        normalized.status === 403 ||
        normalized.status === 404 ||
        normalized.message === 'Este link já não é válido para esta conta.' ||
        normalized.message === 'A conta já está ativa.'
      ) {
        setLoadError(getLoadError(error))
      } else if (normalized.status === 429) {
        setSubmitError('Foram feitos demasiados pedidos. Tenta novamente dentro de um minuto.')
      } else if (
        normalized.status === 409 &&
        normalized.message === 'Já existe uma subscrição em curso para esta conta.'
      ) {
        setSubmitError('O pagamento já foi feito. Verifique o seu email ou inicie sessão.')
        setSubmitLoginLink(true)
      } else if (error instanceof Error && error.message === 'Não foi recebido um endereço para o pagamento.') {
        setSubmitError(error.message)
      } else {
        setSubmitError(normalized.message)
      }

      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <ActivationShell>
        <div className="flex flex-col items-center gap-3 py-12 text-center text-slate-600">
          <LoaderCircle className="animate-spin text-[#8a7043]" size={32} />
          <p>A validar o link de ativação…</p>
        </div>
      </ActivationShell>
    )
  }

  if (loadError) {
    const isInvalidLink = loadError.type === 'invalid-link'
    const isAlreadyActive = loadError.type === 'already-active'

    return (
      <ActivationShell>
        <div className="mx-auto max-w-lg py-5 text-center">
          <AlertCircle className="mx-auto mb-4 text-red-600" size={42} />
          <h1 className="text-2xl font-bold text-[#0d1f35]">
            {isInvalidLink
              ? 'Link de ativação inválido'
              : isAlreadyActive
                ? 'A conta já está ativa'
                : 'Não foi possível abrir a ativação'}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{loadError.message}</p>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            {isInvalidLink && (
              <Link
                to="/ativacao/novo-link"
                className="rounded-xl bg-[#0d1f35] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Pedir novo link
              </Link>
            )}
            {isAlreadyActive && (
              <Link
                to="/login"
                className="rounded-xl bg-[#0d1f35] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Iniciar sessão
              </Link>
            )}
            {!isInvalidLink && !isAlreadyActive && (
              <button
                type="button"
                onClick={retryLoading}
                className="cursor-pointer rounded-xl bg-[#0d1f35] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Tentar novamente
              </button>
            )}
          </div>
        </div>
      </ActivationShell>
    )
  }

  const isActivation = activation?.type === 'activation'
  const price = formatPrice(activation?.price)

  return (
    <ActivationShell>
      <div className="flex items-start gap-4 border-b border-slate-200 pb-6">
        <div className="rounded-full bg-[#8a7043]/15 p-3 text-[#8a7043]">
          <ShieldCheck size={26} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#0d1f35]">
            {isActivation ? 'Ative a sua conta' : 'Reative a sua conta'}
          </h1>
          {activation?.name && (
            <p className="mt-1 text-sm text-slate-600">Olá, {activation.name}.</p>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
        {isActivation ? (
          <p>
            Tem direito a um período experimental de <strong>{activation.trial_days} dias</strong>.
            {' '}Depois desse período, a subscrição custa <strong>{price}</strong>.
          </p>
        ) : (
          <p>
            A quota de <strong>{price}</strong> será cobrada de imediato. Não existe um novo período experimental.
          </p>
        )}
        {activation?.email && <p className="mt-2 text-slate-500">Conta: {activation.email}</p>}
      </div>

      <form className="mt-6" onSubmit={handleSubmit} noValidate>
        {isActivation && (
          <>
            <h2 className="flex items-center gap-2 text-base font-semibold text-[#0d1f35]">
              <CreditCard size={18} />
              Dados de faturação
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Estes dados serão usados nas suas faturas.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <BillingField
                  label="Nome para faturação"
                  name="billing_name"
                  value={billingData.billing_name}
                  onChange={handleBillingChange}
                  error={fieldErrors.billing_name}
                  autoComplete="organization"
                />
              </div>
              <BillingField
                label="NIF"
                name="nif"
                value={billingData.nif}
                onChange={handleBillingChange}
                error={fieldErrors.nif}
                inputMode="numeric"
                autoComplete="off"
              />
              <BillingField
                label="Código postal"
                name="billing_postal_code"
                value={billingData.billing_postal_code}
                onChange={handleBillingChange}
                error={fieldErrors.billing_postal_code}
                placeholder="0000-000"
                autoComplete="postal-code"
              />
              <div className="sm:col-span-2">
                <BillingField
                  label="Morada de faturação"
                  name="billing_address"
                  value={billingData.billing_address}
                  onChange={handleBillingChange}
                  error={fieldErrors.billing_address}
                  autoComplete="street-address"
                />
              </div>
              <div className="sm:col-span-2">
                <BillingField
                  label="Localidade"
                  name="billing_city"
                  value={billingData.billing_city}
                  onChange={handleBillingChange}
                  error={fieldErrors.billing_city}
                  autoComplete="address-level2"
                />
              </div>
            </div>
          </>
        )}

        {submitError && (
          <div className="mt-5 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 shrink-0" size={17} />
            <div>
              <span>{submitError}</span>
              {submitLoginLink && (
                <Link className="mt-1 block font-semibold underline" to="/login">
                  Iniciar sessão
                </Link>
              )}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-7 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0d1f35] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <LoaderCircle className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
          {submitting ? 'A encaminhar para o pagamento…' : 'Continuar para pagamento'}
        </button>
      </form>
    </ActivationShell>
  )
}

export default AccountActivationPage
