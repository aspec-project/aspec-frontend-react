import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, CanceledError } from "axios";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import UpcomingEvents from "../../../src/components/home/UpcomingEvents.jsx";
import { api } from "../../../src/services/api.js";

function criarEvento(id, name, data, hora, color = "#123456") {
  return {
    id,
    name,
    event_date: data,
    event_start_time: hora,
    event_end_time: "13:00:00",
    category: { name: `Tipo ${id}`, color },
    location: { name: "Lisboa" },
    available_spots: 5,
    registration_open: true,
  };
}

function respostaEventos(items, ultimaPagina = 1) {
  return {
    success: true,
    data: {
      items,
      pagination: { last_page: ultimaPagina },
    },
  };
}

function respostaApi(data, config, status = 200) {
  return { data, config, status, statusText: "", headers: {} };
}

function erroHttp(config, status, data = {}) {
  return new AxiosError(
    `Pedido falhou com HTTP ${status}`,
    AxiosError.ERR_BAD_RESPONSE,
    config,
    undefined,
    respostaApi(data, config, status)
  );
}

function simularResposta(data) {
  const adapter = vi.fn((config) => Promise.resolve(respostaApi(data, config)));
  api.defaults.adapter = adapter;
  return adapter;
}

function simularErro(status, data) {
  api.defaults.adapter = vi.fn((config) => Promise.reject(erroHttp(config, status, data)));
}

function mostrarAgenda() {
  return render(
    <MemoryRouter>
      <UpcomingEvents />
    </MemoryRouter>
  );
}

