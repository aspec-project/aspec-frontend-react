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
  it("envia o âmbito confirmado e aceita a resposta agregada com a sessão selecionada", async () => {
    const followingId = "019512a1-9998-7123-8123-123456789abc";
    const post = vi.spyOn(api, "post").mockResolvedValue({ status: 201, data: { success: true, data: { registrations: [
      { id, event_instance_id: id }, { id: followingId, event_instance_id: followingId },
    ] } } });
    await changeEventRegistration(id, "register", undefined, getSessionContext(), "this_and_following");
    expect(post).toHaveBeenCalledWith(`/events/${id}/registrations`, { scope: "this_and_following" }, expect.objectContaining({ sessionGeneration: getSessionContext().generation }));
  });
  it.each([
    [], [{ id, event_instance_id: "019512a1-9998-7123-8123-123456789abc" }],
    [{ id, event_instance_id: id }, { id, event_instance_id: id }],
    [{ id: "inválido", event_instance_id: id }],
    [{ id, event_instance_id: "inválido" }],
    null,
  ])("rejeita uma resposta agregada vazia, incoerente ou inválida: %j", async (registrations) => {
    vi.spyOn(api, "post").mockResolvedValue({ status: 201, data: { success: true, data: { registrations } } });
    await expect(changeEventRegistration(id, "register", undefined, getSessionContext(), "this_and_following")).rejects.toThrow("confirmar");
  });
  it("não aceita resposta individual para um pedido em grupo nem repete um conflito", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValueOnce({ status: 201, data: { success: true, data: { id, event_instance_id: id } } });
    await expect(changeEventRegistration(id, "register", undefined, getSessionContext(), "this_and_following")).rejects.toThrow();
    const conflict = { response: { status: 409, data: { message: "O evento atingiu a lotação máxima." } } };
    post.mockRejectedValueOnce(conflict);
    await expect(changeEventRegistration(id, "register", undefined, getSessionContext(), "this_and_following")).rejects.toBe(conflict);
    expect(post).toHaveBeenCalledTimes(2);
  });
  it.each([["register", "this"], ["cancel", "this_and_following"]])("rejeita âmbito não suportado para %s", async (action, scope) => {
    const post = vi.spyOn(api, "post");
    const remove = vi.spyOn(api, "delete");
    await expect(changeEventRegistration(id, action, undefined, getSessionContext(), scope)).rejects.toThrow("contexto");
    expect(post).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
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
