import { api } from "./api";

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
