import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EventDetail from "../../src/components/events/EventDetail";
import { getEventRegistrants } from "../../src/services/eventRegistrants";
import { useAuthStore } from "../../src/store/authStore";

vi.mock("../../src/services/eventRegistrants", async (original) => ({ ...await original(), getEventRegistrants: vi.fn() }));
vi.mock("../../src/components/events/EventLocationMap", () => ({ default: () => null }));
const id = "019512a1-9999-7123-8123-123456789abc";
const event = { id, name: "Encontro ASPEC", category: { name: "Encontro" }, location: { name: "Lisboa" }, max_attendees: 20, registrations_count: 12, available_spots: 8 };
const member = { id: "membro-a", role: { name: "Member" }, account_status: { name: "Active" } };
const show = () => render(<EventDetail event={event} />, { wrapper: MemoryRouter });
const open = async () => {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Ver empresas inscritas" }));
  return user;
};

describe("Modal de empresas inscritas", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: member, status: "authenticated", sessionChanging: false });
    getEventRegistrants.mockResolvedValue([{ business_name: "Zeta" }, { business_name: "Alfa" }, { business_name: null }]);
  });
  afterEach(() => vi.clearAllMocks());

  it.each([null, { ...member, account_status: { name: "Pending" } }, { ...member, role: { name: "Visitor" } }])("oculta o acesso sem a permissão confirmada: %j", (user) => {
    useAuthStore.setState({ user });
    show();
    expect(screen.queryByRole("button", { name: "Ver empresas inscritas" })).not.toBeInTheDocument();
    expect(getEventRegistrants).not.toHaveBeenCalled();
  });

  it.each(["Member", "Admin"])("permite %s Active e só pede a lista ao abrir, sem alterar a lotação", async (role) => {
    useAuthStore.setState({ user: { ...member, role: { name: role } } });
    show();
    expect(getEventRegistrants).not.toHaveBeenCalled();
    const user = await open();
    const dialog = screen.getByRole("dialog", { name: "Empresas inscritas" });
    await within(dialog).findByText("Alfa");
    expect(within(dialog).getByText("Encontro ASPEC · 3 empresas")).toBeInTheDocument();
    expect(within(dialog).getByText("Nome da empresa indisponível")).toBeInTheDocument();
    expect(screen.getByText("12 / 20")).toBeInTheDocument();
    expect(screen.getByText("8 vagas disponíveis")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "60");
    await user.type(within(dialog).getByRole("searchbox"), "alFa");
    expect(within(dialog).getAllByRole("listitem")).toHaveLength(1);
    expect(within(dialog).getByText("Encontro ASPEC · 3 empresas")).toBeInTheDocument();
    await user.clear(within(dialog).getByRole("searchbox"));
    await user.type(within(dialog).getByRole("searchbox"), "inexistente");
    expect(within(dialog).getByRole("status")).toHaveTextContent("Nenhuma empresa encontrada.");
    expect(getEventRegistrants).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["Construções São João", "CONSTRUCOES SAO JOAO"],
    ["Construcoes Sao Joao", "CONSTRUÇÕES SÃO JOÃO"],
    ["Câmara Açúcar", "  camara acucar  "],
    ["Camara Acucar", "  CÂMARA AÇÚCAR  "],
    ["ÁÉÍÓÚ ÀÂÊÔ ÃÕ Ç", "aeiou aaeo ao c"],
    ["Tecnologia", "TÉCNOLOGIA"],
    ["Construções São João".normalize("NFD"), "construções são joão"],
    ["Construções São João", "CONSTRUÇÕES SÃO JOÃO".normalize("NFD")],
  ])("encontra %s ao pesquisar %s e preserva o nome original", async (name, query) => {
    const companies = Object.freeze([Object.freeze({ business_name: name }), Object.freeze({ business_name: "Outra empresa" })]);
    getEventRegistrants.mockResolvedValueOnce(companies);
    show();
    const user = await open();
    const dialog = screen.getByRole("dialog");
    await within(dialog).findByText(name);
    const search = within(dialog).getByRole("searchbox", { name: "Pesquisar empresa" });

    await user.type(search, query);

    expect(search).toHaveValue(query);
    expect(within(dialog).getAllByRole("listitem").map((item) => item.textContent)).toEqual([name]);
    expect(within(dialog).getByText("Encontro ASPEC · 2 empresas")).toBeInTheDocument();
    expect(companies[0].business_name).toBe(name);
    expect(getEventRegistrants).toHaveBeenCalledTimes(1);
  });

  it("preserva duplicados, ordenação e nome indisponível ao pesquisar e limpar", async () => {
    const companies = Object.freeze([
      Object.freeze({ business_name: "Zeta" }),
      Object.freeze({ business_name: "Água" }),
      Object.freeze({ business_name: null }),
      Object.freeze({ business_name: "Água" }),
    ]);
    getEventRegistrants.mockResolvedValueOnce(companies);
    show();
    const user = await open();
    const dialog = screen.getByRole("dialog");
    await within(dialog).findByText("Zeta");
    const names = () => within(dialog).getAllByRole("listitem").map((item) => item.textContent);
    const originalNames = names();
    const search = within(dialog).getByRole("searchbox");

    await user.type(search, "aGUA");
    expect(names()).toEqual(["Água", "Água"]);
    await user.clear(search);
    await user.type(search, "INDISPONIVEL");
    expect(names()).toEqual(["Nome da empresa indisponível"]);
    await user.clear(search);
    await user.type(search, "inexistênte");
    expect(within(dialog).queryByRole("listitem")).not.toBeInTheDocument();
    expect(within(dialog).getByRole("status")).toHaveTextContent("Nenhuma empresa encontrada.");
    expect(within(dialog).getByText("Encontro ASPEC · 4 empresas")).toBeInTheDocument();
    await user.clear(search);
    expect(names()).toEqual(originalNames);
    await user.type(search, "   ");
    expect(names()).toEqual(originalNames);
    expect(companies.map((company) => company.business_name)).toEqual(["Zeta", "Água", null, "Água"]);
    expect(getEventRegistrants).toHaveBeenCalledTimes(1);
  });

  it.each(["Escape", "Fechar", "Fechar modal"])("fecha com %s, devolve foco e liberta o fundo e scroll", async (method) => {
    show();
    const trigger = screen.getByRole("button", { name: "Ver empresas inscritas" });
    const user = await open();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("searchbox")).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
    expect(trigger.closest("body > div")).toHaveAttribute("inert");
    if (method === "Escape") await user.keyboard("{Escape}");
    else await user.click(within(dialog).getByRole("button", { name: method, exact: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
    expect(trigger.closest("body > div")).not.toHaveAttribute("inert");
    await user.click(trigger);
    await waitFor(() => expect(getEventRegistrants).toHaveBeenCalledTimes(2));
  });

  it("mantém Tab e Shift+Tab dentro do modal", async () => {
    show();
    const user = await open();
    const dialog = screen.getByRole("dialog");
    await within(dialog).findByText("Alfa");
    within(dialog).getByRole("button", { name: "Fechar", exact: true }).focus();
    await user.tab();
    expect(within(dialog).getByRole("button", { name: "Fechar modal" })).toHaveFocus();
    await user.tab({ shift: true });
    expect(within(dialog).getByRole("button", { name: "Fechar", exact: true })).toHaveFocus();
  });

  it("trata erro, repetição e lista vazia", async () => {
    getEventRegistrants.mockRejectedValueOnce({ response: { status: 403, data: { message: "segredo" } } }).mockResolvedValueOnce([]);
    show();
    const user = await open();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não tem permissão");
    expect(screen.queryByText("segredo")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByText("Ainda não existem empresas inscritas.")).toBeInTheDocument();
    expect(screen.getByText("Encontro ASPEC · 0 empresas")).toBeInTheDocument();
  });

  it("cancela ao fechar, ignora respostas antigas e limpa a pesquisa ao reabrir", async () => {
    let resolve;
    getEventRegistrants.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    show();
    const user = await open();
    expect(screen.getByRole("status")).toHaveTextContent("A carregar empresas");
    const signal = getEventRegistrants.mock.calls[0][1];
    await user.keyboard("{Escape}");
    expect(signal.aborted).toBe(true);
    await open();
    await screen.findByText("Alfa");
    await act(async () => resolve([{ business_name: "Resposta antiga" }]));
    expect(screen.queryByText("Resposta antiga")).not.toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toHaveValue("");
  });

  it("desmonta dados privados ao mudar identidade, evento ou geração de sessão", async () => {
    const view = show();
    await open();
    await screen.findByText("Alfa");
    act(() => useAuthStore.setState({ user: { ...member, id: "membro-b" } }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await open();
    view.rerender(<EventDetail event={{ ...event, id: "019512a1-9998-7123-8123-123456789abc" }} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await open();
    act(() => useAuthStore.getState().clearSession());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver empresas inscritas" })).not.toBeInTheDocument();
  });
});
