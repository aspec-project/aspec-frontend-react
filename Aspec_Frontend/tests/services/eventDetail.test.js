import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../src/services/api";
import { getEventDetail } from "../../src/services/events";
import { useAuthStore } from "../../src/store/authStore";
import { getOnlineMeetingUrl } from "../../src/utils/eventAccess";

const id = "019512a1-9999-7123-8123-123456789abc";
const event = {
  id, name: "Encontro ASPEC", description: "Descrição pública", category: { name: "Encontro", color: "#8A7043" },
  location: { name: "Lisboa" }, event_date: "2030-10-15", event_start_time: "10:00", event_end_time: "12:00",
  max_attendees: 20, registrations_count: 12, available_spots: 8, organizer_notes: "Chegar cedo.",
  address: "", latitude: null, longitude: null,
  registration_deadline: "2030-10-14T23:59:00+01:00",
  is_registered: false, registration_open: true,
};

describe("Contrato do detalhe do evento", () => {
  beforeEach(() => vi.spyOn(api, "get").mockResolvedValue({ data: { success: true, data: event } }));
  afterEach(() => vi.restoreAllMocks());

  it("pede o endpoint real com cancelamento e conserva apenas os campos utilizados", async () => {
    const controller = new AbortController();
    api.get.mockResolvedValue({ data: { success: true, data: { ...event, online_url: "https://private.test/secret", secret: "privado", is_registered: true, address: "Rua", latitude: 38, longitude: -9 } } });
    const result = await getEventDetail(id, controller.signal);
    expect(api.get).toHaveBeenCalledWith(`/events/${id}`, { signal: controller.signal });
    expect(result).toEqual({ ...event, is_online: null, venue_name: "", address: "Rua", latitude: 38, longitude: -9, is_registered: true });
    for (const field of ["online_url", "secret"]) expect(result).not.toHaveProperty(field);
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

  it.each([undefined, null, "false", 0, 1])("não interpreta flags ausentes ou inválidas como booleanos: %s", async (flag) => {
    api.get.mockResolvedValue({ data: { success: true, data: { ...event, is_online: flag, is_registered: flag, registration_open: flag } } });
    expect(await getEventDetail(id)).toMatchObject({ is_online: null, is_registered: null, registration_open: null });
  });

  it("conserva venue_name presencial e elimina dados físicos de eventos online", async () => {
    api.get.mockResolvedValueOnce({ data: { success: true, data: { ...event, is_online: false, venue_name: " Auditório " } } });
    expect(await getEventDetail(id)).toMatchObject({ is_online: false, venue_name: "Auditório", location: event.location });
    api.get.mockResolvedValueOnce({ data: { success: true, data: { ...event, is_online: true, venue_name: "Auditório", address: "Rua", latitude: 38, longitude: -9 } } });
    expect(await getEventDetail(id)).toMatchObject({ is_online: true, venue_name: "", location: { name: "" }, address: "", latitude: null, longitude: null });
  });
});

/*
 * Fixtures de contrato preparado: is_online ainda não é publicado no Resource.
 * Os testes não acrescentam dados simulados à aplicação.
 */
describe("Acesso privado à reunião online", () => {
  const deadline = "2030-10-14T23:59:00+01:00";
  const now = Date.parse(deadline) + 1;
  const online = { ...event, is_online: true, is_registered: true, registration_deadline: deadline, online_url: "https://meet.example.test/event" };
  const auth = { status: "authenticated", sessionChanging: false, sessionGeneration: 0, user: { id, role: { name: "Member" }, account_status: { name: "Active" } } };
  let originalAuth;

  beforeEach(() => { originalAuth = useAuthStore.getState(); });
  afterEach(() => { useAuthStore.setState(originalAuth, true); vi.restoreAllMocks(); vi.useRealTimers(); });

  it.each(["Member", "Admin"])("autoriza %s ativo, inscrito, após o prazo", (role) => {
    expect(getOnlineMeetingUrl(online, { ...auth, user: { ...auth.user, role: { name: role } } }, now)).toBe(online.online_url);
  });

  it.each([-1, 0, 1])("respeita o limite estrito do prazo: %s ms", (offset) => {
    expect(getOnlineMeetingUrl(online, auth, Date.parse(deadline) + offset)).toBe(offset > 0 ? online.online_url : "");
  });

  it.each([null, "2030-10-14T23:59:00", "2030-02-30T12:00:00Z", "2030-10-14T25:00:00Z", "inválido"])("bloqueia prazo ausente ou inválido: %s", (registration_deadline) => {
    expect(getOnlineMeetingUrl({ ...online, registration_deadline }, auth, now)).toBe("");
  });

  it.each(["javascript:alert(1)", "data:text/html,privado", "/relative", "https://user:password@meet.example.test", "https://user@meet.example.test", "inválido"])("bloqueia URL insegura: %s", (online_url) => {
    expect(getOnlineMeetingUrl({ ...online, online_url }, auth, now)).toBe("");
  });

  it.each([
    { status: "loading" }, { status: "idle" }, { status: "logging-out" }, { sessionChanging: true },
    { user: null }, { user: { ...auth.user, id: "" } },
    { user: { ...auth.user, role: { name: "Candidate" } } },
    { user: { ...auth.user, account_status: { name: "Inactive" } } },
  ])("bloqueia contexto não autorizado: %j", (context) => {
    expect(getOnlineMeetingUrl(online, { ...auth, ...context }, now)).toBe("");
  });

  it.each([{ is_online: false }, { is_online: null }, { is_online: "true" }, { is_registered: false }, { is_registered: "true" }])("bloqueia evento sem autorização explícita: %j", (fields) => {
    expect(getOnlineMeetingUrl({ ...online, ...fields }, auth, now)).toBe("");
  });

  it("conserva o URL autorizado apenas no detalhe e rejeita a troca de identidade durante o pedido", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    useAuthStore.setState(auth);
    vi.spyOn(api, "get").mockResolvedValue({ data: { success: true, data: online } });
    expect(await getEventDetail(id)).toHaveProperty("online_url", online.online_url);
    api.get.mockImplementationOnce(async () => {
      useAuthStore.setState({ user: { ...auth.user, id: "outro-utilizador" } });
      return { data: { success: true, data: online } };
    });
    expect(await getEventDetail(id)).not.toHaveProperty("online_url");
  });

  it("rejeita a mesma identidade numa nova geração da sessão", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    useAuthStore.setState(auth);
    vi.spyOn(api, "get").mockImplementationOnce(async () => {
      useAuthStore.setState({ sessionGeneration: auth.sessionGeneration + 1 });
      return { data: { success: true, data: online } };
    });
    expect(await getEventDetail(id)).not.toHaveProperty("online_url");
  });
});
