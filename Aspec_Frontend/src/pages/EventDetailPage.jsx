import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import EventDetail from "../components/events/EventDetail";
import { getEventDetail, getEventDetailErrorMessage, isEventId } from "../services/events";
import { useAuthStore } from "../store/authStore";

export default function EventDetailPage() {
  const { id } = useParams();
  const sessionGeneration = useAuthStore((state) => state.sessionGeneration);
  const sessionStatus = useAuthStore((state) => state.status);
  const sessionChanging = useAuthStore((state) => state.sessionChanging);
  const user = useAuthStore((state) => state.user);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  const key = JSON.stringify([id, sessionGeneration, sessionStatus, sessionChanging, user?.id, user?.role?.name, user?.account_status?.name, attempt]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      if (controller.signal.aborted || !isEventId(id)) return;
      try {
        const event = await getEventDetail(id, controller.signal);
        if (!controller.signal.aborted) setResult({ key, event });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ key, notFound: error?.response?.status === 404, error: getEventDetailErrorMessage(error) });
      }
    }
    queueMicrotask(load);
    return () => controller.abort();
  }, [id, key]);

  /*
   * A identidade, o evento e a tentativa fazem parte do contexto da resposta.
   * Dados anteriores desaparecem antes de o próximo pedido terminar.
   */
  const current = result?.key === key ? result : null;
  if (result !== null && current === null) setResult(null);
  const notFound = !isEventId(id) || current?.notFound;

  return (
    <div className="min-h-[65vh] bg-gray-50 text-[#0D1F35]">
      <nav aria-label="Navegação do evento" className="bg-[#0D1F35]">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <Link to="/eventos" className="inline-flex items-center gap-2 rounded text-sm text-white/80 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
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
      ) : <EventDetail key={key} event={current.event} onEventUpdate={(event) => setResult((previous) => previous?.key === key ? { ...previous, event } : previous)} />}
    </div>
  );
}
