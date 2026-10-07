import { useCallback, useEffect, useState } from 'react'
import { normalizeError } from '../../services/api'
import { validatePhone } from '../../utils/registerUtils'
import {
  getMemberProfile,
  updateMemberProfile,
  uploadMemberLogo,
  uploadPortfolioImages,
  deletePortfolioImage,
} from '../../services/memberProfile'
import BusinessHoursEditor, {
  createBusinessHours,
} from './BusinessHoursEditor'
import LogoUploader from './LogoUploader'
import PortfolioGallery from './PortfolioGallery'
import SocialLinksEditor, {
  createSocialLinks,
} from './SocialLinksEditor'

/*
 * Estado inicial dos campos textuais.
 *
 * Os nomes usados aqui são próprios do frontend. No envio, são convertidos
 * para os nomes esperados pelo backend, como business_name e website_url.
 */
const initialFormData = {
  businessName: '',
  description: '',
  commercialContacts: '',
  phone: '',
  address: '',
  website: '',
}

function ShowcaseInfoForm() {
  const [formData, setFormData] = useState(initialFormData)
  const [businessHours, setBusinessHours] = useState(() =>
    createBusinessHours(),
  )
  const [socialLinks, setSocialLinks] = useState(() =>
    createSocialLinks(),
  )

  /*
   * Estes estados guardam os ficheiros selecionados pelos componentes filhos.
   * Os próprios componentes continuam responsáveis pela seleção e pré-visualização.
   */
  const [logoFile, setLogoFile] = useState(null)
  const [portfolioFiles, setPortfolioFiles] = useState([])

  /*
   * Guardam os ficheiros que já foram enviados nesta sessão.
   * Assim, clicar novamente em "Guardar alterações" não cria cópias.
   */
  const [uploadedLogoFile, setUploadedLogoFile] = useState(null)
  const [uploadedPortfolioFiles, setUploadedPortfolioFiles] = useState([])

  /*
 * Guardam os ficheiros que já existem no backend.
 * Estes dados são usados para reconstruir a pré-visualização após F5.
 */
const [savedLogoUrl, setSavedLogoUrl] = useState('')
const [savedPortfolio, setSavedPortfolio] = useState([])

  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  /*
   * Estes estados permitem enviar horários e redes sociais apenas quando
   * o utilizador os altera. A API substitui listas completas destes dados.
   */
  const [hoursChanged, setHoursChanged] = useState(false)
  const [socialLinksChanged, setSocialLinksChanged] = useState(false)

  /*
   * Ao abrir a página, obtemos o perfil do membro autenticado.
   * Os dados recebidos preenchem os campos e fornecem os IDs das redes
   * sociais que já estão associadas ao perfil.
   */
  useEffect(() => {
    let componentIsMounted = true

    async function loadProfile() {
      try {
        const profile = await getMemberProfile()

        if (!componentIsMounted) {
          return
        }

        setFormData({
          businessName: profile.business_name ?? '',
          description: profile.description ?? '',
          commercialContacts: profile.commercial_contacts ?? '',
          phone: profile.phone ?? '',
          address: profile.address ?? '',
          website: profile.website_url ?? '',
        })

        setBusinessHours(createBusinessHours(profile.business_hours ?? []))
        setSocialLinks(createSocialLinks(profile.social_links ?? []))
        /*
        * O serviço já converteu os URLs relativos do Laravel em URLs completos.
        * Guardamos estes valores para os passar aos componentes visuais.
        */
        setSavedLogoUrl(profile.logo_url ?? '')
        setSavedPortfolio(profile.portfolio ?? [])
      } catch (error) {
        if (!componentIsMounted) {
          return
        }

        const normalisedError = normalizeError(error)

        setLoadError(normalisedError.message)
      } finally {
        if (componentIsMounted) {
          setIsLoading(false)
        }
      }
    }

    loadProfile()

    return () => {
      componentIsMounted = false
    }
  }, [])

  /*
   * Atualiza os campos de texto reutilizando o atributo "name".
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
   * Recebe a lista atualizada de horários do BusinessHoursEditor.
   */
  function handleBusinessHoursChange(updatedHours) {
    setBusinessHours(updatedHours)
    setHoursChanged(true)
    setStatus(null)
    setFieldErrors({})
  }

  /*
   * Recebe a lista atualizada de redes sociais do SocialLinksEditor.
   */
  function handleSocialLinksChange(updatedLinks) {
    setSocialLinks(updatedLinks)
    setSocialLinksChanged(true)
    setStatus(null)
    setFieldErrors({})
  }

  /*
   * useCallback mantém a mesma referência entre renderizações.
   * Isto evita que os componentes de ficheiros executem efeitos desnecessários.
   */
  const handleLogoChange = useCallback((selectedLogo) => {
    setLogoFile(selectedLogo)
    setStatus(null)
  }, [])

  const handlePortfolioImagesChange = useCallback((selectedImages) => {
    setPortfolioFiles(selectedImages)
    setStatus(null)
  }, [])

  /*
 * Remove uma imagem que já existe no backend e atualiza a lista
 * usada pela galeria, sem ser necessário recarregar a página.
 */
const handleDeleteSavedPortfolioImage = useCallback(
  async (portfolioImageId) => {
    await deletePortfolioImage(portfolioImageId)

    setSavedPortfolio((currentPortfolio) =>
      currentPortfolio.filter((image) => image.id !== portfolioImageId),
    )
  },
  [],
)

/*
 * Valida no browser os campos que o backend exige no perfil da montra.
 *
 * A regra do telefone é a mesma usada no registo. A morada é obrigatória
 * no endpoint PUT /member-profile, por isso interrompemos o envio antes
 * de fazer um pedido que resultaria num erro 422.
 */
function validateShowcaseFields() {
  const errors = {}
  const phone = formData.phone.trim()

  /*
   * Mantemos o comportamento atual de só enviar telefone quando existe
   * valor, mas quando é preenchido tem de ser português e válido.
   */
  if (phone && !validatePhone(phone)) {
    errors.phone =
      'O campo telefone tem de ser um número de telefone português válido.'
  }

  if (!formData.address.trim()) {
    errors.address = 'O campo morada é obrigatório.'
  }

  return errors
}

  /*
   * Constrói o objeto JSON para PUT /member-profile.
   *
   * Não enviamos campos vazios que sejam obrigatórios quando presentes,
   * como business_name e phone.
   */
  function buildProfilePayload() {
    const profilePayload = {
      description: formData.description.trim() || null,
      commercial_contacts: formData.commercialContacts.trim() || null,
      address: formData.address.trim(),
      website_url: formData.website.trim() || null,
    }

    if (formData.businessName.trim()) {
      profilePayload.business_name = formData.businessName.trim()
    }

    if (formData.phone.trim()) {
      profilePayload.phone = formData.phone
      .trim()
      .replace(/[\s\-()]/g, '')
    }

    /*
     * A API recebe horários como uma lista de objetos.
     * Apenas enviamos os dias que foram marcados como abertos.
     */
    if (hoursChanged) {
      profilePayload.business_hours = businessHours
        .filter((hour) => hour.isOpen)
        .map((hour) => ({
          week_day_id: hour.weekDayId,
          open_time: hour.openTime,
          close_time: hour.closeTime,
        }))
    }

    /*
     * A API exige platform_id para cada rede social.
     *
     * Não inventamos IDs: se o backend não devolveu o ID de uma rede,
     * interrompemos o envio e explicamos o motivo ao utilizador.
     */
    if (socialLinksChanged) {
      const linksWithUrl = socialLinks.filter((link) => link.url.trim())

      const linksWithoutPlatformId = linksWithUrl.filter(
        (link) => !link.platformId,
      )

      if (linksWithoutPlatformId.length > 0) {
        const platformNames = linksWithoutPlatformId
          .map((link) => link.name)
          .join(', ')

        throw new Error(
          `A API ainda não disponibilizou o identificador para: ${platformNames}.`,
        )
      }

      profilePayload.social_links = linksWithUrl.map((link) => ({
        platform_id: link.platformId,
        url: link.url.trim(),
      }))
    }

    return profilePayload
  }

  /*
   * Envia primeiro os dados textuais e, de seguida, os ficheiros.
   *
   * O envio das imagens é sequencial dentro de uploadPortfolioImages,
   * pois a API recebe uma imagem por pedido.
   */
  async function handleSubmit(event) {
    event.preventDefault()

    setIsSaving(true)
    setStatus(null)
    setFieldErrors({})

    try {
      const clientFieldErrors = validateShowcaseFields()

      if (Object.keys(clientFieldErrors).length > 0) {
        setFieldErrors(clientFieldErrors)

        setStatus({
          type: 'error',
          message: 'Corrige os campos assinalados antes de guardar.',
        })

        return
      }

      const profilePayload = buildProfilePayload()

      await updateMemberProfile(profilePayload)

      const shouldUploadLogo =
        logoFile && logoFile !== uploadedLogoFile

      if (shouldUploadLogo) {
        await uploadMemberLogo(logoFile)
        setUploadedLogoFile(logoFile)
      }

      /*
       * Selecionamos apenas imagens ainda não enviadas nesta sessão.
       */
      const newPortfolioFiles = portfolioFiles.filter(
        (file) => !uploadedPortfolioFiles.includes(file),
      )

      if (newPortfolioFiles.length > 0) {
        /*
        * O serviço devolve as imagens já criadas no backend.
        * Guardamo-las imediatamente para a galeria apresentar a versão
        * persistida, sem ser necessário atualizar a página.
        */
        const uploadedImages = await uploadPortfolioImages(newPortfolioFiles)

        setSavedPortfolio((currentPortfolio) => [
          ...currentPortfolio,
          ...uploadedImages,
        ])

        /*
        * Mantemos a referência aos objetos File enviados nesta sessão.
        * A galeria vai usar esta lista para remover as pré-visualizações
        * locais correspondentes e evitar imagens duplicadas.
        */
        setUploadedPortfolioFiles((currentFiles) => [
          ...currentFiles,
          ...newPortfolioFiles,
        ])
      }

      setStatus({
        type: 'success',
        message: 'Alterações guardadas com sucesso.',
      })
    } catch (error) {
      const normalisedError = normalizeError(error)

      /*
       * Erros criados no próprio frontend, como um platform_id em falta,
       * não têm resposta HTTP. Por isso usamos diretamente error.message.
       */
      const message =
        error instanceof Error && !error.response
          ? error.message
          : normalisedError.message

      setFieldErrors(normalisedError.fieldErrors)

      setStatus({
        type: 'error',
        message: `Não foi possível concluir o envio. ${message}`,
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

        <p className="mt-3 text-sm text-red-700">
          Confirma se o backend está ligado e se existe uma sessão iniciada
          com uma conta de membro ativa.
        </p>
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
          Atualiza a informação apresentada aos visitantes na tua montra
          digital.
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

        <section className="rounded-xl border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-[#0d1f35]">
            Contactos
          </h2>

          <div className="mt-6 space-y-6">
            <div>
              <label
                htmlFor="commercialContacts"
                className="text-sm font-medium text-slate-700"
              >
                Contactos comerciais
              </label>

              <textarea
                id="commercialContacts"
                name="commercialContacts"
                value={formData.commercialContacts}
                onChange={handleTextChange}
                rows="3"
                placeholder="Exemplo: email comercial, contacto alternativo ou outras indicações."
                className={`${inputClassName} resize-y`}
              />

              {fieldErrors.commercial_contacts && (
                <p className="mt-2 text-sm text-red-700">
                  {fieldErrors.commercial_contacts}
                </p>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label
                  htmlFor="phone"
                  className="text-sm font-medium text-slate-700"
                >
                  Telefone
                </label>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleTextChange}
                  placeholder="+351 912 345 678"
                  className={inputClassName}
                />

                {fieldErrors.phone && (
                  <p className="mt-2 text-sm text-red-700">
                    {fieldErrors.phone}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="website"
                  className="text-sm font-medium text-slate-700"
                >
                  Website
                </label>

                <input
                  id="website"
                  name="website"
                  type="url"
                  value={formData.website}
                  onChange={handleTextChange}
                  placeholder="https://www.exemplo.pt"
                  className={inputClassName}
                />

                {fieldErrors.website_url && (
                  <p className="mt-2 text-sm text-red-700">
                    {fieldErrors.website_url}
                  </p>
                )}
              </div>
            </div>

            <div>
                <label
                  htmlFor="address"
                  className="text-sm font-medium text-slate-700"
                >
                  Morada
                </label>

                <input
                  id="address"
                  name="address"
                  type="text"
                  value={formData.address}
                  onChange={handleTextChange}
                  autoComplete="street-address"
                  placeholder="Exemplo: Rua Principal, 123, Aveiro"
                  className={inputClassName}
                />

                {fieldErrors.address && (
                  <p className="mt-2 text-sm text-red-700">
                    {fieldErrors.address}
                  </p>
                )}
              </div>

            <p className="text-sm text-slate-500">
              O email de acesso é alterado nas definições da conta, porque a
              API exige a password atual para o modificar.
            </p>
          </div>
        </section>

        <BusinessHoursEditor
          businessHours={businessHours}
          onChange={handleBusinessHoursChange}
        />

        <SocialLinksEditor
          socialLinks={socialLinks}
          onChange={handleSocialLinksChange}
        />

        <LogoUploader
          initialLogoUrl={savedLogoUrl}
          onLogoChange={handleLogoChange}
        />

        <PortfolioGallery
          initialImages={savedPortfolio}
          uploadedFiles={uploadedPortfolioFiles}
          onImagesChange={handlePortfolioImagesChange}
          onDeleteSavedImage={handleDeleteSavedPortfolioImage}
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