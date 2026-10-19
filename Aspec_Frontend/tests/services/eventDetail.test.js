import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../src/services/api";
import { getEventDetail } from "../../src/services/events";

const id = "019512a1-9999-7123-8123-123456789abc";
const event = {
  id, name: "Encontro ASPEC", description: "Descrição pública", category: { name: "Encontro", color: "#8A7043" },
  location: { name: "Lisboa" }, event_date: "2030-10-15", event_start_time: "10:00", event_end_time: "12:00",
  max_attendees: 20, registrations_count: 12, available_spots: 8, organizer_notes: "Chegar cedo.",
  address: "", latitude: null, longitude: null,
  registration_deadline: "2030-10-14T23:59:00+01:00",
};

describe("Contrato do detalhe do evento", () => {
  beforeEach(() => vi.spyOn(api, "get").mockResolvedValue({ data: { success: true, data: event } }));
  afterEach(() => vi.restoreAllMocks());

  it("pede o endpoint real com cancelamento e conserva apenas os campos utilizados", async () => {
    const controller = new AbortController();
    api.get.mockResolvedValue({ data: { success: true, data: { ...event, online_url: "https://private.test/secret", secret: "privado", is_registered: true, address: "Rua", latitude: 38, longitude: -9 } } });
    const result = await getEventDetail(id, controller.signal);
    expect(api.get).toHaveBeenCalledWith(`/events/${id}`, { signal: controller.signal });
    expect(result).toEqual({ ...event, address: "Rua", latitude: 38, longitude: -9 });
    for (const field of ["online_url", "secret", "is_registered"]) expect(result).not.toHaveProperty(field);
  });

  it("mantém zeros distintos de valores ausentes sem calcular vagas a partir da lotação", async () => {
    api.get.mockResolvedValue({ data: { success: true, data: { ...event, max_attendees: 0, registrations_count: 0, available_spots: null } } });
    const result = await getEventDetail(id);
    expect(result).toMatchObject({ max_attendees: 0, registrations_count: 0, available_spots: null });
  });

  it.each(["", "outro", "../auth/me", undefined])("rejeita ID inválido sem pedido: %s", async (value) => {
    await expect(getEventDetail(value)).rejects.toThrow("identificador");
    expect(api.get).not.toHaveBeenCalled();
  });

  it.each([
    { success: false, data: event },
    { success: true, data: null },
    { success: true, data: { ...event, id: "019512a1-9998-7123-8123-123456789abc" } },
    { success: true, data: { ...event, name: " " } },
  ])("rejeita resposta com envelope, identidade ou título inválidos", async (data) => {
    api.get.mockResolvedValue({ data });
    await expect(getEventDetail(id)).rejects.toThrow("formato inesperado");
  });

  it("não transforma valores opcionais inválidos em números nem texto enganadores", async () => {
    api.get.mockResolvedValue({ data: { success: true, data: { id, name: event.name, max_attendees: "20", registrations_count: -1, available_spots: 2.5, description: {}, category: null } } });
    const result = await getEventDetail(id);
    expect(result).toMatchObject({ max_attendees: null, registrations_count: null, available_spots: null, description: "", category: { name: "", color: "" } });
  });

  it.each([{ latitude: 91, longitude: -181 }, { latitude: "38.7", longitude: Infinity }])("descarta coordenadas inválidas: %j", async (coordinates) => {
    api.get.mockResolvedValue({ data: { success: true, data: { ...event, ...coordinates } } });
    expect(await getEventDetail(id)).toMatchObject({ latitude: null, longitude: null });
  });
});
