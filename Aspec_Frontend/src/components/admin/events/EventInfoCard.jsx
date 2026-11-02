import { useId } from 'react'
import { Calendar, CalendarClock, Clock, MapPin, Users } from 'lucide-react'
import { formatEventVenue, formatTimeRange, getOccupancy } from '../../../utils/adminEvents'
import { formatShortDate, formatShortDateTime } from '../../../utils/dateFormat'

/**
 * Par rótulo/valor da grelha da informação do evento, com o ícone à esquerda.
 *
 * @param {{icon: import('react').ComponentType, label: string, value: string}} props
 * @returns {JSX.Element}
 */
function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-gray-500" />
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="font-medium text-[#0d1f35]">{value || '—'}</p>
      </div>
    </div>
  )
}

/**
 * Cartão "Informação do evento" da página do evento no backoffice: data, hora, local, prazo de inscrição e a
 * lotação com a barra dourada. Só apresenta os dados recebidos.
 *
 * @param {{event: object}} props Evento lido por getAdminEvent.
 * @returns {JSX.Element}
 */
export default function EventInfoCard({ event }) {
  const titleId = useId()
  const occupancy = getOccupancy(event.registrations_count, event.max_attendees)

  return (
    <section aria-labelledby={titleId} className="rounded-xl bg-white p-6 shadow-sm">
      <h2 id={titleId} className="text-lg font-semibold text-[#0d1f35]">Informação do evento</h2>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <InfoItem icon={Calendar} label="Data" value={formatShortDate(event.event_date)} />
        <InfoItem icon={Clock} label="Hora" value={formatTimeRange(event.event_start_time, event.event_end_time)} />
        <InfoItem icon={MapPin} label="Local" value={formatEventVenue(event)} />
        <InfoItem icon={CalendarClock} label="Inscrições até" value={formatShortDateTime(event.registration_deadline)} />
      </div>

      <div className="mt-6 border-t border-gray-100 pt-5">
        <div className="flex items-center justify-between gap-4">
          <p className="flex items-center gap-2 text-gray-600">
            <Users size={16} aria-hidden="true" className="text-gray-500" />
            Lotação
          </p>
          {occupancy ? (
            <>
              <span className="sr-only">{`${event.registrations_count} inscritos de ${event.max_attendees} lugares (${occupancy.percent}%)`}</span>
              <p aria-hidden="true" className="font-semibold text-[#0d1f35]">
                {`${event.registrations_count} / ${event.max_attendees} (${occupancy.percent}%)`}
              </p>
            </>
          ) : (
            <p className="text-gray-400">—</p>
          )}
        </div>
        {occupancy && (
          <div aria-hidden="true" className="mt-3 h-1.5 w-full rounded-full bg-gray-100">
            <div className="h-1.5 rounded-full bg-[#8a7043]" style={{ width: `${Math.min(occupancy.percent, 100)}%` }} />
          </div>
        )}
      </div>
    </section>
  )
}
