import { CalendarDays, CalendarClock, Clock, MapPin } from "lucide-react";
import { formatDate, formatRegistrationDeadline, formatTime } from "../../utils/eventFormatting";

function SummaryInformation({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-[#8A7043]" />
      <div className="min-w-0">
        <dt className="sr-only">{label}</dt>
        <dd className="whitespace-pre-line break-words text-xs leading-5 text-gray-600">{children}</dd>
      </div>
    </div>
  );
}

export default function EventRegistrationSummary({ event }) {
  const startTime = formatTime(event.event_start_time);
  const endTime = formatTime(event.event_end_time);
  const deadline = formatRegistrationDeadline(event.registration_deadline);

  return (
    <section aria-labelledby="registration-summary-title" className="mt-5 rounded-lg border border-[#E5DFD3] bg-[#F6F4EF] p-4 text-left">
      {event.category?.name && <p className="text-xs text-gray-500">{event.category.name}</p>}
      <h3 id="registration-summary-title" className="mt-1 break-words text-sm font-semibold text-[#0D1F35]">{event.name}</h3>
      <dl className="mt-3 space-y-2">
        <SummaryInformation icon={CalendarDays} label="Data">{formatDate(event.event_date)}</SummaryInformation>
        <SummaryInformation icon={Clock} label="Horário">
          {startTime ? `${startTime}${endTime ? ` – ${endTime}` : ""}` : endTime ? `Hora de fim: ${endTime}` : "Horário por confirmar"}
        </SummaryInformation>
        {(event.address || event.location?.name) && (
          <SummaryInformation icon={MapPin} label={event.address ? "Morada" : "Localização"}>
            {event.address || event.location.name}
          </SummaryInformation>
        )}
        {deadline && (
          <SummaryInformation icon={CalendarClock} label="Data limite de inscrição">
            <span>Inscrições até <time dateTime={event.registration_deadline}>{deadline}</time></span>
          </SummaryInformation>
        )}
      </dl>
      {event.organizer_notes && (
        <p className="mt-3 whitespace-pre-line break-words border-t border-[#E5DFD3] pt-3 text-xs leading-5 text-gray-500">
          {event.organizer_notes}
        </p>
      )}
    </section>
  );
}
