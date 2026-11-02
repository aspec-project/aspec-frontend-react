import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError } from "axios";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EventDetailPage from "../../src/pages/EventDetailPage";
import AppRouter from "../../src/router/AppRouter";
import { api } from "../../src/services/api";
import { useAuthStore } from "../../src/store/authStore";

vi.mock("../../src/components/layout/Header", () => ({ default: () => <header>ASPEC</header> }));
vi.mock("../../src/components/layout/Footer", () => ({ default: () => <footer>ASPEC</footer> }));

const id = "019512a1-9999-7123-8123-123456789abc";
const otherId = "019512a1-9998-7123-8123-123456789abc";
const event = {
  id, name: "Encontro ASPEC", description: "Descrição pública", category: { name: "Encontro", color: "#8A7043" },
  location: { name: "Lisboa" }, event_date: "2030-10-15", event_start_time: "10:00", event_end_time: "12:00",
  max_attendees: 20, registrations_count: 12, available_spots: 8, organizer_notes: "Chegar cedo.",
  address: "Rua do Encontro, 12", latitude: 38.7, longitude: -9.1, online_url: "https://private.test/secret",
  registration_deadline: "2030-10-14T23:59:00+01:00",
};
const response = (config, data = event) => ({ data: { success: true, data }, config, status: 200, statusText: "", headers: {} });
const show = (eventId = id) => render(<MemoryRouter initialEntries={[`/eventos/${eventId}`]}><Routes><Route path="/eventos/:id" element={<EventDetailPage />} /></Routes></MemoryRouter>);
const fail = (config, status) => Promise.reject(new AxiosError("Detalhe interno", AxiosError.ERR_BAD_RESPONSE, config, undefined, { ...response(config), status, data: { message: "Detalhe interno confidencial" } }));

