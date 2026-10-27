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
