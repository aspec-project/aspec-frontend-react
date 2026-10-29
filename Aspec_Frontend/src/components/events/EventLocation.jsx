import { lazy, Suspense } from "react";
import { MapPin } from "lucide-react";
import { getEventMapsUrl, hasEventCoordinates } from "../../utils/eventLocation";
import EventLocationEmbed from "./EventLocationEmbed";

const EventLocationMap = lazy(() => import("./EventLocationMap"));

export default function EventLocation({ event }) {
  if (event.is_online === true) return null;
  const address = typeof event.address === "string" ? event.address.trim() : "";
  const venue = typeof event.venue_name === "string" ? event.venue_name.trim() : "";
  const placeId = typeof event.place_id === "string" ? event.place_id.trim() : "";
  const hasCoordinates = hasEventCoordinates(event.latitude, event.longitude);
  if (!address && !hasCoordinates && !venue && !placeId) return null;

  const query = hasCoordinates ? `${event.latitude},${event.longitude}` : address || venue || placeId;
  const mapsUrl = getEventMapsUrl(query, placeId);

  /*
   * O identificador Google tem prioridade; o Leaflet serve os eventos sem esse campo.
   * A existência de localização não determina o tipo ou a recorrência do evento.
   */
  return (
    <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm" aria-labelledby="event-location">
      {placeId ? <EventLocationEmbed placeId={placeId} /> : hasCoordinates && (
        <Suspense fallback={<p role="status" className="p-6 text-sm text-gray-600">A carregar mapa...</p>}>
          <EventLocationMap latitude={event.latitude} longitude={event.longitude} />
        </Suspense>
      )}
      <div className="flex items-start gap-2 border-t border-gray-100 p-4">
        <MapPin size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-[#8a7043]" />
        <div className="min-w-0">
          <h2 id="event-location" className={venue ? "sr-only" : "text-sm font-medium text-[#0D1F35]"}>Localização do evento</h2>
          {venue && <p className="break-words text-sm font-medium text-[#0D1F35]">{venue}</p>}
          {address && <p className="whitespace-pre-line break-words text-xs leading-5 text-gray-500">{address}</p>}
          {query && <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 rounded text-xs text-[#0D1F35] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315A79]">
            Abrir no Google Maps <span aria-hidden="true">→</span>
          </a>}
        </div>
      </div>
    </section>
  );
}
