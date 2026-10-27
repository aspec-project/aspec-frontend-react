import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError } from "axios";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EventDetailPage from "../../src/pages/EventDetailPage";
import { api } from "../../src/services/api";
import { useAuthStore } from "../../src/store/authStore";

vi.mock("../../src/components/events/EventLocationMap", () => ({ default: () => null }));
const id = "019512a1-9999-7123-8123-123456789abc";
const other = "019512a1-9998-7123-8123-123456789abc";
const member = { id, role: { name: "Member" }, account_status: { name: "Active" } };
const initial = { id, name: "Encontro", category: { name: "Categoria" }, location: { name: "Lisboa" }, available_spots: 3, max_attendees: 20, registrations_count: 17, registration_deadline: "2030-10-15T12:00:00Z", registration_open: true, is_registered: false };
const response = (config, data, status = 200) => ({ data: { success: true, data }, status, config, statusText: "", headers: {} });
const fail = (config, status, message) => Promise.reject(new AxiosError("Erro", AxiosError.ERR_BAD_RESPONSE, config, undefined, { ...response(config, null, status), data: { message } }));
function show() { return render(<MemoryRouter initialEntries={[`/eventos/${id}`]}><Link to={`/eventos/${other}`}>Outro evento</Link><Link to={`/eventos/${id}`}>Primeiro evento</Link><Routes><Route path="/eventos/:id" element={<EventDetailPage />} /></Routes></MemoryRouter>); }

