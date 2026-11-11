import { useEffect, useRef } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import EventInfoCard from '../../components/admin/events/EventInfoCard'
import PrayerCardsCard from '../../components/admin/events/PrayerCardsCard'
import PrayerCardsDisabledNote from '../../components/admin/events/PrayerCardsDisabledNote'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import FeedbackBanner from '../../components/ui/FeedbackBanner'
import useAdminEvent from '../../hooks/useAdminEvent'
import usePrayerCards from '../../hooks/usePrayerCards'
import { formatSessionLong } from '../../utils/adminEvents'
import { PRAYER_CARDS_TEXTS, formatCardsSummary } from '../../utils/adminPrayerCards'

const buttonClass = 'rounded-lg bg-[#0d1f35] px-4 py-2 text-sm font-semibold text-white hover:bg-[#183650] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Página de um evento no backoffice (/admin/eventos/:id), sem o herói nem os separadores do AdminLayout:
 * banda escura com "Voltar aos eventos", o tipo de evento, o nome (título) e "Sessão X de Y" quando há dados
 * da série; o cartão "Informação do evento" e, por baixo, os cartões de oração. Sem cartões ativos aparece a
 * nota tracejada; com cartões, o estado, quem entregou e o botão "Distribuir agora", que pede confirmação.
 * O estado usa a hora real do browser lida em cada render (sem temporizador: reflete o momento em que a página
 * carregou ou recarregou). A lógica vive nos hooks useAdminEvent (evento) e usePrayerCards (estado e distribuição).
 *
 * @returns {JSX.Element}
 */
export default function AdminEventDetailPage() {
  const { id } = useParams()
  const { event, loading, error, notFound, retry, refresh } = useAdminEvent(id)
  const cardsEnabled = event?.prayer_cards_enabled === true
  const cards = usePrayerCards(id, cardsEnabled, { version: event, onStale: refresh })
  const headingRef = useRef(null)
  const now = Date.now()
  const showEvent = Boolean(event) && !notFound && !error
  const session = showEvent ? formatSessionLong(event) : null

  /**
   * Depois de distribuir (200) ou de um 409, o botão pode ficar desativado: o foco vai para o título da secção.
   * Corre depois de o ConfirmDialog devolver o foco ao botão, por isso fica com a última palavra.
   */
  useEffect(() => {
    if (cards.focusRequest > 0) headingRef.current?.focus()
  }, [cards.focusRequest])

  return (
    <>
      <section className="bg-[linear-gradient(135deg,#0d1f35,#060f1a)]">
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
          <Link
            to="/admin/eventos"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-200 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Voltar aos eventos
          </Link>

          {showEvent ? (
            <div>
              {event.category?.name && (
                <p className="text-sm font-semibold uppercase tracking-wider text-[#c9b87a]">{event.category.name}</p>
              )}
              <h1 className="mt-1 text-2xl font-semibold text-white">{event.name}</h1>
              {session && <p className="mt-1 text-gray-300">{session}</p>}
            </div>
          ) : (
            <h1 className="text-2xl font-semibold text-white">{notFound ? 'Evento não encontrado.' : 'Detalhe do evento'}</h1>
          )}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {cards.feedback && (
          <FeedbackBanner type={cards.feedback.type} message={cards.feedback.message} onClose={cards.dismissFeedback} />
        )}

        {notFound ? (
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-600">O evento pedido não existe ou foi apagado.</p>
          </div>
        ) : error ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
            <p>{error}</p>
            <button type="button" onClick={retry} className={`${buttonClass} mt-4`}>Tentar novamente</button>
          </div>
        ) : !event ? (
          <p role="status" className="py-12 text-center text-gray-600">A carregar evento...</p>
        ) : (
          <div aria-busy={loading} className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`}>
            <EventInfoCard event={event} />

            {!cardsEnabled || cards.unavailable ? (
              <PrayerCardsDisabledNote />
            ) : cards.error ? (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
                <p>{cards.error}</p>
                <button type="button" onClick={cards.retry} className={`${buttonClass} mt-4`}>{PRAYER_CARDS_TEXTS.retry}</button>
              </div>
            ) : !cards.status ? (
              <p role="status" className="py-8 text-center text-gray-600">{PRAYER_CARDS_TEXTS.loading}</p>
            ) : (
              <PrayerCardsCard
                status={cards.status}
                now={now}
                pending={cards.pending}
                onDistribute={cards.requestDistribute}
                headingRef={headingRef}
              />
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={cards.confirming && Boolean(cards.status)}
        title={PRAYER_CARDS_TEXTS.dialogTitle}
        description={PRAYER_CARDS_TEXTS.dialogDescription}
        confirmLabel={PRAYER_CARDS_TEXTS.distributeLabel}
        tone="primary"
        showClose
        pending={cards.pending}
        onConfirm={cards.confirm}
        onCancel={cards.cancel}
      >
        {event && cards.status && (
          <div className="mt-4 rounded-lg bg-[#f5f3ee] px-4 py-3">
            <p className="font-semibold text-[#0d1f35]">{event.name}</p>
            <p className="mt-1 text-sm text-gray-600">{formatCardsSummary(cards.status.cards_count, cards.status.registrations_count)}</p>
          </div>
        )}
      </ConfirmDialog>
    </>
  )
}
