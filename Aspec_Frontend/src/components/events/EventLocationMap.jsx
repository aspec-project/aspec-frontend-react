import { useEffect, useRef, useState } from "react";
import { circleMarker, map, tileLayer } from "leaflet";
import "leaflet/dist/leaflet.css";
import { hasEventCoordinates } from "../../utils/eventLocation";

export default function EventLocationMap({ latitude, longitude }) {
  const container = useRef(null);
  const [failedCoordinates, setFailedCoordinates] = useState(null);
  const coordinateKey = JSON.stringify([latitude, longitude]);

  useEffect(() => {
    if (!hasEventCoordinates(latitude, longitude)) return;
    let instance;
    let observer;
    let active = true;
    try {
      instance = map(container.current, { scrollWheelZoom: false }).setView([latitude, longitude], 15);
      tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).on("tileerror", () => {
        if (active) setFailedCoordinates(coordinateKey);
      }).addTo(instance);
      circleMarker([latitude, longitude], {
        radius: 9, color: "#0D1F35", fillColor: "#8A7043", fillOpacity: 1, weight: 3,
      }).addTo(instance);
      if (typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(() => instance.invalidateSize());
        observer.observe(container.current);
      }
    } catch {
      queueMicrotask(() => {
        if (active) setFailedCoordinates(coordinateKey);
      });
    }
    return () => {
      active = false;
      observer?.disconnect();
      instance?.remove();
    };
  }, [latitude, longitude, coordinateKey]);

  if (!hasEventCoordinates(latitude, longitude)) return null;

  return (
    <div>
      <div ref={container} role="region" aria-label="Mapa da localização do evento" className="relative isolate z-0 h-52 w-full bg-gray-100" />
      {failedCoordinates === coordinateKey && <p role="status" className="p-4 text-sm text-gray-600">Não foi possível carregar o mapa completo. Pode abrir a localização no Google Maps.</p>}
    </div>
  );
}
