import { act, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EventLocationMap from "../../../src/components/events/EventLocationMap";

const leaflet = vi.hoisted(() => ({ map: vi.fn(), tileLayer: vi.fn(), circleMarker: vi.fn() }));
vi.mock("leaflet", () => leaflet);

let instance;
let tiles;
beforeEach(() => {
  vi.clearAllMocks();
  instance = { setView: vi.fn().mockReturnThis(), remove: vi.fn(), invalidateSize: vi.fn() };
  tiles = { on: vi.fn().mockReturnThis(), addTo: vi.fn().mockReturnThis() };
  leaflet.map.mockReturnValue(instance);
  leaflet.tileLayer.mockReturnValue(tiles);
  leaflet.circleMarker.mockReturnValue({ addTo: vi.fn() });
});

describe("Mapa Leaflet do evento", () => {
  it("usa as coordenadas reais, tiles OSM e atribuição e limpa o mapa ao sair", () => {
    const { unmount } = render(<EventLocationMap latitude={38.7197} longitude={-9.1452} />);
    expect(instance.setView).toHaveBeenCalledWith([38.7197, -9.1452], 15);
    expect(leaflet.tileLayer).toHaveBeenCalledWith("https://tile.openstreetmap.org/{z}/{x}/{y}.png", expect.objectContaining({ attribution: expect.stringContaining("https://www.openstreetmap.org/copyright") }));
    expect(leaflet.circleMarker).toHaveBeenCalledWith([38.7197, -9.1452], expect.any(Object));
    unmount();
    expect(instance.remove).toHaveBeenCalledTimes(1);
  });

  it("suporta replay StrictMode e recria o mapa ao mudar de coordenadas", () => {
    const { rerender, unmount } = render(<StrictMode><EventLocationMap latitude={0} longitude={0} /></StrictMode>);
    expect(leaflet.map).toHaveBeenCalledTimes(2);
    expect(instance.remove).toHaveBeenCalledTimes(1);
    rerender(<StrictMode><EventLocationMap latitude={1} longitude={2} /></StrictMode>);
    expect(instance.setView).toHaveBeenLastCalledWith([1, 2], 15);
    unmount();
    expect(instance.remove).toHaveBeenCalledTimes(3);
  });

  it("apresenta alternativa quando falham os tiles", () => {
    render(<EventLocationMap latitude={0} longitude={0} />);
    const onError = tiles.on.mock.calls.find(([event]) => event === "tileerror")[1];
    act(() => onError());
    expect(screen.getByRole("status")).toHaveTextContent("Pode abrir a localização no Google Maps");
  });

  it("tolera falha de inicialização e mantém uma mensagem acessível", async () => {
    leaflet.map.mockImplementationOnce(() => { throw new Error("Mapa indisponível"); });
    render(<EventLocationMap latitude={0} longitude={0} />);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Não foi possível carregar o mapa"));
  });

  it("não inicia Leaflet com coordenadas inválidas", () => {
    const { container } = render(<EventLocationMap latitude={91} longitude={0} />);
    expect(leaflet.map).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });
});
