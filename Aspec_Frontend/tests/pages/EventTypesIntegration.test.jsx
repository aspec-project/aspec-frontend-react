import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EventDetailPage from "../../src/pages/EventDetailPage";
import { api } from "../../src/services/api";
import { useAuthStore } from "../../src/store/authStore";

vi.mock("../../src/components/events/EventLocationMap", () => ({ default: () => <div aria-label="Mapa do local" /> }));

// Fixtures do modelo interno preparado: não representam um contrato de séries
// publicado pela API. Neste teste cada id corresponde explicitamente a um evento.
const firstId = "019512a1-9999-7123-8123-123456789abc";
const secondId = "019512a1-9998-7123-8123-123456789abc";
const first = {
  id: firstId, name: "Ciclo de encontros", description: "Descrição", category: { name: "Formação" },
  is_online: true, location: { name: "Local físico indevido" }, venue_name: "Sala indevida", address: "Rua indevida", latitude: 38, longitude: -9,
  event_date: "2030-10-15", event_start_time: "10:00", event_end_time: "12:00",
  registration_deadline: "2030-10-14T23:59:00+01:00", registration_open: true, is_registered: false,
  max_attendees: 20, registrations_count: 12, available_spots: 8,
  online_url: "https://meet.example.test/privado",
};
const second = { ...first, id: secondId, event_date: "2030-10-22", event_start_time: "14:00", event_end_time: "16:00", registration_deadline: "2030-10-21T23:59:00+01:00", is_registered: true, max_attendees: 30, registrations_count: 25, available_spots: 5 };
const member = { id: "membro-fixture", role: { name: "Member" }, account_status: { name: "Active" } };
const response = (config, data) => ({ config, status: 200, statusText: "OK", headers: {}, data: { success: true, data } });
function show(sessions = null) {
  return render(<MemoryRouter initialEntries={[`/eventos/${firstId}`]}><Routes><Route path="/eventos/:id" element={<EventDetailPage sessions={sessions} recurrenceLabel={sessions ? "Ciclo semanal" : ""} />} /></Routes></MemoryRouter>);
}

describe("Modalidade e seleção de sessões — fixtures de integração", () => {
  let originalAdapter;
  let originalAuth;
  let requests;
  beforeEach(() => {
    originalAdapter = api.defaults.adapter;
    originalAuth = useAuthStore.getState();
    useAuthStore.setState({ status: "authenticated", sessionChanging: false, user: member });
    requests = [];
    api.defaults.adapter = async (config) => {
      requests.push(config);
      return response(config, config.url.endsWith(secondId) ? second : first);
    };
  });
  afterEach(() => { api.defaults.adapter = originalAdapter; act(() => useAuthStore.setState(originalAuth, true)); vi.restoreAllMocks(); });

  it.each([true, false])("seleciona sessão por ID e atualiza lotação, horário, prazo e inscrição (online=%s)", async (is_online) => {
    const fixtures = [first, second].map((event) => ({ ...event, is_online }));
    api.defaults.adapter = async (config) => { requests.push(config); return response(config, config.url.endsWith(secondId) ? fixtures[1] : fixtures[0]); };
    show(fixtures);
    await screen.findByText("12 / 20");
    const button = screen.getByRole("button", { name: /22 de outubro de 2030/ });
    await userEvent.setup().click(button);
    await screen.findByText("25 / 30");
    expect(screen.queryByText("12 / 20")).not.toBeInTheDocument();
    expect(screen.getByText("14:00 – 16:00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar a minha inscrição" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /22 de outubro de 2030/ })).toHaveAttribute("aria-pressed", "true");
    expect(requests.map((config) => [config.method, config.url])).toEqual([["get", `/events/${firstId}`], ["get", `/events/${secondId}`]]);
    expect(screen.getAllByText(/21 de outubro de 2030 às 23:59/).length).toBeGreaterThan(0);
  });

  it("fecha o diálogo anterior e oculta dados antigos enquanto carrega a sessão seguinte", async () => {
    let resolve;
    let pending;
    api.defaults.adapter = (config) => config.url.endsWith(secondId)
      ? new Promise((done) => { resolve = done; pending = config; })
      : Promise.resolve(response(config, first));
    show([first, second]);
    await userEvent.setup().click(await screen.findByRole("button", { name: "Inscrever-me" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Cancelar" }));
    await userEvent.setup().click(screen.getByRole("button", { name: /22 de outubro de 2030/ }));
    await waitFor(() => expect(resolve).toBeTypeOf("function"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("12 / 20")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("A carregar evento");
    await act(async () => resolve(response(pending, second)));
    await screen.findByText("25 / 30");
  });

  it("online não expõe localização física nem URL e não inventa sessões na rota normal", async () => {
    show();
    await screen.findByRole("heading", { name: "Acesso à reunião online" });
    for (const text of [first.address, first.venue_name, first.location.name, first.online_url]) expect(document.body).not.toHaveTextContent(text);
    expect(screen.queryByLabelText("Mapa do local")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Abrir no Google Maps" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Sessões" })).not.toBeInTheDocument();
    expect(screen.queryByText("Recorrente")).not.toBeInTheDocument();
  });

  it("preserva o estado reconciliado da primeira inscrição ao selecionar outra sessão", async () => {
    let registered = false;
    api.defaults.adapter = async (config) => {
      requests.push(config);
      if (config.method === "post") {
        registered = true;
        return { ...response(config, { id: "019512a1-8888-7123-8123-123456789abc", event_instance_id: firstId }), status: 201 };
      }
      return response(config, config.url.endsWith(secondId) ? second : { ...first, is_registered: registered });
    };
    show([first, second]);
    await userEvent.setup().click(await screen.findByRole("button", { name: "Inscrever-me" }));
    await userEvent.setup().click(screen.getByRole("button", { name: "Confirmar inscrição" }));
    await screen.findByText("Inscrição confirmada");
    await userEvent.setup().click(screen.getByRole("button", { name: /22 de outubro de 2030/ }));
    await screen.findByText("25 / 30");
    expect(screen.getByRole("button", { name: /15 de outubro de 2030.*Inscrito/ })).toBeInTheDocument();
    expect(requests.filter((config) => config.method === "post")).toHaveLength(1);
  });

  it("retira o URL autorizado antes de carregar os dados de outro membro", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse(first.registration_deadline) + 1);
    let resolve;
    let pending;
    api.defaults.adapter = async (config) => response(config, { ...first, is_registered: true });
    show();
    await screen.findByRole("link", { name: "Entrar na reunião" });
    api.defaults.adapter = (config) => new Promise((done) => { resolve = done; pending = config; });
    act(() => useAuthStore.setState({ user: { ...member, id: "outro-membro" } }));
    expect(document.body.innerHTML).not.toContain(first.online_url);
    await waitFor(() => expect(resolve).toBeTypeOf("function"));
    await act(async () => resolve(response(pending, { ...first, is_registered: false })));
    await screen.findByRole("heading", { name: first.name });
    expect(document.body.innerHTML).not.toContain(first.online_url);
  });
});
