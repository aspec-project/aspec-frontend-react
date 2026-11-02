import { useId } from 'react'
import { CircleCheck, Hourglass, Lock, Send } from 'lucide-react'
import {
  PRAYER_CARDS_TEXTS,
  canDistributePrayerCards,
  getCardsProgress,
  getPrayerCardsBadge,
  getPrayerCardsPhase,
} from '../../../utils/adminPrayerCards'
import { formatDayMonthTime } from '../../../utils/dateFormat'

const BADGE_STYLES = {
  waiting: { className: 'bg-[#f5efe3] text-[#6b5631]', icon: Hourglass },
  warning: { className: 'bg-amber-50 text-amber-800', icon: Hourglass },
  success: { className: 'bg-emerald-50 text-emerald-700', icon: CircleCheck },
}

/**
 * Cartão "Cartões de oração" da página do evento no backoffice: quantos inscritos preencheram o cartão (com a
 * barra), o badge do estado, a lista de quem entregou (nome, empresa e hora de Lisboa, pela ordem da API), a
 * nota de confidencialidade e o botão "Distribuir agora". O botão só fica ativo com o prazo aberto ou terminado
 * e ainda sem distribuição; desativado, aponta para o badge, que explica porquê. Nunca mostra o conteúdo dos
 * cartões nem quem recebe cada um (o backend nem os envia).
 *
 * @param {{
 *   status: object,
 *   now: number,
 *   pending?: boolean,
 *   onDistribute: () => void,
 *   headingRef?: import('react').Ref<HTMLHeadingElement>,
 * }} props `status` lido por getPrayerCardsStatus; `now` é o momento atual em milissegundos.
 * @returns {JSX.Element}
 */
export default function PrayerCardsCard({ status, now, pending = false, onDistribute, headingRef }) {
  const titleId = useId()
  const badgeId = useId()
  const phase = getPrayerCardsPhase(status, now)
  const badge = getPrayerCardsBadge(status, now)
  const { className: badgeClass, icon: BadgeIcon } = BADGE_STYLES[badge.tone]
  const available = canDistributePrayerCards(phase)
  const progress = getCardsProgress(status.cards_count, status.registrations_count)

  return (
    <section aria-labelledby={titleId} className="rounded-xl bg-white p-6 shadow-sm">
      <h2
        id={titleId}
        ref={headingRef}
        tabIndex={-1}
        className="flex items-center gap-3 text-lg font-semibold text-[#0d1f35] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315a79]"
      >
        <span aria-hidden="true" className="text-[#8a7043]">†</span>
        {PRAYER_CARDS_TEXTS.title}
      </h2>

      <div className="mt-5 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-sm text-gray-500">{PRAYER_CARDS_TEXTS.filledLabel}</p>
          <p className="mt-1 text-[#0d1f35]">
            <span className="text-2xl font-semibold">{status.cards_count}</span>
            {` de ${status.registrations_count} inscritos`}
          </p>
          <div aria-hidden="true" className="mt-3 h-1.5 w-full rounded-full bg-gray-100">
            <div className="h-1.5 rounded-full bg-[#8a7043]" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div>
          <p className="text-sm text-gray-500">{PRAYER_CARDS_TEXTS.statusLabel}</p>
          <span id={badgeId} className={`mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ${badgeClass}`}>
            <BadgeIcon size={16} aria-hidden="true" className="shrink-0" />
            {badge.text}
          </span>
        </div>
      </div>

      <div className="mt-6 border-t border-gray-100 pt-5">
        <h3 className="font-semibold text-[#0d1f35]">{PRAYER_CARDS_TEXTS.participantsTitle}</h3>
        {status.participants.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">{PRAYER_CARDS_TEXTS.noParticipants}</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-100">
            {status.participants.map((participant, index) => (
              <li key={`${participant.submitted_at}-${index}`} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-[#0d1f35]">{participant.name ?? PRAYER_CARDS_TEXTS.unknownName}</p>
                  {participant.business_name && <p className="text-sm text-gray-500">{participant.business_name}</p>}
                </div>
                <time dateTime={participant.submitted_at} className="shrink-0 text-sm text-gray-500">
                  {formatDayMonthTime(participant.submitted_at)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-4 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-sm text-gray-500">
          <Lock size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>{PRAYER_CARDS_TEXTS.lockNote}</span>
        </p>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-describedby={available ? undefined : badgeId}
          disabled={!available || pending}
          onClick={onDistribute}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#0d1f35] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#183650] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          <Send size={16} aria-hidden="true" />
          {PRAYER_CARDS_TEXTS.distributeLabel}
        </button>
      </div>
    </section>
  )
}
