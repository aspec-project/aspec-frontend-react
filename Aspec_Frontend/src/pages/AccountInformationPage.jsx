import { useRef, useState } from 'react'
import { KeyRound, Mail, Pencil, Phone, Save, X } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import ChangePasswordDialog from '../components/account/ChangePasswordDialog'
import InternationalPhoneInput from '../components/ui/InternationalPhoneInput'
import { normalizeError } from '../services/api'
import { isSessionCurrent } from '../services/sessionContext'
import useSessionRequest from '../hooks/useSessionRequest'
import { updateMemberProfile } from '../services/memberProfile'
import {
  normalizePhone,
  validateEmail,
  validatePhone,
} from '../utils/registerUtils'

/*
 * Mostra o erro associado a um campo, mantendo a apresentação consistente
 * com os restantes formulários privados.
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
 * Página da aba “Informações de conta”.
 *
 * O email e telefone são dados pessoais da conta. Os contactos comerciais
 * ficam exclusivamente na página geral do perfil.
 */
export default function AccountInformationPage() {
  const { profile, reloadProfile } = useOutletContext()
  const getRequestContext = useSessionRequest()
  const personalSavingRef = useRef(false)

  const [savedEmail, setSavedEmail] = useState(profile.email ?? '')
  const [personalData, setPersonalData] = useState({
    email: profile.email ?? '',
    phone: profile.phone ?? '',
    currentPassword: '',
  })
  const [isEditingPersonalData, setIsEditingPersonalData] = useState(false)
  const [isSavingPersonalData, setIsSavingPersonalData] = useState(false)
  const [personalStatus, setPersonalStatus] = useState(null)
  const [personalErrors, setPersonalErrors] = useState({})
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)

  function handlePersonalChange(event) {
    const { name, value } = event.target

    setPersonalData((currentData) => ({
      ...currentData,
      [name]: value,
    }))

    setPersonalStatus(null)
    setPersonalErrors({})
  }

  /*
   * O email só exige palavra-passe atual quando sofre uma alteração.
   */
  function validatePersonalData() {
    const errors = {}
    const emailChanged =
      personalData.email.trim() !== savedEmail.trim()

    if (!personalData.email.trim()) {
      errors.email = 'O email é obrigatório.'
    } else if (!validateEmail(personalData.email.trim())) {
      errors.email = 'Indique um email válido.'
    }

    if (!personalData.phone.trim()) {
      errors.phone = 'O telefone é obrigatório.'
    } else if (!validatePhone(personalData.phone.trim())) {
      errors.phone =
        'Indique um telefone pessoal válido com indicativo.'
    }

    if (emailChanged && !personalData.currentPassword) {
      errors.current_password =
        'Indique a palavra-passe atual para alterar o email.'
    }

    return errors
  }

  /*
   * Guarda os dados pessoais através do endpoint de perfil já disponível.
   */
  async function handlePersonalSubmit(event) {
    event.preventDefault()

    const context = getRequestContext()

    if (!context || personalSavingRef.current) {
      return
    }

    const clientErrors = validatePersonalData()

    if (Object.keys(clientErrors).length > 0) {
      setPersonalErrors(clientErrors)
      return
    }

    personalSavingRef.current = true
    setIsSavingPersonalData(true)
    setPersonalStatus(null)
    setPersonalErrors({})

    try {
      const emailChanged =
        personalData.email.trim() !== savedEmail.trim()

        const payload = {
          phone: normalizePhone(personalData.phone),
        }

      if (emailChanged) {
        payload.email = personalData.email.trim()
        payload.current_password = personalData.currentPassword
      }

      await updateMemberProfile(payload, context)

      if (!isSessionCurrent(context)) {
        return
      }

      await reloadProfile()

      setSavedEmail(personalData.email.trim())
      setPersonalData((currentData) => ({
        ...currentData,
        currentPassword: '',
      }))
      setIsEditingPersonalData(false)
      setPersonalStatus({
        type: 'success',
        message: 'Dados pessoais atualizados com sucesso.',
      })
    } catch (error) {
      if (!isSessionCurrent(context)) {
        return
      }

      const normalisedError = normalizeError(error)

      setPersonalErrors(normalisedError.fieldErrors ?? {})
      setPersonalStatus({
        type: 'error',
        message:
          normalisedError.message ??
          'Não foi possível atualizar os dados pessoais.',
      })
    } finally {
      personalSavingRef.current = false

      if (isSessionCurrent(context)) {
        setIsSavingPersonalData(false)
      }
    }
  }

  function handleCancelPersonalEdit() {
    setPersonalData({
      email: savedEmail,
      phone: profile.phone ?? '',
      currentPassword: '',
    })
    setPersonalErrors({})
    setPersonalStatus(null)
    setIsEditingPersonalData(false)
  }

  const inputClassName =
    'mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#9b7b45] focus:ring-2 focus:ring-[#9b7b45]/20'

  const emailChanged =
    personalData.email.trim() !== savedEmail.trim()

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h1 className="text-2xl font-semibold text-[#0d1f35]">
              Informações de conta
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Consulta e atualiza os dados pessoais associados à tua conta
              ASPEC.
            </p>
          </div>

          {!isEditingPersonalData && (
            <button
              type="button"
              onClick={() => setIsEditingPersonalData(true)}
              className="inline-flex w-fit items-center gap-2 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-[#0d1f35] transition hover:bg-slate-200"
            >
              <Pencil size={16} aria-hidden="true" />
              Alterar dados
            </button>
          )}
        </div>

        {!isEditingPersonalData ? (
          <dl className="mt-7 grid gap-5 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-5">
              <dt className="flex items-center gap-2 text-sm font-semibold text-[#0d1f35]">
                <Mail size={17} aria-hidden="true" />
                Email pessoal
              </dt>
              <dd className="mt-3 break-all text-sm text-slate-600">
                {profile.email ?? 'Não indicado'}
              </dd>
            </div>

            <div className="rounded-xl bg-slate-50 p-5">
              <dt className="flex items-center gap-2 text-sm font-semibold text-[#0d1f35]">
                <Phone size={17} aria-hidden="true" />
                Telefone pessoal
              </dt>
              <dd className="mt-3 text-sm text-slate-600">
                {profile.phone ?? 'Não indicado'}
              </dd>
            </div>
          </dl>
        ) : (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <form role="dialog" aria-modal="true" aria-labelledby="personal-data-dialog-title" className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl sm:p-8" onSubmit={handlePersonalSubmit}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="personal-data-dialog-title" className="text-xl font-semibold text-[#0d1f35]">Alterar dados pessoais</h2>
                <p className="mt-2 text-sm text-slate-600">O email pessoal e o telefone nunca são apresentados no perfil comercial.</p>
              </div>
              <button type="button" onClick={handleCancelPersonalEdit} disabled={isSavingPersonalData} className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 disabled:opacity-60" aria-label="Fechar"><X size={18} aria-hidden="true" /></button>
            </div>
            <div className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="text-sm font-semibold text-[#0d1f35]"
              >
                Email pessoal
              </label>

              <input
                id="email"
                name="email"
                type="email"
                value={personalData.email}
                onChange={handlePersonalChange}
                autoComplete="email"
                className={inputClassName}
              />

              <FieldError message={personalErrors.email} />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="text-sm font-semibold text-[#0d1f35]"
              >
                Telefone pessoal
              </label>

              <InternationalPhoneInput
                id="phone"
                name="phone"
                value={personalData.phone}
                onChange={handlePersonalChange}
                className={inputClassName.replace('mt-2 ', '')}
              />

              <FieldError message={personalErrors.phone} />
            </div>

            {emailChanged && (
              <div>
                <label
                  htmlFor="personalCurrentPassword"
                  className="text-sm font-semibold text-[#0d1f35]"
                >
                  Palavra-passe atual
                </label>

                <p className="mt-1 text-sm text-slate-500">
                  É necessária apenas para confirmar a alteração do email.
                </p>

                <input
                  id="personalCurrentPassword"
                  name="currentPassword"
                  type="password"
                  value={personalData.currentPassword}
                  onChange={handlePersonalChange}
                  autoComplete="current-password"
                  className={inputClassName}
                />

                <FieldError message={personalErrors.current_password} />
              </div>
            )}

            {personalStatus && (
              <p
                className={
                  personalStatus.type === 'success'
                    ? 'rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800'
                    : 'rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800'
                }
                role={personalStatus.type === 'error' ? 'alert' : 'status'}
              >
                {personalStatus.message}
              </p>
            )}

            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelPersonalEdit}
                disabled={isSavingPersonalData}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X size={17} aria-hidden="true" />
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSavingPersonalData}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0d1f35] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#193451] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={17} aria-hidden="true" />
                {isSavingPersonalData ? 'A guardar...' : 'Guardar dados'}
              </button>
            </div>
          </form>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <KeyRound className="text-[#9b7b45]" size={22} aria-hidden="true" />
          <div>
            <h2 className="text-xl font-semibold text-[#0d1f35]">
              Alterar palavra-passe
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Usa uma palavra-passe forte e diferente das que utilizas noutros
              serviços.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsPasswordDialogOpen(true)}
          className="mt-7 inline-flex items-center gap-2 rounded-lg bg-[#0d1f35] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#193451]"
        >
          <KeyRound size={17} aria-hidden="true" />
          Alterar palavra-passe
        </button>
      </section>

      {/*
       * O Figma prevê preferências de comunicação, mas a API ainda não
       * expõe campos nem endpoint para guardar essa escolha.
       */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-semibold text-[#0d1f35]">
          Preferências de comunicação
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          Esta área ficará disponível quando o backend disponibilizar as
          preferências de emails e notificações da conta.
        </p>
      </section>

      {isPasswordDialogOpen && (
        <ChangePasswordDialog onClose={() => setIsPasswordDialogOpen(false)} />
      )}
    </div>
  )
}