describe("Inscrição no detalhe do evento", () => {
  let original, data, calls;
  beforeEach(() => {
    original = api.defaults.adapter;
    data = { ...initial };
    calls = [];
    useAuthStore.setState({ user: member, status: "authenticated", sessionChanging: false });
    api.defaults.adapter = (config) => {
      calls.push(config);
      if (config.method === "get") return Promise.resolve(response(config, { ...data, id: config.url.split("/").at(-1) }));
      if (config.method === "post") { data = { ...data, is_registered: true, registrations_count: 18, available_spots: 2 }; return Promise.resolve(response(config, { id, event_instance_id: id }, 201)); }
      data = { ...data, is_registered: false, registration_open: true, registrations_count: 17, available_spots: 3 };
      return Promise.resolve(response(config, null));
    };
  });
  afterEach(() => { api.defaults.adapter = original; vi.restoreAllMocks(); vi.useRealTimers(); });
  const mutations = () => calls.filter((config) => config.method !== "get");
  async function openRegistration() { await userEvent.setup().click(await screen.findByRole("button", { name: "Inscrever-me", exact: true })); }

  it("confirma com foco seguro, permite Escape e só envia após confirmação", async () => {
    show();
    await openRegistration();
    expect(screen.getByRole("button", { name: "Cancelar", exact: true })).toHaveFocus();
    expect(mutations()).toHaveLength(0);
    await userEvent.setup().keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Inscrever-me", exact: true })).toHaveFocus();
    await openRegistration();
    await userEvent.setup().click(screen.getByRole("button", { name: "Confirmar inscrição" }));
    await screen.findByText("Inscrição confirmada");
    expect(mutations()).toHaveLength(1);
    expect(mutations()[0].data).toBeUndefined();
    expect(screen.getByText("18 / 20")).toBeInTheDocument();
    expect(screen.getByText("Apenas 2 vagas disponíveis!")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar a minha inscrição" })).toBeInTheDocument();
    expect(calls.filter((config) => config.method === "get")).toHaveLength(2);
    expect(screen.getAllByText("Inscrição confirmada")).toHaveLength(1);
    expect(screen.queryByText("Inscrição efetuada com sucesso.")).not.toBeInTheDocument();
    expect(screen.queryByText("Está inscrito neste evento.")).not.toBeInTheDocument();
  });

  it("mostra só a ação dourada ao membro não inscrito e o resumo real ao confirmar", async () => {
    data = { ...data, name: "Encontro de profissionais", event_date: "2030-10-16", event_start_time: "14:00", event_end_time: "17:30", address: "Rua do Encontro, 12", organizer_notes: "Trazer identificação.", online_url: "https://privado.test/segredo" };
    show();
    const action = await screen.findByRole("button", { name: "Inscrever-me", exact: true });
    expect(action).toHaveClass("bg-[#8A7043]");
    expect(action.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByText("Ainda não está inscrito neste evento.")).not.toBeInTheDocument();
    await userEvent.setup().click(action);
    const dialog = screen.getByRole("dialog", { name: "Confirmar inscrição?" });
    expect(dialog).toHaveAccessibleDescription("Reveja o resumo do evento antes de confirmar.");
    for (const text of ["Categoria", data.name, "16 de outubro de 2030", "14:00 – 17:30", data.address, data.organizer_notes]) {
      expect(within(dialog).getByText(text)).toBeInTheDocument();
    }
    expect(within(dialog).getByRole("button", { name: "Confirmar inscrição" })).toHaveClass("bg-[#8A7043]");
    expect(within(dialog).queryByText(/€|gratuito|segredo/i)).not.toBeInTheDocument();
    expect(within(dialog).getByText("Data limite de inscrição")).toBeInTheDocument();
    expect(within(dialog).getByRole("region", { name: "Resumo da confirmação" })).toHaveAttribute("tabindex", "0");
  });

  it("omite campos opcionais ausentes no resumo e apresenta HTML apenas como texto", async () => {
    data = { ...data, category: null, location: null, address: null, organizer_notes: '<img src=x onerror="alert(1)">', online_url: "https://privado.test" };
    show(); await openRegistration();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByText("Morada")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Localização")).not.toBeInTheDocument();
    expect(within(dialog).getByText(data.organizer_notes)).toBeInTheDocument();
    expect(dialog.querySelector("img, script, a")).toBeNull();
    expect(within(dialog).queryByText(/privado|Sem notas/i)).not.toBeInTheDocument();
  });

  it("confirma inscrição online sem morada no resumo nem URL privado antes do prazo", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2030-10-14T12:00:00Z"));
    const address = "Rua física indevida, 12";
    const location = "Local físico indevido";
    const venue = "Sala física indevida";
    const onlineUrl = "https://meet.example.test/inscricao-privada";
    data = {
      ...data, is_online: true, event_date: "2030-10-16", event_start_time: "14:00", event_end_time: "17:30",
      location: { name: location }, venue_name: venue, address, latitude: 38.72, longitude: -9.14,
      online_url: onlineUrl,
    };
    show();
    await openRegistration();
    const dialog = screen.getByRole("dialog", { name: "Confirmar inscrição?" });
    expect(within(dialog).getByText("Evento online")).toBeInTheDocument();
    expect(within(dialog).queryByText("Morada")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Localização")).not.toBeInTheDocument();
    for (const text of [address, location, venue, onlineUrl]) expect(document.body.innerHTML).not.toContain(text);
    expect(screen.queryByRole("link", { name: "Abrir no Google Maps" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Entrar na reunião" })).not.toBeInTheDocument();
    expect(mutations()).toHaveLength(0);

    await userEvent.setup().click(within(dialog).getByRole("button", { name: "Confirmar inscrição" }));
    await screen.findByText("Inscrição confirmada");
    expect(screen.getByText("18 / 20")).toBeInTheDocument();
    expect(screen.getByText("Apenas 2 vagas disponíveis!")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar a minha inscrição" })).toBeInTheDocument();
    expect(calls.map((config) => [config.method, config.url])).toEqual([
      ["get", `/events/${id}`], ["post", `/events/${id}/registrations`], ["get", `/events/${id}`],
    ]);
    expect(mutations()[0].data).toBeUndefined();
    for (const text of [address, location, venue, onlineUrl]) expect(document.body.innerHTML).not.toContain(text);
    expect(screen.queryByRole("link", { name: "Entrar na reunião" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copiar" })).not.toBeInTheDocument();
  });

  it("não inventa notas quando o organizador não forneceu informação", async () => {
    data = { ...data, organizer_notes: null };
    show(); await openRegistration();
    expect(within(screen.getByRole("dialog")).queryByText("Notas do organizador")).not.toBeInTheDocument();
    expect(within(screen.getByRole("dialog")).queryByText("Sem notas adicionais.")).not.toBeInTheDocument();
  });

  it("X fecha o resumo e devolve foco à ação de inscrição", async () => {
    show(); await openRegistration();
    await userEvent.setup().click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Inscrever-me", exact: true })).toHaveFocus();
    expect(mutations()).toHaveLength(0);
  });

  it("mostra uma única faixa verde para inscrição já existente", async () => {
    data = { ...data, is_registered: true };
    show();
    await screen.findByText("Inscrição confirmada");
    expect(screen.getAllByText("Inscrição confirmada")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Cancelar a minha inscrição" })).toHaveClass("border-gray-300");
    expect(screen.queryByText("Está inscrito neste evento.")).not.toBeInTheDocument();
  });

  it("cancela mesmo com evento lotado e volta à ação inicial sem mensagem de sucesso", async () => {
    data = { ...data, is_registered: true, registration_open: false, available_spots: 0, registrations_count: 20 };
    show();
    await userEvent.setup().click(await screen.findByRole("button", { name: "Cancelar a minha inscrição" }));
    await userEvent.setup().click(screen.getByRole("button", { name: "Confirmar cancelamento" }));
    await screen.findByRole("button", { name: "Inscrever-me", exact: true });
    expect(mutations()[0].method).toBe("delete");
    expect(mutations()[0].data).toBeUndefined();
    expect(screen.getByText("17 / 20")).toBeInTheDocument();
    const card = screen.getByRole("region", { name: "Inscrição", exact: true });
    expect(within(card).getAllByRole("button")).toHaveLength(1);
    expect(within(card).queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText("Inscrição cancelada com sucesso.")).not.toBeInTheDocument();
    expect(screen.queryByText("Inscrição confirmada")).not.toBeInTheDocument();
  });

  it("mostra entradas de membro a visitantes sem permitir mutações", async () => {
    useAuthStore.setState({ user: null, status: "idle" });
    show();
    expect(await screen.findByRole("link", { name: "Entrar como membro" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Candidatar-me a membro" })).toHaveAttribute("href", "/registo");
    expect(screen.queryByRole("button", { name: "Inscrever-me" })).not.toBeInTheDocument();
    expect(mutations()).toHaveLength(0);
  });

  it.each([
    [{ ...member, role: { name: "Admin" } }, "authenticated", false],
    [{ ...member, account_status: { name: "Pending" } }, "authenticated", false],
    [{ ...member, account_status: { name: "Inactive" } }, "authenticated", false],
    [member, "loading", false], [member, "logging-out", true], [member, "authenticated", true],
  ])("impede mutações para identidade sem elegibilidade: %j %s %s", async (user, status, changing) => {
    useAuthStore.setState({ user, status, sessionChanging: changing });
    show();
    await screen.findByRole("heading", { name: "Inscrição" });
    expect(screen.queryByRole("button", { name: "Inscrever-me" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar a minha inscrição" })).not.toBeInTheDocument();
    expect(mutations()).toHaveLength(0);
  });

  it.each([{ is_registered: undefined }, { is_registered: "false" }, { registration_open: undefined }, { registration_open: "true" }, { registration_deadline: null }, { registration_deadline: "2030-10-15T12:00:00" }, { registration_deadline: "2020-01-01T00:00:00Z" }])("não inventa elegibilidade com dados insuficientes: %j", async (change) => {
    data = { ...data, ...change };
    show();
    await screen.findByRole("heading", { name: "Inscrição" });
    expect(screen.queryByRole("button", { name: "Inscrever-me" })).not.toBeInTheDocument();
    expect(mutations()).toHaveLength(0);
  });

  it("revalida prazo ao confirmar e fecha diálogo após expiração", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(new Date("2030-10-15T11:59:59Z"));
    show();
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: "Inscrever-me", exact: true }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTime(1000));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTime(1));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("O prazo para gerir a inscrição terminou.")).toBeInTheDocument();
    expect(mutations()).toHaveLength(0);
  });

  it("rejeita confirmação tardia mesmo antes do próximo tick do temporizador", async () => {
    show();
    await openRegistration();
    vi.spyOn(Date, "now").mockReturnValue(Date.parse(initial.registration_deadline) + 1);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar inscrição" }));
    expect(mutations()).toHaveLength(0);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("bloqueia duplo envio e Escape durante pedido pendente", async () => {
    let resolveMutation;
    const originalAdapter = api.defaults.adapter;
    api.defaults.adapter = (config) => config.method === "get" ? originalAdapter(config) : new Promise((resolve) => { calls.push(config); resolveMutation = () => resolve(response(config, { id, event_instance_id: id }, 201)); });
    show();
    await openRegistration();
    const confirm = screen.getByRole("button", { name: "Confirmar inscrição" });
    fireEvent.click(confirm); fireEvent.click(confirm);
    await waitFor(() => expect(mutations()).toHaveLength(1));
    expect(screen.getByRole("button", { name: "A processar..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Fechar" })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    data = { ...data, is_registered: true };
    await act(async () => resolveMutation());
    await screen.findByText("Inscrição confirmada");
  });

  it.each([
    [409, "O evento atingiu a lotação máxima."], [409, "Já está inscrito neste evento."],
    [403, "Não tem permissão para gerir esta inscrição."], [419, "A sessão expirou. Atualize a página e tente novamente."],
    [429, "Demasiados pedidos. Tente novamente mais tarde."],
  ])("reconcilia GET após HTTP %s sem repetir POST", async (status, message) => {
    const adapter = api.defaults.adapter;
    api.defaults.adapter = (config) => {
      if (config.method === "get") return adapter(config);
      calls.push(config); data = { ...data, registration_open: false };
      return fail(config, status, message);
    };
    show(); await openRegistration();
    await userEvent.setup().click(screen.getByRole("button", { name: "Confirmar inscrição" }));
    await screen.findByText(message);
    await waitFor(() => expect(calls.filter((config) => config.method === "get")).toHaveLength(2));
    expect(mutations()).toHaveLength(1);
    await screen.findByText("Inscrições encerradas.");
  });

  it("preserva sucesso e bloqueia nova mutação quando GET falha; repetir atualiza só GET", async () => {
    const adapter = api.defaults.adapter;
    let failRefresh = true;
    api.defaults.adapter = (config) => {
      if (config.method === "get" && mutations().length && failRefresh) { calls.push(config); return fail(config, 500, "interno"); }
      return adapter(config);
    };
    show(); await openRegistration();
    await userEvent.setup().click(screen.getByRole("button", { name: "Confirmar inscrição" }));
    await screen.findByText("Inscrição confirmada");
    const retry = await screen.findByRole("button", { name: "Atualizar estado da inscrição" });
    expect(screen.queryByRole("button", { name: "Inscrever-me", exact: true })).not.toBeInTheDocument();
    failRefresh = false;
    await userEvent.setup().click(retry);
    await screen.findByRole("button", { name: "Cancelar a minha inscrição" });
    expect(screen.getByText("Inscrição confirmada")).toBeInTheDocument();
    expect(mutations()).toHaveLength(1);
  });

  it("não mantém faixa de inscrição após cancelamento confirmado com GET falhado", async () => {
    data = { ...data, is_registered: true };
    const adapter = api.defaults.adapter;
    let failRefresh = true;
    api.defaults.adapter = (config) => {
      if (config.method === "get" && mutations().length && failRefresh) { calls.push(config); return fail(config, 500, "interno"); }
      return adapter(config);
    };
    show();
    await userEvent.setup().click(await screen.findByRole("button", { name: "Cancelar a minha inscrição" }));
    await userEvent.setup().click(screen.getByRole("button", { name: "Confirmar cancelamento" }));
    await screen.findByRole("button", { name: "Atualizar estado da inscrição" });
    expect(screen.queryByText("Inscrição cancelada com sucesso.")).not.toBeInTheDocument();
    expect(screen.queryByText("Inscrição confirmada")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar a minha inscrição" })).not.toBeInTheDocument();
    expect(screen.getByText("17 / 20")).toBeInTheDocument();
    failRefresh = false;
    await userEvent.setup().click(screen.getByRole("button", { name: "Atualizar estado da inscrição" }));
    await screen.findByRole("button", { name: "Inscrever-me", exact: true });
    expect(screen.queryByText("Inscrição cancelada com sucesso.")).not.toBeInTheDocument();
    expect(mutations()).toHaveLength(1);
  });

  it("reconcilia resultado indeterminado de rede sem repetir POST", async () => {
    const adapter = api.defaults.adapter;
    api.defaults.adapter = (config) => {
      if (config.method === "get") return adapter(config);
      calls.push(config); data = { ...data, is_registered: true, registrations_count: 18 };
      return Promise.reject(new AxiosError("Network Error", AxiosError.ERR_NETWORK, config));
    };
    show(); await openRegistration();
    await userEvent.setup().click(screen.getByRole("button", { name: "Confirmar inscrição" }));
    await screen.findByText(/Não foi possível confirmar o resultado/);
    await screen.findByRole("button", { name: "Cancelar a minha inscrição" });
    expect(mutations()).toHaveLength(1);
    expect(screen.queryByText("Inscrição efetuada com sucesso.")).not.toBeInTheDocument();
  });

  it("reconcilia DELETE404 e evita ecoar mensagens internas", async () => {
    data = { ...data, is_registered: true };
    const adapter = api.defaults.adapter;
    api.defaults.adapter = (config) => {
      if (config.method === "get") return adapter(config);
      calls.push(config); data = { ...data, is_registered: false };
      return fail(config, 404, "Não existe inscrição sua para este evento.");
    };
    show(); await userEvent.setup().click(await screen.findByRole("button", { name: "Cancelar a minha inscrição" }));
    await userEvent.setup().click(screen.getByRole("button", { name: "Confirmar cancelamento" }));
    await screen.findByText("O evento ou a sua inscrição já não está disponível.");
    await screen.findByRole("button", { name: "Inscrever-me", exact: true });
    expect(mutations()).toHaveLength(1);
  });

  it("fecha confirmação e limpa feedback na mudança de identidade", async () => {
    show(); await openRegistration();
    await act(async () => useAuthStore.setState({ user: { ...member, id: other } }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mutations()).toHaveLength(0);
    await screen.findByRole("button", { name: "Inscrever-me", exact: true });
  });

  it("ignora sucesso antigo após navegar ID A → B → A enquanto pedido está pendente", async () => {
    let resolveMutation, signal;
    const adapter = api.defaults.adapter;
    api.defaults.adapter = (config) => config.method === "get" ? adapter(config) : new Promise((resolve) => { calls.push(config); signal = config.signal; resolveMutation = () => resolve(response(config, { id, event_instance_id: id }, 201)); });
    show(); await openRegistration();
    await userEvent.setup().click(screen.getByRole("button", { name: "Confirmar inscrição" }));
    await userEvent.setup().click(screen.getByRole("link", { name: "Outro evento" }));
    await screen.findByRole("button", { name: "Inscrever-me", exact: true });
    await userEvent.setup().click(screen.getByRole("link", { name: "Primeiro evento" }));
    await screen.findByRole("button", { name: "Inscrever-me", exact: true });
    expect(signal.aborted).toBe(true);
    await act(async () => resolveMutation());
    expect(screen.queryByText("Inscrição efetuada com sucesso.")).not.toBeInTheDocument();
    expect(mutations()).toHaveLength(1);
  });

  it("aborta pedido na mudança de sessão sem expor feedback à identidade nova", async () => {
    let resolveMutation, signal;
    const adapter = api.defaults.adapter;
    api.defaults.adapter = (config) => config.method === "get" ? adapter(config) : new Promise((resolve) => { calls.push(config); signal = config.signal; resolveMutation = () => resolve(response(config, { id, event_instance_id: id }, 201)); });
    show(); await openRegistration();
    await userEvent.setup().click(screen.getByRole("button", { name: "Confirmar inscrição" }));
    await act(async () => useAuthStore.getState().clearSession());
    expect(signal.aborted).toBe(true);
    await screen.findByRole("link", { name: "Entrar como membro" });
    await act(async () => resolveMutation());
    expect(screen.queryByText("Inscrição efetuada com sucesso.")).not.toBeInTheDocument();
  });
});
