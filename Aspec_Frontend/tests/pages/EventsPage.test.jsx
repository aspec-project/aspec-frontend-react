import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError } from "axios";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EventsPage from "../../src/pages/EventsPage.jsx";
import { api } from "../../src/services/api.js";
import AppRouter from "../../src/router/AppRouter.jsx";

const categorias = [
  { id: "categoria-a", name: "Conferência" },
  { id: "categoria-b", name: "Encontro" },
];
const distritos = [
  { id: "distrito-a", name: "Lisboa" },
  { id: "distrito-b", name: "Porto" },
];

function criarEvento(id, name = `Evento ${id}`) {
  return {
    id,
    name,
    event_date: "2030-10-07",
    event_start_time: "11:00:00",
    event_end_time: "13:00:00",
    category: categorias[0],
    location: distritos[0],
    available_spots: 5,
    registration_open: true,
  };
}

function respostaPagina(items, page = 1, pagination = {}) {
  return {
    success: true,
    data: {
      items,
      pagination: {
        current_page: page,
        per_page: 9,
        total: 27,
        last_page: 3,
        ...pagination,
      },
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

function respostaNormal(config) {
  const page = config.params.page;
  return respostaPagina([criarEvento(`pagina-${page}`, `Evento da página ${page}`)], page);
}

function instalarAdapter(eventos = respostaNormal, catalogos) {
  const adapter = vi.fn(async (config) => {
    if (config.url === "/events") {
      return respostaApi(await eventos(config), config);
    }
    if (catalogos) {
      return respostaApi(await catalogos(config), config);
    }
    if (config.url === "/event-categories") {
      return respostaApi({ success: true, data: categorias }, config);
    }
    if (config.url === "/locations") {
      return respostaApi({ success: true, data: distritos }, config);
    }
    throw new Error(`Endpoint inesperado no teste: ${config.url}`);
  });
  api.defaults.adapter = adapter;
  return adapter;
}

function pedidosEventos(adapter) {
  return adapter.mock.calls.map(([config]) => config).filter((config) => config.url === "/events");
}

function mostrarAgenda() {
  return render(<MemoryRouter><EventsPage /></MemoryRouter>);
}

async function esperarPagina(page) {
  await screen.findByRole("heading", { name: `Evento da página ${page}` });
  expect(screen.getByText(`Página ${page} de 3`)).toBeInTheDocument();
}

describe("EventsPage", () => {
  let adapterOriginal;
  let concluirPendentes;

  beforeEach(() => {
    adapterOriginal = api.defaults.adapter;
    concluirPendentes = [];
    vi.stubEnv("VITE_EVENTS_SEARCH_ENABLED", "false");
  });

  afterEach(async () => {
    cleanup();
    await act(async () => {
      concluirPendentes.forEach((concluir) => concluir());
    });
    api.defaults.adapter = adapterOriginal;
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("a rota pública reutiliza uma única Navbar e Footer do MainLayout", async () => {
    instalarAdapter();
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    render(<MemoryRouter initialEntries={["/eventos"]}><AppRouter /></MemoryRouter>);

    await screen.findByRole("heading", { name: "Evento da página 1" });
    expect(screen.getAllByRole("banner")).toHaveLength(1);
    expect(screen.getAllByRole("contentinfo")).toHaveLength(1);
    expect(screen.getByRole("main")).toContainElement(screen.getByRole("heading", { name: "Agenda de Eventos" }));
  });

  it("apresenta todos os eventos da página pela ordem da API e não carrega páginas adicionais", async () => {
    const items = [
      criarEvento("distante", "Evento distante"),
      { ...criarEvento("passado", "Evento passado"), event_date: "2020-01-01" },
      criarEvento("terceiro", "Terceiro evento"),
      criarEvento("quarto", "Quarto evento"),
    ];
    const adapter = instalarAdapter(() => respostaPagina(items));

    mostrarAgenda();

    await screen.findByRole("heading", { name: items[0].name });
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent))
      .toEqual(items.map((evento) => evento.name));
    expect(pedidosEventos(adapter)).toHaveLength(1);
    expect(pedidosEventos(adapter)[0].params).toEqual({ page: 1, per_page: 9 });
    expect(screen.getByRole("navigation", { name: "Paginação de eventos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Seguinte" })).toBeEnabled();
    const card = screen.getByRole("heading", { name: items[0].name }).closest("article");
    expect(within(card).getByRole("link", { name: `Ver evento: ${items[0].name}` }))
      .toHaveAttribute("href", "/eventos/distante");
  });

  it("carrega os catálogos e associa as etiquetas aos filtros", async () => {
    const adapter = instalarAdapter();
    mostrarAgenda();

    expect(await screen.findByRole("option", { name: "Conferência" })).toHaveValue("categoria-a");
    expect(await screen.findByRole("option", { name: "Porto" })).toHaveValue("distrito-b");
    expect(screen.getByLabelText("Categoria")).toBe(screen.getByRole("combobox", { name: "Categoria" }));
    expect(screen.getByLabelText("Distrito")).toBe(screen.getByRole("combobox", { name: "Distrito" }));
    expect(screen.getByRole("option", { name: "Todas as categorias" })).toHaveValue("");
    expect(screen.getByRole("option", { name: "Todos os distritos" })).toHaveValue("");
    expect(adapter.mock.calls.filter(([config]) => config.url === "/event-categories")).toHaveLength(1);
    expect(adapter.mock.calls.filter(([config]) => config.url === "/locations")).toHaveLength(1);
  });

  it("combina os dois filtros e mantém ambos ao navegar pelas páginas do backend", async () => {
    const user = userEvent.setup();
    const adapter = instalarAdapter();
    mostrarAgenda();
    await screen.findByRole("option", { name: "Conferência" });
    await esperarPagina(1);

    await user.selectOptions(screen.getByRole("combobox", { name: "Categoria" }), "categoria-a");
    await waitFor(() => expect(pedidosEventos(adapter).at(-1).params).toEqual({ category_id: "categoria-a", page: 1, per_page: 9 }));
    await esperarPagina(1);
    await user.selectOptions(screen.getByRole("combobox", { name: "Distrito" }), "distrito-b");
    await waitFor(() => expect(pedidosEventos(adapter).at(-1).params).toEqual({ category_id: "categoria-a", location_id: "distrito-b", page: 1, per_page: 9 }));
    await esperarPagina(1);
    await user.click(screen.getByRole("button", { name: "Seguinte" }));
    await esperarPagina(2);
    expect(pedidosEventos(adapter).at(-1).params).toEqual({ category_id: "categoria-a", location_id: "distrito-b", page: 2, per_page: 9 });

    await user.click(screen.getByRole("button", { name: "Seguinte" }));
    await esperarPagina(3);
    expect(screen.getByRole("button", { name: "Seguinte" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Anterior" }));
    await esperarPagina(2);
    expect(pedidosEventos(adapter).map((config) => config.params.page)).toEqual([1, 1, 1, 2, 3, 2]);
  });

  it("alterar ou limpar um filtro regressa à página 1 e preserva o outro", async () => {
    const user = userEvent.setup();
    const adapter = instalarAdapter();
    mostrarAgenda();
    await screen.findByRole("option", { name: "Conferência" });
    await esperarPagina(1);
    await user.selectOptions(screen.getByLabelText("Categoria"), "categoria-a");
    await esperarPagina(1);
    await user.selectOptions(screen.getByLabelText("Distrito"), "distrito-b");
    await esperarPagina(1);
    await user.click(screen.getByRole("button", { name: "Seguinte" }));
    await esperarPagina(2);

    await user.selectOptions(screen.getByLabelText("Categoria"), "categoria-b");
    await esperarPagina(1);
    expect(pedidosEventos(adapter).at(-1).params).toEqual({ category_id: "categoria-b", location_id: "distrito-b", page: 1, per_page: 9 });
    await user.click(screen.getByRole("button", { name: "Seguinte" }));
    await esperarPagina(2);
    await user.selectOptions(screen.getByLabelText("Categoria"), "");
    await esperarPagina(1);
    expect(pedidosEventos(adapter).at(-1).params).toEqual({ location_id: "distrito-b", page: 1, per_page: 9 });
    expect(screen.getByLabelText("Distrito")).toHaveValue("distrito-b");
    await user.selectOptions(screen.getByLabelText("Categoria"), "categoria-a");
    await esperarPagina(1);
    await user.click(screen.getByRole("button", { name: "Seguinte" }));
    await esperarPagina(2);
    await user.selectOptions(screen.getByLabelText("Distrito"), "distrito-a");
    await esperarPagina(1);
    expect(pedidosEventos(adapter).at(-1).params).toEqual({ category_id: "categoria-a", location_id: "distrito-a", page: 1, per_page: 9 });
    await user.click(screen.getByRole("button", { name: "Seguinte" }));
    await esperarPagina(2);
    await user.selectOptions(screen.getByLabelText("Distrito"), "");
    await esperarPagina(1);
    expect(pedidosEventos(adapter).at(-1).params).toEqual({ category_id: "categoria-a", page: 1, per_page: 9 });
    expect(screen.getByLabelText("Categoria")).toHaveValue("categoria-a");
  });

  it("limpa os dois filtros sem manter a página anterior", async () => {
    const user = userEvent.setup();
    const adapter = instalarAdapter();
    mostrarAgenda();
    await screen.findByRole("option", { name: "Conferência" });
    await esperarPagina(1);
    await user.selectOptions(screen.getByLabelText("Categoria"), "categoria-a");
    await esperarPagina(1);
    await user.selectOptions(screen.getByLabelText("Distrito"), "distrito-b");
    await esperarPagina(1);
    await user.click(screen.getByRole("button", { name: "Seguinte" }));
    await esperarPagina(2);

    await user.click(screen.getByRole("button", { name: "Limpar filtros" }));

    await esperarPagina(1);
    expect(pedidosEventos(adapter).at(-1).params).toEqual({ page: 1, per_page: 9 });
    expect(screen.getByLabelText("Categoria")).toHaveValue("");
    expect(screen.getByLabelText("Distrito")).toHaveValue("");
  });

  it("Limpar filtros volta a pedir a página 1 mesmo sem filtros ativos", async () => {
    const user = userEvent.setup();
    const adapter = instalarAdapter();
    mostrarAgenda();
    await esperarPagina(1);

    await user.click(screen.getByRole("button", { name: "Limpar filtros" }));

    await waitFor(() => expect(pedidosEventos(adapter)).toHaveLength(2));
    expect(pedidosEventos(adapter).at(-1).params).toEqual({ page: 1, per_page: 9 });
  });

  it("distingue carregamento de uma resposta válida sem eventos", async () => {
    let concluir;
    const adapter = instalarAdapter(() => new Promise((resolve) => {
      concluir = () => resolve(respostaPagina([], 1, { total: 0, last_page: 1 }));
      concluirPendentes.push(concluir);
    }));
    mostrarAgenda();

    expect(screen.getByText("A carregar eventos...")).toHaveAttribute("role", "status");
    expect(screen.queryByText("Não foram encontrados eventos para os filtros selecionados.")).not.toBeInTheDocument();
    await waitFor(() => expect(pedidosEventos(adapter)).toHaveLength(1));
    await act(async () => concluir());

    expect(await screen.findByText("Não foram encontrados eventos para os filtros selecionados.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("A carregar eventos...")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Paginação de eventos" })).not.toBeInTheDocument();
  });

  it("apresenta o estado vazio amigável quando os filtros não encontram eventos", async () => {
    const user = userEvent.setup();
    instalarAdapter((config) => config.params.category_id
      ? respostaPagina([], 1, { total: 0, last_page: 1 })
      : respostaNormal(config));
    mostrarAgenda();
    await screen.findByRole("option", { name: "Conferência" });
    await esperarPagina(1);

    await user.selectOptions(screen.getByLabelText("Categoria"), "categoria-a");

    expect(await screen.findByText("Não foram encontrados eventos para os filtros selecionados.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each([
    [404, "Não foi possível carregar os eventos. Tente novamente."],
    [500, "Não foi possível carregar os eventos. Tente novamente."],
    [419, "A sessão expirou. Atualize a página e tente novamente."],
    [429, "Demasiados pedidos. Tente novamente mais tarde."],
  ])("mostra erro, sem estado vazio, para HTTP %s", async (status, mensagem) => {
    instalarAdapter((config) => Promise.reject(erroHttp(config, status)));
    mostrarAgenda();

    expect(await screen.findByRole("alert")).toHaveTextContent(mensagem);
    expect(screen.queryByText("Não foram encontrados eventos para os filtros selecionados.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeEnabled();
  });

  it.each([
    [500, ""],
    [404, { detalhe: "Agenda indisponível" }],
  ])("uma mensagem de erro inválida em HTTP %s mantém o aviso e a nova tentativa", async (status, message) => {
    instalarAdapter((config) => Promise.reject(erroHttp(config, status, { message })));
    mostrarAgenda();

    expect(await screen.findByRole("alert"))
      .toHaveTextContent("Não foi possível carregar os eventos. Tente novamente.");
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeEnabled();
    expect(screen.queryByText("Não foram encontrados eventos para os filtros selecionados.")).not.toBeInTheDocument();
  });

  it("mostra a falha de ligação sem apresentar uma agenda vazia", async () => {
    instalarAdapter((config) => Promise.reject(new AxiosError("Network Error", AxiosError.ERR_NETWORK, config)));
    mostrarAgenda();

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar os eventos. Tente novamente.");
    expect(screen.queryByText("Não foram encontrados eventos para os filtros selecionados.")).not.toBeInTheDocument();
  });

  it.each([
    ["corpo inválido", { success: true, data: { items: null } }, "Não foi possível carregar os eventos. Tente novamente."],
    ["paginação inválida", respostaPagina([], 1, { current_page: 0 }), "Não foi possível carregar os eventos. Tente novamente."],
  ])("mostra erro de contrato para %s", async (_, resposta, mensagem) => {
    instalarAdapter(() => resposta);
    mostrarAgenda();

    expect(await screen.findByRole("alert")).toHaveTextContent(mensagem);
    expect(screen.queryByText("Não foram encontrados eventos para os filtros selecionados.")).not.toBeInTheDocument();
  });

  it("permite repetir por teclado o pedido que falhou, preservando os filtros e a página", async () => {
    const user = userEvent.setup();
    let falhar = true;
    const adapter = instalarAdapter((config) => config.params.page === 2 && falhar
      ? Promise.reject(erroHttp(config, 500))
      : respostaNormal(config));
    mostrarAgenda();
    await screen.findByRole("option", { name: "Conferência" });
    await esperarPagina(1);
    await user.selectOptions(screen.getByLabelText("Categoria"), "categoria-a");
    await esperarPagina(1);
    await user.selectOptions(screen.getByLabelText("Distrito"), "distrito-b");
    await esperarPagina(1);
    await user.click(screen.getByRole("button", { name: "Seguinte" }));
    await screen.findByRole("alert");
    falhar = false;
    screen.getByRole("button", { name: "Tentar novamente" }).focus();

    await user.keyboard("{Enter}");

    await esperarPagina(2);
    expect(pedidosEventos(adapter).at(-1).params).toEqual({ category_id: "categoria-a", location_id: "distrito-b", page: 2, per_page: 9 });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each([
    ["/event-categories", "Tentar carregar categorias novamente", "Conferência"],
    ["/locations", "Tentar carregar distritos novamente", "Porto"],
  ])("uma falha do catálogo %s permite repetir apenas esse catálogo", async (endpoint, botao, opcao) => {
    const user = userEvent.setup();
    let falhar = true;
    const adapter = instalarAdapter(respostaNormal, (config) => {
      if (config.url === endpoint && falhar) return Promise.reject(erroHttp(config, 500));
      return { success: true, data: config.url === "/event-categories" ? categorias : distritos };
    });
    mostrarAgenda();
    await esperarPagina(1);
    await screen.findByRole("button", { name: botao });
    falhar = false;

    await user.click(screen.getByRole("button", { name: botao }));

    expect(await screen.findByRole("option", { name: opcao })).toBeInTheDocument();
    expect(adapter.mock.calls.filter(([config]) => config.url === endpoint)).toHaveLength(2);
    expect(adapter.mock.calls.filter(([config]) => config.url !== endpoint && config.url !== "/events")).toHaveLength(1);
    expect(pedidosEventos(adapter)).toHaveLength(1);
  });

  it("não transforma um catálogo inválido numa lista de opções vazia", async () => {
    instalarAdapter(respostaNormal, (config) => config.url === "/event-categories"
      ? { success: true, data: null }
      : { success: true, data: distritos });
    mostrarAgenda();

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar as categorias. Tente novamente.");
    expect(screen.getByRole("button", { name: "Tentar carregar categorias novamente" })).toBeEnabled();
    expect(screen.getByLabelText("Categoria")).toBeDisabled();
    expect(await screen.findByRole("option", { name: "Porto" })).toBeInTheDocument();
  });

  it("uma mensagem de erro vazia do catálogo mantém o aviso e o filtro desativado", async () => {
    instalarAdapter(respostaNormal, (config) => config.url === "/event-categories"
      ? Promise.reject(erroHttp(config, 500, { message: "" }))
      : { success: true, data: distritos });
    mostrarAgenda();
    await esperarPagina(1);

    expect(await screen.findByRole("alert"))
      .toHaveTextContent("Não foi possível carregar as categorias. Tente novamente.");
    expect(screen.getByRole("button", { name: "Tentar carregar categorias novamente" })).toBeEnabled();
    expect(screen.getByLabelText("Categoria")).toBeDisabled();
    expect(screen.getByLabelText("Categoria"))
      .toHaveAttribute("aria-describedby", "event-category-error");
    expect(await screen.findByRole("option", { name: "Porto" })).toBeInTheDocument();
  });

  it("cancela o pedido antigo e não permite que a resposta atrasada substitua o filtro atual", async () => {
    const user = userEvent.setup();
    let concluirAntigo;
    const adapter = instalarAdapter((config) => {
      if (!config.params.category_id) {
        return new Promise((resolve) => {
          concluirAntigo = () => resolve(respostaPagina([criarEvento("antigo", "Resultado antigo")]));
          concluirPendentes.push(concluirAntigo);
        });
      }
      return respostaPagina([criarEvento("atual", "Resultado atual")]);
    });
    mostrarAgenda();
    await screen.findByRole("option", { name: "Conferência" });
    await waitFor(() => expect(pedidosEventos(adapter)).toHaveLength(1));
    const signalAntigo = pedidosEventos(adapter)[0].signal;

    await user.selectOptions(screen.getByLabelText("Categoria"), "categoria-a");
    await screen.findByRole("heading", { name: "Resultado atual" });
    expect(signalAntigo.aborted).toBe(true);
    await act(async () => concluirAntigo());

    expect(screen.getByRole("heading", { name: "Resultado atual" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Resultado antigo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(pedidosEventos(adapter)).toHaveLength(2);
  });

  it("apresenta a pesquisa indisponível sem enviar um parâmetro não confirmado", async () => {
    const adapter = instalarAdapter();
    mostrarAgenda();
    await esperarPagina(1);

    expect(screen.queryByRole("button", { name: /^Limpar (pesquisa|categoria|distrito)$/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Avaliação mínima")).not.toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Pesquisar eventos" })).toBeDisabled();
    expect(screen.getByText("Pesquisa indisponível de momento.")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Pesquisar eventos" }))
      .toHaveAccessibleDescription("Pesquisa indisponível de momento.");
    expect(pedidosEventos(adapter)[0].params).toEqual({ page: 1, per_page: 9 });
  });

  it("pesquisa no backend e apresenta resultados que não dependem do texto da página atual", async () => {
    vi.stubEnv("VITE_EVENTS_SEARCH_ENABLED", "true");
    const user = userEvent.setup();
    const adapter = instalarAdapter((config) => respostaPagina([
      criarEvento("resultado", config.params.search ? "Resultado devolvido pelo servidor" : "Evento inicial"),
    ]));
    mostrarAgenda();
    await screen.findByRole("heading", { name: "Evento inicial" });
    const pesquisa = screen.getByRole("searchbox", { name: "Pesquisar eventos" });
    expect(pesquisa).toBeEnabled();

    await user.type(pesquisa, "conferência");
    await user.click(screen.getByRole("button", { name: "Pesquisar", exact: true }));

    await waitFor(() => expect(pedidosEventos(adapter).at(-1).params).toEqual({ search: "conferência", page: 1, per_page: 9 }));
    expect(await screen.findByRole("heading", { name: "Resultado devolvido pelo servidor" })).toBeInTheDocument();
    expect(screen.getByText("27 eventos encontrados")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(pedidosEventos(adapter).every((config) => config.params.page === 1)).toBe(true);
  });

  it("preserva pesquisa e filtros na paginação e repõe a página ao limpar o input ou filtros", async () => {
    vi.stubEnv("VITE_EVENTS_SEARCH_ENABLED", "true");
    const user = userEvent.setup();
    const adapter = instalarAdapter();
    mostrarAgenda();
    await screen.findByRole("option", { name: "Conferência" });
    await esperarPagina(1);
    const pesquisa = screen.getByRole("searchbox", { name: "Pesquisar eventos" });
    await user.type(pesquisa, "fé");
    await user.click(screen.getByRole("button", { name: "Pesquisar", exact: true }));
    await esperarPagina(1);
    await user.selectOptions(screen.getByLabelText("Categoria"), "categoria-a");
    await esperarPagina(1);
    await user.selectOptions(screen.getByLabelText("Distrito"), "distrito-b");
    await esperarPagina(1);
    await user.click(screen.getByRole("button", { name: "Seguinte" }));
    await esperarPagina(2);
    expect(pedidosEventos(adapter).at(-1).params).toEqual({ search: "fé", category_id: "categoria-a", location_id: "distrito-b", page: 2, per_page: 9 });

    await user.type(pesquisa, " e trabalho");
    await user.click(screen.getByRole("button", { name: "Pesquisar", exact: true }));
    await esperarPagina(1);
    expect(pedidosEventos(adapter).at(-1).params).toEqual({ search: "fé e trabalho", category_id: "categoria-a", location_id: "distrito-b", page: 1, per_page: 9 });
    await user.click(screen.getByRole("button", { name: "Seguinte" }));
    await esperarPagina(2);
    fireEvent.change(pesquisa, { target: { value: "" } });
    await esperarPagina(1);
    expect(pesquisa).toHaveValue("");
    expect(pedidosEventos(adapter).at(-1).params).toEqual({ category_id: "categoria-a", location_id: "distrito-b", page: 1, per_page: 9 });
    fireEvent.change(pesquisa, { target: { value: "rede" } });
    await user.click(screen.getByRole("button", { name: "Pesquisar", exact: true }));
    await esperarPagina(1);
    await user.click(screen.getByRole("button", { name: "Seguinte" }));
    await esperarPagina(2);
    await user.selectOptions(screen.getByLabelText("Categoria"), "");
    await esperarPagina(1);
    expect(pesquisa).toHaveValue("rede");
    expect(pedidosEventos(adapter).at(-1).params).toEqual({ search: "rede", location_id: "distrito-b", page: 1, per_page: 9 });
    await user.selectOptions(screen.getByLabelText("Categoria"), "categoria-b");
    await esperarPagina(1);
    await user.click(screen.getByRole("button", { name: "Seguinte" }));
    await esperarPagina(2);
    await user.selectOptions(screen.getByLabelText("Distrito"), "");
    await esperarPagina(1);
    expect(pedidosEventos(adapter).at(-1).params).toEqual({ search: "rede", category_id: "categoria-b", page: 1, per_page: 9 });
    await user.selectOptions(screen.getByLabelText("Distrito"), "distrito-b");
    await esperarPagina(1);
    await user.click(screen.getByRole("button", { name: "Seguinte" }));
    await esperarPagina(2);
    await user.click(screen.getByRole("button", { name: "Limpar filtros" }));
    await esperarPagina(1);
    expect(pedidosEventos(adapter).at(-1).params).toEqual({ page: 1, per_page: 9 });
    expect(pesquisa).toHaveValue("");
    expect(screen.getByLabelText("Categoria")).toHaveValue("");
    expect(screen.getByLabelText("Distrito")).toHaveValue("");
  });

  it("apresenta nove resultados e o total do backend sem pré-carregar a página seguinte", async () => {
    const adapter = instalarAdapter(() => respostaPagina(
      Array.from({ length: 9 }, (_, index) => criarEvento(String(index))),
      1,
      { total: 47, last_page: 6 }
    ));
    mostrarAgenda();

    await screen.findByText("47 eventos encontrados");
    expect(screen.getAllByRole("article")).toHaveLength(9);
    expect(pedidosEventos(adapter)).toHaveLength(1);
    expect(pedidosEventos(adapter)[0].params).toEqual({ page: 1, per_page: 9 });
    expect(adapter.mock.calls.every(([config]) => !config.url.startsWith("/events/"))).toBe(true);
  });

  it("permite chegar aos três filtros e pesquisar através do teclado", async () => {
    vi.stubEnv("VITE_EVENTS_SEARCH_ENABLED", "true");
    const user = userEvent.setup();
    const adapter = instalarAdapter();
    mostrarAgenda();
    await screen.findByRole("option", { name: "Conferência" });
    await esperarPagina(1);

    await user.tab();
    expect(screen.getByRole("searchbox", { name: "Pesquisar eventos" })).toHaveFocus();
    await user.keyboard("encontro");
    expect(pedidosEventos(adapter)).toHaveLength(1);
    await user.tab();
    expect(screen.getByRole("combobox", { name: "Categoria" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("combobox", { name: "Distrito" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Pesquisar", exact: true })).toHaveFocus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(pedidosEventos(adapter).at(-1).params).toEqual({ search: "encontro", page: 1, per_page: 9 }));
  });

  it("limpar pelo X cancela a pesquisa pendente e volta a carregar sem texto", async () => {
    vi.stubEnv("VITE_EVENTS_SEARCH_ENABLED", "true");
    const user = userEvent.setup();
    let concluirAntigo;
    const adapter = instalarAdapter((config) => {
      if (config.params.search === "a") {
        return new Promise((resolve) => {
          concluirAntigo = () => resolve(respostaPagina([criarEvento("antigo", "Pesquisa antiga")]));
          concluirPendentes.push(concluirAntigo);
        });
      }
      return respostaPagina([criarEvento("novo", config.params.search ? "Pesquisa atual" : "Evento inicial")]);
    });
    mostrarAgenda();
    await screen.findByRole("heading", { name: "Evento inicial" });
    const pesquisa = screen.getByRole("searchbox", { name: "Pesquisar eventos" });
    await user.type(pesquisa, "a");
    await user.click(screen.getByRole("button", { name: "Pesquisar", exact: true }));
    await waitFor(() => expect(pedidosEventos(adapter).at(-1).params.search).toBe("a"));
    const signalAntigo = pedidosEventos(adapter).at(-1).signal;
    fireEvent.change(pesquisa, { target: { value: "" } });
    await screen.findByRole("heading", { name: "Evento inicial" });
    expect(pedidosEventos(adapter).at(-1).params).toEqual({ page: 1, per_page: 9 });
    await act(async () => concluirAntigo());

    expect(signalAntigo.aborted).toBe(true);
    expect(screen.queryByRole("heading", { name: "Pesquisa antiga" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Evento inicial" })).toBeInTheDocument();
  });

  it("cancela todos os pedidos pendentes quando a página é desmontada", async () => {
    const adapter = instalarAdapter((config) => new Promise((resolve) => {
      concluirPendentes.push(() => resolve(respostaPagina([], config.params.page, { total: 0, last_page: 1 })));
    }), () => new Promise((resolve) => {
      concluirPendentes.push(() => resolve({ success: true, data: [] }));
    }));
    const { unmount } = mostrarAgenda();
    await waitFor(() => expect(adapter).toHaveBeenCalledTimes(3));
    const signals = adapter.mock.calls.map(([config]) => config.signal);

    unmount();

    expect(signals.every((signal) => signal.aborted)).toBe(true);
  });
});
