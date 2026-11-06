import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle, Eye, Lock, Pencil, UserPlus } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import useEventPrayerCard from '../../hooks/useEventPrayerCard'
import EventPrayerCardForm from './EventPrayerCardForm'
import OwnPrayerCardView from './OwnPrayerCardView'
import { PrayerCross, PrayerVerse } from './PrayerCardModal'
import { PRAYER_BUTTON } from '../../utils/eventPrayerCard'

function Notice({ children, success = false, registration = false, upcoming = false }) {
  const Icon = success ? CheckCircle : registration ? UserPlus : Lock
  return <div className={`flex items-start gap-3 rounded-lg p-4 ${success ? 'bg-[#e6f2ea] text-[#2f6b47]' : `border bg-[#f5f3ee] text-gray-700 ${registration || upcoming ? 'border-dashed border-[#c9b87a]' : 'border-[#d4d8e3]'}`}`}><Icon size={success ? 18 : 16} aria-hidden="true" className={`mt-0.5 shrink-0 ${success ? '' : 'text-[#8a7043]'}`} /><div className="min-w-0 text-[15px] leading-relaxed">{children}</div></div>
}

function RegisteredPrayerCard({ event }) {
  const state = useEventPrayerCard(event.id)
  const [modal, setModal] = useState(null)
  const card = state.result?.card
  const distributed = state.result?.distribution_status === 'distributed'
  const unpaired = state.result?.distribution_status === 'unpaired'
  const open = state.result?.window?.status === 'open' && state.result?.distribution_status === 'pending'
  const actionClass = 'flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a7043]'
  return <>
    {state.loading && <p role="status" className="text-sm text-gray-600">A carregar cartão de oração…</p>}
    {state.loadError && <div role="alert"><p className="text-sm text-red-700">{state.loadError}</p><button type="button" onClick={state.retry} className="mt-3 rounded-lg border border-[#d4d8e3] px-3 py-2 text-sm">Tentar novamente</button></div>}
    {card ? <>
      <Notice success><p className="font-medium">{distributed ? 'O seu cartão foi enviado e os cartões já foram distribuídos.' : unpaired ? 'O seu cartão foi enviado.' : 'O seu cartão foi enviado. Vai receber o cartão de outro participante quando o prazo terminar.'}</p>{unpaired && <p className="mt-2">Neste evento só foi preenchido o seu cartão, por isso não houve troca.</p>}{distributed && <Link to="/perfil/cartoes-oracao" className="mt-2 flex min-h-11 items-center gap-1.5 text-sm font-medium">Ver os meus cartões de oração <ArrowRight size={14} aria-hidden="true" /></Link>}</Notice>
      <div className="mt-4 flex items-center gap-2"><button type="button" onClick={() => setModal('view')} aria-label="Ver o meu cartão" className={`${actionClass} bg-[#0d1f35] text-white`}><Eye size={17} aria-hidden="true" />Ver</button>{open && !state.loadError && <button type="button" disabled={state.loading} onClick={() => setModal('form')} aria-label="Editar cartão" className={`${actionClass} border border-[#d4d8e3] bg-white text-[#0d1f35] disabled:opacity-40`}><Pencil size={16} aria-hidden="true" />Editar</button>}</div>
    </> : state.result && !state.loading && !state.loadError ? open ? <div className="flex flex-col gap-4"><p className="text-[15px] leading-relaxed text-gray-700 sm:text-sm">Pode preencher o seu cartão até às 23h59 de hoje. No fim do prazo, receberá o cartão de outro participante.</p><button type="button" onClick={() => setModal('form')} className={`${PRAYER_BUTTON} bg-[#8a7043] font-medium text-white`}><PrayerCross />Preencher cartão de oração</button></div> : <Notice upcoming={state.result.window.status === 'not_open'}>{state.result.window.status === 'not_open' ? 'Os cartões de oração abrem no início do evento.' : 'O prazo para preencher o cartão terminou.'}</Notice> : null}
    {modal === 'form' && <EventPrayerCardForm card={card} verse={state.result?.prayer_verse ?? event.prayer_verse} eventDate={state.result?.event_date ?? event.event_date} state={state} onClose={() => setModal(null)} />}
    {modal === 'view' && card && <OwnPrayerCardView event={event} result={state.result} profile={state.profile} profileError={state.profileError} onRetry={state.retry} onClose={() => setModal(null)} />}
  </>
}

export default function EventPrayerCardBlock({ event }) {
  const auth = useAuthStore()
  if (event.prayer_cards_enabled !== true) return null
  const authenticated = auth.status === 'authenticated' && !auth.sessionChanging && !!auth.user?.id
  const active = authenticated && auth.user.account_status?.name === 'Active'
  /*
   * Desmonta os dados privados e os rascunhos ao mudar a sessão ou a inscrição.
   */
  const identity = `${auth.sessionGeneration}:${auth.user?.id}:${event.id}:${event.is_registered}`
  return <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="event-prayer-card-heading">
    <h2 id="event-prayer-card-heading" className="mb-4 flex items-center gap-2 font-medium text-[#0d1f35]"><PrayerCross className="text-[#8a7043]" />Cartão de oração</h2>
    {!authenticated ? <div className="space-y-4"><p className="text-[15px] leading-relaxed text-gray-700 sm:text-sm">Este evento tem cartões de oração. No dia do evento, cada participante inscrito escreve um cartão e, no fim do prazo, recebe o de outro participante, por quem ora durante uma semana.</p><PrayerVerse verse={event.prayer_verse} /></div> : !active ? <Notice>O preenchimento do cartão requer uma conta ativa.</Notice> : event.is_registered !== true ? <Notice registration>Inscreva-se no evento para poder preencher o cartão de oração.</Notice> : <RegisteredPrayerCard key={identity} event={event} />}
  </section>
}