describe("Página de detalhe do evento", () => {
  let original;
  beforeEach(() => {
    vi.stubEnv("VITE_GOOGLE_MAPS_EMBED_KEY", "chave-ficticia-testes");
    original = api.defaults.adapter;
    useAuthStore.setState({ user: null, status: "idle" });
    api.defaults.adapter = (config) => Promise.resolve(response(config));
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });
  afterEach(() => { api.defaults.adapter = original; vi.restoreAllMocks(); vi.unstubAllEnvs(); });

  it("liga o place_id devolvido pelo detalhe ao Embed e ao botão Google Maps", async () => {
    api.defaults.adapter = (config) => Promise.resolve(response(config, { ...event, place_id: " local-google-teste ", latitude: null, longitude: null }));
    show();
    await screen.findByRole("heading", { name: event.name });
    const iframe = screen.getByTitle("Mapa da localização do evento");
    expect(new URL(iframe.src).searchParams.get("q")).toBe("place_id:local-google-teste");
    const search = new URL(screen.getByRole("link", { name: "Abrir no Google Maps" }).href).searchParams;
    expect(search.get("query")).toBe(event.address);
    expect(search.get("query_place_id")).toBe("local-google-teste");
  });

  it("oculta o Embed e o botão num evento online mesmo com place_id indevido", async () => {
    api.defaults.adapter = (config) => Promise.resolve(response(config, { ...event, is_online: true, place_id: "local-google-teste" }));
    show();
    await screen.findByRole("heading", { name: event.name });
    expect(screen.queryByTitle("Mapa da localização do evento")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Abrir no Google Maps" })).not.toBeInTheDocument();
  });

  it("apresenta os dados reais e não expõe o link privado nem infere modalidade ou recorrência", async () => {
    show();
    expect(screen.getByRole("status")).toHaveTextContent("A carregar evento");
    expect(document.title).toBe("Detalhe do evento | ASPEC");
    await screen.findByRole("heading", { name: event.name });
    await waitFor(() => expect(document.title).toBe(`${event.name} | ASPEC`));
    for (const text of ["Descrição pública", "15 de outubro de 2030", "10:00 – 12:00", "Lisboa", "Chegar cedo.", "8 vagas disponíveis", "12 / 20", event.address]) expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "60");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "60% de ocupação");
    expect(screen.getByRole("link", { name: "Voltar à agenda" })).toHaveAttribute("href", "/eventos");
    for (const text of [event.online_url, "Presencial", "Online", "Recorrente"]) expect(screen.queryByText(text)).not.toBeInTheDocument();
    expect(document.querySelector('a[href*="private.test"]')).toBeNull();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("organiza metadados no header, localização antes da descrição e apenas lotação na lateral", async () => {
    show();
    const title = await screen.findByRole("heading", { name: event.name });
    const header = title.closest("header");
    for (const text of ["15 de outubro de 2030", "10:00 – 12:00", "Lisboa"]) expect(within(header).getByText(text)).toBeInTheDocument();
    expect(header.querySelector("time")).toHaveAttribute("datetime", event.registration_deadline);
    const capacity = screen.getByRole("region", { name: "Lotação do Evento" });
    expect(within(capacity).getByText("12 / 20")).toBeInTheDocument();
    expect(within(capacity).getByText(/Data limite de inscrição:/)).toBeInTheDocument();
    expect(capacity.querySelector("time")).toHaveAttribute("datetime", event.registration_deadline);
    expect(screen.getAllByText("14 de outubro de 2030 às 23:59")).toHaveLength(2);
    expect(screen.queryByRole("heading", { name: "Informações do evento" })).not.toBeInTheDocument();
    const headings = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(headings).toEqual(["Localização do evento", "Sobre o evento", "Notas do organizador", "Lotação do Evento", "Inscrição"]);
  });

  it.each([null, "", "2030-02-30T23:59:00+00:00", "2030-10-14T25:00:00+00:00", "2030-10-14T23:59:00", "inválido"])("omite prazo ausente ou inválido sem inventar uma data: %s", async (registration_deadline) => {
    api.defaults.adapter = (config) => Promise.resolve(response(config, { ...event, registration_deadline }));
    show();
    await screen.findByRole("heading", { name: event.name });
    expect(document.querySelector("time")).toBeNull();
    expect(screen.queryByText(/Inscrições até|Data limite de inscrição:/)).not.toBeInTheDocument();
  });

  it("omite morada e mapa quando o payload online tem localização física nula", async () => {
    api.defaults.adapter = (config) => Promise.resolve(response(config, { ...event, address: null, latitude: null, longitude: null }));
    show();
    await screen.findByRole("heading", { name: event.name });
    expect(screen.queryByText(event.address)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Abrir no Google Maps" })).not.toBeInTheDocument();
    expect(screen.queryByTitle("Mapa da localização do evento")).not.toBeInTheDocument();
    expect(screen.queryByText(event.online_url)).not.toBeInTheDocument();
  });

  it.each([
    [8, 40, "Apenas 8 vagas disponíveis!"],
    [1, 5, "Apenas 1 vaga disponível!"],
    [9, 40, "9 vagas disponíveis"],
    [0, 40, "Evento lotado"],
    [null, 40, "Vagas por confirmar"],
    [1, null, "1 vaga disponível"],
  ])("aplica o aviso apenas até 20%% da capacidade com dados reais (%s/%s)", async (available_spots, max_attendees, text) => {
    api.defaults.adapter = (config) => Promise.resolve(response(config, { ...event, available_spots, max_attendees }));
    show();
    await screen.findByRole("heading", { name: event.name });
    expect(screen.getByText(text)).toBeInTheDocument();
    if (!text.startsWith("Apenas")) expect(screen.queryByText(/^Apenas/)).not.toBeInTheDocument();
  });

  it("mantém o evento no layout público da aplicação", async () => {
    render(<MemoryRouter initialEntries={[`/eventos/${id}`]}><AppRouter /></MemoryRouter>);
    await screen.findByRole("heading", { name: event.name });
    expect(screen.getByRole("main")).toContainElement(screen.getByRole("heading", { name: event.name }));
    expect(screen.getByRole("main").previousElementSibling).toHaveTextContent("ASPEC");
    expect(screen.getByRole("contentinfo")).toHaveTextContent("ASPEC");
  });

  it("apresenta ausências sem inventar vagas, data ou horário", async () => {
    api.defaults.adapter = (config) => Promise.resolve(response(config, { id, name: event.name, event_date: "2030-02-30", event_start_time: "25:00" }));
    show();
    await screen.findByRole("heading", { name: event.name });
    for (const text of ["Descrição não disponível.", "Sem notas adicionais.", "Data por confirmar", "Horário por confirmar", "Localização por confirmar", "Vagas por confirmar", "Lotação por confirmar"]) expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("apresenta zero vagas como lotado e preserva lotação e inscritos iguais a zero", async () => {
    api.defaults.adapter = (config) => Promise.resolve(response(config, { ...event, available_spots: 0, max_attendees: 0, registrations_count: 0 }));
    show();
    await screen.findByText("Evento lotado");
    expect(screen.getByText("0 / 0")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByText("Lotação por confirmar")).not.toBeInTheDocument();
    expect(screen.queryByText("Ocupação por confirmar")).not.toBeInTheDocument();
  });

  it("distingue capacidade conhecida de ocupação indisponível sem inventar inscritos", async () => {
    api.defaults.adapter = (config) => Promise.resolve(response(config, { ...event, registrations_count: null }));
    show();
    await screen.findByRole("heading", { name: event.name });
    expect(screen.getByText("Por confirmar / 20")).toBeInTheDocument();
    expect(screen.getByText("Ocupação por confirmar")).toBeInTheDocument();
    expect(screen.queryByText("Lotação por confirmar")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("trata ID inválido sem pedido", async () => {
    const adapter = vi.fn();
    api.defaults.adapter = adapter;
    show("invalido");
    expect(screen.getByRole("heading", { name: "Evento não encontrado" })).toBeInTheDocument();
    expect(document.title).toBe("Evento não encontrado | ASPEC");
    expect(adapter).not.toHaveBeenCalled();
  });

  it("trata 404 como evento indisponível", async () => {
    api.defaults.adapter = (config) => fail(config, 404);
    show();
    await screen.findByRole("heading", { name: "Evento não encontrado" });
    await waitFor(() => expect(document.title).toBe("Evento não encontrado | ASPEC"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each([
    [403, "Não tem permissão para consultar este evento."],
    [419, "A sessão expirou. Atualize a página e tente novamente."],
    [429, "Demasiados pedidos. Tente novamente mais tarde."],
    [500, "Não foi possível carregar o evento. Tente novamente."],
  ])("trata HTTP %s e permite repetir com teclado sem expor erros internos", async (status, message) => {
    api.defaults.adapter = (config) => fail(config, status);
    show();
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(document.title).toBe("Detalhe do evento | ASPEC");
    expect(screen.queryByText(/confidencial/)).not.toBeInTheDocument();
    api.defaults.adapter = (config) => Promise.resolve(response(config));
    screen.getByRole("button", { name: "Tentar novamente" }).focus();
    await userEvent.setup().keyboard("{Enter}");
    await screen.findByRole("heading", { name: event.name });
  });

  it("trata falhas de rede e cancela o pedido ao desmontar", async () => {
    api.defaults.adapter = () => Promise.reject(new AxiosError("Network Error", AxiosError.ERR_NETWORK));
    const view = show();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar o evento");
    view.unmount();
    let signal;
    api.defaults.adapter = (config) => { signal = config.signal; return new Promise(() => {}); };
    const pending = show();
    await waitFor(() => expect(signal).toBeDefined());
    pending.unmount();
    expect(signal.aborted).toBe(true);
  });

  it("cancela e ignora a resposta antiga depois de mudar o ID", async () => {
    const pending = [];
    api.defaults.adapter = (config) => new Promise((resolve) => pending.push({ config, resolve }));
    render(<MemoryRouter initialEntries={[`/eventos/${id}`]}><Link to={`/eventos/${otherId}`}>Outro evento</Link><Routes><Route path="/eventos/:id" element={<EventDetailPage />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(pending).toHaveLength(1));
    await userEvent.setup().click(screen.getByRole("link", { name: "Outro evento" }));
    await waitFor(() => expect(pending).toHaveLength(2));
    expect(pending[0].config.signal.aborted).toBe(true);
    await act(async () => pending[1].resolve(response(pending[1].config, { ...event, id: otherId, name: "Outro encontro" })));
    await screen.findByRole("heading", { name: "Outro encontro" });
    expect(document.title).toBe("Outro encontro | ASPEC");
    await act(async () => pending[0].resolve(response(pending[0].config)));
    expect(document.title).toBe("Outro encontro | ASPEC");
    expect(screen.queryByRole("heading", { name: event.name })).not.toBeInTheDocument();
  });

  it("limpa resultados e ignora respostas antigas numa mudança de sessão", async () => {
    const pending = [];
    api.defaults.adapter = (config) => new Promise((resolve) => pending.push({ config, resolve }));
    show();
    await waitFor(() => expect(pending).toHaveLength(1));
    await act(async () => useAuthStore.getState().clearSession());
    await waitFor(() => expect(pending).toHaveLength(2));
    expect(pending[0].config.signal.aborted).toBe(true);
    await act(async () => pending[1].resolve(response(pending[1].config, { ...event, name: "Sessão atual" })));
    await screen.findByRole("heading", { name: "Sessão atual" });
    await act(async () => pending[0].resolve(response(pending[0].config)));
    expect(screen.queryByRole("heading", { name: event.name })).not.toBeInTheDocument();
    await act(async () => useAuthStore.getState().clearSession());
    expect(screen.queryByRole("heading", { name: "Sessão atual" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("A carregar evento");
    expect(document.title).toBe("Detalhe do evento | ASPEC");
  });

  it("retira o nome carregado ao mudar de evento e atualiza o título seguinte", async () => {
    const pending = [];
    api.defaults.adapter = (config) => new Promise((resolve) => pending.push({ config, resolve }));
    render(<MemoryRouter initialEntries={[`/eventos/${id}`]}><Link to={`/eventos/${otherId}`}>Outro evento</Link><Routes><Route path="/eventos/:id" element={<EventDetailPage />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(pending).toHaveLength(1));
    await act(async () => pending[0].resolve(response(pending[0].config)));
    expect(document.title).toBe(`${event.name} | ASPEC`);
    await userEvent.setup().click(screen.getByRole("link", { name: "Outro evento" }));
    expect(document.title).toBe("Detalhe do evento | ASPEC");
    await waitFor(() => expect(pending).toHaveLength(2));
    const name = '<script>exemplo</script> & Encontro';
    await act(async () => pending[1].resolve(response(pending[1].config, { ...event, id: otherId, name })));
    expect(document.title).toBe(`${name} | ASPEC`);
    expect(document.querySelector('title script')).toBeNull();
  });

  it("renderiza descrições e notas como texto sem executar HTML da API", async () => {
    api.defaults.adapter = (config) => Promise.resolve(response(config, { ...event, description: '<img src=x onerror="alert(1)">', organizer_notes: '<script>alert(1)</script>' }));
    show();
    await screen.findByRole("heading", { name: event.name });
    expect(screen.getByText('<img src=x onerror="alert(1)">')).toBeInTheDocument();
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();
    expect(document.querySelector("img, script")).toBeNull();
  });
});
