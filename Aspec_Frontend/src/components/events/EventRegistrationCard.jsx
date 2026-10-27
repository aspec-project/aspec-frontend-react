import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CircleCheck } from "lucide-react";
import ConfirmDialog from "../ui/ConfirmDialog";
import EventRegistrationSummary from "./EventRegistrationSummary";
import { useAuthStore } from "../../store/authStore";
import { getEventDetail } from "../../services/events";
import { changeEventRegistration, getRegistrationErrorMessage } from "../../services/eventRegistrations";
import { getSessionContext, isSessionCurrent } from "../../services/sessionContext";
import { formatRegistrationDeadline } from "../../utils/eventFormatting";

const buttonClass = "w-full rounded-lg bg-[#0D1F35] px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-[#183650] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315A79] disabled:cursor-not-allowed disabled:opacity-50";
const goldButtonClass = "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#8A7043] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#796038] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8A7043] disabled:cursor-not-allowed disabled:opacity-50";
const cancelButtonClass = "mt-4 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-[#0D1F35] hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315A79] disabled:cursor-not-allowed disabled:opacity-50";

function memberCanAct(state) {
  return state.status === "authenticated" && !state.sessionChanging && !!state.user?.id && state.user.role?.name === "Member" && state.user.account_status?.name === "Active";
}

function identityKey(state) {
  return JSON.stringify([state.sessionGeneration, state.status, state.sessionChanging, state.user?.id, state.user?.role?.name, state.user?.account_status?.name]);
}

function deadlineIsOpen(event) {
  return !!formatRegistrationDeadline(event.registration_deadline) && Date.now() <= Date.parse(event.registration_deadline);
}

