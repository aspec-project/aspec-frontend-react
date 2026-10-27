import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, KeyRound, Save } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { normalizeError } from '../services/api'
import { isSessionCurrent } from '../services/sessionContext'
import useSessionRequest from '../hooks/useSessionRequest'
import { updateAccountPassword } from '../services/account'
import { isPasswordValid } from '../utils/registerUtils'

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

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const getRequestContext = useSessionRequest()
  const passwordSavingRef = useRef(false)
  const redirectTimeoutRef = useRef(null)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    password: '',
    passwordConfirmation: '',
  })
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [passwordStatus, setPasswordStatus] = useState(null)
  const [passwordErrors, setPasswordErrors] = useState({})

  /*
   * Evita que uma navegação pendente aconteça depois de o utilizador sair
   * desta página por iniciativa própria.
   */
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        window.clearTimeout(redirectTimeoutRef.current)
      }
    }
  }, [])

  function handlePasswordChange(event) {
    const { name, value } = event.target

    setPasswordData((currentData) => ({
      ...currentData,
      [name]: value,
    }))

    setPasswordStatus(null)
    setPasswordErrors({})
  }

  function validatePasswordForm() {
    const errors = {}

    if (!passwordData.currentPassword) {
      errors.current_password = 'Indique a palavra-passe atual.'
    }

    if (!passwordData.password) {
      errors.password = 'Indique a nova palavra-passe.'
    } else if (!isPasswordValid(passwordData.password)) {
      errors.password =
        'A palavra-passe deve ter 8 caracteres, maiúscula, minúscula, número e símbolo.'
    }

    if (passwordData.password !== passwordData.passwordConfirmation) {
      errors.password_confirmation = 'As palavras-passe não coincidem.'
    }

    return errors
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault()

    const context = getRequestContext()

    if (!context || passwordSavingRef.current) {
      return
    }

    const clientErrors = validatePasswordForm()

    if (Object.keys(clientErrors).length > 0) {
      setPasswordErrors(clientErrors)
      setPasswordStatus({
        type: 'error',
        message: 'Corrige os campos assinalados antes de guardar.',
      })
      return
    }

    passwordSavingRef.current = true
    setIsSavingPassword(true)
    setPasswordStatus(null)
    setPasswordErrors({})

    try {
      await updateAccountPassword(
        {
          current_password: passwordData.currentPassword,
          password: passwordData.password,
          password_confirmation: passwordData.passwordConfirmation,
        },
        context,
      )

      if (!isSessionCurrent(context)) {
        return
      }

      setPasswordData({
        currentPassword: '',
        password: '',
        passwordConfirmation: '',
      })
      setPasswordStatus({
        type: 'success',
        message: 'Palavra-passe alterada com sucesso.',
      })

      /*
       * Mantém a confirmação visível antes de regressar à página de conta.
       */
      redirectTimeoutRef.current = window.setTimeout(() => {
        navigate('/perfil/conta')
      }, 2000)
    } catch (error) {
      if (!isSessionCurrent(context)) {
        return
      }

      const normalisedError = normalizeError(error)

      setPasswordErrors(normalisedError.fieldErrors ?? {})
      setPasswordStatus({
        type: 'error',
        message:
          normalisedError.message ??
          'Não foi possível alterar a palavra-passe.',
      })
    } finally {
      passwordSavingRef.current = false

      if (isSessionCurrent(context)) {
        setIsSavingPassword(false)
      }
    }
  }

  const inputClassName =
    'mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#9b7b45] focus:ring-2 focus:ring-[#9b7b45]/20'

  return (
    <div className="space-y-6">
      <Link
        to="/perfil/conta"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#0d1f35] hover:underline"
      >
        <ArrowLeft size={17} aria-hidden="true" />
        Voltar às informações de conta
      </Link>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <KeyRound className="text-[#9b7b45]" size={22} aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-bold text-[#0d1f35]">
              Alterar palavra-passe
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Usa uma palavra-passe forte e diferente das que utilizas noutros
              serviços.
            </p>
          </div>
        </div>

        <form className="mt-7 max-w-2xl space-y-5" onSubmit={handlePasswordSubmit}>
          <fieldset disabled={isSavingPassword} className="space-y-5">
            <div>
              <label
                htmlFor="currentPassword"
                className="text-sm font-semibold text-[#0d1f35]"
              >
                Palavra-passe atual
              </label>

              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                autoComplete="current-password"
                className={inputClassName}
              />

              <FieldError message={passwordErrors.current_password} />
            </div>

            <div>
              <label
                htmlFor="password"
                className="text-sm font-semibold text-[#0d1f35]"
              >
                Nova palavra-passe
              </label>

              <input
                id="password"
                name="password"
                type="password"
                value={passwordData.password}
                onChange={handlePasswordChange}
                autoComplete="new-password"
                className={inputClassName}
              />

              <p className="mt-2 text-xs text-slate-500">
                Mínimo de 8 caracteres, com maiúscula, minúscula, número e
                símbolo.
              </p>

              <FieldError message={passwordErrors.password} />
            </div>

            <div>
              <label
                htmlFor="passwordConfirmation"
                className="text-sm font-semibold text-[#0d1f35]"
              >
                Confirmar nova palavra-passe
              </label>

              <input
                id="passwordConfirmation"
                name="passwordConfirmation"
                type="password"
                value={passwordData.passwordConfirmation}
                onChange={handlePasswordChange}
                autoComplete="new-password"
                className={inputClassName}
              />

              <FieldError message={passwordErrors.password_confirmation} />
            </div>

            {passwordStatus && (
              <p
                className={
                  passwordStatus.type === 'success'
                    ? 'rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800'
                    : 'rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800'
                }
                role={passwordStatus.type === 'error' ? 'alert' : 'status'}
              >
                {passwordStatus.message}
              </p>
            )}

            <button
              type="submit"
              disabled={isSavingPassword}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0d1f35] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#193451] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={17} aria-hidden="true" />
              {isSavingPassword ? 'A guardar...' : 'Alterar palavra-passe'}
            </button>
          </fieldset>
        </form>
      </section>
    </div>
  )
}
