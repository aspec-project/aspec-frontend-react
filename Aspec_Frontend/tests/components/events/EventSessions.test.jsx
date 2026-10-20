import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import EventSessions from "../../../src/components/events/EventSessions";

/*
 * Fixtures do modelo interno preparado para sessões; não representam
 * um endpoint ou uma relação de recorrência já publicados pela API.
 */
const sessionFixtures = [
  { id: "019512a1-9999-7123-8123-123456789abc", event_date: "2030-10-14", event_start_time: "08:00", event_end_time: "09:30", registration_deadline: "2030-10-12T23:59:00+01:00", is_registered: true, registration_open: false },
  { id: "019512a1-9998-7123-8123-123456789abc", event_date: "2030-10-21", event_start_time: "09:00", event_end_time: "10:30", registration_deadline: "2030-10-19T23:59:00+01:00", is_registered: false, registration_open: true },
  { id: "019512a1-9997-7123-8123-123456789abc", event_date: "2030-10-28", event_start_time: "10:00", event_end_time: "11:30", registration_deadline: "2030-10-26T23:59:00+01:00", is_registered: false, registration_open: false },
];

describe("EventSessions", () => {
  it("apresenta datas, horários, prazos e estados de cada sessão", () => {
    render(<EventSessions sessions={sessionFixtures} selectedId={sessionFixtures[0].id} onSelect={vi.fn()} recurrenceLabel="Todas as segundas-feiras · 3 sessões" />);
    expect(screen.getByRole("heading", { name: "Sessões" })).toBeInTheDocument();
    expect(screen.getByText(/Todas as segundas-feiras · 3 sessões/)).toBeInTheDocument();
    expect(screen.getByText("Segunda-feira, 14 de outubro de 2030")).toBeInTheDocument();
    expect(screen.getByText(/08:00 — 09:30 · inscrições até 12 de outubro de 2030/)).toBeInTheDocument();
    expect(screen.getByText(/09:00 — 10:30 · inscrições até 19 de outubro de 2030/)).toBeInTheDocument();
    expect(screen.getByText("Inscrito")).toBeInTheDocument();
    expect(screen.getByText("Abertas")).toBeInTheDocument();
    expect(screen.getByText("Encerradas")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("seleciona pelo ID real através do teclado e reflete a seleção controlada", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { rerender } = render(<EventSessions sessions={sessionFixtures} selectedId={sessionFixtures[0].id} onSelect={onSelect} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveAttribute("aria-pressed", "true");
    await user.tab();
    await user.tab();
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(sessionFixtures[1].id);
    rerender(<EventSessions sessions={sessionFixtures} selectedId={sessionFixtures[1].id} onSelect={onSelect} />);
    expect(buttons[0]).toHaveAttribute("aria-pressed", "false");
    expect(buttons[1]).toHaveAttribute("aria-pressed", "true");
  });

  it("permite consultar sessões encerradas sem alterar inscrições", async () => {
    const onSelect = vi.fn();
    render(<EventSessions sessions={sessionFixtures} onSelect={onSelect} />);
    await userEvent.setup().click(screen.getByRole("button", { name: /28 de outubro/ }));
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(sessionFixtures[2].id);
  });

  it.each([
    [{ status: "loading" }, "A carregar sessões..."],
    [{ status: "unavailable" }, "As sessões ainda não estão disponíveis para consulta."],
    [{ sessions: [] }, "Ainda não existem sessões disponíveis."],
    [{ status: "empty" }, "Ainda não existem sessões disponíveis."],
  ])("distingue o estado %j sem inventar sessões", (props, message) => {
    render(<EventSessions {...props} />);
    expect(screen.getByRole("status")).toHaveTextContent(message);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("apresenta erro e permite repetir o carregamento sem expor detalhes internos", async () => {
    const onRetry = vi.fn();
    render(<EventSessions status="error" error="Detalhes privados" onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar as sessões.");
    expect(screen.queryByText("Detalhes privados")).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it.each([
    [{ ...sessionFixtures[0], id: "sessao-inventada" }],
    [sessionFixtures[0], sessionFixtures[0]],
    [sessionFixtures[0], { ...sessionFixtures[0], id: sessionFixtures[0].id.toUpperCase() }],
    [null],
  ])("rejeita IDs inválidos ou repetidos sem oferecer seleção: %j", (...sessions) => {
    render(<EventSessions sessions={sessions} onSelect={vi.fn()} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("desativa seleção sem callback e mantém valores ausentes por confirmar", () => {
    render(<EventSessions sessions={[{ id: sessionFixtures[0].id, registration_open: "true" }]} />);
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByText("Data por confirmar")).toBeInTheDocument();
    expect(screen.getByText(/Horário por confirmar · Prazo de inscrição por confirmar/)).toBeInTheDocument();
    expect(screen.getByText("Por confirmar")).toBeInTheDocument();
  });
});
