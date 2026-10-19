import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import EventCard from "../../../src/components/events/EventCard.jsx";

const evento = {
  id: "evento-1",
  name: "Encontro de profissionais",
  category: { id: "categoria-1", name: "Encontro", color: "#8A7043" },
  location: { id: "distrito-1", name: "Lisboa" },
  event_date: "2030-10-15",
  event_start_time: "10:00:00",
  event_end_time: "12:00:00",
  available_spots: 8,
  registration_open: true,
};

function mostrarCard(alteracoes = {}) {
  return render(<MemoryRouter><EventCard event={{ ...evento, ...alteracoes }} /></MemoryRouter>);
}

afterEach(cleanup);

describe("EventCard", () => {
  it("apresenta os dados reais e a descrição recebida como texto", () => {
    mostrarCard({ description: "  Uma manhã dedicada à colaboração.  " });

    expect(screen.getByRole("heading", { name: evento.name })).toBeInTheDocument();
    expect(screen.getByText("Uma manhã dedicada à colaboração.")).toBeInTheDocument();
    expect(screen.getByText("Encontro")).toBeInTheDocument();
    expect(screen.getByText("15 de outubro de 2030")).toBeInTheDocument();
    expect(screen.getByText("10:00 – 12:00")).toBeInTheDocument();
    expect(screen.getByText("Lisboa")).toBeInTheDocument();
    expect(screen.getByText("8 vagas disponíveis")).toBeInTheDocument();
    expect(screen.getByText("Inscrições abertas")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: `Ver evento: ${evento.name}` }))
      .toHaveAttribute("href", "/eventos/evento-1");
  });

  it.each([undefined, null, "", "   ", 12, { text: "Não apresentar" }])("não inventa uma descrição quando o campo é %j", (description) => {
    mostrarCard({ description });

    expect(screen.getByRole("heading", { name: evento.name })).toBeInTheDocument();
    expect(screen.queryByText(/descrição (indisponível|por confirmar)/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Não apresentar")).not.toBeInTheDocument();
    expect(screen.queryByText("12")).not.toBeInTheDocument();
  });

  it("não interpreta HTML recebido na descrição", () => {
    const description = '<img src="x" onerror="alert(1)">';
    mostrarCard({ description });

    expect(screen.getByText(description)).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it.each([
    ["#123456", "rgb(18, 52, 86)"],
    ["#ABCDEF", "rgb(171, 205, 239)"],
    ["#000000", "rgb(0, 0, 0)"],
  ])("reutiliza a cor válida da categoria %s", (color, backgroundColor) => {
    mostrarCard({ category: { name: "Categoria sem associação por nome", color } });

    expect(screen.getByRole("article").firstElementChild).toHaveStyle({ backgroundColor });
  });

  it.each([undefined, null, "red", "#123", "#GGGGGG", "url(https://example.com/imagem)", 123456])("usa uma cor segura para %j", (color) => {
    mostrarCard({ category: { name: "Conferência", color } });

    expect(screen.getByRole("article").firstElementChild).toHaveStyle({ backgroundColor: "rgb(13, 31, 53)" });
  });

  it.each([
    [0, 40, 0],
    [12, 40, 30],
    [1, 3, 33],
    [40, 40, 100],
    [60, 40, 100],
  ])("representa %s inscrições em %s lugares como %s%%", (registrations_count, max_attendees, percentagem) => {
    mostrarCard({ registrations_count, max_attendees });

    const barra = screen.getByRole("progressbar", { name: "Ocupação do evento" });
    expect(barra).toHaveAttribute("aria-valuemin", "0");
    expect(barra).toHaveAttribute("aria-valuemax", "100");
    expect(barra).toHaveAttribute("aria-valuenow", String(percentagem));
    expect(barra.firstElementChild).toHaveStyle({ width: `${percentagem}%` });
  });

  it("apresenta a contagem e as vagas reais sem substituir a capacidade", () => {
    mostrarCard({ registrations_count: 12, max_attendees: 40, available_spots: 28 });

    expect(screen.getByText("12 / 40 inscritos")).toBeInTheDocument();
    expect(screen.getByText("28 vagas disponíveis")).toBeInTheDocument();
    expect(screen.getByText("30% de ocupação")).toBeInTheDocument();
  });

  it.each([
    [undefined, undefined],
    [0, undefined],
    [undefined, 40],
    [-1, 40],
    [2.5, 40],
    [12, 0],
    [12, -40],
    [12, 40.5],
    ["12", 40],
    [12, "40"],
    [NaN, 40],
    [Infinity, 40],
    [12, Infinity],
  ])("não inventa uma percentagem para inscritos %s e lotação %s", (registrations_count, max_attendees) => {
    mostrarCard({ registrations_count, max_attendees });

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByText("Lotação por confirmar.")).toBeInTheDocument();
  });

  it("distingue um evento lotado e inscrições encerradas", () => {
    mostrarCard({ available_spots: 0, registration_open: false });

    expect(screen.getByText("Evento lotado")).toBeInTheDocument();
    expect(screen.getByText("Inscrições encerradas")).toBeInTheDocument();
    expect(screen.queryByText("Inscrições abertas")).not.toBeInTheDocument();
  });

  it("mantém o estado desconhecido quando a disponibilidade não é válida", () => {
    mostrarCard({ available_spots: -1, registration_open: undefined });

    expect(screen.getByText("Vagas por confirmar")).toBeInTheDocument();
    expect(screen.queryByText("Inscrições abertas")).not.toBeInTheDocument();
    expect(screen.queryByText("Inscrições encerradas")).not.toBeInTheDocument();
  });

  it("mantém o detalhe acessível por teclado e codifica o identificador no URL", async () => {
    const user = userEvent.setup();
    mostrarCard({ id: "evento/externo?x=1" });

    await user.tab();

    const link = screen.getByRole("link", { name: `Ver evento: ${evento.name}` });
    expect(link).toHaveFocus();
    expect(link).toHaveAttribute("href", "/eventos/evento%2Fexterno%3Fx%3D1");
  });
});
