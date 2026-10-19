import { lazy, Suspense } from "react";
import { ExternalLink } from "lucide-react";
import { hasEventCoordinates } from "../../utils/eventLocation";

const EventLocationMap = lazy(() => import("./EventLocationMap"));

export default function EventLocation({ event }) {
  const address = typeof event.address === "string" ? event.address.trim() : "";
  const hasCoordinates = hasEventCoordinates(event.latitude, event.longitude);
  if (!address && !hasCoordinates) return null;

  const query = hasCoordinates ? `${event.latitude},${event.longitude}` : address;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  /* A existência de localização não determina o tipo ou a recorrência do evento. */
  return (
    <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm" aria-labelledby="event-location">
      {hasCoordinates && (
        <Suspense fallback={<p role="status" className="p-6 text-sm text-gray-600">A carregar mapa...</p>}>
          <EventLocationMap latitude={event.latitude} longitude={event.longitude} />
        </Suspense>
      )}
      <div className="p-6">
        <h2 id="event-location" className="text-base font-semibold">Localização do evento</h2>
        {address && <p className="mt-4 whitespace-pre-line break-words text-sm leading-7 text-gray-600">{address}</p>}
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#0D1F35] px-4 py-2 text-sm font-semibold text-white hover:bg-[#183650] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315A79]">
          Abrir no Google Maps <ExternalLink size={16} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
