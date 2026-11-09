export function formatDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "Data por confirmar";
  }

  const date = new Date(`${value}T00:00:00`);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== Number(value.slice(0, 4)) ||
    date.getMonth() + 1 !== Number(value.slice(5, 7)) ||
    date.getDate() !== Number(value.slice(8, 10))
  ) {
    return "Data por confirmar";
  }

  return new Intl.DateTimeFormat("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatTime(value) {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)
    ? value.slice(0, 5)
    : "";
}

export function formatRegistrationDeadline(value) {
  if (typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value) ||
    formatDate(value.slice(0, 10)) === "Data por confirmar") return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("pt-PT", {
    timeZone: "Europe/Lisbon", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(date);
}

export function categoryColor(category) {
  return typeof category?.color === "string" && /^#[0-9a-f]{6}$/i.test(category.color)
    ? category.color
    : "#0D1F35";
}

/** Cor da barra de lotação quando restam poucas vagas; nenhuma cor de categoria é vermelha. */
export const OCCUPANCY_WARNING_COLOR = "#B91C1C";

/**
 * Versão suave da cor da categoria (12 % de opacidade), para o fundo dos badges.
 * @param {string} color Cor no formato #RRGGBB.
 * @returns {string}
 */
export function softCategoryColor(color) {
  return `${color}1F`;
}

/**
 * Indica se a barra de lotação deve ficar a vermelho. Eventos com 10 lugares ou menos: quando metade
 * está ocupada. Restantes: quando sobram 5 vagas ou menos.
 * @param {number} maxAttendees Lugares do evento.
 * @param {number} registrationsCount Inscrições atuais.
 * @returns {boolean}
 */
export function isOccupancyCritical(maxAttendees, registrationsCount) {
  return maxAttendees <= 10
    ? registrationsCount * 2 >= maxAttendees
    : maxAttendees - registrationsCount <= 5;
}
