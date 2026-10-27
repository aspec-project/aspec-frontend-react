import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../../src/services/api";
import { changeEventRegistration, getRegistrationErrorMessage } from "../../src/services/eventRegistrations";
import { getSessionContext, advanceSession } from "../../src/services/sessionContext";

const id = "019512a1-9999-7123-8123-123456789abc";
afterEach(() => vi.restoreAllMocks());

describe("Contrato de inscrições", () => {
  it("envia POST sem corpo e valida 201/event_instance_id", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue({ status: 201, data: { success: true, data: { id, event_instance_id: id } } });
    await changeEventRegistration(id, "register");
    expect(post).toHaveBeenCalledWith(`/events/${id}/registrations`, undefined, expect.objectContaining({ sessionGeneration: getSessionContext().generation, signal: expect.any(AbortSignal) }));
  });
  it("envia DELETE sem corpo e valida 200/data null", async () => {
    const remove = vi.spyOn(api, "delete").mockResolvedValue({ status: 200, data: { success: true, data: null } });
    await changeEventRegistration(id, "cancel");
    expect(remove).toHaveBeenCalledWith(`/events/${id}/registrations`, expect.objectContaining({ sessionGeneration: getSessionContext().generation }));
    expect(remove.mock.calls[0][1]).not.toHaveProperty("data");
  });
  it("rejeita ID e ação inválidos sem enviar pedido", async () => {
    const post = vi.spyOn(api, "post");
    await expect(changeEventRegistration("../auth/me", "register")).rejects.toThrow();
    await expect(changeEventRegistration(id, "edit")).rejects.toThrow();
    expect(post).not.toHaveBeenCalled();
  });
  it("rejeita resposta do contrato antigo event_id ou status incorreto", async () => {
    vi.spyOn(api, "post").mockResolvedValue({ status: 201, data: { success: true, data: { id, event_id: id } } });
    await expect(changeEventRegistration(id, "register")).rejects.toThrow();
    api.post.mockResolvedValue({ status: 200, data: { success: true, data: { id, event_instance_id: id } } });
    await expect(changeEventRegistration(id, "register")).rejects.toThrow();
  });
  it("não usa nem aceita contexto de uma sessão anterior", async () => {
    const context = getSessionContext();
    advanceSession();
    const post = vi.spyOn(api, "post");
    await expect(changeEventRegistration(id, "register", undefined, context)).rejects.toThrow();
    expect(post).not.toHaveBeenCalled();
  });
  it.each(["O prazo de inscrição para este evento terminou.", "Já está inscrito neste evento.", "O evento atingiu a lotação máxima.", "O prazo para cancelar a inscrição terminou."])("apresenta conflito confirmado: %s", (message) => {
    expect(getRegistrationErrorMessage({ response: { status: 409, data: { message } } })).toBe(message);
  });
  it.each([409, 500, 422])("não expõe mensagens internas de HTTP %s", (status) => {
    expect(getRegistrationErrorMessage({ response: { status, data: { message: "segredo interno" } } })).not.toContain("segredo");
  });
});
