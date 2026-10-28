import { useEffect, useRef, useState } from 'react'
import { KeyRound, Save, X } from 'lucide-react'
import useSessionRequest from '../../hooks/useSessionRequest'
import { normalizeError } from '../../services/api'
import { updateAccountPassword } from '../../services/account'
import { isSessionCurrent } from '../../services/sessionContext'
import { isPasswordValid } from '../../utils/registerUtils'

function FieldError({ message }) {
  return message ? <p className="mt-2 text-sm text-red-700" role="alert">{message}</p> : null
}

/* Modal da alteração de palavra-passe, mantido dentro da página da conta. */
export default function ChangePasswordDialog({ onClose }) {
  const getRequestContext = useSessionRequest()
  const savingRef = useRef(false)
  const closeTimeoutRef = useRef(null)
  const [formData, setFormData] = useState({
    currentPassword: '',
    password: '',
    passwordConfirmation: '',
  })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) window.clearTimeout(closeTimeoutRef.current)
    }
  }, [])

  function close() {
    if (!isSaving) onClose()
  }

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((currentData) => ({ ...currentData, [name]: value }))
    setErrors({})
    setStatus(null)
  }

  function validate() {
    const validationErrors = {}
    if (!formData.currentPassword) validationErrors.current_password = 'Indique a palavra-passe atual.'
    if (!formData.password) validationErrors.password = 'Indique a nova palavra-passe.'
    else if (!isPasswordValid(formData.password)) {
      validationErrors.password = 'A palavra-passe deve ter 8 caracteres, maiúscula, minúscula, número e símbolo.'
    }
    if (formData.password !== formData.passwordConfirmation) {
      validationErrors.password_confirmation = 'As palavras-passe não coincidem.'
    }
    return validationErrors
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const context = getRequestContext()
    if (!context || savingRef.current) return

    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    savingRef.current = true
    setIsSaving(true)
    setErrors({})
    setStatus(null)

    try {
      await updateAccountPassword({
        current_password: formData.currentPassword,
        password: formData.password,
        password_confirmation: formData.passwordConfirmation,
      }, context)
      if (!isSessionCurrent(context)) return

      setStatus({ type: 'success', message: 'Palavra-passe alterada com sucesso.' })
      closeTimeoutRef.current = window.setTimeout(() => {
        if (isSessionCurrent(context)) onClose()
      }, 2000)
    } catch (error) {
      if (!isSessionCurrent(context)) return
      const normalisedError = normalizeError(error)
      setErrors(normalisedError.fieldErrors ?? {})
      setStatus({ type: 'error', message: normalisedError.message ?? 'Não foi possível alterar a palavra-passe.' })
    } finally {
      savingRef.current = false
      if (isSessionCurrent(context)) setIsSaving(false)
    }
  }

  const inputClassName = (hasError = false) =>
    `mt-2 w-full rounded-lg border bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#9b7b45] focus:ring-2 focus:ring-[#9b7b45]/20 ${hasError ? 'border-red-400' : 'border-slate-300'}`

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <form role="dialog" aria-modal="true" aria-labelledby="change-password-dialog-title" onSubmit={handleSubmit} className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <KeyRound className="text-[#9b7b45]" size={22} aria-hidden="true" />
            <div>
              <h2 id="change-password-dialog-title" className="text-xl font-semibold text-[#0d1f35]">Alterar palavra-passe</h2>
              <p className="mt-1 text-sm text-slate-600">Use uma palavra-passe forte e diferente das que utiliza noutros serviços.</p>
            </div>
          </div>
          <button type="button" onClick={close} disabled={isSaving} aria-label="Fechar" className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"><X size={18} aria-hidden="true" /></button>
        </div>

        <fieldset disabled={isSaving} className="mt-6 space-y-5">
          <div><label htmlFor="currentPassword" className="text-sm font-semibold text-[#0d1f35]">Palavra-passe atual</label><input id="currentPassword" name="currentPassword" type="password" value={formData.currentPassword} onChange={handleChange} autoComplete="current-password" className={inputClassName(Boolean(errors.current_password))} /><FieldError message={errors.current_password} /></div>
          <div><label htmlFor="password" className="text-sm font-semibold text-[#0d1f35]">Nova palavra-passe</label><input id="password" name="password" type="password" value={formData.password} onChange={handleChange} autoComplete="new-password" className={inputClassName(Boolean(errors.password))} /><p className="mt-2 text-xs text-slate-500">Mínimo de 8 caracteres, com maiúscula, minúscula, número e símbolo.</p><FieldError message={errors.password} /></div>
          <div><label htmlFor="passwordConfirmation" className="text-sm font-semibold text-[#0d1f35]">Confirmar nova palavra-passe</label><input id="passwordConfirmation" name="passwordConfirmation" type="password" value={formData.passwordConfirmation} onChange={handleChange} autoComplete="new-password" className={inputClassName(Boolean(errors.password_confirmation))} /><FieldError message={errors.password_confirmation} /></div>
        </fieldset>

        {status && <p className={`mt-5 rounded-xl border p-4 text-sm font-medium ${status.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`} role={status.type === 'error' ? 'alert' : 'status'}>{status.message}</p>}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={close} disabled={isSaving} className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60">Cancelar</button>
          <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-[#0d1f35] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#193451] disabled:opacity-60"><Save size={17} aria-hidden="true" />{isSaving ? 'A guardar...' : 'Alterar palavra-passe'}</button>
        </div>
      </form>
    </div>
  )
}
