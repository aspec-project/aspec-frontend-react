import { useEffect, useState } from "react";
import { Copy, ExternalLink, Lock, Video } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { formatRegistrationDeadline } from "../../utils/eventFormatting";
import { getOnlineMeetingUrl } from "../../utils/eventAccess";

// Estrutura e temporização reutilizadas seletivamente do stash da ASPEC-258.
export default function EventOnlineAccess({ event, onRefresh }) {
  const auth = useAuthStore();
  const [clock, setClock] = useState(() => Date.now());
  const [copyStatus, setCopyStatus] = useState("");
  const deadline = formatRegistrationDeadline(event.registration_deadline);
  const eligible = auth.status === "authenticated" && !auth.sessionChanging && !!auth.user?.id &&
    ["Member", "Admin"].includes(auth.user.role?.name) && auth.user.account_status?.name === "Active";
  const url = getOnlineMeetingUrl(event, auth, clock);
  const passed = !!deadline && clock > Date.parse(event.registration_deadline);

  useEffect(() => {
    if (!deadline) return;
    let timer;
    let crossed = Date.now() > Date.parse(event.registration_deadline);
    function tick() {
      clearTimeout(timer);
      setClock(Date.now());
      const remaining = Date.parse(event.registration_deadline) - Date.now();
      if (remaining >= 0) timer = setTimeout(tick, Math.min(remaining + 1, 2147483647));
      else if (!crossed) {
        crossed = true;
        if (eligible && event.is_registered === true) onRefresh?.();
      }
    }
    const remaining = Date.parse(event.registration_deadline) - Date.now();
    if (remaining >= 0) timer = setTimeout(tick, Math.min(remaining + 1, 2147483647));
    window.addEventListener("focus", tick);
    return () => { clearTimeout(timer); window.removeEventListener("focus", tick); };
  }, [deadline, event.registration_deadline, event.is_registered, eligible, onRefresh]);

  if (event.is_online !== true) return null;

  let message = "O link da reunião ainda não está disponível.";
  if (!eligible) message = "O link da reunião é disponibilizado apenas aos membros inscritos neste evento.";
  else if (deadline && !passed) message = event.is_registered === true
    ? `Está inscrito. O link ficará visível aqui após o fecho das inscrições (${deadline}).`
    : `O link da reunião é disponibilizado aos inscritos após o fecho das inscrições (${deadline}).`;
  else if (event.is_registered !== true) message = "O link da reunião é disponibilizado apenas aos membros inscritos neste evento.";

  async function copy() {
    // Revalidar imediatamente antes de copiar, incluindo logout e mudança de papel.
    const currentUrl = getOnlineMeetingUrl(event, useAuthStore.getState());
    if (!currentUrl) return;
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopyStatus("Link copiado.");
    } catch {
      setCopyStatus("Não foi possível copiar o link.");
    }
  }

  return (
    <section aria-labelledby="event-online-access" className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 id="event-online-access" className="mb-4 flex items-center gap-2 text-lg font-medium text-[#0d1f35]">
        <Video size={16} aria-hidden="true" className="shrink-0 text-[#8a7043]" /> Acesso à reunião online
      </h2>
      {url ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#d4d8e3] bg-[#f5f3ee] p-4">
          <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
            <p className="mb-1 text-xs text-gray-500">Link da reunião</p>
            <p className="truncate text-sm font-medium text-[#0d1f35]">{url}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg border border-[#d4d8e3] px-3 py-2 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8a7043]"><Copy size={13} aria-hidden="true" /> Copiar</button>
            <a href={url} onClick={(eventClick) => { if (!getOnlineMeetingUrl(event, useAuthStore.getState())) eventClick.preventDefault(); }} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-[#0d1f35] px-3 py-2 text-xs font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8a7043]"><ExternalLink size={13} aria-hidden="true" /> Entrar na reunião</a>
          </div>
          {copyStatus && <p role="status" className="w-full text-xs text-gray-600">{copyStatus}</p>}
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-lg border border-dashed border-[#c9b87a] bg-[#f5f3ee] p-4">
          <Lock size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-[#8a7043]" />
          <div className="min-w-0">
            <p className="break-words text-sm leading-relaxed text-gray-600">{message}</p>
            {eligible && event.is_registered === true && passed && onRefresh && <button type="button" onClick={onRefresh} className="mt-3 rounded-lg border border-[#d4d8e3] px-3 py-2 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8a7043]">Atualizar acesso</button>}
          </div>
        </div>
      )}
    </section>
  );
}