describe("UpcomingEvents", () => {
  let adapterOriginal;

  beforeEach(() => {
    adapterOriginal = api.defaults.adapter;
    vi.stubEnv("VITE_EVENTS_SEARCH_ENABLED", "false");
    vi.stubEnv("VITE_EVENTS_PER_PAGE_ENABLED", "false");
    vi.spyOn(Date, "now").mockReturnValue(
      new Date("2030-10-07T10:00:00").getTime()
    );
  });

  afterEach(() => {
    cleanup();
    api.defaults.adapter = adapterOriginal;
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("mostra os três eventos futuros mais próximos, sem duplicar eventos entre páginas", async () => {
    const primeiro = criarEvento("primeiro", "Encontro de manhã", "2030-10-07", "11:00:00");
    const segundo = criarEvento("segundo", "Encontro ao almoço", "2030-10-07", "12:00:00", "#abcdef");
    const terceiro = criarEvento("terceiro", "Encontro de amanhã", "2030-10-08", "09:00:00");
    const distante = criarEvento("distante", "Encontro distante", "2030-10-09", "09:00:00");
    const passado = criarEvento("passado", "Encontro passado", "2030-10-07", "08:00:00");
    const iniciado = criarEvento("iniciado", "Encontro a começar", "2030-10-07", "10:00:00");
    const adapter = vi.fn()
      .mockImplementationOnce((config) => Promise.resolve(
        respostaApi(respostaEventos([distante, terceiro, passado, primeiro], 2), config)
      ))
      .mockImplementationOnce((config) => Promise.resolve(
        respostaApi(respostaEventos([segundo, iniciado, primeiro], 2), config)
      ));
    api.defaults.adapter = adapter;

    mostrarAgenda();

    await screen.findByRole("heading", { name: primeiro.name });
    expect(screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent))
      .toEqual([primeiro.name, segundo.name, terceiro.name]);
    expect(screen.queryByText(distante.name)).not.toBeInTheDocument();
    expect(screen.queryByText(passado.name)).not.toBeInTheDocument();
    expect(screen.queryByText(iniciado.name)).not.toBeInTheDocument();
    expect(adapter).toHaveBeenCalledTimes(2);

    adapter.mock.calls.forEach(([config], index) => {
      expect(config.url).toBe("/events");
      expect(config.params).toEqual({ page: index + 1 });
      expect(config.baseURL).toBe(api.defaults.baseURL);
      expect(config.withCredentials).toBe(true);
      expect(config.withXSRFToken).toBe(true);
      expect(config.signal).toBeInstanceOf(AbortSignal);
      expect(config.signal.aborted).toBe(false);
    });

    const primeiroCard = screen.getByRole("heading", { name: primeiro.name }).closest("article");
    expect(within(primeiroCard).getByText("Tipo primeiro"))
      .toHaveStyle({ backgroundColor: "rgb(18, 52, 86)" });
    expect(within(primeiroCard).getByText("7 de outubro de 2030"))
      .toBeInTheDocument();
    expect(within(primeiroCard).getByText("11:00 – 13:00"))
      .toBeInTheDocument();
    expect(within(primeiroCard).getByRole("link", { name: `Ver evento: ${primeiro.name}` }))
      .toHaveAttribute("href", "/eventos/primeiro");
    expect(screen.getByText("Tipo segundo"))
      .toHaveStyle({ backgroundColor: "rgb(171, 205, 239)" });
    expect(screen.getByRole("link", { name: "Ver todos" }))
      .toHaveAttribute("href", "/eventos");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each([
    ["uma resposta válida sem eventos", []],
    ["uma resposta só com eventos passados", [
      criarEvento("passado", "Encontro passado", "2030-10-06", "11:00:00"),
    ]],
  ])("mostra a mensagem vazia para %s", async (_, items) => {
    simularResposta(respostaEventos(items));

    mostrarAgenda();

    expect(await screen.findByText("Ainda não há eventos agendados."))
      .toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
  });

  it.each([404, 500, 403])("mostra erro para HTTP %s em vez de uma agenda vazia", async (status) => {
    simularErro(status);

    mostrarAgenda();

    expect(await screen.findByRole("alert"))
      .toHaveTextContent("Não foi possível carregar os eventos. Tente novamente.");
    expect(screen.queryByText("Ainda não há eventos agendados."))
      .not.toBeInTheDocument();
  });

  it("usa a mensagem comum quando o servidor não pode ser contactado", async () => {
    api.defaults.adapter = vi.fn((config) => Promise.reject(
      new AxiosError("Network Error", AxiosError.ERR_NETWORK, config)
    ));

    mostrarAgenda();

    expect(await screen.findByRole("alert"))
      .toHaveTextContent("Não foi possível carregar os eventos. Tente novamente.");
    expect(screen.queryByText("Ainda não há eventos agendados."))
      .not.toBeInTheDocument();
  });

  it.each([
    [419, "A sessão expirou. Atualize a página e tente novamente."],
    [429, "Demasiados pedidos. Tente novamente mais tarde."],
  ])("usa a mensagem comum para HTTP %s", async (status, mensagem) => {
    simularErro(status);

    mostrarAgenda();

    expect(await screen.findByRole("alert")).toHaveTextContent(mensagem);
    expect(screen.queryByText("Ainda não há eventos agendados."))
      .not.toBeInTheDocument();
  });

  it("apresenta uma mensagem segura para o limite de pedidos mesmo quando a API envia outro texto", async () => {
    simularErro(429, { message: "A agenda está temporariamente indisponível." });

    mostrarAgenda();

    expect(await screen.findByRole("alert"))
      .toHaveTextContent("Demasiados pedidos. Tente novamente mais tarde.");
  });

  it.each([
    ["sem corpo", null],
    ["sem confirmação de sucesso", { success: false, data: { items: [] } }],
    ["sem lista de eventos", { success: true, data: { items: null } }],
  ])("preserva o erro de formato para uma resposta %s", async (_, data) => {
    simularResposta(data);

    mostrarAgenda();

    expect(await screen.findByRole("alert"))
      .toHaveTextContent("Não foi possível carregar os eventos. Tente novamente.");
    expect(screen.queryByText("Ainda não há eventos agendados."))
      .not.toBeInTheDocument();
  });

  it.each([0, 1.5, "inválida"])("rejeita uma última página inválida: %s", async (ultimaPagina) => {
    const adapter = simularResposta(respostaEventos([], ultimaPagina));

    mostrarAgenda();

    expect(await screen.findByRole("alert"))
      .toHaveTextContent("Não foi possível carregar os eventos. Tente novamente.");
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Ainda não há eventos agendados."))
      .not.toBeInTheDocument();
  });

  it("não apresenta uma lista parcial quando a segunda página falha", async () => {
    const evento = criarEvento("primeiro", "Encontro de manhã", "2030-10-07", "11:00:00");
    const adapter = vi.fn()
      .mockImplementationOnce((config) => Promise.resolve(
        respostaApi(respostaEventos([evento], 2), config)
      ))
      .mockImplementationOnce((config) => Promise.reject(erroHttp(config, 500)));
    api.defaults.adapter = adapter;

    mostrarAgenda();

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar os eventos. Tente novamente.");
    expect(screen.queryByRole("heading", { name: evento.name })).not.toBeInTheDocument();
    expect(adapter).toHaveBeenCalledTimes(2);
  });

  it("mostra o carregamento enquanto aguarda a resposta", async () => {
    let concluirPedido;
    let configPedido;
    const adapter = vi.fn((config) => {
      configPedido = config;
      return new Promise((resolve) => {
        concluirPedido = resolve;
      });
    });
    api.defaults.adapter = adapter;

    mostrarAgenda();

    expect(screen.getByRole("status")).toHaveTextContent("A carregar eventos...");
    expect(screen.queryByText("Ainda não há eventos agendados."))
      .not.toBeInTheDocument();
    await waitFor(() => expect(adapter).toHaveBeenCalledTimes(1));

    await act(async () => {
      concluirPedido(respostaApi(respostaEventos([]), configPedido));
    });

    expect(await screen.findByText("Ainda não há eventos agendados."))
      .toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it.each([404, 500])("permite repetir por teclado após HTTP %s e recuperar os próximos eventos", async (status) => {
    const user = userEvent.setup();
    const evento = criarEvento("recuperado", "Encontro recuperado", "2030-10-08", "11:00:00");
    const adapter = vi.fn()
      .mockImplementationOnce((config) => Promise.reject(erroHttp(config, status, { message: "Recurso não encontrado." })))
      .mockImplementationOnce((config) => Promise.resolve(respostaApi(respostaEventos([evento]), config)));
    api.defaults.adapter = adapter;
    mostrarAgenda();
    expect(await screen.findByRole("alert"))
      .toHaveTextContent("Não foi possível carregar os eventos. Tente novamente.");
    expect(screen.queryByText("Recurso não encontrado.")).not.toBeInTheDocument();
    screen.getByRole("button", { name: "Tentar novamente" }).focus();

    await user.keyboard("{Enter}");

    expect(await screen.findByRole("heading", { name: evento.name })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(adapter).toHaveBeenCalledTimes(2);
    expect(adapter.mock.calls.map(([config]) => config.params)).toEqual([{ page: 1 }, { page: 1 }]);
  });

  it("as opções futuras da Agenda não alteram a estratégia de pedidos da homepage", async () => {
    vi.stubEnv("VITE_EVENTS_SEARCH_ENABLED", "true");
    vi.stubEnv("VITE_EVENTS_PER_PAGE_ENABLED", "true");
    const adapter = vi.fn((config) => Promise.resolve(respostaApi(respostaEventos([], 2), config)));
    api.defaults.adapter = adapter;
    mostrarAgenda();

    await screen.findByText("Ainda não há eventos agendados.");

    expect(adapter.mock.calls.map(([config]) => config.params)).toEqual([{ page: 1 }, { page: 2 }]);
  });

  it("cancela o pedido pendente ao sair da página", async () => {
    const cancelarPedido = vi.fn();
    const adapter = vi.fn((config) => new Promise((_, reject) => {
      config.signal.addEventListener("abort", () => {
        cancelarPedido();
        reject(new CanceledError("Pedido cancelado", config));
      }, { once: true });
    }));
    api.defaults.adapter = adapter;

    const { unmount } = mostrarAgenda();
    await waitFor(() => expect(adapter).toHaveBeenCalledTimes(1));
    const signal = adapter.mock.calls[0][0].signal;
    expect(signal.aborted).toBe(false);

    await act(async () => {
      unmount();
    });

    expect(signal.aborted).toBe(true);
    expect(cancelarPedido).toHaveBeenCalledTimes(1);
  });
});
