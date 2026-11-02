export function hasEventCoordinates(latitude, longitude) {
  return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
    Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

export function getEventMapsUrl(query, placeId = "") {
  if (!query) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` +
    (placeId ? `&query_place_id=${encodeURIComponent(placeId)}` : "");
}
