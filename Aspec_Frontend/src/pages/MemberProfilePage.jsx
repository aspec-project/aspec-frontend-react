import { useRef, useState } from 'react'
import {
  Check,
  Church,
  Clock3,
  Globe2,
  Mail,
  Pencil,
  Phone,
  Save,
  Share2,
  X,
} from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import SocialPlatformIcon from '../components/member/SocialPlatformIcon'
import BusinessHoursEditor from '../components/showcase/BusinessHoursEditor'
import SocialLinksEditor from '../components/showcase/SocialLinksEditor'
import useSessionRequest from '../hooks/useSessionRequest'
import { normalizeError } from '../services/api'
import { updateMemberProfile } from '../services/memberProfile'
import {
  getLocations,
  getSectors,
  getSocialPlatforms,
  getWeekDays,
} from '../services/referenceLists'
import { isSessionCurrent } from '../services/sessionContext'
import { normalizePhone, validateEmail, validatePhone } from '../utils/registerUtils'
import { createBusinessHours } from '../utils/businessHours'
import { createSocialLinks } from '../utils/socialLinks'

/* A API devolve identificadores numéricos para os dias da semana. */
const weekDayOrder = [
  { id: 1, label: 'Segunda' },
  { id: 2, label: 'Terça' },
  { id: 3, label: 'Quarta' },
  { id: 4, label: 'Quinta' },
  { id: 5, label: 'Sexta' },
  { id: 6, label: 'Sábado' },
  { id: 7, label: 'Domingo' },
]

function createInitialDraft(profile) {
  return {
    businessName: profile.business_name ?? '',
    sectorId: profile.sector?.id ?? '',
    locationId: profile.location?.id ?? '',
    address: profile.address ?? '',
    description: profile.description ?? '',
    website: profile.website_url ?? '',
    commercialEmail: profile.commercial_email ?? '',
    commercialPhone: profile.commercial_phone ?? '',
    congregation: profile.congregation ?? '',
    roleInCongregation: profile.role_in_congregation ?? '',
  }
}

