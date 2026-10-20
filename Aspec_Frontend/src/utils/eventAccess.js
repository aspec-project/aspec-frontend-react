import { formatRegistrationDeadline } from "./eventFormatting";

/*
 * Este filtro evita conservar o URL privado em contextos não autorizados.
 * A API continua responsável por impedir a sua divulgação na resposta HTTP.
 */
export function getOnlineMeetingUrl(event, auth, now = Date.now()) {
  if (auth?.status !== "authenticated" || auth.sessionChanging ||
    typeof auth.user?.id !== "string" || !auth.user.id.trim() ||
    !["Member", "Admin"].includes(auth.user.role?.name) ||
    auth.user.account_status?.name !== "Active" ||
    event?.is_online !== true || event.is_registered !== true ||
    !formatRegistrationDeadline(event.registration_deadline) ||
    !Number.isFinite(now) || now <= Date.parse(event.registration_deadline) ||
    typeof event.online_url !== "string") return "";

  try {
    const url = new URL(event.online_url);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return "";
    return url.href;
  } catch {
    return "";
  }
}
