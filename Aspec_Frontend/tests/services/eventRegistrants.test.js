import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../src/services/api";
import { getEventRegistrants, getEventRegistrantsErrorMessage } from "../../src/services/eventRegistrants";

const id = "019512a1-9999-7123-8123-123456789abc";
describe("Contrato das empresas inscritas", () => {
  beforeEach(() => vi.spyOn(api, "get").mockResolvedValue({ data: { success: true, data: [] } }));
  afterEach(() => vi.restoreAllMocks());

  it("pede apenas o endpoint confirmado, suporta cancelamento e descarta contactos privados", async () => {
    const signal = new AbortController().signal;
    api.get.mockResolvedValue({ data: { success: true, data: [{ business_name: " Empresa A ", email: "privado@example.test" }, { business_name: "Empresa A" }, { business_name: null }] } });
    expect(await getEventRegistrants(id, signal)).toEqual([{ business_name: "Empresa A" }, { business_name: "Empresa A" }, { business_name: null }]);
    expect(api.get).toHaveBeenCalledWith(`/events/${id}/registrants`, { signal });
  });

  it.each([undefined, "../auth/me", "", "123"])("rejeita identificadores inválidos sem pedir à API: %s", async (value) => {
    await expect(getEventRegistrants(value)).rejects.toThrow("identificador");
    expect(api.get).not.toHaveBeenCalled();
  });

  it.each([{ success: false, data: [] }, { success: true, data: {} }, { success: true, data: [null] }, { success: true, data: [{}] }, { success: true, data: [{ business_name: 3 }] }])("rejeita um contrato inesperado: %j", async (data) => {
    api.get.mockResolvedValue({ data });
    await expect(getEventRegistrants(id)).rejects.toThrow("formato inesperado");
  });

  it("aceita a lista vazia e não expõe mensagens internas do servidor", async () => {
    expect(await getEventRegistrants(id)).toEqual([]);
    expect(getEventRegistrantsErrorMessage({ response: { status: 403, data: { message: "segredo" } } })).toBe("Não tem permissão para consultar as empresas inscritas.");
    expect(getEventRegistrantsErrorMessage({ response: { status: 500, data: { message: "segredo" } } })).not.toContain("segredo");
  });
});
