import { api, normalizeError } from "./api";
import { useAuthStore } from "../store/authStore";
import { getOnlineMeetingUrl } from "../utils/eventAccess";

function publicEventItem(item) {
  const result = { ...item };
  delete result.online_url;
  if (Object.hasOwn(result, "is_online")) {
    result.is_online = typeof result.is_online === "boolean" ? result.is_online : null;
  }
  if (result.is_online === true) {
    for (const field of ["location", "venue_name", "address", "latitude", "longitude"]) delete result[field];
  }
  return result;
}

export const isEventId = (value) => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export async function getEventDetail(id, signal) {
  if (!isEventId(id)) throw new Error("O identificador do evento é inválido.");

  const viewer = useAuthStore.getState();
  const response = await api.get(`/events/${encodeURIComponent(id)}`, { signal });
  const event = response.data?.data;
  if (response.data?.success !== true || event?.id !== id || typeof event.name !== "string" || !event.name.trim()) {
    throw new Error("A resposta do evento tem um formato inesperado.");
  }

  const text = (value) => typeof value === "string" ? value.trim() : "";
  const count = (value) => Number.isSafeInteger(value) && value >= 0 ? value : null;
  const coordinate = (value, limit) => typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit ? value : null;
  const currentViewer = useAuthStore.getState();
  const sameViewer = viewer.sessionGeneration === currentViewer.sessionGeneration &&
    viewer.user?.id === currentViewer.user?.id && viewer.status === currentViewer.status &&
    viewer.user?.role?.name === currentViewer.user?.role?.name &&
    viewer.user?.account_status?.name === currentViewer.user?.account_status?.name &&
    !viewer.sessionChanging;
  const onlineUrl = sameViewer ? getOnlineMeetingUrl(event, currentViewer) : "";
  const online = event.is_online === true;

  /*
   * A modalidade ausente mantém-se desconhecida, sem inferir pelo local ou URL.
   * O URL privado só é conservado para a mesma sessão autorizada do pedido.
   */
  return {
    id: event.id,
    name: event.name.trim(),
    is_online: typeof event.is_online === "boolean" ? event.is_online : null,
    description: text(event.description),
    event_date: text(event.event_date),
    event_start_time: text(event.event_start_time),
    event_end_time: text(event.event_end_time),
    registration_deadline: text(event.registration_deadline),
    is_registered: typeof event.is_registered === "boolean" ? event.is_registered : null,
    registration_open: typeof event.registration_open === "boolean" ? event.registration_open : null,
    category: { name: text(event.category?.name), color: text(event.category?.color) },
    location: { name: online ? "" : text(event.location?.name) },
    organizer_notes: text(event.organizer_notes),
    venue_name: online ? "" : text(event.venue_name),
    address: online ? "" : text(event.address),
    latitude: online ? null : coordinate(event.latitude, 90),
    longitude: online ? null : coordinate(event.longitude, 180),
    max_attendees: count(event.max_attendees),
    registrations_count: count(event.registrations_count),
    available_spots: count(event.available_spots),
    ...(onlineUrl ? { online_url: onlineUrl } : {}),
  };
}

export function getEventDetailErrorMessage(error) {
  if (error?.response?.status === 403) return "Não tem permissão para consultar este evento.";
  if ([419, 429].includes(error?.response?.status)) {
    return normalizeError({ response: { status: error.response.status } }).message;
  }
  return "Não foi possível carregar o evento. Tente novamente.";
}

/*
 * O contrato atual da agenda suporta pesquisa textual no servidor.
 */
export function getEventsCapabilities() {
  return {
    search: true,
  };
}

export function getEventsErrorMessage(error) {
  const status = error?.response?.status;

  /*
   * Não apresenta detalhes internos da API nas páginas públicas.
   * Sessão expirada e limite de pedidos reutilizam as mensagens comuns.
   */
  if (status === 419 || status === 429) {
    return normalizeError({ response: { status } }).message;
  }

  return "Não foi possível carregar os eventos. Tente novamente.";
}

export async function getEventsPage(
  { categoryId = "", locationId = "", search = "", page = 1 } = {},
  signal
) {
  if (!Number.isInteger(page) || page < 1) {
    throw new Error("A página dos eventos deve ser um número inteiro positivo.");
  }

  if (
    typeof categoryId !== "string" ||
    typeof locationId !== "string" ||
    typeof search !== "string"
  ) {
    throw new Error("Os filtros dos eventos têm um formato inválido.");
  }

  const params = { page, per_page: 9 };

  if (categoryId) params.category_id = categoryId;
  if (locationId) params.location_id = locationId;
  if (search.trim()) params.search = search.trim();

  const response = await api.get("/events", { params, signal });
  const resposta = response.data;
  const items = resposta?.data?.items;

  if (
    resposta?.success !== true ||
    !Array.isArray(items) ||
    items.some(
      (item) =>
        typeof item?.id !== "string" ||
        !item.id.trim() ||
        typeof item.name !== "string" ||
        !item.name.trim()
    )
  ) {
    throw new Error("A resposta dos eventos tem um formato inesperado.");
  }

  const pagination = resposta.data.pagination;

  if (
    !pagination ||
    !Number.isInteger(pagination.current_page) ||
    !Number.isInteger(pagination.per_page) ||
    !Number.isInteger(pagination.total) ||
    !Number.isInteger(pagination.last_page) ||
    pagination.current_page !== page ||
    pagination.per_page !== 9 ||
    pagination.total < 0 ||
    pagination.last_page < 1 ||
    pagination.current_page > pagination.last_page ||
    pagination.last_page !== Math.max(1, Math.ceil(pagination.total / pagination.per_page)) ||
    items.length > pagination.per_page ||
    items.length > pagination.total
  ) {
    throw new Error("A paginação dos eventos tem um formato inesperado.");
  }

  /*
   * A agenda apresenta apenas a página pedida, na ordem devolvida pela API.
   * Os metadados do backend determinam a navegação entre páginas.
   */
  return { items: items.map(publicEventItem), pagination };
}

export async function getEvents(signal) {
  const eventos = [];
  let pagina = 1;
  let ultimaPagina = 1;

  /*
   * Percorre a paginação para selecionar os três eventos
   * mais próximos entre todos os resultados da agenda.
   */
  do {
    const response = await api.get("/events", {
      params: { page: pagina },
      signal,
    });
    const resposta = response.data;

    if (
      resposta?.success !== true ||
      !Array.isArray(resposta.data?.items)
    ) {
      throw new Error(
        "A resposta dos eventos tem um formato inesperado."
      );
    }

    eventos.push(...resposta.data.items.map(publicEventItem));

    ultimaPagina = Number(
      resposta.data.pagination?.last_page ?? 1
    );

    if (!Number.isInteger(ultimaPagina) || ultimaPagina < 1) {
      throw new Error(
        "A paginação dos eventos tem um formato inesperado."
      );
    }

    pagina += 1;
  } while (pagina <= ultimaPagina);

  /*
   * Evita repetir cards caso existam IDs duplicados nas páginas.
   */
  return Array.from(
    new Map(eventos.map((evento) => [evento.id, evento])).values()
  );
}
