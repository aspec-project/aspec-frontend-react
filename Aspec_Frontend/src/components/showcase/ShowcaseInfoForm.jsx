import { useCallback, useEffect, useState } from 'react'
import { normalizeError } from '../../services/api'
import {
  getMemberProfile,
  updateMemberProfile,
  uploadMemberLogo,
} from '../../services/memberProfile'
import LogoUploader from './LogoUploader'

/*
 * Estado inicial dos campos apresentados nesta secção.
 *
 * Os nomes usados pelo formulário são convertidos para o formato esperado
 * pela API quando os dados são enviados.
 */
const initialFormData = {
  businessName: '',
  description: '',
}

/*
 * Formulário da apresentação visual da montra.
 *
 * Contactos, horários e redes sociais são geridos na sua própria secção
 * para que esta página fique focada no nome, descrição e logótipo.
 */
function ShowcaseInfoForm() {
  const [formData, setFormData] = useState(initialFormData)
  const [profileAddress, setProfileAddress] = useState('')
  const [logoFile, setLogoFile] = useState(null)
  const [uploadedLogoFile, setUploadedLogoFile] = useState(null)
  const [savedLogoUrl, setSavedLogoUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  /*
   * Carrega os dados já persistidos no backend, incluindo a morada.
   *
   * A morada não aparece nesta secção, mas precisa de acompanhar o PUT
   * porque o backend exige que esse campo esteja sempre preenchido.
   */
  useEffect(() => {
    let componentIsMounted = true

    async function loadShowcaseInfo() {
      try {
        const profile = await getMemberProfile()

        if (!componentIsMounted) {
          return
        }

        setFormData({
          businessName: profile.business_name ?? '',
          description: profile.description ?? '',
        })
        setProfileAddress(profile.address ?? '')
        setSavedLogoUrl(profile.logo_url ?? '')
      } catch (error) {
        if (!componentIsMounted) {
          return
        }

        const normalisedError = normalizeError(error)

        setLoadError(
          normalisedError.message ??
            'Não foi possível carregar a informação da montra.',
        )
      } finally {
        if (componentIsMounted) {
          setIsLoading(false)
        }
      }
    }

    loadShowcaseInfo()

    return () => {
      componentIsMounted = false
    }
  }, [])

  /*
   * Atualiza os campos de texto reutilizando o atributo name do input.
   */
  function handleTextChange(event) {
    const { name, value } = event.target

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }))

    setStatus(null)
    setFieldErrors({})
  }

  /*
   * Mantém a mesma referência entre renderizações para evitar efeitos
   * desnecessários dentro do componente responsável pelo logótipo.
   */
  const handleLogoChange = useCallback((selectedLogo) => {
    setLogoFile(selectedLogo)
    setStatus(null)
  }, [])

  /*
   * Constrói o objeto para PUT /member-profile.
   *
   * A morada atual é incluída mesmo sendo editada noutra página, porque
   * o backend considera esse campo obrigatório no pedido de atualização.
   */
  function buildShowcasePayload() {
    const profilePayload = {
      description: formData.description.trim() || null,
      address: profileAddress.trim(),
    }

    if (formData.businessName.trim()) {
      profilePayload.business_name = formData.businessName.trim()
    }

    return profilePayload
  }

  /*
   * Guarda primeiro os dados textuais e, se necessário, envia o novo
   * logótipo. O portefólio é tratado na sua página independente.
   */
  async function handleSubmit(event) {
    event.preventDefault()

    if (!profileAddress.trim()) {
      setStatus({
        type: 'error',
        message:
          'Adiciona uma morada na secção “Contactos e redes” antes de guardar a montra.',
      })

      return
    }

    setIsSaving(true)
    setStatus(null)
    setFieldErrors({})

    try {
      await updateMemberProfile(buildShowcasePayload())

      const shouldUploadLogo =
        logoFile && logoFile !== uploadedLogoFile

      if (shouldUploadLogo) {
        await uploadMemberLogo(logoFile)
        setUploadedLogoFile(logoFile)
      }

      setStatus({
        type: 'success',
        message: 'Informação da montra guardada com sucesso.',
      })
    } catch (error) {
      const normalisedError = normalizeError(error)

      setFieldErrors(normalisedError.fieldErrors ?? {})

      setStatus({
        type: 'error',
        message: `Não foi possível guardar as alterações. ${
          normalisedError.message ?? ''
        }`,
      })
    } finally {
      setIsSaving(false)
    }
  }

  /*
   * Classe Tailwind reutilizada pelos inputs de uma linha.
   */
  const inputClassName =
    'mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#8a7043] focus:ring-2 focus:ring-[#8a7043]/20'

  if (isLoading) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-slate-600">A carregar informação da montra...</p>
      </section>
    )
  }

  if (loadError) {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h1 className="text-xl font-semibold text-red-900">
          Não foi possível carregar a montra
        </h1>

        <p className="mt-2 text-red-800">{loadError}</p>
      </section>
    )
  }

  return (
    <section>
      <div className="border-b border-slate-200 pb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8a7043]">
          Montra digital
        </p>

        <h1 className="mt-2 text-3xl font-bold text-[#0d1f35]">
          Informação da montra
        </h1>

        <p className="mt-3 max-w-2xl text-slate-600">
          Atualiza a apresentação visual da tua empresa e o logótipo
          apresentado aos visitantes.
        </p>
      </div>

      <form className="mt-8 space-y-8" onSubmit={handleSubmit}>
        <section className="rounded-xl border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-[#0d1f35]">
            Apresentação
          </h2>

          <div className="mt-6 space-y-6">
            <div>
              <label
                htmlFor="businessName"
                className="text-sm font-medium text-slate-700"
              >
                Nome da empresa
              </label>

              <input
                id="businessName"
                name="businessName"
                type="text"
                value={formData.businessName}
                onChange={handleTextChange}
                placeholder="Nome da empresa"
                className={inputClassName}
              />

              {fieldErrors.business_name && (
                <p className="mt-2 text-sm text-red-700">
                  {fieldErrors.business_name}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="description"
                className="text-sm font-medium text-slate-700"
              >
                Descrição
              </label>

              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleTextChange}
                rows="5"
                placeholder="Apresenta a empresa, os serviços e os seus principais pontos fortes."
                className={`${inputClassName} resize-y`}
              />

              {fieldErrors.description && (
                <p className="mt-2 text-sm text-red-700">
                  {fieldErrors.description}
                </p>
              )}
            </div>
          </div>
        </section>

        <LogoUploader
          initialLogoUrl={savedLogoUrl}
          onLogoChange={handleLogoChange}
        />

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-[#8a7043] px-6 py-3 font-semibold text-white transition hover:bg-[#705b36] focus:outline-none focus:ring-2 focus:ring-[#8a7043] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'A guardar...' : 'Guardar alterações'}
          </button>

          {status && (
            <p
              className={
                status.type === 'success'
                  ? 'text-sm font-medium text-emerald-700'
                  : 'text-sm font-medium text-red-700'
              }
              aria-live="polite"
            >
              {status.message}
            </p>
          )}
        </div>
      </form>
    </section>
  )
}

export default ShowcaseInfoForm