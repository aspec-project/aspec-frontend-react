import { useId } from "react";
import { CheckCircle, Repeat } from "lucide-react";
import { formatDate, formatRegistrationDeadline, formatTime } from "../../utils/eventFormatting";
import { validEventSessions } from "../../utils/eventSessions";

function sessionDate(value) {
  const date = formatDate(value);
  if (date === "Data por confirmar") return date;
  const weekday = new Intl.DateTimeFormat("pt-PT", { weekday: "long" }).format(new Date(`${value}T12:00:00`));
  return `${weekday[0].toUpperCase()}${weekday.slice(1)}, ${date}`;
}

function SessionBadge({ session }) {
  if (session.is_registered === true) {
    return <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#e6f2ea] px-2.5 py-1 text-xs text-[#2f6b47]"><CheckCircle size={11} aria-hidden="true" />Inscrito</span>;
  }
  if (session.registration_open === true) {
    return <span className="shrink-0 rounded-full bg-[#f5f2e8] px-2.5 py-1 text-xs text-[#6b5427]">Abertas</span>;
  }
  return <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-500">{session.registration_open === false ? "Encerradas" : "Por confirmar"}</span>;
}

export default function EventSessions({ sessions = null, selectedId = null, onSelect, recurrenceLabel = "", status, error, onRetry }) {
  const headingId = useId();
  const state = status ?? (sessions === null ? "unavailable" : "ready");
  const valid = validEventSessions(sessions);
  const failed = state === "error" || (state === "ready" && !valid);
  const ready = state === "ready" && valid && sessions.length > 0;
  const label = typeof recurrenceLabel === "string" ? recurrenceLabel.trim() : "";

  return (
    <section aria-labelledby={headingId} aria-busy={state === "loading"} className="min-w-0 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        <Repeat size={16} aria-hidden="true" className="shrink-0 text-[#8a7043]" />
        <h2 id={headingId} className="text-lg font-medium text-[#0d1f35]">Sessões</h2>
      </div>
      <p className="mb-4 break-words text-xs text-gray-500">{label && `${label.replace(/[.]$/, "")}. `}Selecione uma sessão para ver a lotação e inscrever-se.</p>
      {state === "loading" ? <p role="status" className="text-sm text-gray-500">A carregar sessões...</p> : failed ? (
        <div>
          <p role="alert" className="text-sm text-red-700">{error ? "Não foi possível carregar as sessões. Tente novamente." : "A informação das sessões não está disponível. Tente novamente."}</p>
          {typeof onRetry === "function" && <button type="button" onClick={onRetry} className="mt-3 rounded-lg border border-[#d4d8e3] px-3 py-2 text-xs font-medium text-[#0d1f35] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a7043]">Tentar novamente</button>}
        </div>
      ) : ready ? (
        <ol className="-mx-3 divide-y divide-[#eceae4]">
          {sessions.map((session, index) => {
            const active = session.id === selectedId;
            const start = formatTime(session.event_start_time);
            const end = formatTime(session.event_end_time);
            const time = start && end ? `${start} — ${end}` : start || (end ? `Fim: ${end}` : "Horário por confirmar");
            const deadline = formatRegistrationDeadline(session.registration_deadline);
            return (
              <li key={session.id}>
                <button type="button" aria-pressed={active} disabled={typeof onSelect !== "function"} onClick={() => onSelect?.(session.id)} className={`flex w-full flex-wrap items-center justify-between gap-3 rounded-lg px-3 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a7043] disabled:cursor-not-allowed disabled:opacity-60 ${active ? "bg-[#f5f3ee]" : "bg-transparent"}`}>
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    <span aria-hidden="true" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-medium ${active ? "bg-[#0d1f35] text-white" : "bg-[#f5f3ee] text-[#0d1f35]"}`}>{index + 1}</span>
                    <span className="min-w-0 break-words">
                      <span className="block text-sm font-medium text-[#0d1f35]">{sessionDate(session.event_date)}</span>
                      <span className="block text-xs text-gray-500">{time} · {deadline ? `inscrições até ${deadline}` : "Prazo de inscrição por confirmar"}</span>
                    </span>
                  </span>
                  <SessionBadge session={session} />
                </button>
              </li>
            );
          })}
        </ol>
      ) : <p role="status" className="text-sm text-gray-500">{state === "empty" || (state === "ready" && valid && sessions.length === 0) ? "Ainda não existem sessões disponíveis." : "As sessões ainda não estão disponíveis para consulta."}</p>}
    </section>
  );
}