function getSafeExternalUrl(value) {
  if (!value?.trim()) return null

  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

function getSocialLinkText(value) {
  const safeUrl = getSafeExternalUrl(value)
  return safeUrl ? safeUrl.replace(/^https?:\/\//i, '').replace(/\/$/, '') : value
}

function ProfileDataRow({ label, value }) {
  return (
    <div className="grid gap-2 border-b border-slate-100 py-5 sm:grid-cols-[minmax(180px,1fr)_minmax(220px,1.4fr)] sm:items-center">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="break-words text-sm font-semibold text-[#0d1f35] sm:text-right">
        {value?.trim?.() || value || '—'}
      </dd>
    </div>
  )
}

function FieldError({ message }) {
  return message ? <p className="mt-2 text-sm text-red-700" role="alert">{message}</p> : null
}

/* O ícone mantém o cartão limpo; title e aria-label explicam a ação. */
function EditProfileCardButton({ label, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Editar ${label}`}
      title={`Editar ${label}`}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[#0d1f35] transition hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d1f35] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Pencil size={17} aria-hidden="true" />
    </button>
  )
}

function InlineFeedback({ status }) {
  if (!status) return null

  return (
    <p
      className={`mt-5 rounded-xl border px-4 py-3 text-sm ${status.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}
      role={status.type === 'error' ? 'alert' : 'status'}
    >
      {status.message}
    </p>
  )
}

function CardActions({ isSaving, onCancel }) {
  return (
    <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
      <button
        type="button"
        onClick={onCancel}
        disabled={isSaving}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-[#0d1f35] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <X size={16} aria-hidden="true" />
        Cancelar
      </button>
      <button
        type="submit"
        disabled={isSaving}
        className="inline-flex items-center gap-2 rounded-lg bg-[#0d1f35] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#173558] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? <Check size={16} aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
        {isSaving ? 'A guardar...' : 'Guardar alterações'}
      </button>
    </div>
  )
}

function buildBusinessHours(businessHours = []) {
  const hoursByDay = businessHours.reduce((groupedHours, hour) => {
    const dayId = Number(hour.week_day_id)
    if (!dayId || !hour.open_time || !hour.close_time) return groupedHours

    if (!groupedHours[dayId]) groupedHours[dayId] = []
    groupedHours[dayId].push(`${hour.open_time} — ${hour.close_time}`)
    return groupedHours
  }, {})

  const dailyHours = weekDayOrder
    .filter(({ id }) => hoursByDay[id])
    .map(({ id, label }) => ({ id, label, value: hoursByDay[id].join(' / ') }))

  return dailyHours
    .reduce((groups, day) => {
      const previousGroup = groups[groups.length - 1]
      const isConsecutiveDay = previousGroup?.lastDayId === day.id - 1

      if (isConsecutiveDay && previousGroup.value === day.value) {
        previousGroup.label = `${previousGroup.firstDayLabel} — ${day.label}`
        previousGroup.lastDayId = day.id
        return groups
      }

      groups.push({
        firstDayLabel: day.label,
        lastDayId: day.id,
        label: day.label,
        value: day.value,
      })
      return groups
    }, [])
    .map(({ label, value }) => ({ label, value }))
}

/*
 * A página faz a edição dentro de cada cartão. O endpoint aceita PUT parcial,
 * portanto guardar um cartão não substitui dados dos restantes.
 */
export default function MemberProfilePage() {
  const { profile, reloadProfile } = useOutletContext()
  const getRequestContext = useSessionRequest()
  const savingRef = useRef(false)
  const prepareRequestRef = useRef(0)

  const [editingSection, setEditingSection] = useState(null)
  const [draft, setDraft] = useState(null)
  const [sectors, setSectors] = useState([])
  const [locations, setLocations] = useState([])
  const [businessHours, setBusinessHours] = useState([])
  const [socialLinks, setSocialLinks] = useState([])
  const [isPreparing, setIsPreparing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [editStatus, setEditStatus] = useState(null)
  const [savedNotice, setSavedNotice] = useState(null)

  const activeDraft = draft ?? createInitialDraft(profile)
  const displayHours = buildBusinessHours(profile.business_hours ?? [])
  const displaySocialLinks = (profile.social_links ?? []).filter((link) => link.url)
  const websiteUrl = getSafeExternalUrl(profile.website_url)
  const commercialEmail = profile.commercial_email?.trim()
  const commercialPhone = profile.commercial_phone?.trim()
  const inputClassName = 'mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#9b7b45] focus:ring-2 focus:ring-[#9b7b45]/20'
  const editingAnotherCard = editingSection !== null || isPreparing

  function clearEditorFeedback() {
    setFieldErrors({})
    setEditStatus(null)
    setSavedNotice(null)
  }

  function updateDraft(event) {
    const { name, value } = event.target
    setDraft((currentDraft) => ({
      ...(currentDraft ?? createInitialDraft(profile)),
      [name]: value,
    }))
    clearEditorFeedback()
  }

  async function startEditing(section) {
    if (editingAnotherCard || isSaving) return

    const context = getRequestContext()
    if (!context) return

    const requestId = ++prepareRequestRef.current
    setEditingSection(section)
    setDraft(createInitialDraft(profile))
    clearEditorFeedback()

    if (!['dados-perfil', 'horario', 'redes-sociais'].includes(section)) return

    setIsPreparing(true)

    try {
      const config = { sessionGeneration: context.generation, signal: context.signal }

      if (section === 'dados-perfil') {
        const [sectorList, locationList] = await Promise.all([
          getSectors(context.signal),
          getLocations(context.signal),
        ])

        if (prepareRequestRef.current !== requestId || !isSessionCurrent(context)) return
        setSectors(sectorList)
        setLocations(locationList)
      }

      if (section === 'horario') {
        const weekDayList = await getWeekDays(config)
        if (prepareRequestRef.current !== requestId || !isSessionCurrent(context)) return
        setBusinessHours(createBusinessHours(profile.business_hours ?? [], weekDayList))
      }

      if (section === 'redes-sociais') {
        const socialPlatformList = await getSocialPlatforms(config)
        if (prepareRequestRef.current !== requestId || !isSessionCurrent(context)) return
        setSocialLinks(createSocialLinks(profile.social_links ?? [], socialPlatformList))
      }
    } catch (error) {
      if (prepareRequestRef.current !== requestId || !isSessionCurrent(context)) return
      const normalisedError = normalizeError(error)
      setEditStatus({
        type: 'error',
        message: normalisedError.message ?? 'Não foi possível preparar a edição deste cartão.',
      })
    } finally {
      if (prepareRequestRef.current === requestId && isSessionCurrent(context)) {
        setIsPreparing(false)
      }
    }
  }

  function cancelEditing() {
    prepareRequestRef.current += 1
    setEditingSection(null)
    setDraft(null)
    setFieldErrors({})
    setEditStatus(null)
    setIsPreparing(false)
  }

  function validateCurrentSection(section) {
    const errors = {}

    if (section === 'dados-perfil') {
      if (!activeDraft.businessName.trim()) errors.business_name = 'O nome do negócio é obrigatório.'
      if (!activeDraft.sectorId) errors.sector_id = 'Selecione o setor de atividade.'
      if (!activeDraft.locationId) errors.location_id = 'Selecione o distrito.'
      if (!activeDraft.address.trim()) errors.address = 'O campo morada é obrigatório.'
    }

    if (section === 'contactos-comerciais') {
      if (activeDraft.website.trim() && !/^https?:\/\/.+/i.test(activeDraft.website)) {
        errors.website_url = 'Indique um website válido, começado por http:// ou https://.'
      }
      if (!activeDraft.commercialEmail.trim()) {
        errors.commercial_email = 'O email comercial é obrigatório.'
      } else if (!validateEmail(activeDraft.commercialEmail)) {
        errors.commercial_email = 'Indique um email comercial válido.'
      }
      if (!activeDraft.commercialPhone.trim()) {
        errors.commercial_phone = 'O telefone comercial é obrigatório.'
      } else if (!validatePhone(activeDraft.commercialPhone)) {
        errors.commercial_phone = 'Indique um telefone comercial válido com indicativo.'
      }
    }

    if (section === 'congregacao') {
      if (!activeDraft.congregation.trim()) errors.congregation = 'O nome da congregação é obrigatório.'
      if (!activeDraft.roleInCongregation.trim()) {
        errors.role_in_congregation = 'A função na congregação é obrigatória.'
      }
    }

    return errors
  }

  function buildPayload(section) {
    if (section === 'dados-perfil') {
      return {
        business_name: activeDraft.businessName.trim(),
        sector_id: activeDraft.sectorId,
        location_id: activeDraft.locationId,
        address: activeDraft.address.trim(),
      }
    }

    if (section === 'descricao') return { description: activeDraft.description.trim() || null }

    if (section === 'contactos-comerciais') {
      return {
        website_url: activeDraft.website.trim() || null,
        commercial_email: activeDraft.commercialEmail.trim(),
        commercial_phone: normalizePhone(activeDraft.commercialPhone),
      }
    }

    if (section === 'horario') {
      return {
        business_hours: businessHours.filter((hour) => hour.isOpen).map((hour) => ({
          week_day_id: hour.weekDayId,
          open_time: hour.openTime,
          close_time: hour.closeTime,
        })),
      }
    }

    if (section === 'redes-sociais') {
      const linksWithUrl = socialLinks.filter((link) => link.url.trim())
      const missingPlatformIds = linksWithUrl.filter((link) => !link.platformId)
      if (missingPlatformIds.length > 0) {
        throw new Error(`A API ainda não disponibilizou o identificador para: ${missingPlatformIds.map((link) => link.name).join(', ')}.`)
      }
      return {
        social_links: linksWithUrl.map((link) => ({
          platform_id: link.platformId,
          url: link.url.trim(),
        })),
      }
    }

    return {
      congregation: activeDraft.congregation.trim(),
      role_in_congregation: activeDraft.roleInCongregation.trim(),
    }
  }

  async function saveSection(event, section) {
    event.preventDefault()
    const context = getRequestContext()
    if (!context || savingRef.current || isPreparing) return

    const clientErrors = validateCurrentSection(section)
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors)
      setEditStatus({ type: 'error', message: 'Corrige os campos assinalados antes de guardar.' })
      return
    }

    let payload
    try {
      payload = buildPayload(section)
    } catch (error) {
      setEditStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível preparar os dados a guardar.',
      })
      return
    }

    savingRef.current = true
    setIsSaving(true)
    setFieldErrors({})
    setEditStatus(null)

    try {
      await updateMemberProfile(payload, context)
      if (!isSessionCurrent(context)) return
      await reloadProfile()

      setEditingSection(null)
      setDraft(null)
      setSavedNotice({ section, message: 'Alterações guardadas com sucesso.' })
    } catch (error) {
      if (!isSessionCurrent(context)) return
      const normalisedError = normalizeError(error)
      setFieldErrors(normalisedError.fieldErrors ?? {})
      setEditStatus({
        type: 'error',
        message: normalisedError.message ?? 'Não foi possível guardar as alterações deste cartão.',
      })
    } finally {
      savingRef.current = false
      if (isSessionCurrent(context)) setIsSaving(false)
    }
  }

  function renderSavedNotice(section) {
    return savedNotice?.section === section
      ? <InlineFeedback status={{ type: 'success', message: savedNotice.message }} />
      : null
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {editingSection === 'dados-perfil' ? (
            <form onSubmit={(event) => void saveSection(event, 'dados-perfil')}>
              <h2 className="text-2xl font-bold text-[#0d1f35]">Dados do Perfil</h2>
              {isPreparing ? <p className="mt-5 text-sm text-slate-600">A carregar opções do formulário...</p> : (
                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  <div><label htmlFor="businessName" className="text-sm font-semibold text-[#0d1f35]">Nome do Negócio</label><input id="businessName" name="businessName" type="text" value={activeDraft.businessName} onChange={updateDraft} className={inputClassName} /><FieldError message={fieldErrors.business_name} /></div>
                  <div><label htmlFor="sectorId" className="text-sm font-semibold text-[#0d1f35]">Setor de Atividade</label><select id="sectorId" name="sectorId" value={activeDraft.sectorId} onChange={updateDraft} className={inputClassName}><option value="">Selecionar setor...</option>{sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}</select><FieldError message={fieldErrors.sector_id} /></div>
                  <div><label htmlFor="locationId" className="text-sm font-semibold text-[#0d1f35]">Distrito</label><select id="locationId" name="locationId" value={activeDraft.locationId} onChange={updateDraft} className={inputClassName}><option value="">Selecionar distrito...</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select><FieldError message={fieldErrors.location_id} /></div>
                  <div><label htmlFor="address" className="text-sm font-semibold text-[#0d1f35]">Morada</label><input id="address" name="address" type="text" value={activeDraft.address} onChange={updateDraft} autoComplete="street-address" className={inputClassName} /><FieldError message={fieldErrors.address} /></div>
                </div>
              )}
              <InlineFeedback status={editStatus} />
              <CardActions isSaving={isSaving || isPreparing} onCancel={cancelEditing} />
            </form>
          ) : (
            <>
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><h2 className="text-2xl font-bold text-[#0d1f35]">Dados do Perfil</h2><EditProfileCardButton label="os dados do perfil" onClick={() => void startEditing('dados-perfil')} disabled={editingAnotherCard} /></div>
              <dl className="mt-5"><ProfileDataRow label="Nome do Negócio" value={profile.business_name} /><ProfileDataRow label="Setor de Atividade" value={profile.sector?.name} /><ProfileDataRow label="Distrito" value={profile.location?.name} /><ProfileDataRow label="Morada" value={profile.address} /></dl>
              {renderSavedNotice('dados-perfil')}
            </>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {editingSection === 'descricao' ? (
            <form onSubmit={(event) => void saveSection(event, 'descricao')}>
              <label htmlFor="description" className="text-2xl font-bold text-[#0d1f35]">Descrição Institucional</label>
              <textarea id="description" name="description" rows="6" value={activeDraft.description} onChange={updateDraft} placeholder="Apresente a sua empresa, atividade e principais serviços." className={`${inputClassName} resize-y`} />
              <FieldError message={fieldErrors.description} />
              <InlineFeedback status={editStatus} />
              <CardActions isSaving={isSaving} onCancel={cancelEditing} />
            </form>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4"><h2 className="text-2xl font-bold text-[#0d1f35]">Descrição Institucional</h2><EditProfileCardButton label="a descrição institucional" onClick={() => void startEditing('descricao')} disabled={editingAnotherCard} /></div>
              <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">{profile.description?.trim() || 'Ainda não foi adicionada uma descrição institucional.'}</p>
              {renderSavedNotice('descricao')}
            </>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {editingSection === 'contactos-comerciais' ? (
            <form onSubmit={(event) => void saveSection(event, 'contactos-comerciais')}>
              <h2 className="text-2xl font-bold text-[#0d1f35]">Contactos Comerciais</h2>
              <p className="mt-2 text-sm text-slate-600">Estes dados são apresentados no seu perfil comercial.</p>
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div><label htmlFor="commercialEmail" className="text-sm font-semibold text-[#0d1f35]">Email comercial</label><input id="commercialEmail" name="commercialEmail" type="email" value={activeDraft.commercialEmail} onChange={updateDraft} autoComplete="email" placeholder="geral@empresa.pt" className={inputClassName} /><FieldError message={fieldErrors.commercial_email} /></div>
                <div><label htmlFor="commercialPhone" className="text-sm font-semibold text-[#0d1f35]">Telefone comercial</label><input id="commercialPhone" name="commercialPhone" type="tel" value={activeDraft.commercialPhone} onChange={updateDraft} autoComplete="tel" maxLength={40} placeholder="+351 213 456 789" className={inputClassName} /><FieldError message={fieldErrors.commercial_phone} /></div>
              </div>
              <div className="mt-6"><label htmlFor="website" className="text-sm font-semibold text-[#0d1f35]">Website</label><input id="website" name="website" type="url" value={activeDraft.website} onChange={updateDraft} placeholder="https://www.exemplo.pt" className={inputClassName} /><FieldError message={fieldErrors.website_url} /></div>
              <InlineFeedback status={editStatus} />
              <CardActions isSaving={isSaving} onCancel={cancelEditing} />
            </form>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4"><h2 className="text-2xl font-bold text-[#0d1f35]">Contactos Comerciais</h2><EditProfileCardButton label="os contactos comerciais" onClick={() => void startEditing('contactos-comerciais')} disabled={editingAnotherCard} /></div>
              <p className="mt-3 text-sm leading-6 text-slate-600">Informação disponibilizada publicamente para clientes e visitantes.</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-[#0d1f35]"><Mail size={16} className="text-[#9b7b45]" aria-hidden="true" />Email</div>{commercialEmail ? <a href={`mailto:${commercialEmail}`} className="mt-2 block break-all text-sm text-slate-600 hover:text-[#0d1f35] hover:underline">{commercialEmail}</a> : <p className="mt-2 text-sm text-slate-500">Não indicado</p>}</div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-[#0d1f35]"><Phone size={16} className="text-[#9b7b45]" aria-hidden="true" />Telefone</div>{commercialPhone ? <a href={`tel:${commercialPhone}`} className="mt-2 block break-all text-sm text-slate-600 hover:text-[#0d1f35] hover:underline">{commercialPhone}</a> : <p className="mt-2 text-sm text-slate-500">Não indicado</p>}</div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2"><div className="flex items-center gap-2 text-sm font-semibold text-[#0d1f35]"><Globe2 size={16} className="text-[#9b7b45]" aria-hidden="true" />Website</div>{websiteUrl ? <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block break-all text-sm text-slate-600 hover:text-[#0d1f35] hover:underline">{profile.website_url}</a> : <p className="mt-2 text-sm text-slate-500">Não indicado</p>}</div>
              </div>
              {renderSavedNotice('contactos-comerciais')}
            </>
          )}
        </section>
      </div>

      <aside className="space-y-6">
        {editingSection === 'horario' ? (
          <form onSubmit={(event) => void saveSection(event, 'horario')}>
            {isPreparing ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm text-slate-600">A carregar editor de horários...</p><InlineFeedback status={editStatus} /><CardActions isSaving onCancel={cancelEditing} /></section>
            ) : (
              <BusinessHoursEditor businessHours={businessHours} onChange={(updatedHours) => { setBusinessHours(updatedHours); clearEditorFeedback() }} footer={<><InlineFeedback status={editStatus} /><CardActions isSaving={isSaving} onCancel={cancelEditing} /></>} />
            )}
          </form>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><Clock3 className="text-[#9b7b45]" size={21} aria-hidden="true" /><h2 className="text-xl font-bold text-[#0d1f35]">Horário de Atendimento</h2></div><EditProfileCardButton label="o horário de atendimento" onClick={() => void startEditing('horario')} disabled={editingAnotherCard} /></div>
            {displayHours.length > 0 ? <dl className="mt-5 space-y-4">{displayHours.map((hour) => <div key={hour.label} className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm"><dt className="text-slate-500">{hour.label}</dt><dd className="font-semibold text-[#0d1f35]">{hour.value}</dd></div>)}</dl> : <p className="mt-5 text-sm text-slate-500">Horário ainda não definido.</p>}
            {renderSavedNotice('horario')}
          </section>
        )}

        {editingSection === 'redes-sociais' ? (
          <form onSubmit={(event) => void saveSection(event, 'redes-sociais')}>
            {isPreparing ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm text-slate-600">A carregar redes sociais...</p><InlineFeedback status={editStatus} /><CardActions isSaving onCancel={cancelEditing} /></section>
            ) : (
              <SocialLinksEditor socialLinks={socialLinks} onChange={(updatedLinks) => { setSocialLinks(updatedLinks); clearEditorFeedback() }} footer={<><InlineFeedback status={editStatus} /><CardActions isSaving={isSaving} onCancel={cancelEditing} /></>} />
            )}
          </form>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><Share2 className="text-[#9b7b45]" size={21} aria-hidden="true" /><h2 className="text-xl font-bold text-[#0d1f35]">Redes Sociais</h2></div><EditProfileCardButton label="as redes sociais" onClick={() => void startEditing('redes-sociais')} disabled={editingAnotherCard} /></div>
            {displaySocialLinks.length > 0 ? <ul className="mt-5 space-y-4">{displaySocialLinks.map((link) => {
              const url = getSafeExternalUrl(link.url)
              const displayUrl = getSocialLinkText(link.url)
              const platformName = link.platform || 'Rede social'
              return <li key={`${link.platform_id}-${link.url}`}>{url ? <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${platformName}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3.5 text-sm text-[#0d1f35] transition hover:border-[#9b7b45] hover:bg-slate-50"><SocialPlatformIcon platform={link.platform} className="shrink-0 text-[#9b7b45]" size={18} aria-hidden="true" /><span className="sr-only">{platformName}: </span><span className="break-all">{displayUrl}</span></a> : <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3.5 text-sm text-slate-600"><SocialPlatformIcon platform={link.platform} className="shrink-0 text-[#9b7b45]" size={18} aria-hidden="true" /><span className="sr-only">{platformName}: </span><span className="break-all">{displayUrl}</span></div>}</li>
            })}</ul> : <p className="mt-5 text-sm text-slate-500">Ainda não foram adicionadas redes sociais.</p>}
            {renderSavedNotice('redes-sociais')}
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {editingSection === 'congregacao' ? (
            <form onSubmit={(event) => void saveSection(event, 'congregacao')}>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-[#0d1f35]"><Church size={20} className="text-[#9b7b45]" aria-hidden="true" />Congregação</h2>
              <div className="mt-6 grid gap-6"><div><label htmlFor="congregation" className="text-sm font-semibold text-[#0d1f35]">Congregação</label><input id="congregation" name="congregation" type="text" value={activeDraft.congregation} onChange={updateDraft} className={inputClassName} /><FieldError message={fieldErrors.congregation} /></div><div><label htmlFor="roleInCongregation" className="text-sm font-semibold text-[#0d1f35]">Cargo na congregação</label><input id="roleInCongregation" name="roleInCongregation" type="text" value={activeDraft.roleInCongregation} onChange={updateDraft} className={inputClassName} /><FieldError message={fieldErrors.role_in_congregation} /></div></div>
              <InlineFeedback status={editStatus} />
              <CardActions isSaving={isSaving} onCancel={cancelEditing} />
            </form>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><Church className="text-[#9b7b45]" size={21} aria-hidden="true" /><h2 className="text-xl font-bold text-[#0d1f35]">Congregação</h2></div><EditProfileCardButton label="a congregação" onClick={() => void startEditing('congregacao')} disabled={editingAnotherCard} /></div>
              <dl className="mt-5 space-y-4 text-sm"><div><dt className="text-slate-500">Nome</dt><dd className="mt-1 font-semibold text-[#0d1f35]">{profile.congregation?.trim() || 'Não indicada'}</dd></div><div><dt className="text-slate-500">Função</dt><dd className="mt-1 font-semibold text-[#0d1f35]">{profile.role_in_congregation?.trim() || 'Não indicada'}</dd></div></dl>
              {renderSavedNotice('congregacao')}
            </>
          )}
        </section>
      </aside>
    </div>
  )
}
