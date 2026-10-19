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

export function badgeTextColor(color) {
  const channels = [1, 3, 5].map((index) => {
    const channel = parseInt(color.slice(index, index + 2), 16) / 255;

    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];

  return 1.05 / (luminance + 0.05) >= (luminance + 0.05) / 0.05
    ? "#FFFFFF"
    : "#000000";
}

