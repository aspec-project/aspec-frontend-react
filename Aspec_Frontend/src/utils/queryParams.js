/**
 * Lê um inteiro positivo escrito só com algarismos (ex.: a página no endereço).
 *
 * @param {string|null|undefined} value Valor do parâmetro.
 * @param {number} fallback Valor padrão.
 * @returns {number} O inteiro, ou o padrão se o valor for inválido.
 */
export function parsePositiveInteger(value, fallback) {
  if (!/^\d+$/.test(value ?? '')) return fallback

  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}

/**
 * Lê um valor que só pode ser um de uma lista fechada. Compara o texto do parâmetro com o texto de cada opção,
 * para servir tanto listas de texto como de números.
 *
 * @template T
 * @param {string|null|undefined} value Valor do parâmetro.
 * @param {T[]} allowed Valores permitidos.
 * @param {T} fallback Valor padrão.
 * @returns {T} A opção correspondente, ou o padrão.
 */
export function parseAllowedValue(value, allowed, fallback) {
  return allowed.find((option) => String(option) === value) ?? fallback
}

/**
 * Lê uma data sem hora (AAAA-MM-DD) que exista no calendário.
 *
 * @param {string|null|undefined} value Valor do parâmetro.
 * @returns {string} A data, ou "" se for inválida.
 */
export function parseDateOnly(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '')

  if (!match) return ''

  const [year, month, day] = match.slice(1).map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? value : ''
}

/**
 * Copia os parâmetros do endereço e aplica as mudanças de uma lista, sem tocar nos parâmetros das outras.
 * Um valor vazio ou igual ao padrão é removido, para o endereço só guardar o que foi escolhido.
 *
 * @param {URLSearchParams} current Parâmetros atuais.
 * @param {Record<string, string|number>} changes Novos valores por nome de parâmetro.
 * @param {Record<string, string|number>} [defaults] Valores padrão por nome de parâmetro.
 * @returns {URLSearchParams} Novos parâmetros.
 */
export function updateSearchParams(current, changes, defaults = {}) {
  const next = new URLSearchParams(current)

  for (const [name, value] of Object.entries(changes)) {
    if (value === '' || value === null || value === undefined || value === defaults[name]) {
      next.delete(name)
    } else {
      next.set(name, String(value))
    }
  }

  return next
}
