import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EventOnlineAccess from "../../../src/components/events/EventOnlineAccess";
import { useAuthStore } from "../../../src/store/authStore";

// Fixture do discriminador ainda em falta na resposta pública do backend.
const deadline = "2030-10-14T23:59:00+01:00";
const event = { id: "019512a1-9999-7123-8123-123456789abc", is_online: true, is_registered: true, registration_deadline: deadline, online_url: "https://meet.example.test/reuniao" };
const user = { id: "member-fixture", role: { name: "Member" }, account_status: { name: "Active" } };
let auth;
beforeEach(() => {
  auth = useAuthStore.getState();
  useAuthStore.setState({ user, status: "authenticated", sessionChanging: false });
  vi.spyOn(Date, "now").mockReturnValue(Date.parse(deadline) + 1);
});
afterEach(() => { act(() => useAuthStore.setState(auth, true)); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("Acesso à reunião online", () => {
  it.each(["Member", "Admin"])("mostra URL e ações apenas ao %s ativo inscrito depois do prazo", (role) => {
    useAuthStore.setState({ user: { ...user, role: { name: role } } });
    render(<EventOnlineAccess event={event} />);
    const link = screen.getByRole("link", { name: "Entrar na reunião" });
    expect(link).toHaveAttribute("href", event.online_url);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("button", { name: "Copiar" })).toBeInTheDocument();
  });

  it.each([true, false])("copia apenas o URL autorizado e comunica o resultado (sucesso=%s)", async (success) => {
    const interaction = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    if (success) writeText.mockResolvedValue(undefined);
    else writeText.mockRejectedValue(new Error("Clipboard indisponível"));
    render(<EventOnlineAccess event={event} />);
    await interaction.click(screen.getByRole("button", { name: "Copiar" }));
    expect(writeText).toHaveBeenCalledExactlyOnceWith(event.online_url);
    expect(screen.getByRole("status")).toHaveTextContent(success ? "Link copiado." : "Não foi possível copiar o link.");
  });

  it.each([
    { user: null, status: "idle" }, { sessionChanging: true }, { status: "loading" },
    { user: { ...user, role: { name: "Candidate" } } },
    { user: { ...user, account_status: { name: "Inactive" } } },
  ])("bloqueia sem URL no texto, atributos ou ações para contexto %j", (state) => {
    useAuthStore.setState(state);
    render(<EventOnlineAccess event={event} />);
    expect(document.body.innerHTML).not.toContain(event.online_url);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copiar" })).not.toBeInTheDocument();
  });

  it.each([-100, 0])("não expõe URL antes ou no instante exato do prazo (%s)", (offset) => {
    Date.now.mockReturnValue(Date.parse(deadline) + offset);
    render(<EventOnlineAccess event={event} />);
    expect(document.body.innerHTML).not.toContain(event.online_url);
    expect(screen.getByText(/Está inscrito/)).toBeInTheDocument();
  });

  it.each([{ is_registered: false }, { is_registered: null }, { registration_deadline: "inválido" }, { online_url: "javascript:alert(1)" }])("mantém acesso bloqueado com dados %j", (fields) => {
    render(<EventOnlineAccess event={{ ...event, ...fields }} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain(event.online_url);
  });

  it("remove imediatamente acesso ao terminar a sessão", () => {
    render(<EventOnlineAccess event={event} />);
    expect(screen.getByRole("link")).toBeInTheDocument();
    act(() => useAuthStore.setState({ user: null, status: "idle", sessionChanging: true }));
    expect(document.body.innerHTML).not.toContain(event.online_url);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("permite pedir nova consulta quando o servidor ainda não disponibiliza o URL", async () => {
    const onRefresh = vi.fn();
    render(<EventOnlineAccess event={{ ...event, online_url: undefined }} onRefresh={onRefresh} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Atualizar acesso" }));
    expect(onRefresh).toHaveBeenCalledOnce();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("consulta novamente o detalhe ao ultrapassar o prazo sem reusar um URL anterior", async () => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(Date.parse(deadline));
    const onRefresh = vi.fn();
    render(<EventOnlineAccess event={{ ...event, online_url: undefined }} onRefresh={onRefresh} />);
    await act(async () => vi.advanceTimersByTime(1));
    expect(onRefresh).toHaveBeenCalledOnce();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
