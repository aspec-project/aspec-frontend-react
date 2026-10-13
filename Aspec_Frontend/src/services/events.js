import { api, normalizeError } from "./api";

/*
 * Pesquisa e limite por pedido aguardam confirmação do contrato do backend.
 * As opções só devem ser ativadas depois de essa integração estar disponível.
 */
export function getEventsCapabilities() {
  return {
    search: import.meta.env.VITE_EVENTS_SEARCH_ENABLED === "true",
    perPage: import.meta.env.VITE_EVENTS_PER_PAGE_ENABLED === "true",
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

  const capabilities = getEventsCapabilities();
  const params = { page };

  if (categoryId) params.category_id = categoryId;
  if (locationId) params.location_id = locationId;
  if (capabilities.search && search.trim()) params.search = search.trim();
  if (capabilities.perPage) params.per_page = 10;

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
    pagination.per_page < 1 ||
    pagination.total < 0 ||
    pagination.last_page < 1 ||
    pagination.current_page > pagination.last_page ||
    pagination.last_page !== Math.max(1, Math.ceil(pagination.total / pagination.per_page)) ||
    items.length > pagination.per_page ||
    items.length > pagination.total ||
    (capabilities.perPage && (pagination.per_page > 10 || items.length > 10))
  ) {
    throw new Error("A paginação dos eventos tem um formato inesperado.");
  }

  /*
   * A agenda apresenta apenas a página pedida, na ordem devolvida pela API.
   * Os metadados do backend determinam a navegação entre páginas.
   */
  return { items, pagination };
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

    eventos.push(...resposta.data.items);

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
