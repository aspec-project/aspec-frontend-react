import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  Mail,
  Send,
} from 'lucide-react'
import { normalizeError } from '../services/api'
import { requestPasswordResetLink } from '../services/passwordRecovery'
import { validateEmail } from '../utils/registerUtils'

/*
 * Mostra um erro diretamente abaixo do campo a que pertence.
 */
function FieldError({ message }) {
  if (!message) {
    return null
  }

  return (
    <p className="mt-2 text-sm text-red-700" role="alert">
      {message}
    </p>
  )
}

/*
 * Página pública para pedir o link de redefinição de password.
 *
 * O backend devolve sempre uma confirmação neutra para emails válidos:
 * assim, não revelamos se o endereço pertence a uma conta ativa.
 */
export default function ForgotPasswordPage() {
  const submittingRef = useRef(false)

  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [status, setStatus] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  function handleEmailChange(event) {
    setEmail(event.target.value)
    setFieldError('')
    setStatus(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const normalizedEmail = email.trim()

    if (!normalizedEmail) {
      setFieldError('Indique o seu email.')
      return
    }

    if (!validateEmail(normalizedEmail)) {
      setFieldError('Indique um email válido.')
      return
    }

    if (submittingRef.current) {
      return
    }

    submittingRef.current = true
    setSubmitting(true)
    setFieldError('')
    setStatus(null)

    try {
      const response = await requestPasswordResetLink(normalizedEmail)

      setSubmitted(true)
      setStatus({
        type: 'success',
        message:
          response.message ??
          'Se o email estiver registado e a conta ativa, receberá um link para redefinir a password.',
      })
    } catch (error) {

      const normalizedError = normalizeError(error)

      setFieldError(normalizedError.fieldErrors.email ?? '')
      setStatus({
        type: 'error',
        message:
          normalizedError.message ??
          'Não foi possível enviar o pedido. Tente novamente.',
      })
    } finally {
      submittingRef.current = false

        setSubmitting(false)
    }
  }

  return (
    <section className="flex min-h-screen items-center justify-center bg-[#f8f7f2] px-5 py-12">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        {submitted ? (
          <div className="py-4 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={38} aria-hidden="true" />
            </div>

            <h1 className="mt-6 text-2xl font-bold text-[#0d1f35]">
              Verifique o seu email
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              {status?.message}
            </p>

            <Link
              to="/login"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#0d1f35] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <ArrowLeft size={17} aria-hidden="true" />
              Voltar ao início de sessão
            </Link>
          </div>
        ) : (
          <>
            <div className="flex size-12 items-center justify-center rounded-full bg-[#8a7043]/15 text-[#8a7043]">
              <Mail size={25} aria-hidden="true" />
            </div>

            <h1 className="mt-5 text-2xl font-bold text-[#0d1f35]">
              Esqueci-me da password
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Introduza o email associado à sua conta. Se estiver registado e
              a conta estiver ativa, receberá um link para redefinir a
              password.
            </p>

            <form className="mt-7" onSubmit={handleSubmit} noValidate>
              <label
                className="block text-sm font-medium text-slate-700"
                htmlFor="forgot-password-email"
              >
                Email
              </label>

              <input
                id="forgot-password-email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                autoComplete="email"
                placeholder="o-teu@email.pt"
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#8a7043] focus:ring-2 focus:ring-[#8a7043]/20"
              />

              <FieldError message={fieldError} />

              {status?.type === 'error' && (
                <p
                  className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800"
                  role="alert"
                >
                  {status.message}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0d1f35] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <LoaderCircle className="animate-spin" size={18} />
                ) : (
                  <Send size={18} aria-hidden="true" />
                )}
                {submitting ? 'A enviar…' : 'Enviar link de recuperação'}
              </button>
            </form>

            <Link
              to="/login"
              className="mt-5 flex items-center justify-center gap-2 text-sm font-medium text-[#8a7043] hover:underline"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Voltar ao início de sessão
            </Link>
          </>
        )}
      </div>
    </section>
  )
}