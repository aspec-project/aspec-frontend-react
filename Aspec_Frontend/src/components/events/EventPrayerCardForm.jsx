import { useId, useRef, useState } from 'react'
import { Check, Lock, Send } from 'lucide-react'
import PrayerCardModal, { PrayerVerse } from './PrayerCardModal'
import { PRAYER_BUTTON, PRAYER_REQUESTS } from '../../utils/eventPrayerCard'
import { formatDate } from '../../utils/eventFormatting'

export default function EventPrayerCardForm({ card, verse, eventDate, state, onClose }) {
  const prefix = useId()
  const [values, setValues] = useState(() => Object.fromEntries(PRAYER_REQUESTS.map(({ key }) => [key, card?.[key] ?? ''])))
  /*
   * A API exige uma nova autorização explícita também em cada edição.
   */
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const locked = useRef(false)
  const errorRef = useRef(null)
  const anyRequest = PRAYER_REQUESTS.some(({ key }) => values[key].trim())
  const editable = state.result?.window?.status === 'open' && state.result?.distribution_status === 'pending'
  const canSubmit = anyRequest && consent && !state.saving && editable && !!state.profile && !state.profileError && !state.loading && !state.loadError

  async function submit(event) {
    event.preventDefault()
    if (locked.current || state.saving) return
    const fields = {}
    PRAYER_REQUESTS.forEach(({ key }) => {
      if (Array.from(values[key]).length > 500) fields[key] = 'O pedido não pode exceder 500 caracteres.'
      else if (!anyRequest) fields[key] = 'Preencha pelo menos um pedido.'
    })
    if (!consent) fields.consent = 'Autorize a partilha para enviar o cartão.'
    setErrors(fields)
    if (Object.keys(fields).length || !canSubmit) return
    locked.current = true
    setMessage('')
    try {
      const response = await state.save({ ...values, consent })
      if (response.success) onClose()
      else if (!response.cancelled) {
        setErrors(response.fields || {})
        setMessage(response.message)
        queueMicrotask(() => errorRef.current?.focus())
      }
    } finally { locked.current = false }
  }

  const profile = state.profile
  return <PrayerCardModal title={card ? 'Editar cartão de oração' : 'Cartão de oração'} description="Escreva os pedidos pelos quais gostaria que orassem por si." onClose={onClose} busy={state.saving} bodyClass="space-y-5 px-4 py-4 sm:px-6" footer={<>
    {!anyRequest && <p className="mb-2 text-xs text-gray-600 sm:text-right">Escreva pelo menos um pedido.</p>}
    {anyRequest && !consent && <p className="mb-2 text-xs text-gray-600 sm:text-right">Marque a autorização para poder enviar o cartão.</p>}
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button type="button" disabled={state.saving} onClick={onClose} className={`${PRAYER_BUTTON} border border-[#d4d8e3] text-[#555]`}>Cancelar</button>
      <button form={`${prefix}-form`} type="submit" disabled={!canSubmit} className={`${PRAYER_BUTTON} bg-[#0d1f35] font-medium text-white`}>{card ? <Check size={15} aria-hidden="true" /> : <Send size={15} aria-hidden="true" />}{state.saving ? 'A guardar…' : card ? 'Guardar alterações' : 'Enviar cartão'}</button>
    </div>
  </>}>
    <PrayerVerse verse={verse} />
    <section aria-label="Os seus dados">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs text-gray-500"><Lock size={11} aria-hidden="true" /> Os seus dados, preenchidos a partir do perfil</p>
      {profile ? <dl className="divide-y divide-black/10 rounded-xl border border-[#e4dfd3] bg-[#faf9f6]">{[['Nome', profile.name], ['Email', profile.email], ['Telefone', profile.phone], ['Data', formatDate(eventDate)]].map(([label, value]) => <div key={label} className="flex items-baseline gap-3 px-4 py-2.5"><dt className="w-[72px] shrink-0 text-xs text-gray-500">{label}</dt><dd className="min-w-0 flex-1 break-words text-sm text-gray-800">{value || '—'}</dd></div>)}</dl> : <p role="status" className="text-sm text-gray-600">A carregar os seus dados…</p>}
      {state.profileError && <div role="alert" className="mt-2 text-sm text-red-700"><p>{state.profileError}</p><button type="button" onClick={state.retry} className="mt-2 underline">Tentar novamente</button></div>}
    </section>
    <form id={`${prefix}-form`} onSubmit={submit} noValidate className="space-y-5">
      {message && <p ref={errorRef} tabIndex={-1} role="alert" className="text-sm text-red-700">{message}</p>}
      {state.loadError ? <p role="alert" className="text-sm text-red-700">{state.loadError}</p> : !editable && <p role="status" className="text-sm text-gray-600">{state.result?.window?.status === 'not_open' ? 'Os cartões de oração abrem no início do evento.' : 'O prazo para preencher o cartão terminou.'}</p>}
      {PRAYER_REQUESTS.map(({ key, label }) => {
        const length = Array.from(values[key]).length
        return <div key={key}>
          <div className="mb-1.5 flex items-center justify-between"><label htmlFor={`${prefix}-${key}`} className="text-sm font-medium text-[#0d1f35]">{label}</label><span id={`${prefix}-${key}-count`} className={`text-xs tabular-nums ${length >= 450 ? 'text-[#b45f06]' : 'text-gray-500'}`}>{length}/500</span></div>
          <textarea id={`${prefix}-${key}`} rows={4} disabled={state.saving} value={values[key]} aria-invalid={!!errors[key]} aria-describedby={`${prefix}-${key}-count${errors[key] ? ` ${prefix}-${key}-error` : ''}`} onChange={(event) => {
            // Tal como o Laravel, conta pontos de código e preserva os pares UTF-16 dos emojis.
            const value = Array.from(event.target.value).slice(0, 500).join('')
            setValues((current) => ({ ...current, [key]: value }))
            setErrors((current) => ({ ...current, [key]: '' }))
          }} className="w-full resize-none rounded-xl border border-[#d4d8e3] bg-transparent px-4 py-3 text-base leading-relaxed text-[#0d1f35] outline-none transition-colors focus:border-[#8a7043] focus:ring-2 focus:ring-[#8a7043]/15 sm:text-sm" />
          {errors[key] && <p id={`${prefix}-${key}-error`} role="alert" className="mt-1 text-xs text-red-700">{errors[key]}</p>}
        </div>
      })}
      <div>
        <label className={`flex cursor-pointer select-none items-start gap-3.5 rounded-xl border bg-[#f5f2e8] p-4 ${consent ? 'border-[#8a7043]' : 'border-[#e4dfd3]'}`}>
          <input type="checkbox" checked={consent} disabled={state.saving} aria-invalid={!!errors.consent} aria-describedby={errors.consent ? `${prefix}-consent-error` : undefined} onChange={(event) => { setConsent(event.target.checked); setErrors((current) => ({ ...current, consent: '' })) }} className="peer sr-only" />
          <span aria-hidden="true" className={`mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[#8a7043]/40 ${consent ? 'border-[#8a7043] bg-[#8a7043]' : 'border-[#a9a08a] bg-white'}`}>{consent && <Check size={14} color="white" strokeWidth={3} />}</span>
          <span className="text-[15px] font-normal leading-relaxed text-[#4a3f24] sm:text-sm">Autorizo que o meu nome, email, telefone e os meus pedidos de oração sejam partilhados com o membro que vai receber este cartão.</span>
        </label>
        {errors.consent && <p id={`${prefix}-consent-error`} role="alert" className="mt-1 text-xs text-red-700">{errors.consent}</p>}
      </div>
    </form>
  </PrayerCardModal>
}