function RegistrationControls({ event, onEventUpdate, eligible, visitor, identity }) {
  const [dialog, setDialog] = useState(null);
  const [operation, setOperation] = useState({ pending: false, refreshing: false, stale: false, message: "", success: false });
  const [, setClock] = useState(0);
  const lifecycle = useRef(null);
  const lock = useRef(false);
  const openDeadline = deadlineIsOpen(event);
  const canRegister = eligible && event.is_registered === false && event.registration_open === true && openDeadline;
  const canCancel = eligible && event.is_registered === true && openDeadline;
  const cancelledAwaitingRefresh = operation.success && operation.action === "cancel" && operation.stale;
  const registered = (operation.success && operation.action === "register" && operation.stale) || (event.is_registered === true && !cancelledAwaitingRefresh);

  useEffect(() => {
    const controller = new AbortController();
    lifecycle.current = controller;
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!formatRegistrationDeadline(event.registration_deadline)) return;
    let timer;
    function tick() {
      clearTimeout(timer);
      setClock((clock) => clock + 1);
      const remaining = Date.parse(event.registration_deadline) - Date.now();
      if (remaining >= 0) timer = setTimeout(tick, Math.min(remaining + 1, 2147483647));
    }
    const remaining = Date.parse(event.registration_deadline) - Date.now();
    if (remaining >= 0) timer = setTimeout(tick, Math.min(remaining + 1, 2147483647));
    window.addEventListener("focus", tick);
    return () => { clearTimeout(timer); window.removeEventListener("focus", tick); };
  }, [event.registration_deadline]);

  if (!operation.pending && ((dialog === "register" && !canRegister) || (dialog === "cancel" && !canCancel))) {
    setDialog(null);
  }

  async function reconcile(context, controller, feedback) {
    const current = () => !controller.signal.aborted && isSessionCurrent(context) && identityKey(useAuthStore.getState()) === identity;
    if (!current()) return;
    setOperation({ ...feedback, pending: false, refreshing: true, stale: true });
    try {
      const updated = await getEventDetail(event.id, controller.signal);
      if (!current()) return;
      onEventUpdate(updated);
      setOperation({ ...feedback, pending: false, refreshing: false, stale: false });
    } catch {
      if (current()) setOperation({ ...feedback, pending: false, refreshing: false, stale: true });
    }
  }

  async function confirm() {
    const state = useAuthStore.getState();
    const action = dialog;
    if (lock.current || operation.stale || identityKey(state) !== identity || !memberCanAct(state) || !deadlineIsOpen(event) ||
      (action === "register" ? event.is_registered !== false || event.registration_open !== true : action !== "cancel" || event.is_registered !== true)) {
      if (!lock.current) setDialog(null);
      return;
    }
    /*
     * O bloqueio síncrono cobre a mutação e a atualização dos dados,
     * incluindo cliques repetidos antes do próximo render.
     */
    lock.current = true;
    const context = getSessionContext();
    const controller = lifecycle.current;
    if (!controller || controller.signal.aborted) { lock.current = false; return; }
    setOperation({ pending: true, refreshing: false, stale: false, message: "", success: false });
    let feedback;
    try {
      await changeEventRegistration(event.id, action, controller.signal, context);
      feedback = { success: true, action, message: action === "register" ? "Inscrição efetuada com sucesso." : "Inscrição cancelada com sucesso." };
    } catch (error) {
      feedback = { success: false, action, message: getRegistrationErrorMessage(error) };
    }
    if (!controller.signal.aborted && isSessionCurrent(context) && identityKey(useAuthStore.getState()) === identity) {
      setDialog(null);
      /*
       * Uma falha de rede não garante que a operação falhou no servidor.
       * Reconciliar por GET evita repetir uma mutação de resultado incerto.
       */
      await reconcile(context, controller, feedback);
    }
    lock.current = false;
  }

  async function retryRefresh() {
    if (lock.current || identityKey(useAuthStore.getState()) !== identity) return;
    lock.current = true;
    await reconcile(getSessionContext(), lifecycle.current, { message: operation.message, success: operation.success, action: operation.action });
    lock.current = false;
  }

  let content;
  if (visitor) {
    content = (
      <div className="rounded-lg border border-[#E5DFD3] bg-[#F6F4EF] p-4">
        <p className="text-sm leading-6 text-gray-600">
          Para se inscrever neste evento é necessário ser membro ativo da ASPEC.
        </p>
        <Link to="/login" className={`${buttonClass} mt-5 inline-block`}>Entrar como membro</Link>
        <Link to="/registo" className="mt-3 inline-block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315A79]">
          Candidatar-me a membro
        </Link>
      </div>
    );
  } else if (!eligible) {
    content = (
      <p className="text-sm leading-6 text-gray-600">
        A inscrição está disponível apenas para membros ASPEC ativos com sessão confirmada.
      </p>
    );
  } else {
    const disabled = operation.pending || operation.refreshing || operation.stale;
    content = (
      <>
        {registered && (
          <p role="status" className="flex items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-3 text-sm font-medium text-green-800">
            <CircleCheck size={18} aria-hidden="true" className="shrink-0" /> Inscrição confirmada
          </p>
        )}
        {event.is_registered === null && !registered && (
          <p className="text-sm leading-6 text-gray-600">Não foi possível confirmar o estado da sua inscrição.</p>
        )}
        {canRegister && !registered && (
          <button type="button" className={goldButtonClass} disabled={disabled} onClick={() => setDialog("register")}>
            <CircleCheck size={18} aria-hidden="true" /> Inscrever-me
          </button>
        )}
        {canCancel && !cancelledAwaitingRefresh && (
          <button type="button" className={cancelButtonClass} disabled={disabled} onClick={() => setDialog("cancel")}>
            Cancelar a minha inscrição
          </button>
        )}
        {!openDeadline && (
          <p className="mt-3 text-sm text-gray-600">
            {formatRegistrationDeadline(event.registration_deadline) ? "O prazo para gerir a inscrição terminou." : "Prazo de inscrição por confirmar."}
          </p>
        )}
        {openDeadline && event.is_registered === false && event.registration_open !== true && (
          <p className="mt-3 text-sm text-gray-600">
            {event.registration_open === false ? "Inscrições encerradas." : "Disponibilidade de inscrição por confirmar."}
          </p>
        )}
      </>
    );
  }

  return (
    <section aria-labelledby="event-registration" className="rounded-xl border border-gray-200 bg-white p-5 text-center shadow-sm">
      <h2 id="event-registration" className="mb-5 text-left text-base font-semibold">Inscrição</h2>
      {content}
      {operation.message && !operation.success && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {operation.message}
        </p>
      )}
      {operation.refreshing && <p role="status" className="mt-3 text-sm text-gray-600">A atualizar o estado da inscrição...</p>}
      {operation.stale && !operation.refreshing && (
        <div className="mt-3">
          <p role="alert" className="text-sm text-gray-600">
            Não foi possível atualizar os dados do evento. O estado apresentado pode estar desatualizado.
          </p>
          <button type="button" className={`${buttonClass} mt-3`} onClick={retryRefresh}>Atualizar estado da inscrição</button>
        </div>
      )}
      <ConfirmDialog
        open={dialog !== null}
        title={dialog === "cancel" ? "Cancelar inscrição" : "Confirmar inscrição?"}
        description={dialog === "cancel" ? "Pretende cancelar a sua inscrição neste evento?" : "Reveja o resumo do evento antes de confirmar."}
        confirmLabel={dialog === "cancel" ? "Confirmar cancelamento" : "Confirmar inscrição"}
        tone={dialog === "cancel" ? "danger" : "gold"}
        showClose={dialog === "register"}
        pending={operation.pending}
        onConfirm={confirm}
        onCancel={() => setDialog(null)}
      >
        {dialog === "register" && <EventRegistrationSummary event={event} />}
      </ConfirmDialog>
    </section>
  );
}

export default function EventRegistrationCard({ event, onEventUpdate }) {
  const status = useAuthStore((state) => state.status);
  const generation = useAuthStore((state) => state.sessionGeneration);
  const changing = useAuthStore((state) => state.sessionChanging);
  const user = useAuthStore((state) => state.user);
  const eligible = memberCanAct({ status, sessionChanging: changing, user });
  const visitor = !user && status === "idle" && !changing;
  const identity = identityKey({ status, sessionGeneration: generation, sessionChanging: changing, user });
  return (
    <RegistrationControls
      key={`${event.id}:${identity}`}
      identity={identity}
      event={event}
      onEventUpdate={onEventUpdate}
      eligible={eligible}
      visitor={visitor}
    />
  );
}
