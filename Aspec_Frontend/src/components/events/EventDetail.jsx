import { CalendarDays, CalendarClock, Clock, Info, MapPin, Users, Video } from "lucide-react";
import { formatDate, formatRegistrationDeadline, formatTime } from "../../utils/eventFormatting";
import EventLocation from "./EventLocation";
import EventRegistrantsModal from "./EventRegistrantsModal";
import EventRegistrationCard from "./EventRegistrationCard";
import EventOnlineAccess from "./EventOnlineAccess";
import EventTypeBadges from "./EventTypeBadges";
import EventSessions from "./EventSessions";

function HeaderInformation({ icon: Icon, label, children }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <Icon size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-[#C3A572]" />
      <dt className="sr-only">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

export default function EventDetail({ event, onEventUpdate, onRefresh, sessions = null, recurrenceLabel = "", onSelectSession }) {
  const recurring = Array.isArray(sessions);
  const selectedSession = recurring ? sessions.findIndex((session) => session?.id === event.id) : -1;
  const dates = recurring ? sessions.map((session) => session?.event_date).filter((date) => formatDate(date) !== "Data por confirmar").sort() : [];
  const dateLabel = dates.length > 1 ? `${formatDate(dates[0])} — ${formatDate(dates[dates.length - 1])}` : formatDate(event.event_date);
  const startTime = formatTime(event.event_start_time);
  const endTime = formatTime(event.event_end_time);
  const deadline = formatRegistrationDeadline(event.registration_deadline);
  const available = event.available_spots;
  const fewSpots = available > 0 && event.max_attendees > 0 && available <= event.max_attendees * 0.2;
  const hasOccupancy = event.max_attendees > 0 && event.registrations_count !== null;
  const occupancy = hasOccupancy ? Math.min(100, Math.round(event.registrations_count / event.max_attendees * 100)) : null;

  return (
    <article>
      <header className="bg-[linear-gradient(135deg,#0d1f35,#060f1a)] pb-12 pt-8">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-wrap items-center gap-2">
          <span className="inline-block max-w-full break-words rounded-full border border-[#8A7043]/30 bg-[#8A7043]/20 px-2.5 py-1 text-xs font-semibold text-[#C3A572]">
            {event.category.name || "Evento"}
          </span>
          <EventTypeBadges isOnline={event.is_online} recurring={recurring} dark />
          </div>
          <h1 className="mt-4 max-w-4xl break-words text-2xl font-semibold leading-snug text-white">{event.name}</h1>
          {recurring && recurrenceLabel && <p className="mt-3 break-words text-sm text-[#b89d6e]">{recurrenceLabel}</p>}
          <dl className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/80">
            <HeaderInformation icon={CalendarDays} label="Data">{dateLabel}</HeaderInformation>
            <HeaderInformation icon={Clock} label="Horário">{startTime ? `${startTime}${endTime ? ` – ${endTime}` : ""}` : endTime ? `Hora de fim: ${endTime}` : "Horário por confirmar"}</HeaderInformation>
            {event.is_online === true ? <HeaderInformation icon={Video} label="Modalidade">Evento online</HeaderInformation> : <HeaderInformation icon={MapPin} label="Localização">{event.venue_name || event.location.name || "Localização por confirmar"}</HeaderInformation>}
            {deadline && <HeaderInformation icon={CalendarClock} label="Data limite de inscrição">Inscrições até <time dateTime={event.registration_deadline}>{deadline}</time></HeaderInformation>}
          </dl>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          {event.is_online === true ? <EventOnlineAccess key={`${event.id}:${event.registration_deadline}`} event={event} onRefresh={onRefresh} /> : <EventLocation event={event} />}
          {recurring && <EventSessions sessions={sessions.map((session) => session?.id === event.id ? { ...session, ...event } : session)} selectedId={event.id} onSelect={onSelectSession} recurrenceLabel={recurrenceLabel} />}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="event-description">
            <h2 id="event-description" className="text-base font-semibold">Sobre o evento</h2>
            <p className="mt-4 whitespace-pre-line break-words text-sm leading-6 text-gray-600">{event.description || "Descrição não disponível."}</p>
          </section>
          <section className="flex items-start gap-3 rounded-xl border border-[#D8C698] bg-[#F6F3EA] p-5" aria-labelledby="event-notes">
            <Info size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-[#8A7043]" />
            <div className="min-w-0">
              <h2 id="event-notes" className="text-sm font-semibold text-[#796038]">Notas do organizador</h2>
              <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-gray-600">{event.organizer_notes || "Sem notas adicionais."}</p>
            </div>
          </section>
        </div>
        <div className="min-w-0 space-y-6 self-start">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm" aria-labelledby="event-capacity">
          <h2 id="event-capacity" className="text-base font-semibold">Lotação do Evento{selectedSession >= 0 ? ` — sessão ${selectedSession + 1}` : ""}</h2>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="inline-flex items-center gap-1.5 text-gray-500"><Users size={15} aria-hidden="true" /> Vagas preenchidas</p>
            <p className="font-semibold">{event.registrations_count ?? "Por confirmar"} / {event.max_attendees ?? "Por confirmar"}</p>
          </div>
          {hasOccupancy ? (
            <div role="progressbar" aria-label="Ocupação do evento" aria-valuemin={0} aria-valuemax={100} aria-valuenow={occupancy} aria-valuetext={`${occupancy}% de ocupação`} className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-[#8A7043]" style={{ width: `${occupancy}%` }} />
            </div>
          ) : event.max_attendees === null || event.registrations_count === null ? (
            <p className="mt-2 text-xs text-gray-500">{event.max_attendees === null ? "Lotação por confirmar" : "Ocupação por confirmar"}</p>
          ) : null}
          <p className={`mt-3 text-xs ${fewSpots ? "font-medium text-red-700" : "text-gray-600"}`}>
            {available === null ? "Vagas por confirmar" : available === 0 ? "Evento lotado" : `${fewSpots ? "Apenas " : ""}${available} ${available === 1 ? "vaga disponível" : "vagas disponíveis"}${fewSpots ? "!" : ""}`}
          </p>
          <EventRegistrantsModal event={event} />
          {deadline && (
            <p className="mt-4 flex items-start gap-2 border-t border-gray-100 pt-4 text-xs leading-5 text-gray-500">
              <CalendarClock size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-[#8A7043]" />
              <span>Data limite de inscrição: <time dateTime={event.registration_deadline} className="font-medium text-[#0D1F35]">{deadline}</time></span>
            </p>
          )}
        </section>
        <EventRegistrationCard key={event.id} event={event} onEventUpdate={onEventUpdate} />
        </div>
      </div>
    </article>
  );
}
