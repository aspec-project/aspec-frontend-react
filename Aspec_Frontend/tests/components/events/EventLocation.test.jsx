import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EventLocation from "../../../src/components/events/EventLocation";

vi.mock("../../../src/components/events/EventLocationMap", () => ({ default: () => <div role="region" aria-label="Mapa da localização do evento" /> }));

describe("Localização do evento", () => {
  it("omite a secção quando a API não fornece localização suficiente", () => {
    const { container } = render(<EventLocation event={{ address: null, latitude: null, longitude: null }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("apresenta morada sem inventar coordenadas e permite abrir a pesquisa", () => {
    render(<EventLocation event={{ address: "Rua de teste, Lisboa", latitude: null, longitude: null }} />);
    expect(screen.getByText("Rua de teste, Lisboa")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Mapa da localização do evento" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir no Google Maps" })).toHaveAttribute("href", "https://www.google.com/maps/search/?api=1&query=Rua%20de%20teste%2C%20Lisboa");
  });

  it.each([[0, 0], [-90, -180], [90, 180], [38.7197, -9.1452]])("usa coordenadas válidas (%s, %s) sem classificar o evento", async (latitude, longitude) => {
    render(<EventLocation event={{ latitude, longitude }} />);
    expect(await screen.findByRole("region", { name: "Mapa da localização do evento" })).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Abrir no Google Maps" });
    expect(link).toHaveAttribute("href", `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`);
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.queryByText(/presencial|online|recorrente/i)).not.toBeInTheDocument();
  });

  it.each([[null, 0], [0, undefined], [91, 0], [0, -181], [NaN, 0], [Infinity, 0], ["38", "-9"]])("não inicia mapa nem inventa localização para (%s, %s)", (latitude, longitude) => {
    const { container } = render(<EventLocation event={{ address: " ", latitude, longitude }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
