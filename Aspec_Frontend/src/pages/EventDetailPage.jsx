import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import EventDetail from "../components/events/EventDetail";
import PageTitle from "../components/PageTitle";
import { getEventDetail, getEventDetailErrorMessage, isEventId } from "../services/events";
import { useAuthStore } from "../store/authStore";
import { validEventSessions } from "../utils/eventSessions";

// A lista é um modelo interno: um futuro adapter terá de confirmar que cada
// id corresponde a uma instância consultável em /events/:id. A rota atual não
// fornece sessões nem lê campos de série presumidos da API.
export default function EventDetailPage({ sessions = null, recurrenceLabel = "" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const sessionGeneration = useAuthStore((state) => state.sessionGeneration);
  const sessionStatus = useAuthStore((state) => state.status);
  const sessionChanging = useAuthStore((state) => state.sessionChanging);
  const user = useAuthStore((state) => state.user);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  const [sessionSummaries, setSessionSummaries] = useState(null);
  const identity = JSON.stringify([sessionGeneration, sessionStatus, sessionChanging, user?.id, user?.role?.name, user?.account_status?.name]);
  const rememberSession = useCallback((event) => {
    // Só metadados do seletor: nenhum URL privado fica guardado entre sessões.
    const summary = Object.fromEntries(["id", "event_date", "event_start_time", "event_end_time", "registration_deadline", "is_registered", "registration_open"].map((field) => [field, event[field]]));
    setSessionSummaries((previous) => ({ identity, items: { ...(previous?.identity === identity ? previous.items : {}), [event.id]: summary } }));
  }, [identity]);
  const refresh = useCallback(() => setAttempt((value) => value + 1), []);
  function selectSession(sessionId) {
    if (sessionId !== id && validEventSessions(sessions) && sessions.some((session) => session.id === sessionId)) {
      navigate(`/eventos/${encodeURIComponent(sessionId)}`);
    }
  }
  const key = JSON.stringify([id, sessionGeneration, sessionStatus, sessionChanging, user?.id, user?.role?.name, user?.account_status?.name, attempt]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      if (controller.signal.aborted || !isEventId(id)) return;
      try {
        const event = await getEventDetail(id, controller.signal);
        if (!controller.signal.aborted) {
          setResult({ key, event });
          if (sessions !== null) rememberSession(event);
        }
      } catch (error) {
        if (!controller.signal.aborted) setResult({ key, notFound: error?.response?.status === 404, error: getEventDetailErrorMessage(error) });
      }
    }
    queueMicrotask(load);
    return () => controller.abort();
  }, [id, key, sessions, rememberSession]);

  /*
   * A identidade, o evento e a tentativa fazem parte do contexto da resposta.
   * Dados anteriores desaparecem antes de o próximo pedido terminar.
   */
  const current = result?.key === key ? result : null;
  if (result !== null && current === null) setResult(null);
  const notFound = !isEventId(id) || current?.notFound;
  if (sessionSummaries !== null && sessionSummaries.identity !== identity) setSessionSummaries(null);
  const currentSessions = Array.isArray(sessions) ? sessions.map((session) => ({ ...session, ...(sessionSummaries?.identity === identity ? sessionSummaries.items[session?.id] : {}) })) : null;

  return (
    <div className="min-h-[65vh] bg-gray-50 text-[#0D1F35]">
      <PageTitle title={notFound ? "Evento não encontrado" : current?.event?.name || "Detalhe do evento"} />
      <nav
        aria-label="Navegação do evento"
        className="bg-[#0d1f35]"
      >
        <div className="mx-auto max-w-7xl px-6 py-4">
          <Link
            to="/eventos"
            className="inline-flex items-center gap-2 rounded text-sm font-medium text-white/75 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Voltar à agenda
          </Link>
        </div>
      </nav>
      {notFound ? (
        <div className="mx-auto max-w-7xl px-6 py-16">
          <h1 className="text-2xl font-medium">Evento não encontrado</h1>
          <p role="status" className="mt-4 text-gray-600">O evento solicitado não está disponível.</p>
        </div>
      ) : !current ? (
        <p role="status" className="px-6 py-16 text-center text-gray-600">A carregar evento...</p>
      ) : current.error ? (
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
            <h1 className="text-xl font-medium">Detalhe do evento</h1>
            <p role="alert" className="mt-3">{current.error}</p>
            <button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-700">Tentar novamente</button>
          </div>
        </div>
      ) : <EventDetail key={key} event={current.event} sessions={currentSessions} recurrenceLabel={recurrenceLabel} onSelectSession={selectSession} onRefresh={refresh} onEventUpdate={(event) => {
        setResult((previous) => previous?.key === key ? { ...previous, event } : previous);
        if (sessions !== null) rememberSession(event);
      }} />}
    </div>
  );
}
