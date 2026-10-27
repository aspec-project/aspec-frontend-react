import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  Save,
} from 'lucide-react'
import { normalizeError } from '../services/api'
import { resetPassword } from '../services/passwordRecovery'
import { isPasswordValid, validateEmail } from '../utils/registerUtils'

/*
 * Mostra o erro devolvido para cada campo do formulário.
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
 * Página pública aberta pelo link recebido por email.
 *
 * O token e o email são lidos diretamente da query string e nunca são
 * guardados no localStorage. Enquanto esta página está aberta, o browser
 * também não envia o URL do link como Referer para sites externos.
 */
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const submittingRef = useRef(false)

  const email = searchParams.get('email')?.trim() ?? ''
  const token = searchParams.get('token') ?? ''
  const hasValidLinkParameters = Boolean(
    token && email && validateEmail(email),
  )

  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [status, setStatus] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  /*
   * O link de redefinição é uma credencial temporária. Esta meta evita que
   * o URL completo seja enviado no cabeçalho Referer por navegação externa.
   */
  useEffect(() => {
    let meta = document.querySelector('meta[name="referrer"]')
    const wasCreated = !meta
    const previousContent = meta?.getAttribute('content') ?? null

    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'referrer')
      document.head.append(meta)
    }

    meta.setAttribute('content', 'no-referrer')

    return () => {
      if (wasCreated) {
        meta.remove()
      } else if (previousContent === null) {
        meta.removeAttribute('content')
      } else {
        meta.setAttribute('content', previousContent)
      }
    }
  }, [])

  function handlePasswordChange(setValue) {
    return (event) => {
      setValue(event.target.value)
      setFieldErrors({})
      setStatus(null)
    }
  }

  function validateForm() {
    const errors = {}

    if (!password) {
      errors.password = 'Indique a nova password.'
    } else if (!isPasswordValid(password)) {
      errors.password =
        'A password deve ter 8 caracteres, maiúscula, minúscula, número e símbolo.'
    }

    if (password !== passwordConfirmation) {
      errors.password_confirmation = 'As passwords não coincidem.'
    }

    return errors
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const clientErrors = validateForm()

    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors)
      return
    }

    if (submittingRef.current) {
      return
    }

    submittingRef.current = true
    setSubmitting(true)
    setFieldErrors({})
    setStatus(null)

    try {
    const response = await resetPassword({
        email,
        token,
        password,
        passwordConfirmation,
      })

      setSubmitted(true)
      setStatus({
        type: 'success',
        message:
          response.message ??
          'Password redefinida com sucesso. Inicie sessão novamente.',
      })
    } catch (error) {

      const normalizedError = normalizeError(error)

      setFieldErrors(normalizedError.fieldErrors ?? {})
      setStatus({
        type: 'error',
        message:
          normalizedError.message ??
          'Não foi possível redefinir a password. Tente novamente.',
      })
    } finally {
      submittingRef.current = false

        setSubmitting(false)
    }
  }

  if (!hasValidLinkParameters) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-[#f8f7f2] px-5 py-12">
        <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-red-100 text-red-600">
            <KeyRound size={32} aria-hidden="true" />
          </div>

          <h1 className="mt-6 text-2xl font-bold text-[#0d1f35]">
            Link de redefinição inválido
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            O link está incompleto ou já não é válido. Peça um novo link para
            redefinir a sua password.
          </p>

          <Link
            to="/esqueci-password"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#0d1f35] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Pedir novo link
          </Link>
        </div>
      </section>
    )
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
              Password redefinida
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              {status?.message}
            </p>

            <Link
              to="/login"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#0d1f35] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <ArrowLeft size={17} aria-hidden="true" />
              Iniciar sessão
            </Link>
          </div>
        ) : (
          <>
            <div className="flex size-12 items-center justify-center rounded-full bg-[#8a7043]/15 text-[#8a7043]">
              <KeyRound size={25} aria-hidden="true" />
            </div>

            <h1 className="mt-5 text-2xl font-bold text-[#0d1f35]">
              Redefinir password
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Escolha uma nova password para a conta <strong>{email}</strong>.
            </p>

            <form className="mt-7 space-y-5" onSubmit={handleSubmit} noValidate>
              <div>
                <label
                  className="block text-sm font-medium text-slate-700"
                  htmlFor="reset-password"
                >
                  Nova password
                </label>

                <input
                  id="reset-password"
                  type="password"
                  value={password}
                  onChange={handlePasswordChange(setPassword)}
                  autoComplete="new-password"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#8a7043] focus:ring-2 focus:ring-[#8a7043]/20"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Mínimo de 8 caracteres, com maiúscula, minúscula, número e
                  símbolo.
                </p>

                <FieldError message={fieldErrors.password} />
              </div>

              <div>
                <label
                  className="block text-sm font-medium text-slate-700"
                  htmlFor="reset-password-confirmation"
                >
                  Confirmar nova password
                </label>

                <input
                  id="reset-password-confirmation"
                  type="password"
                  value={passwordConfirmation}
                  onChange={handlePasswordChange(setPasswordConfirmation)}
                  autoComplete="new-password"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#8a7043] focus:ring-2 focus:ring-[#8a7043]/20"
                />

                <FieldError message={fieldErrors.password_confirmation} />
              </div>

              {status?.type === 'error' && (
                <p
                  className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800"
                  role="alert"
                >
                  {status.message}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0d1f35] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <LoaderCircle className="animate-spin" size={18} />
                ) : (
                  <Save size={18} aria-hidden="true" />
                )}
                {submitting ? 'A guardar…' : 'Guardar nova password'}
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