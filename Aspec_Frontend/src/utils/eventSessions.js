const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/*
 * A lista é fornecida explicitamente pela integração: não deduz relações
 * de recorrência a partir de datas, nomes ou categorias dos eventos.
 */
export function validEventSessions(sessions) {
  if (!Array.isArray(sessions)) return false;
  const ids = new Set();
  return sessions.every((session) => {
    if (!session || typeof session.id !== "string" || !uuid.test(session.id)) return false;
    const id = session.id.toLowerCase();
    if (ids.has(id)) return false;
    ids.add(id);
    return true;
  });
}

export function eventSessionStart(event) {
  const date = event?.event_date;
  const time = event?.event_start_time;
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    typeof time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const parsed = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null;
  return `${date}T${time}:00`;
}

const lisbonClock = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Lisbon", hourCycle: "h23",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
});

/*
 * A data e a hora do evento são locais de Lisboa. O offset do prazo pode
 * pertencer a outro período de hora legal e não define o início da sessão.
 */
export function isFutureEventSession(event, now = Date.now()) {
  const start = eventSessionStart(event);
  if (start === null || !Number.isFinite(now)) return false;
  const parts = Object.fromEntries(lisbonClock.formatToParts(now).map(({ type, value }) => [type, value]));
  const current = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
  return start > current;
}
