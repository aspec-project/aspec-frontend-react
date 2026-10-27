import { AxiosError, CanceledError } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../src/services/api.js";
import { getEvents, getEventsCapabilities, getEventsPage } from "../../src/services/events.js";

function respostaApi(data, config, status = 200) {
  return { data, config, status, statusText: "", headers: {} };
}

function respostaPagina(items = [], pagination = {}) {
  return {
    success: true,
    data: {
      items,
      pagination: {
        current_page: 1,
        per_page: 9,
        total: items.length,
        last_page: 1,
        ...pagination,
      },
    },
  };
}

function simularResposta(data) {
  const adapter = vi.fn((config) => Promise.resolve(respostaApi(data, config)));
  api.defaults.adapter = adapter;
  return adapter;
}

describe("getEventsPage", () => {
  let adapterOriginal;

  beforeEach(() => {
    adapterOriginal = api.defaults.adapter;
    vi.stubEnv("VITE_EVENTS_SEARCH_ENABLED", "false");
  });

  afterEach(() => {
    api.defaults.adapter = adapterOriginal;
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("pede apenas a página atual e preserva todos os eventos e os metadados recebidos", async () => {
    const items = [
      { id: "distante", name: "Evento distante", event_date: "2030-12-20" },
      { id: "passado", name: "Evento passado", event_date: "2020-01-01" },
      { id: "primeiro", name: "Primeiro evento", event_date: "2030-01-02" },
      { id: "primeiro", name: "Registo repetido recebido da API" },
      { id: "quinto", name: "Quinto evento" },
    ];
    const resposta = respostaPagina(items, { current_page: 2, total: 27, last_page: 3 });
    const adapter = simularResposta(resposta);
    const controller = new AbortController();

    const pagina = await getEventsPage(
      { categoryId: "categoria-a", locationId: "distrito-b", page: 2 },
      controller.signal
    );

    expect(pagina).toEqual(resposta.data);
    expect(adapter).toHaveBeenCalledTimes(1);
    const config = adapter.mock.calls[0][0];
    expect(config.url).toBe("/events");
    expect(config.method).toBe("get");
    expect(config.params).toEqual({ category_id: "categoria-a", location_id: "distrito-b", page: 2, per_page: 9 });
    expect(config.baseURL).toBe(api.defaults.baseURL);
    expect(config.withCredentials).toBe(true);
    expect(config.withXSRFToken).toBe(true);
    expect(config.signal).toBe(controller.signal);
  });

  it("descarta o URL privado em todas as listagens, mesmo quando a API o devolve", async () => {
    const item = { id: "evento-online", name: "Evento online", is_online: true, online_url: "https://private.example.test/event", location: { name: "Lisboa" }, address: "Rua", venue_name: "Auditório", latitude: 38, longitude: -9 };
    simularResposta(respostaPagina([item]));
    const page = await getEventsPage();
    const all = await getEvents();
    for (const result of [page.items[0], all[0]]) {
      expect(result).toEqual({ id: item.id, name: item.name, is_online: true });
    }
    expect(item.online_url).toBe("https://private.example.test/event");
  });

  it.each([undefined, "true", 1, false])("não infere modalidade a partir de URL ou localização: %s", async (is_online) => {
    simularResposta(respostaPagina([{ id: "evento", name: "Evento", is_online, location: { name: "Lisboa" }, online_url: "https://private.example.test/event" }]));
    expect((await getEventsPage()).items[0]).toEqual({ id: "evento", name: "Evento", is_online: is_online === false ? false : null, location: { name: "Lisboa" } });
  });

  it.each([
    [{}, { page: 1, per_page: 9 }],
    [{ categoryId: "", locationId: "", page: 1 }, { page: 1, per_page: 9 }],
    [{ categoryId: "categoria-a", page: 1 }, { category_id: "categoria-a", page: 1, per_page: 9 }],
    [{ locationId: "distrito-b", page: 1 }, { location_id: "distrito-b", page: 1, per_page: 9 }],
  ])("omite filtros vazios sem inventar parâmetros para %j", async (filtros, params) => {
    const adapter = simularResposta(respostaPagina());

    await getEventsPage(filtros);

    expect(adapter).toHaveBeenCalledTimes(1);
    expect(adapter.mock.calls[0][0].params).toEqual(params);
  });

  it.each([0, -1, 1.5, "2", NaN])("rejeita uma página inválida antes do pedido: %s", async (page) => {
    const adapter = simularResposta(respostaPagina());

    await expect(getEventsPage({ page })).rejects.toThrow("A página dos eventos deve ser um número inteiro positivo.");

    expect(adapter).not.toHaveBeenCalled();
  });

  it.each([
    { categoryId: ["categoria-a"] },
    { categoryId: { id: "categoria-a" } },
    { locationId: 4 },
    { locationId: ["distrito-b"] },
  ])("rejeita filtros inválidos antes do pedido: %j", async (filtros) => {
    const adapter = simularResposta(respostaPagina());

    await expect(getEventsPage(filtros)).rejects.toThrow("Os filtros dos eventos têm um formato inválido.");

    expect(adapter).not.toHaveBeenCalled();
  });

  it.each([
    null,
    { success: false, data: { items: [] } },
    { success: true, data: { items: null } },
    respostaPagina([{ id: "", name: "Nome sem identificador" }]),
    respostaPagina([{ id: "evento-a", name: "" }]),
  ])("não converte uma resposta inválida numa página vazia: %j", async (resposta) => {
    simularResposta(resposta);

    await expect(getEventsPage()).rejects.toThrow("A resposta dos eventos tem um formato inesperado.");
  });

  it.each([
    { current_page: 0 },
    { current_page: 2 },
    { per_page: 0 },
    { total: -1 },
    { total: 1.5 },
    { last_page: 0 },
    { total: 20, last_page: 1 },
  ])("rejeita metadados de paginação inválidos: %j", async (pagination) => {
    const adapter = simularResposta(respostaPagina([], pagination));

    await expect(getEventsPage()).rejects.toThrow("A paginação dos eventos tem um formato inesperado.");

    expect(adapter).toHaveBeenCalledTimes(1);
  });

  it("ativa a pesquisa do contrato atual sem depender da antiga flag", async () => {
    const items = Array.from({ length: 9 }, (_, index) => ({ id: String(index), name: `Evento ${index}` }));
    const adapter = simularResposta(respostaPagina(items));
    expect(getEventsCapabilities()).toEqual({ search: true });
    expect((await getEventsPage({ search: "conferencia" })).items).toHaveLength(9);
    expect(adapter.mock.calls[0][0].params).toEqual({ page: 1, per_page: 9, search: "conferencia" });
  });

  it("combina a pesquisa com os filtros e pede nove resultados quando o contrato está ativado", async () => {
    vi.stubEnv("VITE_EVENTS_SEARCH_ENABLED", "true");
    const adapter = simularResposta(respostaPagina([], { current_page: 2, total: 25, last_page: 3 }));

    expect(getEventsCapabilities()).toEqual({ search: true });
    await getEventsPage({ search: "conferência", categoryId: "categoria-a", locationId: "distrito-b", page: 2 });

    expect(adapter).toHaveBeenCalledTimes(1);
    expect(adapter.mock.calls[0][0].params).toEqual({ search: "conferência", category_id: "categoria-a", location_id: "distrito-b", page: 2, per_page: 9 });
  });

  it("omite uma pesquisa vazia mesmo com o contrato ativado", async () => {
    vi.stubEnv("VITE_EVENTS_SEARCH_ENABLED", "true");
    const adapter = simularResposta(respostaPagina());

    await getEventsPage({ search: "   " });

    expect(adapter.mock.calls[0][0].params).toEqual({ page: 1, per_page: 9 });
  });

  it.each([null, 12, ["evento"], { text: "evento" }])("rejeita uma pesquisa com formato inválido: %j", async (search) => {
    vi.stubEnv("VITE_EVENTS_SEARCH_ENABLED", "true");
    const adapter = simularResposta(respostaPagina());

    await expect(getEventsPage({ search })).rejects.toThrow();

    expect(adapter).not.toHaveBeenCalled();
  });

  it.each([10, 15])("não corta silenciosamente uma página de %s resultados quando o limite nove está ativado", async (quantidade) => {
    const items = Array.from({ length: quantidade }, (_, index) => ({ id: String(index), name: `Evento ${index}` }));
    const adapter = simularResposta(respostaPagina(items, { per_page: quantidade }));

    await expect(getEventsPage()).rejects.toThrow();

    expect(adapter).toHaveBeenCalledTimes(1);
    expect(adapter.mock.calls[0][0].params).toEqual({ page: 1, per_page: 9 });
  });

  it("rejeita metadados que ignoram per_page mesmo quando chegam menos de nove eventos", async () => {
    simularResposta(respostaPagina([{ id: "1", name: "Evento" }], { per_page: 15 }));

    await expect(getEventsPage()).rejects.toThrow();
  });

  it("não mascara o 404 como uma página vazia", async () => {
    const adapter = vi.fn((config) => Promise.reject(new AxiosError(
      "HTTP 404", AxiosError.ERR_BAD_RESPONSE, config, undefined, respostaApi({}, config, 404)
    )));
    api.defaults.adapter = adapter;

    await expect(getEventsPage()).rejects.toMatchObject({ response: { status: 404 } });

    expect(adapter).toHaveBeenCalledTimes(1);
  });

  it("cancela o pedido pendente sem iniciar outras páginas", async () => {
    const controller = new AbortController();
    const adapter = vi.fn((config) => new Promise((_, reject) => {
      config.signal.addEventListener("abort", () => {
        reject(new CanceledError("Pedido cancelado", config));
      }, { once: true });
    }));
    api.defaults.adapter = adapter;

    const pedido = getEventsPage({ page: 1 }, controller.signal);
    const resultado = expect(pedido).rejects.toMatchObject({ code: AxiosError.ERR_CANCELED });
    controller.abort();
    await resultado;

    expect(adapter).toHaveBeenCalledTimes(1);
  });
});
