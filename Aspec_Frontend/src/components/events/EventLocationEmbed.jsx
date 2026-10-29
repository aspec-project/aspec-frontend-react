export default function EventLocationEmbed({ placeId }) {
  const key = import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY;
  if (typeof key !== "string" || !key.trim()) {
    return <p role="status" className="p-4 text-sm text-gray-600">O mapa está indisponível. Pode abrir a localização no Google Maps.</p>;
  }

  const src = `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key.trim())}&q=${encodeURIComponent(`place_id:${placeId}`)}`;

  return (
    <iframe
      title="Mapa da localização do evento"
      src={src}
      className="block h-52 w-full border-0 bg-gray-100"
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
    />
  );
}
