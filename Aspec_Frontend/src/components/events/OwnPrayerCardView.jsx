import { Calendar, Mail, Phone } from 'lucide-react'
import PrayerCardModal, { PrayerVerse } from './PrayerCardModal'
import { PRAYER_BUTTON, PRAYER_REQUESTS } from '../../utils/eventPrayerCard'
import { formatDate } from '../../utils/eventFormatting'

export default function OwnPrayerCardView({ event, result, profile, profileError, onRetry, onClose }) {
  return <PrayerCardModal title="O meu cartão de oração" description="Este é o cartão que enviou." onClose={onClose} wide bodyClass="bg-[#f0eee8] p-3 sm:p-4" footer={<button type="button" onClick={onClose} className={`${PRAYER_BUTTON} bg-[#0d1f35] font-medium text-white`}>Fechar</button>}>
    <div className="@container">
      <article className="rounded-md border border-[#e4dfd3] bg-[#fbf9f4] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_8px_24px_-12px_rgba(13,31,53,0.25),0_2px_4px_rgba(13,31,53,0.05)] @md:p-2.5">
        <div className="rounded-sm border border-[#d9ccab] p-4 @md:p-6">
          <header className="mb-4 flex flex-col gap-3 border-b border-[#e4dfd3] pb-4 @md:flex-row @md:items-start @md:justify-between">
            <div className="min-w-0"><p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#8a7043]">Cartão de Oração</p><h3 className="mt-2 break-words text-lg font-medium leading-snug text-[#0d1f35]">{event.name}</h3><p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600"><Calendar size={13} aria-hidden="true" className="shrink-0 text-[#8a7043]" />{formatDate(result.event_date)}</p></div>
          </header>
          <div className="mb-5"><PrayerVerse verse={result.prayer_verse} compact /></div>
          <div className="mb-6">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Os seus dados</p>
            {profile ? <><p className="text-base font-medium text-[#0d1f35]">{profile.name || '—'}</p><div className="mt-3 flex flex-col gap-2 @md:flex-row @md:flex-wrap">{[[Mail, profile.email], [Phone, profile.phone]].map(([Icon, value], index) => <div key={index} className="flex min-h-11 items-center gap-3 break-all rounded-lg border border-[#d9ccab] bg-white px-3.5 py-2.5 text-sm text-[#0d1f35]"><Icon size={16} aria-hidden="true" className="shrink-0 text-[#8a7043]" />{value || '—'}</div>)}</div></> : <p className="text-sm text-gray-600">A carregar os seus dados…</p>}
            {profileError && <div role="alert" className="mt-2 text-sm text-red-700"><p>{profileError}</p><button type="button" onClick={onRetry} className="mt-2 underline">Tentar novamente</button></div>}
          </div>
          <dl className="space-y-5">{PRAYER_REQUESTS.map(({ key, label }) => <div key={key}><dt className="text-[13px] font-semibold text-[#8a7043]">{label}</dt><dd className="mt-1 whitespace-pre-line break-words border-b border-dashed border-[#d9ccab] pb-4 text-[15px] leading-relaxed text-gray-800">{result.card[key] || '—'}</dd></div>)}</dl>
        </div>
      </article>
    </div>
  </PrayerCardModal>
}
