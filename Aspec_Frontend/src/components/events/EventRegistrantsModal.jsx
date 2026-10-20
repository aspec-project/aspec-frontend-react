import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Building2, Search, X } from "lucide-react";
import { getEventRegistrants, getEventRegistrantsErrorMessage } from "../../services/eventRegistrants";
import { useAuthStore } from "../../store/authStore";

function RegistrantsModal({ event, onClose, triggerRef }) {
  const titleId = useId();
  const descriptionId = useId();
  const overlayRef = useRef(null);
  const dialogRef = useRef(null);
  const inputRef = useRef(null);
  const [search, setSearch] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  const current = result?.attempt === attempt ? result : null;

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const companies = await getEventRegistrants(event.id, controller.signal);
        if (!controller.signal.aborted) setResult({ attempt, companies: [...companies].sort((first, second) => (first.business_name || "").localeCompare(second.business_name || "", "pt-PT")) });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ attempt, error: getEventRegistrantsErrorMessage(error) });
      }
    }
    queueMicrotask(() => { if (!controller.signal.aborted) load(); });
    return () => controller.abort();
  }, [event.id, attempt]);

  useEffect(() => {
    const trigger = triggerRef.current;
    const overflow = document.body.style.overflow;
    const siblings = [...document.body.children].filter((node) => node !== overlayRef.current);
    const previous = siblings.map((node) => ({ node, inert: node.hasAttribute("inert") }));
    siblings.forEach((node) => node.setAttribute("inert", ""));
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
      if (event.key !== "Tab") return;
      const controls = [...dialogRef.current.querySelectorAll('button:not([disabled]), input:not([disabled]), [tabindex="0"]')];
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      previous.forEach(({ node, inert }) => { if (!inert) node.removeAttribute("inert"); });
      document.body.style.overflow = overflow;
      if (trigger?.isConnected) trigger.focus();
    };
  }, [onClose, triggerRef]);

  const companies = current?.companies;
  const filtered = companies?.filter((company) => (company.business_name || "Nome da empresa indisponível").toLocaleLowerCase("pt-PT").includes(search.trim().toLocaleLowerCase("pt-PT")));

  return createPortal(
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className="relative grid max-h-[calc(100dvh-2rem)] w-full max-w-md gap-4 overflow-y-auto rounded-2xl border border-black/10 bg-white p-6 text-[#0d1f35] shadow-lg">
        <div className="flex min-w-0 flex-col gap-2 pr-5 text-center sm:text-left">
          <h2 id={titleId} className="text-lg font-semibold leading-none">Empresas inscritas</h2>
          <p id={descriptionId} className="break-words text-sm text-[#717182]">{event.name}{companies && ` · ${companies.length} ${companies.length === 1 ? "empresa" : "empresas"}`}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar modal" className="absolute right-4 top-4 rounded text-[#0d1f35] opacity-70 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a7043]"><X size={16} aria-hidden="true" /></button>
        <div className="relative">
          <Search size={14} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input ref={inputRef} type="search" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Pesquisar empresa" placeholder="Pesquisar empresa" className="w-full rounded-lg border border-[#d4d8e3] bg-white py-2 pl-9 pr-3 text-sm text-[#0d1f35] placeholder:text-[#717182] focus:border-[#8a7043] focus:outline-2 focus:outline-offset-2 focus:outline-[#8a7043]" />
        </div>
        {!current ? <p role="status" className="py-6 text-center text-sm text-[#717182]">A carregar empresas inscritas...</p> : current.error ? (
          <div className="text-center text-sm">
            <p role="alert" className="text-red-700">{current.error}</p>
            <button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-3 rounded-lg border border-[#d4d8e3] px-4 py-2 text-[#555] focus-visible:outline-2 focus-visible:outline-[#8a7043]">Tentar novamente</button>
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-100" tabIndex={filtered.length ? 0 : undefined} role="region" aria-label="Lista de empresas inscritas">
            {filtered.length ? <ul className="divide-y divide-gray-100">{filtered.map((company, index) => (
              <li key={index} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f5f3ee]"><Building2 size={13} aria-hidden="true" className="text-[#8a7043]" /></span>
                <span className="min-w-0 flex-1 break-words text-[#0d1f35]">{company.business_name || "Nome da empresa indisponível"}</span>
              </li>
            ))}</ul> : <p role="status" className="px-3 py-6 text-center text-sm text-gray-400">{companies.length ? "Nenhuma empresa encontrada." : "Ainda não existem empresas inscritas."}</p>}
          </div>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-lg border border-[#d4d8e3] px-4 py-2 text-sm text-[#555] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a7043]">Fechar</button>
        </div>
      </section>
    </div>, document.body
  );
}

function RegistrantsButton({ event }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  return <>
    <button ref={triggerRef} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-[#8a7043] px-4 py-2 text-sm text-[#8a7043] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a7043]"><Building2 size={14} aria-hidden="true" />Ver empresas inscritas</button>
    {open && <RegistrantsModal event={event} onClose={close} triggerRef={triggerRef} />}
  </>;
}

export default function EventRegistrantsModal({ event }) {
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const sessionChanging = useAuthStore((state) => state.sessionChanging);
  const generation = useAuthStore((state) => state.sessionGeneration);
  const allowed = status === "authenticated" && !sessionChanging && user?.account_status?.name === "Active" && ["Member", "Admin"].includes(user?.role?.name);
  /*
   * Uma mudança de evento ou identidade desmonta a lista privada e cancela
   * o pedido. Reabrir o modal obtém sempre uma lista atualizada da API.
   */
  return allowed ? <RegistrantsButton key={JSON.stringify([event.id, user.id, generation, user.role.name])} event={event} /> : null;
}
