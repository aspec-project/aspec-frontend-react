import { useEffect, useState } from 'react'
import { normalizeError } from '../../services/api'
import {
  getMemberProfile,
  updateMemberProfile,
} from '../../services/memberProfile'
import { getSocialPlatforms, getWeekDays } from '../../services/referenceLists'
import { validatePhone } from '../../utils/registerUtils'
import { createBusinessHours } from '../../utils/businessHours'
import { createSocialLinks } from '../../utils/socialLinks'
import BusinessHoursEditor from './BusinessHoursEditor'
import SocialLinksEditor from './SocialLinksEditor'

/*
 * Estado inicial dos contactos que podem ser apresentados na montra.
 *
 * Os nomes são próprios do frontend e são convertidos para o formato
 * esperado pela API quando o formulário é submetido.
 */
const initialFormData = {
  commercialContacts: '',
  phone: '',
  address: '',
  website: '',
}

/*
 * Formulário exclusivo de contactos, horários e redes sociais.
 *
 * Separá-lo da informação principal da montra evita uma página demasiado
 * extensa e permite guardar cada área de forma independente.
 */
export default function ShowcaseContactsForm() {
  const [formData, setFormData] = useState(initialFormData)
  const [businessHours, setBusinessHours] = useState([])
  const [socialLinks, setSocialLinks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  /*
   * A API substitui as listas completas de horários e redes sociais.
   * Estas flags evitam enviar essas listas quando o utilizador não as alterou.
   */
  const [hoursChanged, setHoursChanged] = useState(false)
  const [socialLinksChanged, setSocialLinksChanged] = useState(false)

  /*
   * Carrega o perfil e as listas de referência necessárias para transformar
   * os IDs devolvidos pela API em dias e plataformas legíveis na interface.
   */
  useEffect(() => {
    let componentIsMounted = true

    async function loadContactData() {
      try {
        const [profile, socialPlatforms, weekDays] = await Promise.all([
          getMemberProfile(),
          getSocialPlatforms(),
          getWeekDays(),
        ])

        if (!componentIsMounted) {
          return
        }

        setFormData({
          commercialContacts: profile.commercial_contacts ?? '',
          phone: profile.phone ?? '',
          address: profile.address ?? '',
          website: profile.website_url ?? '',
        })

        setBusinessHours(
          createBusinessHours(profile.business_hours ?? [], weekDays),
        )
        setSocialLinks(
          createSocialLinks(profile.social_links ?? [], socialPlatforms),
        )
      } catch (error) {
        if (!componentIsMounted) {
          return
        }

        const normalisedError = normalizeError(error)

        setLoadError(
          normalisedError.message ??
            'Não foi possível carregar os contactos da montra.',
        )
      } finally {
        if (componentIsMounted) {
          setIsLoading(false)
        }
      }
    }

    loadContactData()

    return () => {
      componentIsMounted = false
    }
  }, [])

  /*
   * Atualiza um campo de contacto reutilizando o atributo name do input.
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
   * Guarda a lista atualizada de horários devolvida pelo editor.
   */
  function handleBusinessHoursChange(updatedHours) {
    setBusinessHours(updatedHours)
    setHoursChanged(true)
    setStatus(null)
    setFieldErrors({})
  }

  /*
   * Guarda a lista atualizada de redes sociais devolvida pelo editor.
   */
  function handleSocialLinksChange(updatedLinks) {
    setSocialLinks(updatedLinks)
    setSocialLinksChanged(true)
    setStatus(null)
    setFieldErrors({})
  }

  /*
   * Valida no browser as mesmas regras que o backend aplica ao perfil:
   * telefone português quando preenchido e morada obrigatória.
   */
  function validateContactFields() {
    const errors = {}
    const phone = formData.phone.trim()

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
   * Constrói apenas os dados pertencentes a esta secção.
   *
   * Não enviamos campos da apresentação da empresa, porque esses são
   * geridos separadamente em “Informação da montra”.
   */
  function buildContactsPayload() {
    const profilePayload = {
      commercial_contacts: formData.commercialContacts.trim() || null,
      address: formData.address.trim(),
      website_url: formData.website.trim() || null,
    }

    if (formData.phone.trim()) {
      profilePayload.phone = formData.phone
        .trim()
        .replace(/[\s\-()]/g, '')
    }

    /*
     * A API recebe apenas os dias marcados como abertos.
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
     * Cada rede social precisa do platform_id devolvido pela API.
     * Se faltar algum identificador, interrompemos o envio em vez de
     * inventar um ID que o backend não reconhece.
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
   * Guarda contactos e, quando foram alterados, horários e redes sociais.
   */
  async function handleSubmit(event) {
    event.preventDefault()

    setIsSaving(true)
    setStatus(null)
    setFieldErrors({})

    try {
      const clientFieldErrors = validateContactFields()

      if (Object.keys(clientFieldErrors).length > 0) {
        setFieldErrors(clientFieldErrors)
        setStatus({
          type: 'error',
          message: 'Corrige os campos assinalados antes de guardar.',
        })

        return
      }

      await updateMemberProfile(buildContactsPayload())

      setStatus({
        type: 'success',
        message: 'Contactos e redes sociais guardados com sucesso.',
      })
    } catch (error) {
      const normalisedError = normalizeError(error)

      /*
       * Erros criados no frontend não têm resposta HTTP, pelo que usamos
       * diretamente a respetiva mensagem.
       */
      const message =
        error instanceof Error && !error.response
          ? error.message
          : normalisedError.message

      setFieldErrors(normalisedError.fieldErrors ?? {})

      setStatus({
        type: 'error',
        message: `Não foi possível guardar as alterações. ${message}`,
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
        <p className="text-slate-600">A carregar contactos e redes sociais...</p>
      </section>
    )
  }

  if (loadError) {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h1 className="text-xl font-semibold text-red-900">
          Não foi possível carregar os contactos
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
          Contactos e redes sociais
        </h1>

        <p className="mt-3 max-w-2xl text-slate-600">
          Atualiza as formas de contacto, o horário de funcionamento e as
          redes sociais apresentadas na tua montra.
        </p>
      </div>

      <form className="mt-8 space-y-8" onSubmit={handleSubmit}>
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