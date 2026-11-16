import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError } from "axios";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EventDetailPage from "../../src/pages/EventDetailPage";
import { api } from "../../src/services/api";
import { useAuthStore } from "../../src/store/authStore";

const seriesId = "019512a1-7777-7123-8123-123456789abc";
const id = "019512a1-9999-7123-8123-123456789abc";
const nextId = "019512a1-9998-7123-8123-123456789abc";
const pastId = "019512a1-9997-7123-8123-123456789abc";
const registrationId = "019512a1-8888-7123-8123-123456789abc";
const base = {
  id, series_id: seriesId, name: "Encontros da série", description: "Encontros entre membros.",
  category: { name: "Encontro" }, is_online: true,
  event_date: "2030-10-15", event_start_time: "10:00", event_end_time: "12:00",
  registration_deadline: "2030-10-14T23:59:00+01:00", registration_open: true,
  is_registered: false, max_attendees: 20, registrations_count: 10, available_spots: 10,
};
const response = (config, data, status = 200) => ({ config, status, statusText: "", headers: {}, data: { success: true, data } });
const show = () => render(<MemoryRouter initialEntries={[`/eventos/${id}`]}><Routes><Route path="/eventos/:id" element={<EventDetailPage />} /></Routes></MemoryRouter>);
const seriesRegion = () => screen.getByRole("region", { name: "Sessões" });
const seriesButton = (day) => within(seriesRegion()).getByRole("button", { name: new RegExp(`, ${day} de outubro de 2030`) });

