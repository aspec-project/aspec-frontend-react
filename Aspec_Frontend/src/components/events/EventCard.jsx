import { Link } from "react-router-dom";
import { CalendarDays, Clock, MapPin, Users, ChevronRight } from "lucide-react";

import { formatDate, formatTime, categoryColor, badgeTextColor } from "../../utils/eventFormatting";

export default function EventCard({ event }) {
  const color = categoryColor(event.category);
  const startTime = formatTime(event.event_start_time);
  const endTime = formatTime(event.event_end_time);
  const availableSpots = event.available_spots;
  const description = typeof event.description === "string" ? event.description.trim() : "";
  const maxAttendees = event.max_attendees;
  const registrationsCount = event.registrations_count;
  const hasOccupancy =
    Number.isFinite(maxAttendees) && Number.isInteger(maxAttendees) && maxAttendees > 0 &&
    Number.isFinite(registrationsCount) && Number.isInteger(registrationsCount) && registrationsCount >= 0;
  const occupancy = hasOccupancy
    ? Math.min(100, Math.max(0, Math.round((registrationsCount / maxAttendees) * 100)))
    : null;
  const availability = !Number.isInteger(availableSpots) || availableSpots < 0
    ? "Vagas por confirmar"
    : availableSpots === 0
      ? "Evento lotado"
      : `${availableSpots} ${availableSpots === 1 ? "vaga disponível" : "vagas disponíveis"}`;

  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div aria-hidden="true" className="h-2" style={{ backgroundColor: color }} />
      <div className="flex flex-1 flex-col p-5">
        <span
          className="mb-3 max-w-full self-start break-words rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ backgroundColor: color, color: badgeTextColor(color) }}
        >
          {typeof event.category?.name === "string" ? event.category.name : "Evento"}
        </span>
        <h2 className="mb-4 break-words text-base font-medium leading-snug text-[#0D1F35]">
          {event.name}
        </h2>
        {description ? (
          <p className="mb-4 min-h-8 line-clamp-2 break-words text-xs leading-4 text-gray-500">{description}</p>
        ) : (
          <div aria-hidden="true" className="mb-4 min-h-8" />
        )}
        <div className="space-y-1.5 text-xs text-gray-500">
          <p className="flex items-start gap-1.5">
            <CalendarDays size={12} aria-hidden="true" className="mt-0.5 shrink-0 text-[#8A7043]" />
            <span>{formatDate(event.event_date)}</span>
          </p>
          <p className="flex items-start gap-1.5">
            <Clock size={12} aria-hidden="true" className="mt-0.5 shrink-0 text-[#8A7043]" />
            <span>{startTime ? `${startTime}${endTime ? ` – ${endTime}` : ""}` : "Horário por confirmar"}</span>
          </p>
          <p className="flex items-start gap-1.5">
            <MapPin size={12} aria-hidden="true" className="mt-0.5 shrink-0 text-[#8A7043]" />
            <span className="min-w-0 break-words">{typeof event.location?.name === "string" ? event.location.name : "Local por confirmar"}</span>
          </p>
          <p className="flex items-start gap-1.5">
            <Users size={12} aria-hidden="true" className="mt-0.5 shrink-0 text-[#8A7043]" />
            <span>{availability}</span>
          </p>
        </div>
        {hasOccupancy ? (
          <div className="mt-4">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
              <span>{registrationsCount} / {maxAttendees} inscritos</span>
              <span>{occupancy}% de ocupação</span>
            </div>
            <div
              role="progressbar"
              aria-label="Ocupação do evento"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={occupancy}
              className="h-1.5 overflow-hidden rounded-full bg-gray-100"
            >
              <div className="h-full rounded-full" style={{ width: `${occupancy}%`, backgroundColor: color }} />
            </div>
          </div>
        ) : (
          <p className="mt-4 text-xs text-gray-500">Lotação por confirmar.</p>
        )}
        {event.registration_open === true && (
          <p className="mt-4 text-xs font-medium text-gray-500">Inscrições abertas</p>
        )}
        {event.registration_open === false && (
          <p className="mt-4 text-xs font-medium text-gray-500">Inscrições encerradas</p>
        )}
        <div className="mt-auto pt-4">
          <Link
            to={`/eventos/${encodeURIComponent(event.id)}`}
            aria-label={`Ver evento: ${event.name}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0D1F35] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#183650] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315A79]"
          >
            Ver detalhes <ChevronRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
