import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EventLocation from "../../../src/components/events/EventLocation";

vi.mock("../../../src/components/events/EventLocationMap", () => ({ default: () => <div role="region" aria-label="Mapa da localização do evento" /> }));

describe("Localização do evento", () => {
  beforeEach(() => vi.stubEnv("VITE_GOOGLE_MAPS_EMBED_KEY", "chave-ficticia-testes"));
  afterEach(() => vi.unstubAllEnvs());

  it("apresenta o nome real do espaço sem inventar coordenadas ou pesquisa vazia", () => {
    render(<EventLocation event={{ venue_name: "Auditório ASPEC", address: null, latitude: null, longitude: null }} />);
    expect(screen.getByText("Auditório ASPEC")).toBeInTheDocument();
    expect(new URL(screen.getByRole("link").href).searchParams.get("query")).toBe("Auditório ASPEC");
    expect(screen.queryByRole("region", { name: "Mapa da localização do evento" })).not.toBeInTheDocument();
  });

  it("nunca apresenta localização física de um evento explicitamente online", () => {
    const { container } = render(<EventLocation event={{ is_online: true, place_id: "local-teste", venue_name: "Espaço indevido", address: "Rua indevida", latitude: 38, longitude: -9 }} />);
    expect(container).toBeEmptyDOMElement();
  });

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

  it("usa Embed com place_id mesmo sem coordenadas e preserva os atributos acessíveis", () => {
    render(<EventLocation event={{ place_id: " local-google-teste ", address: "Rua do Encontro" }} />);
    const iframe = screen.getByTitle("Mapa da localização do evento");
    const src = new URL(iframe.src);
    expect(src.origin).toBe("https://www.google.com");
    expect(src.pathname).toBe("/maps/embed/v1/place");
    expect(src.searchParams.get("q")).toBe("place_id:local-google-teste");
    expect(src.searchParams.get("key")).toBe("chave-ficticia-testes");
    expect(iframe).toHaveAttribute("loading", "lazy");
    expect(iframe).toHaveAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    expect(iframe).toHaveAttribute("allowfullscreen");
    expect(iframe).toHaveClass("h-52", "w-full");
    expect(screen.queryByRole("region", { name: "Mapa da localização do evento" })).not.toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Abrir no Google Maps" });
    const search = new URL(link.href).searchParams;
    expect(search.get("query")).toBe("Rua do Encontro");
    expect(search.get("query_place_id")).toBe("local-google-teste");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("codifica identificadores e pesquisas sem permitir alterar o destino ou injetar parâmetros", () => {
    const placeId = 'local &key=outra#<script>"';
    const address = 'Rua &query_place_id=outro#<img>';
    render(<EventLocation event={{ place_id: placeId, address, latitude: 38, longitude: -9 }} />);
    const src = new URL(screen.getByTitle("Mapa da localização do evento").src);
    expect(src.searchParams.get("q")).toBe(`place_id:${placeId}`);
    expect(src.searchParams.getAll("key")).toEqual(["chave-ficticia-testes"]);
    const search = new URL(screen.getByRole("link").href).searchParams;
    expect(search.get("query_place_id")).toBe(placeId);
    expect(search.get("query")).toBe("38,-9");
    expect(document.querySelector("script, img")).toBeNull();
    expect(screen.queryByRole("region", { name: "Mapa da localização do evento" })).not.toBeInTheDocument();
  });

  it("conserva o link com query obrigatório quando place_id é o único dado disponível", () => {
    render(<EventLocation event={{ place_id: "local-google-teste" }} />);
    const search = new URL(screen.getByRole("link").href).searchParams;
    expect(search.get("query")).toBe("local-google-teste");
    expect(search.get("query_place_id")).toBe("local-google-teste");
  });

  it.each([undefined, "", "   "])("apresenta uma alternativa útil sem chave Embed: %s", (key) => {
    vi.stubEnv("VITE_GOOGLE_MAPS_EMBED_KEY", key);
    render(<EventLocation event={{ place_id: "local-google-teste", latitude: 38, longitude: -9 }} />);
    expect(screen.getByRole("status")).toHaveTextContent("O mapa está indisponível");
    expect(screen.getByRole("link", { name: "Abrir no Google Maps" })).toBeInTheDocument();
    expect(screen.queryByTitle("Mapa da localização do evento")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Mapa da localização do evento" })).not.toBeInTheDocument();
  });
});
