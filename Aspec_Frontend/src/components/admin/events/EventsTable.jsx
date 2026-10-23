import { CalendarClock, CalendarDays, Clock, MapPin, Video } from 'lucide-react'
import EventActions from './EventActions'
import EventOccupancy from './EventOccupancy'
import { EVENT_PERIOD_TABS, formatDeadline, formatEventDate, formatSession, formatTimeRange, getRegistrationState } from '../../../utils/adminEvents'
import { badgeTextColor, categoryColor } from '../../../utils/eventFormatting'

const REGISTRATION_BADGES = {
  open: { label: 'Abertas', className: 'bg-emerald-50 text-emerald-700' },
  closed: { label: 'Encerradas', className: 'bg-gray-100 text-gray-600' },
}

/**
 * Tabela da lista de eventos do backoffice: evento (nome, categoria e "Sessão X/Y" quando existe), data e hora,
 * local, prazo de inscrição com o estado (Abertas/Encerradas), lotação ("Participação" nos passados) e ações
 * (exportar a lista de presenças). O link dos eventos online não é mostrado.
 *
 * @param {{
 *   events: object[],
 *   period: 'upcoming'|'past',
 *   busy?: boolean,
 *   onExport: (event: object) => void,
 *   actionsDisabled?: boolean,
 * }} props
 * @returns {JSX.Element}
 */
export default function EventsTable({ events, period, busy = false, onExport, actionsDisabled = false }) {
  const tab = EVENT_PERIOD_TABS.find((item) => item.key === period) ?? EVENT_PERIOD_TABS[0]
  const headers = ['Evento', 'Data e hora', 'Local', 'Inscrições até', tab.capacityLabel, 'Ações']

  return (
    <div aria-busy={busy} className={`overflow-x-auto rounded-xl bg-white shadow-sm transition-opacity ${busy ? 'opacity-60' : ''}`}>
      <table className="w-full min-w-[1000px] text-left text-sm">
        <caption className="sr-only">{tab.caption}</caption>
        <thead className="bg-gray-50">
          <tr>
            {headers.map((header) => (
              <th key={header} scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {events.map((event) => {
            const color = categoryColor(event.category)
            const session = formatSession(event)
            const timeRange = formatTimeRange(event.event_start_time, event.event_end_time)
            const registrationBadge = REGISTRATION_BADGES[getRegistrationState(event.registration_deadline)]

            return (
              <tr key={event.id}>
                <td className="px-5 py-4">
                  <p className="font-semibold text-[#0d1f35]">{event.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {event.category?.name && (
                      <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: color, color: badgeTextColor(color) }}>
                        {event.category.name}
                      </span>
                    )}
                    {session && <span className="text-xs text-gray-500">{session}</span>}
                  </div>
                </td>
                <td className="px-5 py-4 text-gray-700">
                  <p className="flex items-center gap-2">
                    <CalendarDays size={14} aria-hidden="true" className="text-gray-400" />
                    <span>{formatEventDate(event.event_date)}</span>
                  </p>
                  {timeRange && (
                    <p className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                      <Clock size={14} aria-hidden="true" className="text-gray-400" />
                      <span>{timeRange}</span>
                    </p>
                  )}
                </td>
                <td className="px-5 py-4 text-gray-700">
                  {event.is_online ? (
                    <>
                      <p className="flex items-center gap-2">
                        <Video size={14} aria-hidden="true" className="text-gray-400" />
                        <span>Online</span>
                      </p>
                      {event.location?.name && <p className="mt-1 pl-6 text-xs text-gray-500">{event.location.name}</p>}
                    </>
                  ) : (
                    <p className="flex items-center gap-2">
                      <MapPin size={14} aria-hidden="true" className="text-gray-400" />
                      <span>{event.location?.name ?? '—'}</span>
                    </p>
                  )}
                </td>
                <td className="px-5 py-4 text-gray-700">
                  <p className="flex items-center gap-2">
                    <CalendarClock size={14} aria-hidden="true" className="text-gray-400" />
                    <span>{formatDeadline(event.registration_deadline)}</span>
                  </p>
                  {registrationBadge && (
                    <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-xs font-medium ${registrationBadge.className}`}>
                      {registrationBadge.label}
                    </span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <EventOccupancy registrations={event.registrations_count} max={event.max_attendees} period={period} />
                </td>
                <td className="px-5 py-4">
                  <EventActions event={event} disabled={actionsDisabled} onExport={onExport} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