describe("Integração real do contrato de séries no detalhe", () => {
  let originalAdapter, originalAuth, calls, events, listFails, conflict, conflictMessage, uncertain;
  function adapter(config) {
    calls.push(config);
    if (config.url === "/events") {
      if (listFails) return Promise.reject(new Error("Rede indisponível"));
      return Promise.resolve(response(config, { items: [...events].reverse(), pagination: { current_page: 1, per_page: 9, total: 3, last_page: 1 } }));
    }
    const targetId = config.url.split("/")[2];
    const target = events.find((event) => event.id === targetId);
    if (config.method === "get") return Promise.resolve(response(config, target));
    if (conflict) return Promise.reject(new AxiosError("Conflito", AxiosError.ERR_BAD_RESPONSE, config, undefined, { ...response(config, null, 409), data: { message: conflictMessage } }));
    const group = config.method === "post" && JSON.parse(config.data || "{}").scope === "this_and_following";
    const affected = group ? events.filter((event) => event.event_date >= target.event_date) : [target];
    for (const event of affected) {
      event.is_registered = config.method === "post";
      event.registrations_count += event.is_registered ? 1 : -1;
      event.available_spots += event.is_registered ? -1 : 1;
    }
    if (uncertain) return Promise.reject(new AxiosError("Ligação interrompida", AxiosError.ERR_NETWORK, config));
    const data = config.method === "delete" ? null : group
      ? { registrations: affected.map((event, index) => ({ id: index ? seriesId : registrationId, event_instance_id: event.id })) }
      : { id: registrationId, event_instance_id: targetId };
    return Promise.resolve(response(config, data, config.method === "post" ? 201 : 200));
  }
  beforeEach(() => {
    originalAdapter = api.defaults.adapter;
    originalAuth = useAuthStore.getState();
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2030-10-10T12:00:00Z"));
    useAuthStore.setState({ status: "authenticated", sessionChanging: false, user: { id: "membro-teste", role: { name: "Member" }, account_status: { name: "Active" } } });
    events = [
      { ...base, id: pastId, event_date: "2030-10-01", registration_deadline: "2030-09-30T23:59:00+01:00", registration_open: false },
      { ...base },
      { ...base, id: nextId, event_date: "2030-10-22", registration_deadline: "2030-10-21T23:59:00+01:00" },
    ];
    calls = []; listFails = false; conflict = false; conflictMessage = "O evento atingiu a lotação máxima."; uncertain = false;
    api.defaults.adapter = adapter;
  });
  afterEach(() => { api.defaults.adapter = originalAdapter; act(() => useAuthStore.setState(originalAuth, true)); vi.restoreAllMocks(); });

  it("consulta a série completa, ordena e permite consultar passadas sem inscrição", async () => {
    show();
    await screen.findByRole("button", { name: /22 de outubro de 2030/ });
    const buttons = within(seriesRegion()).getAllByRole("button");
    expect(buttons.map((button) => button.textContent)).toEqual([expect.stringContaining("1 de outubro"), expect.stringContaining("15 de outubro"), expect.stringContaining("22 de outubro")]);
    expect(calls.find((config) => config.url === "/events").params.series_id).toBe(seriesId);
    await userEvent.setup().click(seriesButton(1));
    await screen.findByText(/Esta sessão já começou/);
    expect(screen.queryByRole("button", { name: "Inscrever-me" })).not.toBeInTheDocument();
    await screen.findByRole("button", { name: /22 de outubro de 2030/ });
    await userEvent.setup().click(seriesButton(22));
    await screen.findByRole("button", { name: "Inscrever-me" });
    expect(seriesButton(22)).toHaveAttribute("aria-pressed", "true");
  });

  it.each(["this", "this_and_following"])("inscreve no âmbito %s e reconcilia toda a série; cancelamento continua individual", async (scope) => {
    show();
    await userEvent.setup().click(await screen.findByRole("button", { name: "Inscrever-me" }));
    expect(screen.getByRole("radio", { name: "Só nesta sessão" })).toBeChecked();
    if (scope === "this_and_following") await userEvent.setup().click(screen.getByRole("radio", { name: "Nesta e nas seguintes" }));
    await userEvent.setup().click(screen.getByRole("button", { name: "Confirmar inscrição" }));
    await screen.findByText("Inscrição confirmada");
    await waitFor(() => expect(calls.filter((config) => config.url === "/events")).toHaveLength(2));
    const post = calls.find((config) => config.method === "post");
    expect(post.data).toBe(scope === "this" ? undefined : JSON.stringify({ scope }));
    expect(screen.getByText("11 / 20")).toBeInTheDocument();
    expect(seriesButton(22).textContent.includes("Inscrito")).toBe(scope === "this_and_following");
    await userEvent.setup().click(screen.getByRole("button", { name: "Cancelar a minha inscrição" }));
    await userEvent.setup().click(screen.getByRole("button", { name: "Confirmar cancelamento" }));
    await screen.findByRole("button", { name: "Inscrever-me" });
    expect(screen.getByText("10 / 20")).toBeInTheDocument();
    expect(calls.filter((config) => config.url === "/events")).toHaveLength(3);
    expect(calls.filter((config) => config.method === "delete")).toHaveLength(1);
    expect(seriesButton(22).textContent.includes("Inscrito")).toBe(scope === "this_and_following");
  });

  it("trata o 409 do grupo sem assumir inscrições parciais e atualiza a lista", async () => {
    conflict = true;
    show();
    await userEvent.setup().click(await screen.findByRole("button", { name: "Inscrever-me" }));
    await userEvent.setup().click(screen.getByRole("radio", { name: "Nesta e nas seguintes" }));
    await userEvent.setup().click(screen.getByRole("button", { name: "Confirmar inscrição" }));
    await screen.findByText(/Não foram efetuadas inscrições neste pedido/);
    expect(within(seriesRegion()).queryByText("Inscrito")).not.toBeInTheDocument();
    expect(screen.getByText("10 / 20")).toBeInTheDocument();
    expect(calls.filter((config) => config.url === "/events")).toHaveLength(2);
    await userEvent.setup().click(screen.getByRole("button", { name: "Inscrever-me" }));
    expect(screen.getByRole("radio", { name: "Nesta e nas seguintes" })).toBeChecked();
  });

  it("o 409 do grupo indica a data da sessão que falhou", async () => {
    conflict = true;
    conflictMessage = "Já está inscrito na sessão de 18/11/2030.";
    show();
    await userEvent.setup().click(await screen.findByRole("button", { name: "Inscrever-me" }));
    await userEvent.setup().click(screen.getByRole("radio", { name: "Nesta e nas seguintes" }));
    await userEvent.setup().click(screen.getByRole("button", { name: "Confirmar inscrição" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Já está inscrito na sessão de 18/11/2030. Não foram efetuadas inscrições neste pedido.");
    await waitFor(() => expect(calls.filter((config) => config.url === "/events")).toHaveLength(2));
    expect(within(seriesRegion()).queryByText("Inscrito")).not.toBeInTheDocument();
  });

  it("se a atualização da série falhar, bloqueia mutações e repete apenas GET", async () => {
    api.defaults.adapter = (config) => {
      const pending = adapter(config);
      if (config.method === "post") listFails = true;
      return pending;
    };
    show();
    await userEvent.setup().click(await screen.findByRole("button", { name: "Inscrever-me" }));
    await userEvent.setup().click(screen.getByRole("radio", { name: "Nesta e nas seguintes" }));
    await userEvent.setup().click(screen.getByRole("button", { name: "Confirmar inscrição" }));
    const retry = await screen.findByRole("button", { name: "Atualizar estado da inscrição" });
    expect(screen.queryByRole("button", { name: "Cancelar a minha inscrição" })).not.toBeInTheDocument();
    expect(screen.getByText("10 / 20")).toBeInTheDocument();
    listFails = false;
    await userEvent.setup().click(retry);
    await waitFor(() => expect(screen.queryByRole("button", { name: "Atualizar estado da inscrição" })).not.toBeInTheDocument());
    expect(screen.getByText("11 / 20")).toBeInTheDocument();
    expect(seriesButton(22)).toHaveTextContent("Inscrito");
    expect(calls.filter((config) => config.method === "post")).toHaveLength(1);
  });

  it("reconcilia um POST de resultado incerto sem o repetir", async () => {
    uncertain = true;
    show();
    await userEvent.setup().click(await screen.findByRole("button", { name: "Inscrever-me" }));
    await userEvent.setup().click(screen.getByRole("radio", { name: "Nesta e nas seguintes" }));
    await userEvent.setup().click(screen.getByRole("button", { name: "Confirmar inscrição" }));
    await screen.findByText("Inscrição confirmada");
    expect(seriesButton(22)).toHaveTextContent("Inscrito");
    expect(screen.getByRole("alert")).toHaveTextContent(/Não foi possível confirmar o resultado/);
    expect(calls.filter((config) => config.method === "post")).toHaveLength(1);
  });

  it("mostra erro da listagem e permite retry", async () => {
    listFails = true;
    show();
    await screen.findByText("Não foi possível carregar as sessões. Tente novamente.");
    expect(screen.queryByRole("button", { name: "Inscrever-me" })).not.toBeInTheDocument();
    listFails = false;
    await userEvent.setup().click(within(seriesRegion()).getByRole("button", { name: "Tentar novamente" }));
    await screen.findByRole("button", { name: "Inscrever-me" });
  });

  it("apresenta uma série vazia e bloqueia inscrições", async () => {
    api.defaults.adapter = (config) => config.url === "/events"
      ? Promise.resolve(response(config, { items: [], pagination: { current_page: 1, per_page: 9, total: 0, last_page: 1 } }))
      : adapter(config);
    show();
    await screen.findByText("Ainda não existem sessões disponíveis.");
    expect(screen.queryByRole("button", { name: "Inscrever-me" })).not.toBeInTheDocument();
  });

  it("bloqueia inscrição numa sessão passada mesmo com prazo e disponibilidade incorretamente abertos", async () => {
    events[1].event_date = "2030-10-01";
    show();
    await screen.findByRole("button", { name: /22 de outubro de 2030/ });
    expect(screen.getByText(/Esta sessão já começou/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Inscrever-me" })).not.toBeInTheDocument();
    expect(calls.every((config) => config.method === "get")).toBe(true);
  });

  it("mantém loading até a série chegar e ignora respostas de uma identidade anterior", async () => {
    let finish;
    api.defaults.adapter = (config) => config.url === "/events"
      ? new Promise((resolve) => { finish = () => resolve(response(config, { items: events, pagination: { current_page: 1, per_page: 9, total: 3, last_page: 1 } })); })
      : adapter(config);
    show();
    await screen.findByText("A carregar sessões...");
    expect(screen.queryByRole("button", { name: "Inscrever-me" })).not.toBeInTheDocument();
    await waitFor(() => expect(finish).toBeTypeOf("function"));
    const finishPrevious = finish;
    api.defaults.adapter = (config) => config.url === "/events"
      ? Promise.resolve(response(config, { items: events.map((event) => ({ ...event, is_registered: true })), pagination: { current_page: 1, per_page: 9, total: 3, last_page: 1 } }))
      : adapter(config);
    act(() => useAuthStore.setState({ user: { ...useAuthStore.getState().user, id: "outro-membro" } }));
    await screen.findByRole("button", { name: /22 de outubro de 2030.*Inscrito/ });
    await act(async () => finishPrevious());
    expect(seriesButton(22)).toHaveTextContent("Inscrito");
  });
});
