/**
 * Indica se um valor é uma cor no formato #RRGGBB (maiúsculas ou minúsculas).
 *
 * @param {unknown} value Valor a verificar.
 * @returns {boolean}
 */
export function isHexColor(value) {
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value)
}

/**
 * Normaliza uma cor escrita pelo utilizador: corta os espaços, acrescenta o # quando vêm só os 6 dígitos e
 * devolve em maiúsculas.
 *
 * @param {unknown} value Texto escrito (ex.: " 8a7043 ").
 * @returns {string|null} Cor #RRGGBB em maiúsculas, ou null se não for válida.
 */
export function normalizeHexColor(value) {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  const withHash = /^[0-9A-Fa-f]{6}$/.test(trimmed) ? `#${trimmed}` : trimmed

  return isHexColor(withHash) ? withHash.toUpperCase() : null
}

/**
 * Converte uma cor #RRGGBB nos três canais RGB.
 *
 * @param {unknown} hex Cor #RRGGBB.
 * @returns {{r: number, g: number, b: number}|null} Canais de 0 a 255, ou null se a cor for inválida.
 */
export function hexToRgb(hex) {
  if (!isHexColor(hex)) return null

  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  }
}
